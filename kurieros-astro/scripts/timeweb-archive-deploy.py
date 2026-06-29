#!/usr/bin/env python3
"""Deploy a static build to Timeweb as one zip and unpack it on the server."""

from __future__ import annotations

import argparse
import fnmatch
import ftplib
import os
import secrets
import ssl
import sys
import tempfile
import time
import urllib.error
import urllib.request
import zipfile
from pathlib import Path


DEFAULT_EXCLUDES = (
    ".env",
    ".env.*",
    "**/.DS_Store",
)

DEFAULT_PRESERVE = (
    ".htaccess",
    ".well-known",
    "cgi-bin",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", required=True, type=Path)
    parser.add_argument("--ftp-host", required=True)
    parser.add_argument("--ftp-port", type=int, default=21)
    parser.add_argument("--ftp-user", required=True)
    parser.add_argument("--ftp-password-env", required=True)
    parser.add_argument("--ftp-tls", action="store_true")
    parser.add_argument("--remote-root", default="/")
    parser.add_argument("--unpack-url", required=True, help="URL that points to the same Timeweb document root.")
    parser.add_argument("--preserve", action="append", default=[])
    parser.add_argument("--exclude", action="append", default=[])
    parser.add_argument("--insecure-https", action="store_true")
    parser.add_argument("--request-timeout", type=int, default=900)
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def ftp_password(env_name: str) -> str:
    value = os.environ.get(env_name)
    if not value:
        raise SystemExit(f"FTP password is required via {env_name}")
    return value


def should_exclude(relative: Path, patterns: list[str]) -> bool:
    text = relative.as_posix()
    return any(fnmatch.fnmatch(text, pattern) or text == pattern.rstrip("/") for pattern in patterns)


def make_zip(source_dir: Path, archive_path: Path, excludes: list[str]) -> int:
    count = 0
    with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(source_dir.rglob("*")):
            if path.is_dir():
                continue
            relative = path.relative_to(source_dir)
            if relative.is_absolute() or ".." in relative.parts:
                raise RuntimeError(f"Unsafe archive path: {relative}")
            if should_exclude(relative, excludes):
                continue
            archive.write(path, relative.as_posix())
            count += 1
    return count


def php_string(value: str) -> str:
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


def unpacker_php(archive_name: str, staging_name: str, token: str, preserve: list[str]) -> bytes:
    preserve_items = ", ".join(php_string(item.strip("/")) for item in preserve if item.strip("/"))
    return f"""<?php
declare(strict_types=1);

ignore_user_abort(true);
@set_time_limit(0);

$token = {php_string(token)};
$archiveName = {php_string(archive_name)};
$stagingName = {php_string(staging_name)};
$preserve = array_fill_keys([{preserve_items}], true);
$preserve[$archiveName] = true;
$preserve[$stagingName] = true;
$preserve[basename(__FILE__)] = true;

function fail_deploy(string $message, int $status = 500): void {{
    http_response_code($status);
    echo 'ERROR ' . $message;
    exit;
}}

if (!isset($_GET['token']) || !hash_equals($token, (string) $_GET['token'])) {{
    fail_deploy('Forbidden', 403);
}}

if (!class_exists('ZipArchive')) {{
    fail_deploy('ZipArchive is not available');
}}

$root = __DIR__;
$archivePath = $root . DIRECTORY_SEPARATOR . $archiveName;
$stagingPath = $root . DIRECTORY_SEPARATOR . $stagingName;

function remove_tree(string $path): void {{
    if (is_link($path) || is_file($path)) {{
        if (!@unlink($path)) {{
            fail_deploy('Cannot remove file: ' . basename($path));
        }}
        return;
    }}

    if (!is_dir($path)) {{
        return;
    }}

    $items = scandir($path);
    if ($items === false) {{
        fail_deploy('Cannot read directory: ' . basename($path));
    }}

    foreach ($items as $item) {{
        if ($item === '.' || $item === '..') {{
            continue;
        }}
        remove_tree($path . DIRECTORY_SEPARATOR . $item);
    }}

    if (!@rmdir($path)) {{
        fail_deploy('Cannot remove directory: ' . basename($path));
    }}
}}

if (!is_file($archivePath)) {{
    fail_deploy('Archive is missing');
}}

if (file_exists($stagingPath)) {{
    remove_tree($stagingPath);
}}

if (!@mkdir($stagingPath, 0755, true) && !is_dir($stagingPath)) {{
    fail_deploy('Cannot create staging directory');
}}

$zip = new ZipArchive();
if ($zip->open($archivePath) !== true) {{
    remove_tree($stagingPath);
    fail_deploy('Cannot open archive');
}}

if (!$zip->extractTo($stagingPath)) {{
    $zip->close();
    remove_tree($stagingPath);
    fail_deploy('Cannot extract archive');
}}
$zip->close();

$rootItems = scandir($root);
if ($rootItems === false) {{
    remove_tree($stagingPath);
    fail_deploy('Cannot read root directory');
}}

foreach ($rootItems as $item) {{
    if ($item === '.' || $item === '..' || isset($preserve[$item])) {{
        continue;
    }}
    remove_tree($root . DIRECTORY_SEPARATOR . $item);
}}

$stagingItems = scandir($stagingPath);
if ($stagingItems === false) {{
    remove_tree($stagingPath);
    fail_deploy('Cannot read staging directory');
}}

foreach ($stagingItems as $item) {{
    if ($item === '.' || $item === '..' || isset($preserve[$item])) {{
        continue;
    }}
    $from = $stagingPath . DIRECTORY_SEPARATOR . $item;
    $to = $root . DIRECTORY_SEPARATOR . $item;
    if (!@rename($from, $to)) {{
        remove_tree($stagingPath);
        fail_deploy('Cannot publish: ' . $item);
    }}
}}

remove_tree($stagingPath);
@unlink($archivePath);
@unlink(__FILE__);

echo 'OK unpacked';
""".encode("utf-8")


def with_retries(label: str, retries: int, action):
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            return action()
        except Exception as error:  # noqa: BLE001 - deploy tool should report transport failures.
            last_error = error
            if attempt == retries:
                break
            time.sleep(min(2 * attempt, 10))
    raise RuntimeError(f"{label} failed after {retries} attempts: {last_error}") from last_error


def connect_ftp(args: argparse.Namespace, password: str) -> ftplib.FTP:
    klass = ftplib.FTP_TLS if args.ftp_tls else ftplib.FTP
    ftp = klass()
    ftp.connect(args.ftp_host, args.ftp_port, timeout=45)
    ftp.login(args.ftp_user, password)
    if args.ftp_tls:
        assert isinstance(ftp, ftplib.FTP_TLS)
        ftp.prot_p()
    ftp.set_pasv(True)
    if args.remote_root != "/":
        ftp.cwd(args.remote_root)
    return ftp


def upload_path(ftp: ftplib.FTP, local_path: Path, remote_name: str, retries: int) -> None:
    total = local_path.stat().st_size
    transferred = 0
    next_report = 25 * 1024 * 1024

    def callback(chunk: bytes) -> None:
        nonlocal transferred, next_report
        transferred += len(chunk)
        if transferred >= next_report:
            print(f"Uploaded {remote_name}: {transferred}/{total} bytes")
            next_report += 25 * 1024 * 1024

    def action() -> None:
        nonlocal transferred, next_report
        transferred = 0
        next_report = 25 * 1024 * 1024
        with local_path.open("rb") as handle:
            ftp.storbinary(f"STOR {remote_name}", handle, blocksize=1024 * 1024, callback=callback)

    with_retries(f"upload {remote_name}", retries, action)


def upload_bytes(ftp: ftplib.FTP, payload: bytes, remote_name: str, retries: int) -> None:
    with tempfile.NamedTemporaryFile(prefix="timeweb-unpack-", suffix=".php", delete=False) as handle:
        tmp_path = Path(handle.name)
        handle.write(payload)
    try:
        upload_path(ftp, tmp_path, remote_name, retries)
    finally:
        tmp_path.unlink(missing_ok=True)


def fetch(url: str, insecure_https: bool, timeout: int) -> tuple[int, str]:
    context = ssl._create_unverified_context() if insecure_https and url.startswith("https://") else None
    request = urllib.request.Request(url, headers={"User-Agent": "Kurerok-Timeweb-Deploy/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
            return response.status, response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8", errors="replace")


def remote_url(root: str, file_name: str, token: str | None = None) -> str:
    url = f"{root.rstrip('/')}/{file_name}"
    if token:
        url += f"?token={token}"
    return url


def try_remote_delete(ftp: ftplib.FTP, *names: str) -> None:
    for name in names:
        try:
            ftp.delete(name)
        except ftplib.all_errors:
            pass


def main() -> int:
    args = parse_args()
    source_dir = args.source_dir.resolve()
    if not source_dir.is_dir():
        raise SystemExit(f"Source directory does not exist: {source_dir}")

    suffix = secrets.token_hex(8)
    token = secrets.token_urlsafe(32)
    archive_name = f"kurerok-deploy-{suffix}.zip"
    unpacker_name = f"kurerok-unpack-{suffix}.php"
    staging_name = f".kurerok-deploy-{suffix}"
    preserve = [*DEFAULT_PRESERVE, *args.preserve]

    with tempfile.TemporaryDirectory(prefix="kurerok-timeweb-") as tmpdir:
        archive_path = Path(tmpdir) / archive_name
        file_count = make_zip(source_dir, archive_path, [*DEFAULT_EXCLUDES, *args.exclude])
        archive_size = archive_path.stat().st_size
        if file_count == 0:
            raise SystemExit("Archive is empty; check --source-dir and --exclude")

        print(f"Created {archive_name}: {file_count} files, {archive_size} bytes")
        if args.dry_run:
            print("Dry run completed; no files uploaded.")
            return 0

        password = ftp_password(args.ftp_password_env)
        ftp = connect_ftp(args, password)
        try:
            try_remote_delete(ftp, archive_name, unpacker_name)
            upload_path(ftp, archive_path, archive_name, args.retries)
            upload_bytes(
                ftp,
                unpacker_php(archive_name, staging_name, token, preserve),
                unpacker_name,
                args.retries,
            )
            print("Uploaded archive and unpacker.")
        finally:
            try:
                ftp.quit()
            except ftplib.all_errors:
                ftp.close()

        status, body = fetch(remote_url(args.unpack_url, unpacker_name, token), args.insecure_https, args.request_timeout)
        print(f"Unpacker response: HTTP {status} {body[:120]}")
        if status != 200 or "OK unpacked" not in body:
            return 2

        cleanup_failed = False
        for name in (unpacker_name, archive_name):
            cleanup_status, _ = fetch(remote_url(args.unpack_url, name), args.insecure_https, 30)
            print(f"Cleanup check {name}: HTTP {cleanup_status}")
            if cleanup_status < 400:
                cleanup_failed = True

        return 3 if cleanup_failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
