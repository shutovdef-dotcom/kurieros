"""Local integration tests for managed private backup/export lifecycle."""

from __future__ import annotations

import importlib.util
import io
import hashlib
import json
import shutil
import secrets
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = PROJECT_ROOT / "scripts" / "deploy-reviewed-site.py"
PHP = shutil.which("php")
SPEC = importlib.util.spec_from_file_location("deploy_reviewed_site", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
DEPLOY = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = DEPLOY
SPEC.loader.exec_module(DEPLOY)


@unittest.skipUnless(PHP, "PHP CLI is required for generated-helper integration tests")
class ManagedBackupLifecycleTests(unittest.TestCase):
    token = "local-integration-token"
    archive_name = "codex-deploy-test.zip"
    manifest_name = "codex-deploy-test.json"

    def setUp(self) -> None:
        self.nonce = secrets.token_hex(18)
        self.addCleanup(shutil.rmtree, self.managed_root(), ignore_errors=True)

    def setup_site(self, base: Path, *, deployed: bool = False) -> tuple[Path, Path, Path, list[DEPLOY.FileEntry]]:
        webroot = base / "public_html"
        source = base / "dist"
        webroot.mkdir(mode=0o700)
        source.mkdir()
        (source / "index.html").write_text(
            '<!doctype html><html><head><link rel="canonical" href="https://kurerok.ru/"></head><body>current</body></html>',
            encoding="utf-8",
        )
        (source / "app.js").write_text("window.ready=true;", encoding="utf-8")
        nested_page = source / "v" / "managed-test" / "index.html"
        nested_page.parent.mkdir(parents=True)
        nested_page.write_text(
            '<!doctype html><html><head><link rel="canonical" href="https://kurerok.ru/v/managed-test/"></head><body>new route</body></html>',
            encoding="utf-8",
        )
        (webroot / "index.html").write_text(
            '<!doctype html><html><head><link rel="canonical" href="https://kurerok.ru/"></head><body>previous</body></html>',
            encoding="utf-8",
        )
        (webroot / "unrelated.txt").write_text("preserve", encoding="utf-8")
        archive = base / "payload.zip"
        manifest = base / "manifest.json"
        entries = DEPLOY.build_package(source, archive, manifest)
        if deployed:
            for entry in entries:
                destination = webroot / entry.path
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes((source / entry.path).read_bytes())
        (webroot / self.archive_name).write_bytes(archive.read_bytes())
        (webroot / self.manifest_name).write_bytes(manifest.read_bytes())
        return webroot, source, base, entries

    def run_helper(self, webroot: Path, action: str, *, export_sha256: str | None = None, managed: bool = True) -> bytes:
        helper_path = webroot / "codex-deploy-test.php"
        helper_path.write_bytes(
            DEPLOY.helper_source(self.archive_name, self.manifest_name, self.token, self.nonce, None, managed)
        )
        lint = subprocess.run([PHP, "-l", str(helper_path)], capture_output=True, text=True, timeout=15)
        self.assertEqual(lint.returncode, 0, lint.stderr or lint.stdout)
        runner = webroot.parent / "run-helper.php"
        post = f"$_POST['action'] = {DEPLOY.php_literal(action)};"
        if export_sha256 is not None:
            post += f" $_POST['export_sha256'] = {DEPLOY.php_literal(export_sha256)};"
        runner.write_text(
            "<?php\n$_SERVER['REQUEST_METHOD']='POST';\n"
            f"$_POST['token']={DEPLOY.php_literal(self.token)}; {post}\n"
            f"include {DEPLOY.php_literal(str(helper_path))};\n",
            encoding="utf-8",
        )
        completed = subprocess.run([PHP, str(runner)], capture_output=True, timeout=30)
        self.assertEqual(completed.returncode, 0, completed.stderr.decode(errors="replace"))
        return completed.stdout

    def managed_root(self) -> Path:
        return Path(tempfile.gettempdir()) / f"kurerok-deploy-private-{self.nonce}"

    @staticmethod
    def snapshot_tree(root: Path) -> dict[str, str]:
        return {
            path.relative_to(root).as_posix(): DEPLOY.sha256_file(path)
            for path in sorted(root.rglob("*"))
            if path.is_file()
        }

    def test_apply_export_and_verified_cleanup(self) -> None:
        with tempfile.TemporaryDirectory(prefix="reviewed-managed-apply-") as temp:
            base = Path(temp)
            webroot, _, _, entries = self.setup_site(base)
            result = json.loads(self.run_helper(webroot, "apply"))
            self.assertTrue(result["ok"], result)
            self.assertEqual((webroot / "index.html").read_bytes(), (base / "dist/index.html").read_bytes())
            self.assertEqual((webroot / "unrelated.txt").read_text(), "preserve")
            self.assertEqual((webroot / "v/managed-test/index.html").read_bytes(), (base / "dist/v/managed-test/index.html").read_bytes())
            self.assertEqual((webroot / "v").stat().st_mode & 0o777, 0o755)
            self.assertEqual((webroot / "v/managed-test").stat().st_mode & 0o777, 0o755)
            root = self.managed_root()
            self.assertTrue(root.is_dir())
            self.assertEqual(root.stat().st_mode & 0o777, 0o700)
            exported = self.run_helper(webroot, "export-backup")
            class Headers(dict):
                def get_content_type(self): return "application/zip"

            digest = hashlib.sha256(exported).hexdigest()

            class Response(io.BytesIO):
                def __init__(self, content: bytes):
                    super().__init__(content)
                    self.headers = Headers({"X-Backup-SHA256": digest})
                def __enter__(self): return self
                def __exit__(self, *args): self.close()

            args = type("Args", (), {"backup_dir":base / "local-rollback", "base_url":"https://kurerok.ru/", "request_timeout":30})()
            with mock.patch.object(DEPLOY.urllib.request, "urlopen", return_value=Response(exported)):
                archive, local_manifest, actual_hash = DEPLOY.export_backup(args, "codex-deploy-test.php", self.token, self.nonce, entries, result["counts"])
            self.assertEqual(actual_hash, digest)
            payload = DEPLOY.verify_backup_archive(archive, entries, result["counts"])
            self.assertTrue(local_manifest.is_file())
            self.assertTrue((args.backup_dir / f"timeweb-backup-{self.nonce}-receipt.json").is_file())
            self.assertEqual(set(payload["files"]), {entry.path for entry in entries})
            self.assertEqual(payload["files"]["index.html"]["was_missing"], False)
            self.assertEqual(payload["files"]["app.js"], {"was_missing": True})
            incomplete = dict(payload)
            incomplete["files"] = {"index.html": payload["files"]["index.html"]}
            incomplete_archive = base / "incomplete-backup.zip"
            with DEPLOY.zipfile.ZipFile(incomplete_archive, "w") as broken:
                broken.writestr("__kurerok_backup_manifest__.json", json.dumps(incomplete))
                broken.writestr("index.html", (base / "dist/index.html").read_bytes())
            with self.assertRaises(DEPLOY.DeployError):
                DEPLOY.verify_backup_archive(incomplete_archive, entries, result["counts"])
            self.assertTrue(root.exists(), "an incomplete local export must not authorize private cleanup")
            cleanup = json.loads(self.run_helper(webroot, "cleanup-private-storage", export_sha256=digest))
            self.assertTrue(cleanup["ok"], cleanup)
            self.assertFalse(root.exists())

    def test_no_change_still_exports_empty_rollback_manifest(self) -> None:
        with tempfile.TemporaryDirectory(prefix="reviewed-managed-nochange-") as temp:
            base = Path(temp)
            webroot, _, _, entries = self.setup_site(base, deployed=True)
            result = json.loads(self.run_helper(webroot, "apply"))
            self.assertTrue(result["ok"], result)
            self.assertEqual(result["counts"]["updated_files"], 0)
            self.assertIsNotNone(result["backup_location"])
            archive = base / "download.zip"
            archive.write_bytes(self.run_helper(webroot, "export-backup"))
            payload = DEPLOY.verify_backup_archive(archive, entries, result["counts"])
            self.assertEqual(payload["files"], {})
            cleanup = json.loads(self.run_helper(webroot, "cleanup-private-storage", export_sha256=DEPLOY.sha256_file(archive)))
            self.assertTrue(cleanup["ok"], cleanup)
            self.assertFalse(self.managed_root().exists())

    def test_tampered_backup_fails_export_and_keeps_private_storage(self) -> None:
        with tempfile.TemporaryDirectory(prefix="reviewed-managed-tamper-") as temp:
            base = Path(temp)
            webroot, _, _, _ = self.setup_site(base)
            self.assertTrue(json.loads(self.run_helper(webroot, "apply"))["ok"])
            backup_target = self.managed_root() / f".kurerok-backup-{self.nonce}" / "index.html"
            backup_target.write_text("tampered", encoding="utf-8")
            response = json.loads(self.run_helper(webroot, "export-backup"))
            self.assertFalse(response["ok"])
            self.assertTrue(self.managed_root().exists())
            refusal = json.loads(self.run_helper(webroot, "cleanup-private-storage", export_sha256="0" * 64))
            self.assertFalse(refusal["ok"])
            self.assertTrue(self.managed_root().exists())

    def test_failed_apply_retains_private_diagnostics_without_cleanup(self) -> None:
        with tempfile.TemporaryDirectory(prefix="reviewed-managed-failed-") as temp:
            base = Path(temp)
            webroot, _, _, _ = self.setup_site(base)
            (webroot / self.archive_name).write_bytes(b"not a zip")
            result = json.loads(self.run_helper(webroot, "apply"))
            self.assertFalse(result["ok"])
            self.assertFalse(result["rollback_attempted"])
            self.assertTrue(self.managed_root().exists())
            before = (webroot / "index.html").read_text()
            cleanup = json.loads(self.run_helper(webroot, "cleanup-private-storage", export_sha256="0" * 64))
            self.assertFalse(cleanup["ok"])
            self.assertTrue(self.managed_root().exists())
            self.assertEqual((webroot / "index.html").read_text(), before)

    def test_duplicate_apply_refuses_without_changing_private_or_public_state(self) -> None:
        with tempfile.TemporaryDirectory(prefix="reviewed-managed-duplicate-") as temp:
            base = Path(temp)
            webroot, _, _, entries = self.setup_site(base)
            first = json.loads(self.run_helper(webroot, "apply"))
            self.assertTrue(first["ok"], first)
            root = self.managed_root()
            private_before = self.snapshot_tree(root)
            public_before = {
                entry.path: DEPLOY.sha256_file(webroot / entry.path)
                for entry in entries
            }

            second = json.loads(self.run_helper(webroot, "apply"))
            self.assertFalse(second["ok"])
            self.assertEqual(second["state"], "refused")
            self.assertIn("already exists", second["error"])
            self.assertEqual(self.snapshot_tree(root), private_before)
            self.assertEqual(
                {entry.path: DEPLOY.sha256_file(webroot / entry.path) for entry in entries},
                public_before,
            )

            unknown = json.loads(self.run_helper(webroot, "delete-everything"))
            self.assertFalse(unknown["ok"])
            self.assertEqual(unknown["state"], "refused")
            self.assertEqual(self.snapshot_tree(root), private_before)
            self.assertEqual(
                {entry.path: DEPLOY.sha256_file(webroot / entry.path) for entry in entries},
                public_before,
            )

            exported = self.run_helper(webroot, "export-backup")
            archive = base / "original-backup.zip"
            archive.write_bytes(exported)
            self.assertEqual(
                DEPLOY.verify_backup_archive(archive, entries, first["counts"])["files"],
                json.loads((root / f".kurerok-backup-{self.nonce}" / "backup-manifest.json").read_text())["files"],
            )

    def test_preexisting_nonce_path_collision_is_preserved(self) -> None:
        with tempfile.TemporaryDirectory(prefix="reviewed-managed-collision-") as temp:
            base = Path(temp)
            webroot, _, _, _ = self.setup_site(base)
            collision = self.managed_root()
            collision.mkdir(mode=0o700)
            collision.chmod(0o700)
            sentinel = collision / "owner-data.txt"
            sentinel.write_text("leave untouched", encoding="utf-8")
            private_before = self.snapshot_tree(collision)
            public_before = DEPLOY.sha256_file(webroot / "index.html")

            result = json.loads(self.run_helper(webroot, "apply"))
            self.assertFalse(result["ok"])
            self.assertEqual(result["state"], "refused")
            self.assertEqual(self.snapshot_tree(collision), private_before)
            self.assertEqual(DEPLOY.sha256_file(webroot / "index.html"), public_before)
            self.assertEqual(sentinel.read_text(encoding="utf-8"), "leave untouched")

    def test_unknown_apply_result_is_never_reapplied_or_cleaned(self) -> None:
        class FakeFTP:
            def connect(self, *args, **kwargs): pass
            def login(self, *args, **kwargs): pass
            def prot_p(self): pass
            def set_pasv(self, *args, **kwargs): pass
            def pwd(self): return "/"
            def nlst(self): return ["index.html"]
            def storbinary(self, *args, **kwargs): pass
            def delete(self, name): raise AssertionError("ambiguous outcome must preserve temporary uploads")
            def quit(self): pass
            def close(self): pass

        with tempfile.TemporaryDirectory(prefix="reviewed-managed-unknown-") as temp:
            base = Path(temp)
            _, _, _, entries = self.setup_site(base)
            archive = base / "payload.zip"
            manifest = base / "manifest.json"
            DEPLOY.build_package(base / "dist", archive, manifest)
            args = DEPLOY.make_parser().parse_args([
                "--source-dir", str(base / "dist"), "--ftp-host", "example.invalid", "--ftp-user", "test",
                "--ftp-password-env", "DEPLOY_TEST_PASSWORD", "--managed-private-root", "--backup-dir", str(base / "backups"),
                "--request-timeout", "1", "--status-poll-timeout", "1", "--status-poll-interval", "1", "--apply",
            ])
            calls: list[str] = []

            def fake_http(_args, _helper, _token, action="apply"):
                calls.append(action)
                if action == "apply":
                    raise DEPLOY.RemoteOutcomeUnknown("simulated timeout")
                return {"state": "running"}

            with mock.patch.object(DEPLOY, "ftp_connect", return_value=FakeFTP()), \
                 mock.patch.object(DEPLOY, "check_remote_root", return_value=("/", 1)), \
                 mock.patch.object(DEPLOY, "ftp_store_file"), \
                 mock.patch.object(DEPLOY, "http_post", side_effect=fake_http), \
                 mock.patch.dict("os.environ", {"DEPLOY_TEST_PASSWORD": "unused"}):
                code = DEPLOY.apply_remote(args, archive, manifest, entries)
            self.assertEqual(code, 3)
            self.assertEqual(calls.count("apply"), 1)
            self.assertNotIn("cleanup-private-storage", calls)
            self.assertNotIn("export-backup", calls)

    def test_nonempty_backup_dir_fails_before_ftp_connect(self) -> None:
        with tempfile.TemporaryDirectory(prefix="reviewed-managed-preflight-") as temp:
            base = Path(temp)
            _, _, _, entries = self.setup_site(base)
            archive = base / "payload.zip"
            manifest = base / "manifest.json"
            DEPLOY.build_package(base / "dist", archive, manifest)
            backup_dir = base / "backups"
            backup_dir.mkdir()
            (backup_dir / "prior-artifact.txt").write_text("keep", encoding="utf-8")
            args = DEPLOY.make_parser().parse_args([
                "--source-dir", str(base / "dist"), "--ftp-host", "example.invalid", "--ftp-user", "test",
                "--ftp-password-env", "DEPLOY_TEST_PASSWORD", "--managed-private-root", "--backup-dir", str(backup_dir), "--apply",
            ])
            with mock.patch.object(DEPLOY, "ftp_connect") as ftp_connect:
                with self.assertRaises(DEPLOY.DeployError):
                    DEPLOY.apply_remote(args, archive, manifest, entries)
            ftp_connect.assert_not_called()
            self.assertEqual((backup_dir / "prior-artifact.txt").read_text(), "keep")


if __name__ == "__main__":
    unittest.main()
