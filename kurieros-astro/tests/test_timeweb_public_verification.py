"""Exercise public release verification against an actual local HTTP server."""

import importlib.util
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import tempfile
import threading
import unittest

SPEC = importlib.util.spec_from_file_location(
    "verify_timeweb_release", Path(__file__).resolve().parents[1] / "scripts/verify-timeweb-release.py"
)
VERIFY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VERIFY)


class PublicReleaseVerificationTests(unittest.TestCase):
    def test_actual_http_bytes_must_match_and_redirects_do_not_count(self):
        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                if self.path == "/removed.php":
                    self.send_error(404)
                    return
                if self.path == "/redirect/":
                    self.send_response(302)
                    self.send_header("Location", "/")
                    self.end_headers()
                    return
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b"expected" if self.path == "/" else b"stale")

            def log_message(self, *_args):
                pass

        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                (root / "index.html").write_bytes(b"expected")
                for route in ["stale", "redirect"]:
                    (root / route).mkdir()
                    (root / route / "index.html").write_bytes(b"expected")
                origin = f"http://127.0.0.1:{server.server_port}"
                self.assertTrue(VERIFY.verify_path(root, origin, "/", 1)["ok"])
                self.assertFalse(VERIFY.verify_path(root, origin, "/stale/", 1)["ok"])
                self.assertFalse(VERIFY.verify_path(root, origin, "/redirect/", 1)["ok"])
                self.assertTrue(VERIFY.verify_absent(origin, "/removed.php")["ok"])
                self.assertFalse(VERIFY.verify_absent(origin, "/stale/")["ok"])
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

    def test_public_paths_cannot_escape_the_build(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for path in ["/../private", "/x/../../private", "//etc/passwd", "/?token=value"]:
                with self.subTest(path=path), self.assertRaises(ValueError):
                    VERIFY.local_file(root, path)


if __name__ == "__main__":
    unittest.main()
