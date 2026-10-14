#!/usr/bin/env python3
"""Safely overlay a reviewed Astro dist build onto a Timeweb site.

The default mode is local-only dry-run: it validates dist, creates and checks
a temporary zip plus SHA-256 manifest, and performs no network or server write.
Remote deployment requires --apply and a password supplied through an
environment variable. The remote PHP helper stages and validates the complete
archive privately, backs up every changed destination outside the document
root, then atomically replaces files in assets/data-before-HTML order.
"""

from __future__ import annotations

import argparse
import ftplib
import hashlib
import json
import os
import re
import secrets
import ssl
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath
from typing import Any


CANONICAL_URL = "https://kurerok.ru/"
HEX_SHA256 = re.compile(r"^[0-9a-f]{64}$")
ENV_NAME = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
SECRET_NAME_PATTERNS = (
    re.compile(r"^\.env(?:\..*)?$", re.IGNORECASE),
    re.compile(r"^(?:\.netrc|\.npmrc|\.pypirc|credentials(?:\..*)?)$", re.IGNORECASE),
    re.compile(r"(?:^|[._-])(?:secret|secrets|credential|credentials)(?:[._-]|$)", re.IGNORECASE),
    re.compile(r"\.(?:pem|key|p12|pfx)$", re.IGNORECASE),
    re.compile(r"(?:^|/)id_(?:rsa|ed25519)(?:\.pub)?$", re.IGNORECASE),
)
PRESERVED_ROOTS = {".htaccess", ".well-known"}


class DeployError(RuntimeError):
    """Fail-closed local, FTP, or remote deployment error."""


class RemoteOutcomeUnknown(DeployError):
    """The request connection ended before a terminal server result arrived."""


@dataclass(frozen=True)
class FileEntry:
    path: str
    sha256: str
    size: int
    phase: str


class CanonicalParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.hrefs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "link":
            return
        values = {key.lower(): value or "" for key, value in attrs}
        rels = {value.lower() for value in values.get("rel", "").split()}
        if "canonical" in rels:
            self.hrefs.append(values.get("href", ""))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_relative_path(value: Any) -> str:
    if not isinstance(value, str) or not value or value.strip() != value:
        raise DeployError("Rejected empty or invalid relative path")
    if value.startswith("/") or "\\" in value or "\x00" in value:
        raise DeployError("Rejected absolute or non-POSIX path")
    if re.search(r"[\x00-\x1f\x7f]", value):
        raise DeployError("Rejected control character in path")
    parts = value.split("/")
    if any(part in ("", ".", "..") for part in parts):
        raise DeployError("Rejected traversal or empty path component")
    if PurePosixPath(value).as_posix() != value:
        raise DeployError("Rejected non-canonical path")
    if parts[0] in PRESERVED_ROOTS or parts[0].startswith("codex-deploy-") or any(part == ".htaccess" for part in parts):
        raise DeployError("Path is reserved for server-preserved or temporary files")
    if any(pattern.search(part) for pattern in SECRET_NAME_PATTERNS for part in parts):
        raise DeployError("Secret-like path is not deployable")
    return value


def validate_private_root_argument(value: str | None) -> str | None:
    """Validate the syntax of an optional absolute remote private directory."""
    if value is None:
        return None
    if not value.startswith("/") or value == "/" or "\\" in value or "\x00" in value:
        raise argparse.ArgumentTypeError("--private-root must be a canonical absolute POSIX directory")
    if re.search(r"[\x00-\x1f\x7f]", value) or any(part in ("", ".", "..") for part in value.split("/")[1:]):
        raise argparse.ArgumentTypeError("--private-root must be a canonical absolute POSIX directory")
    if PurePosixPath(value).as_posix() != value:
        raise argparse.ArgumentTypeError("--private-root must be a canonical absolute POSIX directory")
    return value


def phase_for(path: str) -> str:
    if path.endswith(".html") or path.endswith(".htm"):
        return "html"
    return "data_asset"


def collect_dist(source_dir: Path) -> tuple[Path, list[tuple[Path, str]]]:
    if source_dir.is_symlink():
        raise DeployError("--source-dir may not be a symlink")
    try:
        root = source_dir.resolve(strict=True)
    except OSError as exc:
        raise DeployError("Cannot resolve --source-dir") from exc
    if not root.is_dir():
        raise DeployError("--source-dir must be a directory (normally dist/)")

    files: list[tuple[Path, str]] = []
    for current, dirs, names in os.walk(root, topdown=True, followlinks=False):
        current_path = Path(current)
        kept_dirs: list[str] = []
        for name in sorted(dirs):
            candidate = current_path / name
            if candidate.is_symlink():
                raise DeployError(f"Symlink directory is not allowed: {candidate.relative_to(root)}")
            rel = candidate.relative_to(root).as_posix()
            if rel == ".well-known" or rel.startswith(".well-known/"):
                continue
            kept_dirs.append(name)
        dirs[:] = kept_dirs

        for name in sorted(names):
            candidate = current_path / name
            rel = candidate.relative_to(root).as_posix()
            if candidate.is_symlink():
                raise DeployError(f"Symlink file is not allowed: {rel}")
            if not candidate.is_file():
                raise DeployError(f"Non-regular file is not deployable: {rel}")
            if PurePosixPath(rel).name == ".htaccess" or rel.startswith(".well-known/"):
                continue
            if any(pattern.search(part) for pattern in SECRET_NAME_PATTERNS for part in PurePosixPath(rel).parts):
                continue
            files.append((candidate, validate_relative_path(rel)))

    if not files:
        raise DeployError("dist contains no deployable public files")
    files.sort(key=lambda pair: (phase_for(pair[1]) == "html", pair[1]))
    return root, files


def build_package(source_dir: Path, archive_path: Path, manifest_path: Path) -> list[FileEntry]:
    root, files = collect_dist(source_dir)
    entries: list[FileEntry] = []
    with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6, allowZip64=True) as archive:
        for local_path, relative in files:
            archive.write(local_path, relative)
            entries.append(FileEntry(relative, sha256_file(local_path), local_path.stat().st_size, phase_for(relative)))
    manifest = {
        "schema": 1,
        "canonical": CANONICAL_URL,
        "source": "public dist overlay",
        "files": [entry.__dict__ for entry in entries],
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    validate_package(archive_path, manifest_path)
    return entries


def validate_package(archive_path: Path, manifest_path: Path) -> list[FileEntry]:
    try:
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
        records = payload["files"]
    except (OSError, UnicodeError, json.JSONDecodeError, KeyError, TypeError) as exc:
        raise DeployError("Cannot read generated SHA-256 manifest") from exc
    if payload.get("schema") != 1 or payload.get("canonical") != CANONICAL_URL or not isinstance(records, list) or not records:
        raise DeployError("Invalid generated manifest header or empty file list")
    entries: list[FileEntry] = []
    by_path: dict[str, FileEntry] = {}
    seen: set[str] = set()
    for item in records:
        if not isinstance(item, dict) or set(item) != {"path", "sha256", "size", "phase"}:
            raise DeployError("Manifest records must contain path, sha256, size, and phase")
        path = validate_relative_path(item["path"])
        if path in seen:
            raise DeployError(f"Duplicate manifest path: {path}")
        seen.add(path)
        if not isinstance(item["sha256"], str) or not HEX_SHA256.fullmatch(item["sha256"]):
            raise DeployError(f"Invalid SHA-256 for {path}")
        if type(item["size"]) is not int or item["size"] < 0 or item["phase"] != phase_for(path):
            raise DeployError(f"Invalid size or phase for {path}")
        entry = FileEntry(path, item["sha256"], item["size"], item["phase"])
        entries.append(entry)
        by_path[path] = entry
    try:
        with zipfile.ZipFile(archive_path, "r") as archive:
            if archive.testzip() is not None:
                raise DeployError("Archive CRC validation failed")
            names = archive.namelist()
            if len(names) != len(set(names)) or set(names) != seen:
                raise DeployError("Archive members do not exactly match the SHA-256 manifest")
            for info in archive.infolist():
                if info.is_dir():
                    raise DeployError("Explicit directory entries are not allowed in archive")
                mode = info.external_attr >> 16
                if mode and (mode & 0o170000) == 0o120000:
                    raise DeployError(f"Symlink entry is not allowed: {info.filename}")
                validate_relative_path(info.filename)
                digest = hashlib.sha256()
                size = 0
                with archive.open(info, "r") as handle:
                    for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                        digest.update(chunk)
                        size += len(chunk)
                expected = by_path[info.filename]
                if digest.hexdigest() != expected.sha256 or size != expected.size:
                    raise DeployError(f"Archive payload does not match manifest: {info.filename}")
    except (OSError, zipfile.BadZipFile, RuntimeError) as exc:
        if isinstance(exc, DeployError):
            raise
        raise DeployError("Cannot validate archive contents") from exc
    return entries


def php_literal(value: str) -> str:
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


def helper_source(
    archive_name: str,
    manifest_name: str,
    token: str,
    nonce: str,
    private_root: str | None = None,
    managed_private_root: bool = False,
) -> bytes:
    q_archive = php_literal(archive_name)
    q_manifest = php_literal(manifest_name)
    q_token = php_literal(token)
    q_nonce = php_literal(nonce)
    q_private_root = "null" if private_root is None else php_literal(private_root)
    q_managed_private_root = "true" if managed_private_root else "false"
    return f'''<?php
declare(strict_types=1);
ignore_user_abort(true);
@set_time_limit(0);
header('Content-Type: application/json; charset=utf-8');

function reply_json(array $data, int $status = 200): void {{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') reply_json(['ok'=>false,'error'=>'POST required'], 405);
$expectedToken = {q_token};
if (!isset($_POST['token']) || !is_string($_POST['token']) || !hash_equals($expectedToken, $_POST['token'])) reply_json(['ok'=>false,'error'=>'Forbidden'], 403);
$action = $_POST['action'] ?? 'apply';
if (!is_string($action) || !in_array($action, ['apply','status','cleanup-status','export-backup','cleanup-private-storage'], true)) reply_json(['ok'=>false,'state'=>'refused','error'=>'Unknown helper action'], 400);

$root = realpath(__DIR__);
$privateRootConfigured = {q_private_root};
$managedPrivateRoot = {q_managed_private_root};
$privateParent = $managedPrivateRoot ? realpath(sys_get_temp_dir()) : false;
$managedBasePath = ($privateParent !== false) ? $privateParent . DIRECTORY_SEPARATOR . 'kurerok-deploy-private-' . {q_nonce} : false;
$privateBase = $root === false ? false : ($managedPrivateRoot ? (is_dir((string)$managedBasePath) ? realpath((string)$managedBasePath) : false) : ($privateRootConfigured === null ? realpath(dirname($root)) : realpath($privateRootConfigured)));
$privateBaseError = null;
if ($managedPrivateRoot) {{
    if ($root === false || $privateParent === false || !is_dir($privateParent) || !is_writable($privateParent)) {{
        $privateBaseError = 'Managed private parent is unavailable';
    }} elseif (inside_path($privateParent, $root)) {{
        $privateBaseError = 'Managed private parent must be outside and separate from document root';
    }} elseif ($privateBase === false && $action !== 'apply') {{
        $privateBaseError = 'Managed private storage is unavailable';
    }} elseif ($privateBase !== false && (is_link((string)$managedBasePath) || $privateBase !== $managedBasePath || inside_path($privateBase, $root))) {{
        $privateBaseError = 'Managed private storage is not a canonical separate directory';
    }} elseif ($privateBase !== false) {{
        $privateMode = @fileperms($privateBase);
        $privateOwner = @fileowner($privateBase);
        $processOwner = function_exists('posix_geteuid') ? @posix_geteuid() : @fileowner($root);
        if ($privateMode === false || ($privateMode & 0777) !== 0700) $privateBaseError = 'Managed private storage permissions must be exactly 0700';
        elseif ($privateOwner === false || $processOwner === false || $privateOwner !== $processOwner) $privateBaseError = 'Managed private storage must be owned by the PHP account';
        elseif (!is_writable($privateBase)) $privateBaseError = 'Managed private storage is not writable';
        elseif ($action === 'apply') reply_json(['ok'=>false,'state'=>'refused','error'=>'Managed private storage already exists; refusing duplicate apply'], 409);
    }} elseif ($action === 'apply') {{
        $previousUmask = umask(0077);
        $managedCreated = !file_exists((string)$managedBasePath) && !is_link((string)$managedBasePath) && @mkdir((string)$managedBasePath, 0700);
        umask($previousUmask);
        if (!$managedCreated) {{
            $privateBaseError = 'Cannot create unique managed private storage';
        }} else {{
            $privateBase = realpath((string)$managedBasePath);
            $privateMode = $privateBase === false ? false : @fileperms($privateBase);
            $privateOwner = $privateBase === false ? false : @fileowner($privateBase);
            $processOwner = function_exists('posix_geteuid') ? @posix_geteuid() : @fileowner($root);
            if ($privateBase === false || $privateBase !== $managedBasePath || $privateMode === false || ($privateMode & 0777) !== 0700 || $privateOwner === false || $processOwner === false || $privateOwner !== $processOwner || !is_writable($privateBase)) $privateBaseError = 'Created managed private storage failed ownership or permission checks';
        }}
    }}
}} elseif ($privateRootConfigured !== null) {{
    if (!is_string($privateRootConfigured) || $privateRootConfigured === '' || $privateRootConfigured[0] !== '/' || str_contains($privateRootConfigured, "\\\\") || preg_match('/[\\x00-\\x1f\\x7f]/', $privateRootConfigured) || preg_match('#(?:^|/)\\.{{1,2}}(?:/|$)#', $privateRootConfigured) || str_contains($privateRootConfigured, '//') || str_ends_with($privateRootConfigured, '/')) {{
        $privateBaseError = 'Explicit private root must be a canonical absolute path';
    }} elseif ($root === false || $privateBase === false || !is_dir($privateRootConfigured) || is_link($privateRootConfigured) || $privateBase !== $privateRootConfigured) {{
        $privateBaseError = 'Explicit private root must exist as a canonical non-symlink directory';
    }} elseif (inside_path($privateBase, $root) || inside_path($root, $privateBase)) {{
        $privateBaseError = 'Explicit private root must be outside and separate from document root';
    }} else {{
        $privateMode = @fileperms($privateBase);
        $privateOwner = @fileowner($privateBase);
        $documentOwner = @fileowner($root);
        $processOwner = function_exists('posix_geteuid') ? @posix_geteuid() : $documentOwner;
        if ($privateMode === false || ($privateMode & 0777) !== 0700) {{
            $privateBaseError = 'Explicit private root permissions must be exactly 0700';
        }} elseif ($privateOwner === false || $processOwner === false || $privateOwner !== $processOwner) {{
            $privateBaseError = 'Explicit private root must be owned by the PHP account';
        }} elseif (!is_writable($privateBase)) {{
            $privateBaseError = 'Explicit private root is not writable by the PHP process';
        }}
    }}
}}
$archivePath = __DIR__ . DIRECTORY_SEPARATOR . {q_archive};
$manifestPath = __DIR__ . DIRECTORY_SEPARATOR . {q_manifest};
$nonce = {q_nonce};
$privatePathIsSeparate = $managedPrivateRoot
    ? ($root !== false && $privateBase !== false && !inside_path((string)$privateBase, $root))
    : ($privateRootConfigured === null
    ? ($root !== false && !inside_path((string)$privateBase, $root))
    : ($root !== false && !inside_path((string)$privateBase, $root) && !inside_path($root, (string)$privateBase)));
$privatePathsAllowed = $privateBase !== false && $privateBaseError === null && $privatePathIsSeparate;
$stage = $privatePathsAllowed ? $privateBase . DIRECTORY_SEPARATOR . '.kurerok-stage-' . $nonce : false;
$backup = $privatePathsAllowed ? $privateBase . DIRECTORY_SEPARATOR . '.kurerok-backup-' . $nonce : false;
$statusPath = $privatePathsAllowed ? $privateBase . DIRECTORY_SEPARATOR . '.kurerok-status-' . $nonce . '.json' : false;
$attempted = [];
$createdDirs = [];
$backed = [];
$unused = [];
$mutationStarted = false;

function write_status(string $path, string $state, array $details = []): void {{
    if ($path === '') return;
    $payload = ['state'=>$state,'updated_at_utc'=>gmdate('Y-m-d\\TH:i:s\\Z')] + $details;
    $temporary = $path . '.tmp-' . bin2hex(random_bytes(6));
    if (@file_put_contents($temporary, json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), LOCK_EX) === false) return;
    @chmod($temporary, 0600);
    @rename($temporary, $path);
}}
if ($privateBaseError !== null && in_array($action, ['status','cleanup-status','export-backup','cleanup-private-storage'], true)) reply_json(['ok'=>false,'error'=>$privateBaseError], 400);
if (is_string($statusPath) && $action === 'status') {{
    if (!is_file($statusPath) || is_link($statusPath)) reply_json(['ok'=>false,'error'=>'No remote status is available'], 404);
    $statusRaw = @file_get_contents($statusPath);
    $status = $statusRaw === false ? null : json_decode($statusRaw, true);
    if (!is_array($status)) reply_json(['ok'=>false,'error'=>'Remote status is unreadable'], 500);
    reply_json($status);
}}
if (is_string($statusPath) && $action === 'cleanup-status') {{
    $statusRaw = is_file($statusPath) ? @file_get_contents($statusPath) : false;
    $status = $statusRaw === false ? null : json_decode($statusRaw, true);
    if (!is_array($status) || !in_array($status['state'] ?? '', ['complete','failed'], true)) reply_json(['ok'=>false,'error'=>'Status is not terminal'], 409);
    @unlink($statusPath);
    reply_json(['ok'=>true,'state'=>'status_removed']);
}}

function inside_path(string $path, string $parent): bool {{
    $p = rtrim(str_replace('\\\\', '/', $path), '/') . '/';
    $r = rtrim(str_replace('\\\\', '/', $parent), '/') . '/';
    return $p === $r || str_starts_with($p, $r);
}}
function safe_relative($path): bool {{
    if (!is_string($path) || $path === '' || str_contains($path, "\\\\") || str_contains($path, "\0") || preg_match('/[\\x00-\\x1f\\x7f]/', $path)) return false;
    if ($path[0] === '/' || preg_match('/^[A-Za-z]:/', $path)) return false;
    $parts = explode('/', $path);
    foreach ($parts as $part) if ($part === '' || $part === '.' || $part === '..') return false;
    if ($parts[0] === '.htaccess' || $parts[0] === '.well-known' || str_starts_with($parts[0], 'codex-deploy-') || in_array('.htaccess', $parts, true)) return false;
    foreach ($parts as $part) if (preg_match('/^\\.env(?:\\..*)?$|^(?:\\.netrc|\\.npmrc|\\.pypirc|credentials(?:\\..*)?)$|(?:^|[._-])(?:secret|secrets|credential|credentials)(?:[._-]|$)|\\.(?:pem|key|p12|pfx)$/i', $part)) return false;
    return true;
}}
function ensure_no_symlink_ancestors(string $root, string $relative, bool $allowMissingDirs, array &$createdDirs): string {{
    $parts = explode('/', $relative);
    $current = $root;
    $last = count($parts) - 1;
    $missingParent = false;
    foreach ($parts as $index => $part) {{
        $current .= DIRECTORY_SEPARATOR . $part;
        if ($index === $last) break;
        if ($missingParent) continue;
        if (is_link($current)) throw new RuntimeException('Symlink parent in target path');
        if (file_exists($current)) {{
            if (!is_dir($current)) throw new RuntimeException('Non-directory target parent');
        }} elseif ($allowMissingDirs) {{
            if (!@mkdir($current, 0755)) throw new RuntimeException('Cannot create public target directory');
            $createdDirs[] = $current;
            if (!@chmod($current, 0755) || (fileperms($current) & 0777) !== 0755) throw new RuntimeException('Cannot set public target directory readable permissions');
        }} else {{
            $missingParent = true;
        }}
    }}
    return $current;
}}
function remove_private_tree(string $path): void {{
    if (is_link($path) || is_file($path)) {{ @unlink($path); return; }}
    if (!is_dir($path)) return;
    $items = @scandir($path);
    if (!is_array($items)) return;
    foreach ($items as $item) if ($item !== '.' && $item !== '..') remove_private_tree($path . DIRECTORY_SEPARATOR . $item);
    @rmdir($path);
}}
function list_private_files(string $base): array {{
    $result = [];
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($base, FilesystemIterator::SKIP_DOTS));
    foreach ($iterator as $entry) {{
        if ($entry->isLink() || !$entry->isFile()) throw new RuntimeException('Unexpected non-file in private backup');
        $result[] = str_replace(DIRECTORY_SEPARATOR, '/', substr($entry->getPathname(), strlen($base) + 1));
    }}
    sort($result, SORT_STRING);
    return $result;
}}
if ($privateBaseError === null && is_string($backup) && $action === 'export-backup') {{
    try {{
        $statusRaw = is_file((string)$statusPath) ? @file_get_contents((string)$statusPath) : false;
        $status = $statusRaw === false ? null : json_decode($statusRaw, true);
        if (!is_array($status) || ($status['state'] ?? '') !== 'complete' || !is_dir((string)$backup) || is_link((string)$backup)) throw new RuntimeException('Completed private backup is unavailable');
        $manifestPathPrivate = $backup . DIRECTORY_SEPARATOR . 'backup-manifest.json';
        $manifestRaw = @file_get_contents($manifestPathPrivate);
        $backupManifest = $manifestRaw === false ? null : json_decode($manifestRaw, true);
        if (!is_array($backupManifest) || !isset($backupManifest['files']) || !is_array($backupManifest['files'])) throw new RuntimeException('Private backup manifest is unreadable');
        $expectedPayload = [];
        foreach ($backupManifest['files'] as $relative => $record) {{
            if (!safe_relative($relative) || !is_array($record) || !isset($record['was_missing'])) throw new RuntimeException('Private backup manifest contains an invalid record');
            if ($record['was_missing'] === true) continue;
            if (($record['was_missing'] ?? null) !== false || ($record['backup'] ?? null) !== str_replace('/', DIRECTORY_SEPARATOR, $relative) || !is_string($record['sha256'] ?? null) || !preg_match('/^[a-f0-9]{{64}}$/', $record['sha256']) || !is_int($record['size'] ?? null) || $record['size'] < 0) throw new RuntimeException('Private backup record is invalid');
            $file = $backup . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative);
            if (is_link($file) || !is_file($file) || filesize($file) !== $record['size'] || hash_file('sha256', $file) !== $record['sha256']) throw new RuntimeException('Private backup file failed hash verification');
            $expectedPayload[$relative] = $file;
        }}
        $actual = list_private_files((string)$backup);
        $expected = array_keys($expectedPayload); $expected[] = 'backup-manifest.json'; sort($expected, SORT_STRING);
        if ($actual !== $expected) throw new RuntimeException('Private backup contains unexpected or missing files');
        $exportPath = $privateBase . DIRECTORY_SEPARATOR . '.kurerok-export-' . $nonce . '.zip';
        if (file_exists($exportPath) || is_link($exportPath)) throw new RuntimeException('Private backup export already exists');
        $zip = new ZipArchive();
        if ($zip->open($exportPath, ZipArchive::CREATE | ZipArchive::EXCL) !== true) throw new RuntimeException('Cannot create private backup export');
        if (!$zip->addFile($manifestPathPrivate, '__kurerok_backup_manifest__.json')) throw new RuntimeException('Cannot add backup manifest to export');
        foreach ($expectedPayload as $relative => $file) if (!$zip->addFile($file, $relative)) throw new RuntimeException('Cannot add backup payload to export');
        if (!$zip->close()) throw new RuntimeException('Cannot finalize private backup export');
        @chmod($exportPath, 0600);
        $exportHash = hash_file('sha256', $exportPath);
        if ($exportHash === false) throw new RuntimeException('Cannot verify private backup export');
        $status['export_sha256'] = $exportHash;
        $status['export_bytes'] = filesize($exportPath);
        write_status((string)$statusPath, 'complete', $status);
        header('Content-Type: application/zip');
        header('Content-Length: ' . (string)filesize($exportPath));
        header('X-Backup-SHA256: ' . $exportHash);
        header('Cache-Control: no-store, private');
        readfile($exportPath);
        @unlink($exportPath);
        exit;
    }} catch (Throwable $error) {{
        if (isset($zip) && $zip instanceof ZipArchive) @$zip->close();
        if (isset($exportPath)) @unlink($exportPath);
        reply_json(['ok'=>false,'state'=>'failed','error'=>get_class($error),'message'=>substr($error->getMessage(),0,300)], 500);
    }}
}}
if ($privateBaseError === null && is_string($backup) && $action === 'cleanup-private-storage') {{
    try {{
        $statusRaw = is_file((string)$statusPath) ? @file_get_contents((string)$statusPath) : false;
        $status = $statusRaw === false ? null : json_decode($statusRaw, true);
        if (!is_array($status) || ($status['state'] ?? '') !== 'complete' || !isset($status['export_sha256']) || !is_string($_POST['export_sha256'] ?? null) || !hash_equals((string)$status['export_sha256'], (string)$_POST['export_sha256'])) throw new RuntimeException('Verified backup export receipt is required');
        if (is_dir((string)$stage) || is_link((string)$stage)) throw new RuntimeException('Unexpected private staging path remains');
        $exportPath = $privateBase . DIRECTORY_SEPARATOR . '.kurerok-export-' . $nonce . '.zip';
        if (file_exists($exportPath) || is_link($exportPath)) {{
            if (is_link($exportPath) || !is_file($exportPath) || hash_file('sha256', $exportPath) !== $status['export_sha256'] || !@unlink($exportPath)) throw new RuntimeException('Unexpected or unverifiable private export file remains');
        }}
        if ($managedPrivateRoot) {{
            $remaining = @scandir((string)$privateBase);
            if (!is_array($remaining) || array_diff($remaining, ['.','..',basename((string)$backup),basename((string)$statusPath)]) !== [] || array_diff(['.','..',basename((string)$backup),basename((string)$statusPath)], $remaining) !== []) throw new RuntimeException('Managed private storage contains unexpected files');
        }}
        if (is_dir((string)$backup) && !is_link((string)$backup)) remove_private_tree((string)$backup);
        elseif (file_exists((string)$backup) || is_link((string)$backup)) throw new RuntimeException('Unexpected private backup path type');
        if (is_file((string)$statusPath) && !is_link((string)$statusPath)) @unlink((string)$statusPath);
        if ($managedPrivateRoot) {{
            $remaining = @scandir((string)$privateBase);
            if (!is_array($remaining) || count(array_diff($remaining, ['.','..'])) !== 0 || !@rmdir((string)$privateBase)) throw new RuntimeException('Managed private storage contains unexpected files or could not be removed');
        }}
        reply_json(['ok'=>true,'state'=>'private_storage_removed','managed_private_root'=>$managedPrivateRoot]);
    }} catch (Throwable $error) {{
        reply_json(['ok'=>false,'state'=>'cleanup_failed','error'=>get_class($error),'message'=>substr($error->getMessage(),0,300)], 500);
    }}
}}
function atomic_copy(string $source, string $target, int $mode): void {{
    $tmp = $target . '.codex-tmp-' . bin2hex(random_bytes(8));
    if (!@copy($source, $tmp)) {{ @unlink($tmp); throw new RuntimeException('Cannot prepare atomic file replacement'); }}
    @chmod($tmp, $mode & 0777);
    if (!@rename($tmp, $target)) {{ @unlink($tmp); throw new RuntimeException('Atomic rename failed'); }}
}}
function rollback_files(string $root, string $backup, array $attempted, array $backed, array $createdDirs): array {{
    $errors = [];
    $unused = [];
    foreach (array_reverse($attempted) as $relative) {{
        try {{
            $target = ensure_no_symlink_ancestors($root, $relative, false, $unused);
            if (isset($backed[$relative])) {{
                $record = $backed[$relative];
                atomic_copy($backup . DIRECTORY_SEPARATOR . $record['backup'], $target, (int)$record['mode']);
                if (hash_file('sha256', $target) !== $record['sha256']) throw new RuntimeException('Rollback hash mismatch');
            }} else {{
                if (is_link($target)) throw new RuntimeException('Refusing to remove a changed symlink');
                if (is_file($target) && !@unlink($target)) throw new RuntimeException('Cannot remove newly created target');
            }}
        }} catch (Throwable $e) {{ $errors[] = $relative . ': ' . get_class($e); }}
    }}
    foreach (array_reverse($createdDirs) as $dir) @rmdir($dir);
    return $errors;
}}

try {{
    if ($privateBaseError !== null) throw new RuntimeException($privateBaseError);
    if ($root === false || $privateBase === false || $stage === false || $backup === false || !is_dir($root) || !is_writable($privateBase)) throw new RuntimeException('Private staging parent is unavailable');
    if (inside_path($stage, $root) || inside_path($backup, $root)) throw new RuntimeException('Private staging must be outside document root');
    if (!class_exists('ZipArchive')) throw new RuntimeException('ZipArchive unavailable');
    if (!is_file($archivePath) || !is_file($manifestPath) || is_link($archivePath) || is_link($manifestPath)) throw new RuntimeException('Temporary upload missing');
    @ini_set('max_execution_time', '0');
    @ini_set('memory_limit', '512M');
    $memorySetting = trim((string)ini_get('memory_limit'));
    $memoryBytes = -1;
    if ($memorySetting !== '-1' && preg_match('/^(\d+)\s*([KMG])?$/i', $memorySetting, $memoryMatch)) {{
        $memoryBytes = (int)$memoryMatch[1] * (strtoupper($memoryMatch[2] ?? '') === 'G' ? 1073741824 : (strtoupper($memoryMatch[2] ?? '') === 'M' ? 1048576 : (strtoupper($memoryMatch[2] ?? '') === 'K' ? 1024 : 1)));
    }}
    if ($memoryBytes !== -1 && $memoryBytes < 268435456) throw new RuntimeException('PHP memory_limit below 256 MiB; refusing large manifest deployment');
    $manifestRaw = file_get_contents($manifestPath);
    $manifest = $manifestRaw === false ? null : json_decode($manifestRaw, true);
    if (!is_array($manifest) || ($manifest['schema'] ?? null) !== 1 || ($manifest['canonical'] ?? null) !== {php_literal(CANONICAL_URL)} || !isset($manifest['files']) || !is_array($manifest['files']) || count($manifest['files']) === 0) throw new RuntimeException('Invalid SHA-256 manifest');
    $expected = [];
    foreach ($manifest['files'] as $item) {{
        if (!is_array($item) || !isset($item['path'],$item['sha256'],$item['size'],$item['phase']) || !safe_relative($item['path']) || !is_string($item['sha256']) || !preg_match('/^[a-f0-9]{{64}}$/', $item['sha256']) || !is_int($item['size']) || $item['size'] < 0) throw new RuntimeException('Invalid manifest entry');
        $phase = (str_ends_with($item['path'], '.html') || str_ends_with($item['path'], '.htm')) ? 'html' : 'data_asset';
        if ($item['phase'] !== $phase || isset($expected[$item['path']])) throw new RuntimeException('Invalid phase or duplicate manifest path');
        $expected[$item['path']] = $item;
    }}

    // Conservative capacity gate before stage/backup creation or public mutation.
    $stageBytes = 0; $backupEstimate = 0; $maxAtomicBytes = 0;
    foreach ($manifest['files'] as $item) {{
        $target = ensure_no_symlink_ancestors($root, $item['path'], false, $unused);
        if (is_link($target) || (file_exists($target) && !is_file($target))) throw new RuntimeException('Unsafe target type during disk preflight');
        $stageBytes += $item['size'];
        $exists = is_file($target);
        $oldHash = $exists ? hash_file('sha256', $target) : null;
        if ($exists && ($oldHash === false || ($bytes = filesize($target)) === false)) throw new RuntimeException('Cannot inspect existing target');
        $willChange = !$exists || $oldHash !== $item['sha256'];
        if ($willChange) {{
            $maxAtomicBytes = max($maxAtomicBytes, $item['size']);
            if ($exists) $backupEstimate += $bytes;
        }}
    }}
    $archiveBytes = filesize($archivePath);
    $privateFree = @disk_free_space($privateBase);
    $rootFree = @disk_free_space($root);
    $privateStat = @stat($privateBase); $rootStat = @stat($root);
    if ($archiveBytes === false || $privateFree === false || $rootFree === false || !is_array($privateStat) || !is_array($rootStat)) throw new RuntimeException('Cannot verify free disk space; refusing deployment');
    $sameDevice = $privateStat['dev'] === $rootStat['dev'];
    $margin = 268435456;
    // A verified local rollback ZIP is materialized transiently after publish,
    // so reserve a second backup-sized allowance before any public mutation.
    $privateNeeded = $stageBytes + (2 * $backupEstimate) + $margin + ($sameDevice ? $maxAtomicBytes : 0);
    $rootNeeded = $sameDevice ? 0 : $maxAtomicBytes + $margin;
    if ($privateFree < $privateNeeded || $rootFree < $rootNeeded) throw new RuntimeException('Insufficient verified free disk space for archive overlay, staging, backup, and atomic replacement');
    $space = ['archive_bytes'=>$archiveBytes,'stage_bytes'=>$stageBytes,'backup_upper_bound_bytes'=>$backupEstimate,'backup_export_upper_bound_bytes'=>$backupEstimate,'max_atomic_temp_bytes'=>$maxAtomicBytes,'safety_margin_bytes'=>$margin,'estimated_peak_footprint_bytes'=>$archiveBytes+$stageBytes+(2*$backupEstimate)+$maxAtomicBytes+$margin,'private_free_bytes'=>$privateFree,'root_free_bytes'=>$rootFree,'same_filesystem'=>$sameDevice,'php_memory_limit'=>$memorySetting,'php_max_execution_time'=>ini_get('max_execution_time')];
    write_status((string)$statusPath, 'running', ['phase'=>'disk_preflight','manifest_files'=>count($expected),'space'=>$space]);
    if (!@mkdir($stage, 0700)) throw new RuntimeException('Cannot create private stage directory');
    if (!@mkdir($backup, 0700)) throw new RuntimeException('Cannot create private backup directory');
    $zip = new ZipArchive();
    if ($zip->open($archivePath) !== true) throw new RuntimeException('Cannot open uploaded archive');
    if ($zip->numFiles !== count($expected)) throw new RuntimeException('Archive count differs from manifest');
    $staged = [];
    for ($i = 0; $i < $zip->numFiles; $i++) {{
        $name = $zip->getNameIndex($i);
        if (!safe_relative($name) || !isset($expected[$name]) || isset($staged[$name])) throw new RuntimeException('Archive contains an unexpected path');
        $entryStat = $zip->statIndex($i);
        if (!is_array($entryStat) || ($entryStat['size'] ?? null) !== $expected[$name]['size']) throw new RuntimeException('Archive size differs from manifest');
        $ops = 0; $attrs = 0;
        if ($zip->getExternalAttributesIndex($i, $ops, $attrs) && (($attrs >> 16) & 0170000) === 0120000) throw new RuntimeException('Symlink archive entry rejected');
        $destination = $stage . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $name);
        $parent = dirname($destination);
        if (!is_dir($parent) && !@mkdir($parent, 0700, true)) throw new RuntimeException('Cannot create staged directory');
        $input = $zip->getStream($name);
        if ($input === false) throw new RuntimeException('Cannot read archive member');
        $output = @fopen($destination, 'xb');
        if ($output === false) {{ fclose($input); throw new RuntimeException('Cannot create staged file'); }}
        $hash = hash_init('sha256'); $size = 0;
        while (!feof($input)) {{
            $chunk = fread($input, 1048576);
            if ($chunk === false) {{ fclose($input); fclose($output); throw new RuntimeException('Cannot read archive data'); }}
            if ($chunk === '') continue;
            hash_update($hash, $chunk); $size += strlen($chunk);
            if (fwrite($output, $chunk) !== strlen($chunk)) {{ fclose($input); fclose($output); throw new RuntimeException('Cannot write staged file'); }}
        }}
        fclose($input); fclose($output); @chmod($destination, 0644);
        $item = $expected[$name];
        if (hash_final($hash) !== $item['sha256'] || $size !== $item['size']) throw new RuntimeException('Staged file hash or size mismatch');
        $staged[$name] = true;
    }}
    $zip->close();
    if (count($staged) !== count($expected)) throw new RuntimeException('Archive did not contain every manifest file');

    // Discover and hash every target before making a backup or public change.
    $plan = [];
    foreach ($manifest['files'] as $item) {{
        $target = ensure_no_symlink_ancestors($root, $item['path'], false, $unused);
        if (is_link($target)) throw new RuntimeException('Symlink destination rejected');
        if (file_exists($target) && !is_file($target)) throw new RuntimeException('Target exists but is not a regular file');
        $exists = is_file($target);
        $oldHash = $exists ? hash_file('sha256', $target) : null;
        if ($exists && $oldHash === false) throw new RuntimeException('Cannot hash existing target');
        $plan[$item['path']] = ['exists'=>$exists,'changed'=>!$exists || $oldHash !== $item['sha256'],'mode'=>$exists ? (fileperms($target) & 0777) : 0644,'old_hash'=>$oldHash];
    }}
    $changed = array_filter($plan, fn($p) => $p['changed']);
    write_status((string)$statusPath, 'running', ['phase'=>'backing_up','manifest_files'=>count($expected),'backup_location'=>$backup,'space'=>$space]);
    $backupRecords = [];
    foreach ($changed as $relative => $state) {{
        if (!$state['exists']) {{ $backupRecords[$relative] = ['was_missing'=>true]; continue; }}
        $target = ensure_no_symlink_ancestors($root, $relative, false, $unused);
        $backupFile = $backup . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative);
        if (!is_dir(dirname($backupFile)) && !@mkdir(dirname($backupFile), 0700, true)) throw new RuntimeException('Cannot create backup directory');
        if (!@copy($target, $backupFile)) throw new RuntimeException('Cannot back up existing target');
        @chmod($backupFile, 0600);
        $backupHash = hash_file('sha256', $backupFile);
        if ($backupHash === false || $backupHash !== $state['old_hash']) throw new RuntimeException('Backup readback hash mismatch');
        $backupRecords[$relative] = ['was_missing'=>false,'backup'=>str_replace('/', DIRECTORY_SEPARATOR, $relative),'sha256'=>$backupHash,'size'=>filesize($backupFile),'mode'=>$state['mode']];
        $backed[$relative] = $backupRecords[$relative];
    }}
    $backupManifest = ['created_at_utc'=>gmdate('Y-m-d\\TH:i:s\\Z'),'files'=>(object)$backupRecords];
    $backupManifestPath = $backup . DIRECTORY_SEPARATOR . 'backup-manifest.json';
    if (file_put_contents($backupManifestPath, json_encode($backupManifest, JSON_UNESCAPED_SLASHES)) === false) throw new RuntimeException('Cannot write private backup manifest');
    @chmod($backupManifestPath, 0600);
    write_status((string)$statusPath, 'running', ['phase'=>'backup_complete','manifest_files'=>count($expected),'changed_files'=>count($changed),'backup_location'=>$backup,'space'=>$space]);

    if (count($changed) === 0) {{
        remove_private_tree($stage);
        if (!$managedPrivateRoot) remove_private_tree($backup);
        $done = ['ok'=>true,'state'=>'complete','counts'=>['manifest_files'=>count($expected),'updated_files'=>0,'unchanged_files'=>count($expected),'readback_files'=>count($expected),'backed_up_existing'=>0,'new_targets'=>0],'backup_location'=>$managedPrivateRoot ? $backup : null,'space'=>$space];
        write_status((string)$statusPath, 'complete', $done);
        reply_json($done);
    }}

    $ordered = array_keys($changed);
    usort($ordered, function($a,$b) use ($expected) {{
        $pa = $expected[$a]['phase'] === 'html' ? 1 : 0; $pb = $expected[$b]['phase'] === 'html' ? 1 : 0;
        return $pa <=> $pb ?: strcmp($a,$b);
    }});
    foreach ($ordered as $publishIndex => $relative) {{
        $source = $stage . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative);
        $target = ensure_no_symlink_ancestors($root, $relative, true, $createdDirs);
        $attempted[] = $relative; $mutationStarted = true;
        if ($publishIndex === 0 || ($publishIndex + 1) % 50 === 0 || $publishIndex + 1 === count($ordered)) write_status((string)$statusPath, 'running', ['phase'=>'publishing','attempted_files'=>count($attempted),'total_changed_files'=>count($changed),'backup_location'=>$backup,'space'=>$space]);
        atomic_copy($source, $target, $plan[$relative]['mode']);
    }}
    $checked = 0;
    foreach ($manifest['files'] as $item) {{
        $target = ensure_no_symlink_ancestors($root, $item['path'], false, $unused);
        if (!is_file($target) || hash_file('sha256', $target) !== $item['sha256']) throw new RuntimeException('Public readback hash mismatch');
        $checked++;
    }}
    remove_private_tree($stage);
    $done = ['ok'=>true,'state'=>'complete','counts'=>['manifest_files'=>count($expected),'updated_files'=>count($changed),'unchanged_files'=>count($expected)-count($changed),'readback_files'=>$checked,'backed_up_existing'=>count(array_filter($backupRecords,fn($r)=>!($r['was_missing']??false))),'new_targets'=>count(array_filter($backupRecords,fn($r)=>($r['was_missing']??false)))],'backup_location'=>$backup,'space'=>$space];
    write_status((string)$statusPath, 'complete', $done);
    reply_json($done);
}} catch (Throwable $error) {{
    $rollbackErrors = $mutationStarted ? rollback_files((string)$root, (string)$backup, $attempted, $backed, $createdDirs) : [];
    remove_private_tree((string)$stage);
    if (!$mutationStarted) remove_private_tree((string)$backup);
    $failure = ['ok'=>false,'state'=>'failed','error'=>get_class($error),'message'=>substr($error->getMessage(),0,400),'rollback_attempted'=>$mutationStarted,'rollback_errors'=>$rollbackErrors,'backup_location'=>is_dir((string)$backup) ? $backup : null];
    write_status((string)$statusPath, 'failed', $failure);
    reply_json($failure, 500);
}}
'''.encode("utf-8")


def ftp_connect(args: argparse.Namespace, password: str) -> ftplib.FTP:
    ftp: ftplib.FTP
    if args.ftp_tls:
        ftp = ftplib.FTP_TLS(context=ssl.create_default_context())
    else:
        ftp = ftplib.FTP()
    try:
        ftp.connect(args.ftp_host, args.ftp_port, timeout=args.ftp_timeout)
        ftp.login(args.ftp_user, password)
        if isinstance(ftp, ftplib.FTP_TLS):
            ftp.prot_p()
        ftp.set_pasv(True)
        if args.remote_root != "/":
            ftp.cwd(args.remote_root)
        return ftp
    except Exception:
        ftp.close()
        raise


def remote_read(ftp: ftplib.FTP, path: str) -> bytes:
    chunks: list[bytes] = []
    ftp.retrbinary(f"RETR {path}", chunks.append)
    return b"".join(chunks)


def check_remote_root(ftp: ftplib.FTP) -> tuple[str, int]:
    pwd = ftp.pwd()
    try:
        listing = ftp.nlst()
    except ftplib.all_errors as exc:
        raise DeployError("FTP root listing failed; refusing unverified root") from exc
    if not any(item.rstrip("/").split("/")[-1] == "index.html" for item in listing):
        raise DeployError("FTP root has no index.html; refusing unverified root")
    try:
        home = remote_read(ftp, "index.html")
    except ftplib.all_errors as exc:
        raise DeployError("Cannot read remote root index.html") from exc
    parser = CanonicalParser()
    parser.feed(home.decode("utf-8", errors="replace"))
    canonical_ok = any(href.rstrip("/") == CANONICAL_URL.rstrip("/") for href in parser.hrefs)
    if not canonical_ok:
        raise DeployError("Remote index.html lacks canonical https://kurerok.ru/; refusing target root")
    return pwd, len(listing)


def ftp_store_file(ftp: ftplib.FTP, name: str, path: Path) -> None:
    size = path.stat().st_size
    progress = 25 * 1024 * 1024
    next_report = progress
    transferred = 0

    def report(block: bytes) -> None:
        nonlocal transferred, next_report
        transferred += len(block)
        if transferred >= next_report:
            print(json.dumps({"phase":"upload_progress","remote_name":name,"uploaded_bytes":transferred,"total_bytes":size},separators=(",",":")),flush=True)
            next_report += progress

    with path.open("rb") as handle:
        ftp.storbinary(f"STOR {name}", handle, blocksize=1024 * 1024, callback=report)
    print(json.dumps({"phase":"upload_complete","remote_name":name,"uploaded_bytes":transferred,"total_bytes":size},separators=(",",":")),flush=True)


def http_post(args: argparse.Namespace, helper_name: str, token: str, action: str = "apply") -> dict[str, Any]:
    request = urllib.request.Request(
        args.base_url.rstrip("/") + "/" + urllib.parse.quote(helper_name),
        data=urllib.parse.urlencode({"token": token, "action": action}).encode("ascii"),
        headers={"Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Kurerok-Reviewed-Site-Deploy/1.0"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=min(args.request_timeout, 30) if action != "apply" else args.request_timeout) as response:
            body = response.read(2_000_001)
            status_code = response.status
    except urllib.error.HTTPError as exc:
        body = exc.read(2_000_001)
        status_code = exc.code
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise RemoteOutcomeUnknown(f"Remote helper connection ended ({type(exc).__name__}); checking private server status") from exc
    if len(body) > 2_000_000:
        raise RemoteOutcomeUnknown(f"Remote helper HTTP {status_code} response exceeded the diagnostic limit")
    try:
        result = json.loads(body.decode("utf-8"))
    except (UnicodeError, json.JSONDecodeError) as exc:
        if action == "apply":
            raise RemoteOutcomeUnknown(f"Remote helper HTTP {status_code} response was not valid JSON; checking private server status") from exc
        raise DeployError(f"Remote status endpoint returned invalid JSON (HTTP {status_code})") from exc
    if not isinstance(result, dict):
        raise RemoteOutcomeUnknown(f"Remote helper HTTP {status_code} response was not an object; checking private server status")
    if status_code >= 400 and result.get("state") not in ("complete", "failed"):
        raise DeployError(f"Remote helper returned HTTP {status_code}: {json.dumps(result,ensure_ascii=False,separators=(',',':'))[:1000]}")
    return result


def http_post_form(args: argparse.Namespace, helper_name: str, token: str, action: str, extra: dict[str, str] | None = None) -> urllib.request.Request:
    fields = {"token": token, "action": action}
    if extra:
        fields.update(extra)
    return urllib.request.Request(
        args.base_url.rstrip("/") + "/" + urllib.parse.quote(helper_name),
        data=urllib.parse.urlencode(fields).encode("ascii"),
        headers={"Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Kurerok-Reviewed-Site-Deploy/1.0"},
        method="POST",
    )


def export_backup(args: argparse.Namespace, helper_name: str, token: str, nonce: str, entries: list[FileEntry], expected_counts: dict[str, Any]) -> tuple[Path, Path, str]:
    backup_dir = prepare_backup_dir(args.backup_dir)
    archive_path = backup_dir / f"timeweb-backup-{nonce}.zip"
    manifest_path = backup_dir / f"timeweb-backup-{nonce}.json"
    partial_path = backup_dir / f".{archive_path.name}.part"
    request = http_post_form(args, helper_name, token, "export-backup")
    try:
        with urllib.request.urlopen(request, timeout=args.request_timeout) as response:
            content_type = response.headers.get_content_type()
            server_hash = response.headers.get("X-Backup-SHA256", "")
            if content_type != "application/zip" or not HEX_SHA256.fullmatch(server_hash):
                raise DeployError("Private backup export response lacks its verified ZIP metadata")
            digest = hashlib.sha256()
            with partial_path.open("xb") as output:
                while True:
                    block = response.read(1024 * 1024)
                    if not block:
                        break
                    output.write(block)
                    digest.update(block)
                output.flush()
                os.fsync(output.fileno())
    except urllib.error.HTTPError as exc:
        details = exc.read(4096).decode("utf-8", errors="replace")
        partial_path.unlink(missing_ok=True)
        raise DeployError(f"Private backup export failed (HTTP {exc.code}): {details[:500]}") from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        partial_path.unlink(missing_ok=True)
        raise DeployError(f"Private backup export outcome is unknown ({type(exc).__name__}); do not reapply") from exc
    actual_hash = digest.hexdigest()
    if actual_hash != server_hash:
        partial_path.unlink(missing_ok=True)
        raise DeployError("Downloaded private backup ZIP differs from its authenticated server hash")
    try:
        payload = verify_backup_archive(partial_path, entries, expected_counts)
    except Exception:
        partial_path.unlink(missing_ok=True)
        raise
    os.replace(partial_path, archive_path)
    manifest_path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    receipt = {
        "schema": 1,
        "canonical": CANONICAL_URL,
        "archive": archive_path.name,
        "archive_sha256": actual_hash,
        "archive_bytes": archive_path.stat().st_size,
        "manifest": manifest_path.name,
        "manifest_sha256": sha256_file(manifest_path),
        "backed_up_files": sum(not record.get("was_missing", False) for record in payload["files"].values()),
        "new_targets": sum(bool(record.get("was_missing", False)) for record in payload["files"].values()),
        "verification": "all backup payload hashes, sizes, paths, and ZIP CRC passed",
    }
    (backup_dir / f"timeweb-backup-{nonce}-receipt.json").write_text(json.dumps(receipt, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return archive_path, manifest_path, actual_hash


def verify_backup_archive(archive_path: Path, deployed_entries: list[FileEntry], expected_counts: dict[str, Any] | None = None) -> dict[str, Any]:
    expected_deployed = {entry.path for entry in deployed_entries}
    try:
        with zipfile.ZipFile(archive_path, "r") as archive:
            if archive.testzip() is not None:
                raise DeployError("Private backup ZIP CRC verification failed")
            names = archive.namelist()
            manifest_name = "__kurerok_backup_manifest__.json"
            if len(names) != len(set(names)) or names.count(manifest_name) != 1:
                raise DeployError("Private backup ZIP has duplicate or missing manifest")
            if any(name != manifest_name and name not in expected_deployed for name in names):
                raise DeployError("Private backup ZIP contains a path outside the deployment manifest")
            payload = json.loads(archive.read(manifest_name).decode("utf-8"))
            records = payload.get("files") if isinstance(payload, dict) else None
            if not isinstance(records, dict) or not set(records).issubset(expected_deployed):
                raise DeployError("Private backup manifest contains a target outside the deployment manifest")
            expected_payload = set()
            for path, record in records.items():
                validate_relative_path(path)
                if not isinstance(record, dict) or type(record.get("was_missing")) is not bool:
                    raise DeployError("Private backup manifest contains an invalid record")
                if record["was_missing"]:
                    if set(record) != {"was_missing"}:
                        raise DeployError("New-target backup record contains unexpected fields")
                    continue
                if set(record) != {"was_missing", "backup", "sha256", "size", "mode"} or record["backup"] != path:
                    raise DeployError("Existing-target backup record has an invalid layout")
                if not isinstance(record["sha256"], str) or not HEX_SHA256.fullmatch(record["sha256"]):
                    raise DeployError("Existing-target backup record has invalid SHA-256")
                if type(record["size"]) is not int or record["size"] < 0 or type(record["mode"]) is not int:
                    raise DeployError("Existing-target backup record has invalid size or mode")
                expected_payload.add(path)
                digest = hashlib.sha256()
                size = 0
                with archive.open(path, "r") as handle:
                    for block in iter(lambda: handle.read(1024 * 1024), b""):
                        digest.update(block)
                        size += len(block)
                if size != record["size"] or digest.hexdigest() != record["sha256"]:
                    raise DeployError(f"Private backup payload failed hash verification: {path}")
            if expected_counts is not None:
                expected_updated = expected_counts.get("updated_files")
                expected_existing = expected_counts.get("backed_up_existing")
                expected_new = expected_counts.get("new_targets")
                actual_existing = sum(not record.get("was_missing", False) for record in records.values())
                actual_new = sum(bool(record.get("was_missing", False)) for record in records.values())
                if (
                    type(expected_updated) is not int
                    or type(expected_existing) is not int
                    or type(expected_new) is not int
                    or len(records) != expected_updated
                    or actual_existing != expected_existing
                    or actual_new != expected_new
                ):
                    raise DeployError("Private backup manifest record counts differ from the authenticated completed deploy result")
            if set(names) != expected_payload | {manifest_name}:
                raise DeployError("Private backup ZIP members do not match its manifest")
            return payload
    except (OSError, UnicodeError, json.JSONDecodeError, zipfile.BadZipFile, RuntimeError, KeyError, TypeError) as exc:
        if isinstance(exc, DeployError):
            raise
        raise DeployError("Cannot validate downloaded private backup archive") from exc


def cleanup_managed_storage(args: argparse.Namespace, helper_name: str, token: str, archive_hash: str) -> dict[str, Any]:
    request = http_post_form(args, helper_name, token, "cleanup-private-storage", {"export_sha256": archive_hash})
    try:
        with urllib.request.urlopen(request, timeout=min(args.request_timeout, 60)) as response:
            result = json.loads(response.read(4096).decode("utf-8"))
    except urllib.error.HTTPError as exc:
        details = exc.read(4096).decode("utf-8", errors="replace")
        raise DeployError(f"Verified backup was saved locally, but remote private cleanup failed (HTTP {exc.code}): {details[:400]}") from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise DeployError(f"Verified backup was saved locally; remote cleanup outcome is unknown ({type(exc).__name__})") from exc
    if not isinstance(result, dict) or not result.get("ok") or result.get("state") != "private_storage_removed":
        raise DeployError("Verified backup was saved locally, but remote private cleanup was not confirmed")
    return result


def poll_remote_status(args: argparse.Namespace, helper_name: str, token: str) -> dict[str, Any] | None:
    deadline = time.monotonic() + args.status_poll_timeout
    last_state: str | None = None
    while time.monotonic() < deadline:
        try:
            result = http_post(args, helper_name, token, "status")
            state = result.get("state")
            if state in ("complete", "failed"):
                return result
            if isinstance(state, str) and state != last_state:
                print(json.dumps({"phase":"remote_status_pending","state":state,"remote_phase":result.get("phase"),"attempted_files":result.get("attempted_files"),"total_changed_files":result.get("total_changed_files")},separators=(",",":")),flush=True)
                last_state = state
        except DeployError:
            # The helper may not yet have started, or the hosting endpoint may
            # be briefly unavailable. Never repeat the apply POST.
            pass
        time.sleep(min(args.status_poll_interval, max(0, deadline - time.monotonic())))
    return None


def try_cleanup_remote(ftp: ftplib.FTP, names: list[str]) -> list[str]:
    failures: list[str] = []
    for name in names:
        try:
            ftp.delete(name)
        except ftplib.error_perm as exc:
            if not str(exc).startswith("550"):
                failures.append(name)
        except ftplib.all_errors:
            failures.append(name)
    return failures


def password_from_env(name: str) -> str:
    if not ENV_NAME.fullmatch(name):
        raise DeployError("--ftp-password-env must be a valid environment variable name")
    value = os.environ.get(name)
    if not value:
        raise DeployError(f"FTP password environment variable {name} is unset or empty")
    return value


def prepare_backup_dir(path: Path) -> Path:
    """Create/check the empty local rollback destination before remote mutation."""
    try:
        path.mkdir(mode=0o700, parents=True, exist_ok=True)
        if path.is_symlink() or not path.is_dir() or not os.access(path, os.W_OK | os.X_OK):
            raise DeployError("--backup-dir must be a writable real local directory")
        if any(path.iterdir()):
            raise DeployError("--backup-dir must be empty so backup evidence cannot overwrite prior files")
        return path
    except OSError as exc:
        raise DeployError("Cannot prepare empty writable --backup-dir before deployment") from exc


def apply_remote(args: argparse.Namespace, archive_path: Path, manifest_path: Path, entries: list[FileEntry]) -> int:
    if not args.ftp_host or not args.ftp_user:
        raise DeployError("--apply requires --ftp-host and --ftp-user")
    parsed_base = urllib.parse.urlparse(args.base_url)
    if parsed_base.scheme != "https" or parsed_base.hostname != "kurerok.ru" or parsed_base.path not in ("", "/"):
        raise DeployError("--base-url must be exactly the canonical HTTPS site origin https://kurerok.ru/")
    if args.managed_private_root:
        prepare_backup_dir(args.backup_dir)
    password = password_from_env(args.ftp_password_env)
    nonce = secrets.token_hex(18)
    token = secrets.token_urlsafe(32)
    archive_name = f"codex-deploy-{nonce}.zip"
    manifest_name = f"codex-deploy-{nonce}.json"
    helper_name = f"codex-deploy-{nonce}.php"
    helper = helper_source(archive_name, manifest_name, token, nonce, args.private_root, args.managed_private_root)
    ftp = ftp_connect(args, password)
    remote_names: list[str] = []
    terminal_known = True
    apply_started = False
    try:
        root_pwd, listing_count = check_remote_root(ftp)
        existing_names = {item.rstrip("/").split("/")[-1] for item in ftp.nlst()}
        if existing_names.intersection({archive_name, manifest_name, helper_name}):
            raise DeployError("Generated temporary remote name unexpectedly already exists")
        print(json.dumps({"phase":"remote_preflight_passed","remote_root":root_pwd,"root_entries":listing_count,"canonical":CANONICAL_URL,"manifest_files":len(entries)},ensure_ascii=False,separators=(",",":")))
        remote_names.append(archive_name)
        ftp_store_file(ftp, archive_name, archive_path)
        remote_names.append(manifest_name)
        ftp_store_file(ftp, manifest_name, manifest_path)
        remote_names.append(helper_name)
        from io import BytesIO
        ftp.storbinary(f"STOR {helper_name}", BytesIO(helper), blocksize=64 * 1024)
        print(json.dumps({"phase":"upload_complete","remote_name":helper_name,"uploaded_bytes":len(helper)},separators=(",",":")),flush=True)
        apply_started = True
        try:
            result = http_post(args, helper_name, token)
        except RemoteOutcomeUnknown as exc:
            terminal_known = False
            print(json.dumps({"phase":"remote_result_ambiguous","reason":str(exc),"status_poll_timeout_seconds":args.status_poll_timeout},ensure_ascii=False,separators=(",",":")),flush=True)
            status = poll_remote_status(args, helper_name, token)
            if status is None:
                print(json.dumps({"phase":"remote_state_unresolved","action":"no retry; temporary uploads preserved for inspection","temporary_names":remote_names},ensure_ascii=False,separators=(",",":")),file=sys.stderr,flush=True)
                return 3
            result = status
            terminal_known = True
        if result.get("state") not in ("complete", "failed"):
            # A valid HTTP response should be terminal. Treat any other shape
            # as ambiguous and consult status instead of repeating the apply.
            terminal_known = False
            status = poll_remote_status(args, helper_name, token)
            if status is None:
                print(json.dumps({"phase":"remote_state_unresolved","action":"no retry; temporary uploads preserved for inspection","temporary_names":remote_names},ensure_ascii=False,separators=(",",":")),file=sys.stderr,flush=True)
                return 3
            result = status
            terminal_known = True
        print(json.dumps({"phase":"remote_apply_result",**result},ensure_ascii=False,separators=(",",":")))
        if not result.get("ok"):
            return 1
        if args.managed_private_root:
            try:
                backup_archive, backup_manifest, backup_hash = export_backup(args, helper_name, token, nonce, entries, result["counts"])
                cleanup = cleanup_managed_storage(args, helper_name, token, backup_hash)
                print(json.dumps({
                    "phase":"verified_backup_saved_and_private_storage_removed",
                    "archive":str(backup_archive),
                    "manifest":str(backup_manifest),
                    "archive_sha256":backup_hash,
                    "cleanup":cleanup,
                },ensure_ascii=False,separators=(",",":")),flush=True)
            except DeployError:
                # Publication may already have completed. Preserve the private
                # server backup and never replay apply after an export/cleanup error.
                raise
        return 0
    finally:
        if terminal_known:
            if apply_started and not args.managed_private_root:
                try:
                    http_post(args, helper_name, token, "cleanup-status")
                except DeployError:
                    pass
            leftovers = try_cleanup_remote(ftp, remote_names)
            if leftovers:
                # Long-running PHP can outlive the FTP control connection. A
                # single reconnect is safe only after terminal status exists.
                retry_ftp: ftplib.FTP | None = None
                try:
                    retry_ftp = ftp_connect(args, password)
                    retry_root, _ = check_remote_root(retry_ftp)
                    if retry_root != root_pwd:
                        raise DeployError("Reconnected FTP session resolved to a different root")
                    leftovers = try_cleanup_remote(retry_ftp, leftovers)
                except Exception as exc:
                    print(json.dumps({"phase":"temporary_cleanup_reconnect_failed","error_type":type(exc).__name__,"remaining_names":leftovers},separators=(",",":")),file=sys.stderr,flush=True)
                finally:
                    if retry_ftp is not None:
                        try:
                            retry_ftp.quit()
                        except ftplib.all_errors:
                            retry_ftp.close()
            if leftovers:
                print(json.dumps({"phase":"temporary_cleanup_warning","remaining_names":leftovers},separators=(",",":")),file=sys.stderr,flush=True)
        else:
            print(json.dumps({"phase":"temporary_cleanup_deferred","reason":"remote helper may still be running","remaining_names":remote_names},separators=(",",":")),file=sys.stderr,flush=True)
        try:
            ftp.quit()
        except ftplib.all_errors:
            ftp.close()


def make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, default=Path("dist"), help="Public static build directory (default: dist)")
    parser.add_argument("--ftp-host", help="Verified Timeweb FTP hostname")
    parser.add_argument("--ftp-user", help="Scoped FTP username")
    parser.add_argument("--ftp-port", type=int, default=21)
    parser.add_argument("--ftp-password-env", default="TIMEWEB_FTP_PASSWORD", help="Environment variable name; value is never printed")
    parser.add_argument("--remote-root", default="/", help="FTP-scoped site document root")
    parser.add_argument("--private-root", type=validate_private_root_argument, help="Existing canonical remote directory, owned by the site owner, mode 0700, outside the document root")
    parser.add_argument("--managed-private-root", action="store_true", help="Create nonce-scoped 0700 private storage under PHP sys_get_temp_dir and remove it only after verified local backup export")
    parser.add_argument("--backup-dir", type=Path, help="Empty local directory for verified remote rollback ZIP, manifest, and receipt (required with --managed-private-root)")
    parser.add_argument("--ftp-tls", action=argparse.BooleanOptionalAction, default=True, help="Use explicit FTPS (default)")
    parser.add_argument("--ftp-timeout", type=int, default=120, help="Seconds for FTP connect/data operations")
    parser.add_argument("--base-url", default=CANONICAL_URL, help="Must remain canonical https://kurerok.ru/")
    parser.add_argument("--request-timeout", type=int, default=1800, help="Seconds to wait for the remote helper")
    parser.add_argument("--status-poll-timeout", type=int, default=600, help="Seconds to poll private status after an ambiguous apply result")
    parser.add_argument("--status-poll-interval", type=int, default=5, help="Seconds between private status checks")
    parser.add_argument("--apply", action="store_true", help="Upload and atomically overlay the reviewed dist build")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = make_parser().parse_args(argv)
    if args.private_root and args.managed_private_root:
        print("ERROR: --private-root and --managed-private-root are mutually exclusive", file=sys.stderr)
        return 2
    if args.managed_private_root and args.backup_dir is None:
        print("ERROR: --managed-private-root requires --backup-dir", file=sys.stderr)
        return 2
    if args.backup_dir is not None and not args.managed_private_root:
        print("ERROR: --backup-dir is supported only with --managed-private-root", file=sys.stderr)
        return 2
    if not 1 <= args.ftp_port <= 65535:
        print("ERROR: --ftp-port must be 1..65535", file=sys.stderr)
        return 2
    if args.request_timeout < 1:
        print("ERROR: --request-timeout must be positive", file=sys.stderr)
        return 2
    if args.status_poll_timeout < 1 or args.status_poll_interval < 1:
        print("ERROR: status polling timeout and interval must be positive", file=sys.stderr)
        return 2
    if args.ftp_timeout < 1:
        print("ERROR: --ftp-timeout must be positive", file=sys.stderr)
        return 2
    try:
        with tempfile.TemporaryDirectory(prefix="kurerok-site-package-") as temporary:
            temp = Path(temporary)
            archive_path = temp / "public-dist.zip"
            manifest_path = temp / "sha256-manifest.json"
            entries = build_package(args.source_dir, archive_path, manifest_path)
            raw_size = sum(entry.size for entry in entries)
            counts = {"files":len(entries),"html":sum(entry.phase == "html" for entry in entries),"data_assets":sum(entry.phase == "data_asset" for entry in entries),"raw_bytes":raw_size,"archive_bytes":archive_path.stat().st_size,"manifest_sha256":hashlib.sha256(manifest_path.read_bytes()).hexdigest()}
            if not args.apply:
                print(json.dumps({"status":"dry_run_local_only","source":str(args.source_dir.resolve()),"counts":counts,"remote_requests":0,"server_writes":0,"preserved":sorted(PRESERVED_ROOTS)},ensure_ascii=False,separators=(",",":")))
                return 0
            return apply_remote(args, archive_path, manifest_path, entries)
    except DeployError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    except (OSError, zipfile.BadZipFile) as exc:
        print(f"ERROR: local packaging failed ({type(exc).__name__})", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
