"""Local PHP boundary checks for the reviewed-site deployer's private root."""

from __future__ import annotations

import importlib.util
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = PROJECT_ROOT / "scripts" / "deploy-reviewed-site.py"
PHP = shutil.which("php")
SPEC = importlib.util.spec_from_file_location("deploy_reviewed_site", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
DEPLOY = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = DEPLOY
SPEC.loader.exec_module(DEPLOY)


@unittest.skipUnless(PHP, "PHP CLI is required for generated-helper boundary tests")
class ExplicitPrivateRootTests(unittest.TestCase):
    def run_helper(self, webroot: Path, private_root: Path | None) -> dict[str, object]:
        helper = webroot / "codex-deploy-test.php"
        helper.write_bytes(
            DEPLOY.helper_source(
                "codex-deploy-test.zip",
                "codex-deploy-test.json",
                "local-test-token",
                "0123456789abcdef0123456789abcdef0123",
                str(private_root) if private_root is not None else None,
            )
        )
        lint = subprocess.run(
            [PHP, "-l", str(helper)],
            check=False,
            capture_output=True,
            text=True,
            timeout=15,
        )
        self.assertEqual(lint.returncode, 0, lint.stderr or lint.stdout)
        runner = webroot.parent / "run-helper.php"
        runner.write_text(
            "<?php\n"
            "$_SERVER['REQUEST_METHOD'] = 'POST';\n"
            "$_POST['token'] = 'local-test-token';\n"
            f"include {DEPLOY.php_literal(str(helper))};\n",
            encoding="utf-8",
        )
        completed = subprocess.run(
            [PHP, str(runner)],
            check=False,
            capture_output=True,
            text=True,
            timeout=15,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)
        return json.loads(completed.stdout)

    def test_accepts_existing_private_0700_root_and_fails_at_next_preflight(self) -> None:
        with tempfile.TemporaryDirectory(prefix="reviewed-deploy-php-") as temp:
            base = Path(temp)
            webroot = base / "public_html"
            private_root = base / "private"
            webroot.mkdir(mode=0o700)
            private_root.mkdir(mode=0o700)
            private_root.chmod(0o700)

            result = self.run_helper(webroot, private_root.resolve())

            # Reaching archive/runtime preflight proves the explicit path passed
            # canonical-path, separation, owner, mode, and writability checks.
            self.assertFalse(result["ok"])
            self.assertIn(result["message"], {"ZipArchive unavailable", "Temporary upload missing"})
            private_entries = [path.name for path in private_root.iterdir()]
            self.assertEqual(len(private_entries), 1)
            self.assertTrue(private_entries[0].startswith(".kurerok-status-"))
            self.assertEqual(sorted(path.name for path in webroot.iterdir()), ["codex-deploy-test.php"])

    def test_omitting_private_root_keeps_parent_directory_default(self) -> None:
        with tempfile.TemporaryDirectory(prefix="reviewed-deploy-default-") as temp:
            base = Path(temp)
            webroot = base / "public_html"
            webroot.mkdir(mode=0o700)

            result = self.run_helper(webroot, None)

            self.assertFalse(result["ok"])
            self.assertIn(result["message"], {"ZipArchive unavailable", "Temporary upload missing"})
            parent_entries = [path.name for path in base.iterdir() if path != webroot]
            status_entries = [name for name in parent_entries if name.startswith(".kurerok-status-")]
            self.assertEqual(len(status_entries), 1)
            self.assertIn("run-helper.php", parent_entries)
            self.assertFalse(any(name.startswith((".kurerok-stage-", ".kurerok-backup-")) for name in parent_entries))
            self.assertEqual(sorted(path.name for path in webroot.iterdir()), ["codex-deploy-test.php"])

    def test_rejects_private_root_inside_document_root_before_any_filesystem_write(self) -> None:
        with tempfile.TemporaryDirectory(prefix="reviewed-deploy-inside-") as temp:
            base = Path(temp)
            webroot = base / "public_html"
            private_root = webroot / "private"
            webroot.mkdir(mode=0o700)
            private_root.mkdir(mode=0o700)
            private_root.chmod(0o700)

            result = self.run_helper(webroot, private_root.resolve())

            self.assertFalse(result["ok"])
            self.assertEqual(
                result["message"],
                "Explicit private root must be outside and separate from document root",
            )
            self.assertEqual(sorted(path.name for path in webroot.iterdir()), ["codex-deploy-test.php", "private"])
            self.assertFalse(any(private_root.iterdir()))

    def test_rejects_symlinked_private_root_before_any_filesystem_write(self) -> None:
        with tempfile.TemporaryDirectory(prefix="reviewed-deploy-symlink-") as temp:
            base = Path(temp)
            webroot = base / "public_html"
            private_target = base / "private"
            private_link = base / "private-link"
            webroot.mkdir(mode=0o700)
            private_target.mkdir(mode=0o700)
            private_target.chmod(0o700)
            private_link.symlink_to(private_target, target_is_directory=True)

            result = self.run_helper(webroot, private_link)

            self.assertFalse(result["ok"])
            self.assertEqual(
                result["message"],
                "Explicit private root must exist as a canonical non-symlink directory",
            )
            self.assertFalse(any(private_target.iterdir()))
            self.assertEqual(sorted(path.name for path in webroot.iterdir()), ["codex-deploy-test.php"])

    def test_rejects_parent_segments_even_when_realpath_resolves_outside_document_root(self) -> None:
        with tempfile.TemporaryDirectory(prefix="reviewed-deploy-traversal-") as temp:
            base = Path(temp)
            webroot = base / "public_html"
            private_root = base / "private"
            detour = base / "detour"
            webroot.mkdir(mode=0o700)
            private_root.mkdir(mode=0o700)
            private_root.chmod(0o700)
            detour.mkdir(mode=0o700)
            configured_path = detour / ".." / "private"

            result = self.run_helper(webroot, configured_path)

            self.assertFalse(result["ok"])
            self.assertEqual(result["message"], "Explicit private root must be a canonical absolute path")
            self.assertFalse(any(private_root.iterdir()))
            self.assertEqual(sorted(path.name for path in webroot.iterdir()), ["codex-deploy-test.php"])


if __name__ == "__main__":
    unittest.main()
