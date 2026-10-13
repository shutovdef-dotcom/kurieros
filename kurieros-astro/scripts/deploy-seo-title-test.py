#!/usr/bin/env python3
"""Safely deploy an explicit manifest of SEO title-test files to Timeweb.

Dry-run is the default: it performs read-only FTP checks but never creates a
backup or writes remote files. Applying changes needs --apply, a password
supplied through --password-env, and a private backup directory outside the
repository and source tree. This is intentionally not a general site deployer:
only selected vacancy pages, hashed Astro assets, and the Ozon Fresh
translation payload are accepted.
"""

from __future__ import annotations

import argparse
import ftplib
import hashlib
import json
import os
import re
import ssl
import sys
import time
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath
from typing import Any
from urllib.parse import urlparse


HEX_SHA256 = re.compile(r"^[a-fA-F0-9]{64}$")
ENV_NAME = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
VACANCY_PAGE = re.compile(r"^v/[a-z0-9]+(?:-[a-z0-9]+)*/index\.html$")
VACANCY_TRANSLATION = re.compile(
    r"^vacancy-translations/[a-z]{2,3}(?:-[A-Z]{2})?/ozon-fresh-courier\.json$"
)
ASTRO_ASSET = re.compile(
    r"^_astro/(?:[A-Za-z0-9_][A-Za-z0-9._-]*[._-])?"
    r"[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]{1,12}$"
)
MISSING_550 = re.compile(
    r"(?:not found|no such file|does not exist|doesn't exist|cannot find|can't find)",
    re.IGNORECASE,
)


class DeployError(RuntimeError):
    """A fail-closed manifest, FTP, or verification error."""


@dataclass(frozen=True)
class Entry:
    path: str
    expected_sha256: str
    content: bytes

    @property
    def is_asset(self) -> bool:
        return self.path.startswith("_astro/")

    @property
    def is_html(self) -> bool:
        return self.path.endswith(".html")

    @property
    def sha256(self) -> str:
        return hashlib.sha256(self.content).hexdigest()


class CanonicalParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.hrefs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "link":
            return
        values = {name.lower(): value or "" for name, value in attrs}
        rels = {value.lower() for value in values.get("rel", "").split()}
        if "canonical" in rels:
            self.hrefs.append(values.get("href", ""))


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def validate_relative_path(value: Any) -> str:
    if not isinstance(value, str) or not value or value.strip() != value:
        raise DeployError("Manifest path must be a non-empty relative path string")
    if "\\" in value or value.startswith("/") or "\x00" in value:
        raise DeployError(f"Rejected absolute or non-POSIX path: {value!r}")
    parts = value.split("/")
    if any(part in ("", ".", "..") for part in parts):
        raise DeployError(f"Rejected traversal or empty path component: {value!r}")
    path = PurePosixPath(value)
    if path.is_absolute() or path.as_posix() != value:
        raise DeployError(f"Rejected non-canonical relative path: {value!r}")
    if not (VACANCY_PAGE.fullmatch(value) or ASTRO_ASSET.fullmatch(value) or VACANCY_TRANSLATION.fullmatch(value)):
        raise DeployError(f"Path is outside the SEO title-test allowlist: {value}")
    return value


def load_manifest(manifest_path: Path, source_dir: Path) -> list[Entry]:
    try:
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise DeployError(f"Cannot read manifest JSON: {exc}") from exc
    if not isinstance(payload, list) or not payload:
        raise DeployError("Manifest must be a non-empty JSON list")

    try:
        source_root = source_dir.resolve(strict=True)
    except OSError as exc:
        raise DeployError(f"Cannot resolve --source-dir: {exc}") from exc
    if not source_root.is_dir():
        raise DeployError("--source-dir must be an existing directory")

    seen: set[str] = set()
    entries: list[Entry] = []
    for index, item in enumerate(payload):
        if not isinstance(item, dict):
            raise DeployError(f"Manifest item {index} must be an object")
        path_keys = [key for key in ("path", "filepath") if key in item]
        if len(path_keys) != 1 or set(item) != {path_keys[0], "sha256"}:
            raise DeployError(f"Manifest item {index} must contain exactly path (or filepath) and sha256")
        relative = validate_relative_path(item[path_keys[0]])
        if relative in seen:
            raise DeployError(f"Duplicate manifest path: {relative}")
        seen.add(relative)
        expected = item["sha256"]
        if not isinstance(expected, str) or not HEX_SHA256.fullmatch(expected):
            raise DeployError(f"Manifest sha256 for {relative} must be 64 hexadecimal characters")

        local_path = source_root.joinpath(*PurePosixPath(relative).parts)
        cursor = source_root
        for part in PurePosixPath(relative).parts:
            cursor = cursor / part
            if cursor.is_symlink():
                raise DeployError(f"Symlinks are not allowed in source paths: {relative}")
        try:
            resolved = local_path.resolve(strict=True)
            if not resolved.is_relative_to(source_root) or not resolved.is_file():
                raise DeployError(f"Source path is not a regular file under --source-dir: {relative}")
            content = resolved.read_bytes()
        except OSError as exc:
            raise DeployError(f"Cannot read source file {relative}: {exc}") from exc
        actual = sha256(content)
        if actual != expected.lower():
            raise DeployError(f"SHA-256 mismatch for source file {relative}")
        entries.append(Entry(relative, expected.lower(), content))
    return entries


def find_repo_root(start: Path) -> Path | None:
    for candidate in (start, *start.parents):
        if (candidate / ".git").exists():
            return candidate.resolve()
    return None


def validate_backup_dir(backup_dir: Path, source_dir: Path) -> Path:
    if not backup_dir.is_absolute():
        raise DeployError("--backup-dir must be an absolute local path outside public/repository trees")
    backup_abs = backup_dir.resolve(strict=False)
    source_abs = source_dir.resolve(strict=True)
    if backup_abs == source_abs or source_abs in backup_abs.parents:
        raise DeployError("--backup-dir must not be inside --source-dir")
    repo_root = find_repo_root(Path(__file__).resolve())
    if repo_root and (backup_abs == repo_root or repo_root in backup_abs.parents):
        raise DeployError("--backup-dir must be outside the Git repository")
    if backup_dir.exists() and backup_dir.is_symlink():
        raise DeployError("--backup-dir may not be a symlink")
    if backup_dir.exists() and (not backup_dir.is_dir() or any(backup_dir.iterdir())):
        raise DeployError("--backup-dir must be a new or empty directory")
    return backup_abs


def is_missing_asset_550(exc: ftplib.error_perm) -> bool:
    message = str(exc)
    return (
        message.startswith("550")
        and bool(MISSING_550.search(message))
        and not re.search(r"permission|denied|no access|not allowed", message, re.IGNORECASE)
    )


def retrieve(ftp: ftplib.FTP, remote_path: str) -> bytes:
    chunks: list[bytes] = []
    ftp.retrbinary(f"RETR {remote_path}", chunks.append)
    return b"".join(chunks)


def check_site_fingerprint(ftp: ftplib.FTP) -> tuple[str, int]:
    root_pwd = ftp.pwd()
    entries = ftp.nlst()
    if not any(item.rstrip("/").split("/")[-1] == "index.html" for item in entries):
        raise DeployError("FTP root listing has no index.html; refusing an unverified remote root")
    root_html = retrieve(ftp, "index.html")
    parser = CanonicalParser()
    try:
        parser.feed(root_html.decode("utf-8", errors="replace"))
    except Exception as exc:  # HTMLParser's exception text may contain no credentials.
        raise DeployError(f"Cannot parse the remote root index fingerprint: {exc}") from exc
    canonical_hosts: set[str] = set()
    valid_home = False
    for href in parser.hrefs:
        try:
            parsed = urlparse(href)
        except ValueError:
            continue
        if parsed.hostname:
            canonical_hosts.add(parsed.hostname.lower())
        if parsed.scheme.lower() == "https" and parsed.hostname and parsed.hostname.lower() == "kurerok.ru":
            if parsed.path.rstrip("/") == "" and not parsed.query and not parsed.fragment:
                valid_home = True
    if not valid_home:
        raise DeployError("Remote root index.html does not have canonical https://kurerok.ru/")
    return root_pwd, len(entries)


def remote_size(ftp: ftplib.FTP, entry: Entry) -> int | None:
    try:
        ftp.voidcmd("TYPE I")
        size = ftp.size(entry.path)
    except ftplib.error_perm as exc:
        if entry.is_asset and is_missing_asset_550(exc):
            return None
        raise DeployError(f"FTP SIZE failed for {entry.path}: {exc}") from exc
    except ftplib.all_errors as exc:
        raise DeployError(f"FTP SIZE failed for {entry.path}: {exc}") from exc
    if size is None:
        raise DeployError(f"FTP server returned no size for {entry.path}")
    return int(size)


def ensure_parent_dir(ftp: ftplib.FTP, relative_path: str, original_pwd: str) -> None:
    parent = str(PurePosixPath(relative_path).parent)
    try:
        ftp.cwd(parent)
        ftp.cwd(original_pwd)
    except ftplib.all_errors as exc:
        try:
            ftp.cwd(original_pwd)
        except ftplib.all_errors:
            pass
        raise DeployError(f"FTP parent directory is unavailable for {relative_path}: {exc}") from exc


def write_private_file(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    try:
        os.chmod(path.parent, 0o700)
    except OSError:
        pass
    with path.open("xb") as handle:
        handle.write(content)
    os.chmod(path, 0o600)


def save_backups(
    backup_dir: Path,
    backups: dict[str, bytes | None],
    host: str,
    remote_pwd: str,
) -> Path:
    backup_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(backup_dir, 0o700)
    records = []
    for relative, content in sorted(backups.items()):
        if content is None:
            records.append({"path": relative, "was_missing": True, "sha256": None, "size": None})
            continue
        target = backup_dir.joinpath(*PurePosixPath(relative).parts)
        write_private_file(target, content)
        records.append({
            "path": relative,
            "was_missing": False,
            "backup_file": str(target.relative_to(backup_dir)),
            "sha256": sha256(content),
            "size": len(content),
        })
    manifest = {
        "created_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "ftp_host": host,
        "ftp_pwd": remote_pwd,
        "files": records,
    }
    manifest_path = backup_dir / "backup-manifest.json"
    with manifest_path.open("x", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2, sort_keys=True)
        handle.write("\n")
    os.chmod(manifest_path, 0o600)
    return manifest_path


def upload(ftp: ftplib.FTP, entry: Entry) -> None:
    from io import BytesIO

    ftp.storbinary(f"STOR {entry.path}", BytesIO(entry.content), blocksize=64 * 1024)
    returned = retrieve(ftp, entry.path)
    if len(returned) != len(entry.content) or sha256(returned) != entry.expected_sha256:
        raise DeployError(f"FTP read-back verification failed for {entry.path}")


def restore(ftp: ftplib.FTP, attempted: list[str], originals: dict[str, bytes | None]) -> list[str]:
    errors: list[str] = []
    from io import BytesIO

    for relative in reversed(attempted):
        old = originals[relative]
        try:
            if old is None:
                try:
                    ftp.delete(relative)
                except ftplib.error_perm as exc:
                    if not (str(exc).startswith("550") and MISSING_550.search(str(exc))):
                        raise
            else:
                ftp.storbinary(f"STOR {relative}", BytesIO(old), blocksize=64 * 1024)
                check = retrieve(ftp, relative)
                if len(check) != len(old) or sha256(check) != sha256(old):
                    raise DeployError("rollback read-back did not match the saved content")
        except ftplib.all_errors as exc:
            errors.append(f"{relative}: {exc}")
        except DeployError as exc:
            errors.append(f"{relative}: {exc}")
    return errors


def run_remote(args: argparse.Namespace, entries: list[Entry], backup_path: Path) -> int:
    if not ENV_NAME.fullmatch(args.password_env):
        raise DeployError("--password-env must be a valid environment variable name")
    password = os.environ.get(args.password_env)
    if not password:
        raise DeployError(f"Password environment variable {args.password_env} is unset or empty")

    ftp_class: type[ftplib.FTP]
    if args.ftp_tls:
        ftp_class = ftplib.FTP_TLS
        ftp = ftp_class(context=ssl.create_default_context())
    else:
        ftp = ftplib.FTP()
    changed: list[Entry] = []
    originals: dict[str, bytes | None] = {}
    attempted: list[str] = []
    try:
        ftp.connect(args.ftp_host, args.ftp_port, timeout=args.timeout)
        ftp.login(args.ftp_user, password)
        if isinstance(ftp, ftplib.FTP_TLS):
            ftp.prot_p()
        ftp.set_pasv(True)
        root_pwd, listing_count = check_site_fingerprint(ftp)
        print(f"Preflight passed: PWD={root_pwd}; root listing entries={listing_count}; canonical=https://kurerok.ru/")

        for entry in entries:
            ensure_parent_dir(ftp, entry.path, root_pwd)
            current_size = remote_size(ftp, entry)
            if current_size is None:
                if not entry.is_asset:
                    raise DeployError(f"Only missing _astro assets may be created; target missing: {entry.path}")
                originals[entry.path] = None
                changed.append(entry)
                print(f"Target absent (new asset): {entry.path}")
                continue
            current = retrieve(ftp, entry.path)
            if len(current) != current_size:
                raise DeployError(f"FTP SIZE/RETR length mismatch for {entry.path}")
            if sha256(current) == entry.expected_sha256:
                print(f"Already matches; no write needed: {entry.path}")
                continue
            originals[entry.path] = current
            changed.append(entry)

        if not changed:
            print("All manifest targets already match. No backup or production write was made.")
            return 0

        if not args.apply:
            print("DRY RUN: remote preflight completed; no backup or production write was made.")
            print(f"Would update {len(changed)} manifest target(s), in asset/data/page order:")
            for entry in sorted(changed, key=lambda item: (0 if item.is_asset else 2 if item.is_html else 1, item.path)):
                print(f"  {entry.path} size={len(entry.content)} sha256={entry.expected_sha256}")
            return 0

        # Persist every prior file before the first remote write.
        backup_records = {entry.path: originals[entry.path] for entry in changed}
        backup_manifest = save_backups(backup_path, backup_records, args.ftp_host, root_pwd)
        print(f"Backed up {sum(value is not None for value in backup_records.values())} existing target(s) to private local backup; manifest={backup_manifest}")

        order = sorted(changed, key=lambda item: (0 if item.is_asset else 2 if item.is_html else 1, item.path))
        try:
            for entry in order:
                attempted.append(entry.path)
                upload(ftp, entry)
                print(f"Verified upload: {entry.path} sha256={entry.expected_sha256}")
        except Exception as exc:
            rollback_errors = restore(ftp, attempted, originals)
            if rollback_errors:
                details = "; ".join(rollback_errors)
                raise DeployError(f"Deployment failed ({exc}); rollback also failed for: {details}. Backup preserved at {backup_manifest}") from exc
            raise DeployError(f"Deployment failed and all attempted targets were rolled back: {exc}. Backup preserved at {backup_manifest}") from exc

        print(f"Deployment complete: {len(attempted)} file(s) updated; backup retained at {backup_manifest}")
        return 0
    except DeployError:
        raise
    except ftplib.all_errors as exc:
        raise DeployError(f"FTP operation failed: {exc}") from exc
    finally:
        try:
            ftp.quit()
        except Exception:
            try:
                ftp.close()
            except Exception:
                pass


def make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", required=True, type=Path, help="JSON list of {path, sha256} entries")
    parser.add_argument("--source-dir", required=True, type=Path, help="Root containing manifest files, typically dist/")
    parser.add_argument("--backup-dir", required=True, type=Path, help="Absolute private local backup path outside repo/source")
    parser.add_argument("--ftp-host", help="Timeweb FTP host (read from the verified account settings)")
    parser.add_argument("--ftp-user", help="Scoped Timeweb FTP user; never printed")
    parser.add_argument("--ftp-port", type=int, default=21)
    parser.add_argument("--password-env", default="TIMEWEB_FTP_PASSWORD", help="Environment variable holding FTP password")
    parser.add_argument("--ftp-tls", action=argparse.BooleanOptionalAction, default=True, help="Use explicit FTPS (default); --no-ftp-tls only if verified necessary")
    parser.add_argument("--timeout", type=int, default=45)
    parser.add_argument("--apply", action="store_true", help="After read-only FTP preflight, back up and write only changed manifest targets")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = make_parser().parse_args(argv)
    try:
        if not 1 <= args.ftp_port <= 65535:
            raise DeployError("--ftp-port must be between 1 and 65535")
        if args.timeout < 1:
            raise DeployError("--timeout must be positive")
        entries = load_manifest(args.manifest, args.source_dir)
        backup_dir = validate_backup_dir(args.backup_dir, args.source_dir)
        if not args.ftp_host or not args.ftp_user:
            raise DeployError("Remote dry-run and --apply require --ftp-host and --ftp-user")
        if backup_dir.exists() and any(backup_dir.iterdir()):
            raise DeployError("--backup-dir must be empty before dry-run/apply")
        print(f"Manifest validated: {len(entries)} file(s); source={args.source_dir.resolve()}; backup-dir={backup_dir}")
        if not args.apply:
            print("DRY RUN: read-only FTP login/list/fingerprint/target checks will run; no backup or production write will occur.")
        return run_remote(args, entries, backup_dir)
    except DeployError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
