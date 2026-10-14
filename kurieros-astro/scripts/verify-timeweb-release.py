#!/usr/bin/env python3
"""Verify public release bytes against the exact artifact deployed by Actions."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import time
import urllib.error
import urllib.request


ORIGIN = "https://kurerok.ru"


def local_file(source: Path, path: str) -> Path:
    if not path.startswith("/") or path.startswith("//") or "\\" in path or "?" in path or "#" in path:
        raise ValueError("Expected a public absolute path without query or fragment")
    parts = path.strip("/").split("/") if path != "/" else []
    if any(part in ("", ".", "..") for part in parts):
        raise ValueError("Invalid public path")
    relative = PurePosixPath(*parts)
    if path.endswith("/"):
        relative /= "index.html"
    candidate = source.joinpath(*relative.parts)
    if candidate.is_symlink() or not candidate.is_file():
        raise ValueError(f"Missing regular release file for {path}")
    if not candidate.resolve().is_relative_to(source.resolve()):
        raise ValueError("Public path escapes release directory")
    return candidate


def release_paths(source: Path, baseline: Path) -> list[str]:
    paths = {
        "/", "/robots.txt", "/sitemap-index.xml", "/api/blog-release-manifest.json",
        "/vacancy-indexability.json", "/company-indexability.json",
    }
    arms = set()
    for row in json.loads(baseline.read_text())["cohorts"]:
        if row["arm"] not in arms:
            paths.add(row["path"])
            arms.add(row["arm"])
    if len(arms) != 8:
        raise ValueError("Expected all eight fixed title experiment groups")
    indexability = json.loads((source / "vacancy-indexability.json").read_text())
    paths.update(indexability["noindexPaths"][:2])
    companies = json.loads((source / "company-indexability.json").read_text())
    for url in companies["noindexUrls"]:
        if not url.startswith(ORIGIN + "/"):
            raise ValueError("Unexpected company URL origin")
        paths.add(url.removeprefix(ORIGIN))
    for path in paths:
        local_file(source, path)
    return sorted(paths)


def verify_path(source: Path, base_url: str, path: str, attempts: int = 2) -> dict:
    expected = hashlib.sha256(local_file(source, path).read_bytes()).hexdigest()
    url = base_url.rstrip("/") + path
    result = {"path": path, "expectedSha256": expected, "ok": False}
    for attempt in range(1, attempts + 1):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "KurerokReleaseCheck/1.0"})
            with urllib.request.urlopen(request, timeout=35) as response:
                data = response.read()
                actual = hashlib.sha256(data).hexdigest()
                result.update(status=response.status, actualSha256=actual,
                              ok=response.status == 200 and response.url == url and actual == expected)
            if result["ok"]:
                result.pop("error", None)
                break
            result["error"] = "Public response differs from the release artifact"
        except (OSError, urllib.error.URLError) as error:
            result["error"] = type(error).__name__
        if attempt < attempts:
            time.sleep(1)
    return result


def temporary_paths(deploy_log: Path) -> list[str]:
    names = set()
    for line in deploy_log.read_text().splitlines():
        if not line.startswith("{"):
            continue
        event = json.loads(line)
        name = event.get("remote_name", "")
        if event.get("phase") == "upload_complete" and re.fullmatch(r"codex-deploy-[a-f0-9]{36}\.(php|json|zip)", name):
            names.add(name)
    if len(names) != 3 or len({name.rsplit(".", 1)[0] for name in names}) != 1:
        raise ValueError("Deploy log must identify exactly one helper, manifest and archive")
    return sorted("/" + name for name in names)


def verify_absent(base_url: str, path: str) -> dict:
    url = base_url.rstrip("/") + path
    result = {"path": path, "ok": False}
    try:
        with urllib.request.urlopen(url, timeout=35) as response:
            result["status"] = response.status
    except urllib.error.HTTPError as error:
        result.update(status=error.code, ok=error.code == 404 and error.url == url)
    except (OSError, urllib.error.URLError) as error:
        result["error"] = type(error).__name__
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--baseline", type=Path, required=True)
    parser.add_argument("--deploy-log", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    paths = release_paths(args.source_dir, args.baseline)
    temporary = temporary_paths(args.deploy_log)
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda path: verify_path(args.source_dir, ORIGIN, path), paths))
    temporary_results = [verify_absent(ORIGIN, path) for path in temporary]
    failures = [result for result in results + temporary_results if not result["ok"]]
    report = {"verifiedAt": datetime.now(timezone.utc).isoformat(), "origin": ORIGIN,
              "checked": len(results), "failures": failures, "results": results,
              "temporaryFiles": temporary_results}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"checked": len(results), "failed": len(failures), "report": str(args.output)}))
    return int(bool(failures))


if __name__ == "__main__":
    raise SystemExit(main())
