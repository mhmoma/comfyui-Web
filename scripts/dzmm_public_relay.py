# -*- coding: utf-8 -*-
"""
站长侧 DZMM 公共中转（住宅/本机出口 → 官网，带 CORS，供线上 Pages 调用）。

用法:
  python scripts/dzmm_public_relay.py [端口]
默认端口 8765。对外可用 cloudflared / localtunnel 暴露固定域名。

环境变量:
  DZMM_RELAY_PORT=8765
"""
from __future__ import annotations

import json
import os
import sys
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, Tuple
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import dzmm_draw as draw  # noqa: E402


def _json(handler: BaseHTTPRequestHandler, code: int, data: Any) -> None:
    body = json.dumps(data, ensure_ascii=False).encode("utf-8")
    handler.send_response(code)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Dzmm-Cookie, x-dzmm-cookie",
    )
    handler.send_header("Access-Control-Max-Age", "86400")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def _enrich_status(data: Dict[str, Any], cookie: str) -> Dict[str, Any]:
    out = dict(data or {})
    complete = bool(cookie) and ("sb-rls-auth-token=" in cookie) and len(cookie) > 40
    out.setdefault("hasCookie", bool(cookie))
    out["cookieComplete"] = complete
    out["acceptedLocally"] = complete and not out.get("error")
    out["direct"] = False
    out["relay"] = True
    if complete and out.get("user") is None:
        out["user"] = {"isLoggedIn": True}
    return out


class Handler(BaseHTTPRequestHandler):
    server_version = "DzmmPublicRelay/1.0"

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _cors_preflight(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization, X-Dzmm-Cookie, x-dzmm-cookie",
        )
        self.send_header("Access-Control-Max-Age", "86400")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_OPTIONS(self) -> None:
        self._cors_preflight()

    def _read_json(self) -> Dict[str, Any]:
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        try:
            data = json.loads(raw.decode("utf-8", errors="replace") or "{}")
            return data if isinstance(data, dict) else {}
        except Exception:
            return {}

    def _dispatch(self, method: str) -> None:
        parsed = urlparse(self.path)
        path = parsed.path or "/"
        query = {k: (v[0] if v else "") for k, v in parse_qs(parsed.query).items()}
        body = self._read_json() if method == "POST" else {}

        hdr = self.headers.get("X-Dzmm-Cookie") or self.headers.get("x-dzmm-cookie") or ""
        if hdr:
            body = {**body, "_requestCookie": hdr}
            if method == "GET":
                query = {**query, "_requestCookie": hdr}

        # 健康检查
        if path in ("/", "/health", "/api/dzmm/health") and method == "GET":
            _json(self, 200, {"ok": True, "service": "dzmm-public-relay"})
            return

        if not path.startswith("/api/dzmm"):
            _json(self, 404, {"ok": False, "error": "not found"})
            return

        try:
            code, data = draw.handle_api(method, path, query, body)
            if code == 0 and isinstance(data, dict) and data.get("__file__"):
                file_path = Path(data["__file__"])
                raw = file_path.read_bytes()
                self.send_response(200)
                ctype = "image/webp" if file_path.suffix.lower() == ".webp" else "application/octet-stream"
                self.send_header("Content-Type", ctype)
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Content-Length", str(len(raw)))
                self.end_headers()
                self.wfile.write(raw)
                return

            if path == "/api/dzmm/status" and isinstance(data, dict):
                data = _enrich_status(data, hdr or draw.get_cookie())

            # 业务失败用 400，避免被当成网关错误
            if isinstance(data, dict) and data.get("ok") is False and code >= 500:
                code = 400
            _json(self, code, data)
        except Exception as e:
            traceback.print_exc()
            _json(self, 500, {"ok": False, "error": str(e)})

    def do_GET(self) -> None:
        self._dispatch("GET")

    def do_POST(self) -> None:
        self._dispatch("POST")


def main() -> None:
    port = int(os.environ.get("DZMM_RELAY_PORT") or (sys.argv[1] if len(sys.argv) > 1 else 8765))
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"[dzmm-relay] http://127.0.0.1:{port}/api/dzmm/status", flush=True)
    print("[dzmm-relay] expose with: npx localtunnel --port %s" % port, flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[dzmm-relay] stopped", flush=True)


if __name__ == "__main__":
    main()
