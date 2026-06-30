"""
ComfyUI Web 本地服务器
- 托管前端静态文件
- 反向代理 ComfyUI API（解决 CORS 问题）
- 支持 WebSocket 代理

用法: python server.py [端口] [ComfyUI地址]
默认: python server.py 8080 http://127.0.0.1:8188
"""

import sys
import os
import traceback
import http.client
import json
import threading
import socket
import socketserver
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
import mimetypes

COMFYUI_URL = "http://127.0.0.1:8188"
PORT = 8080

def _get_base_dir():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

STATIC_DIR = _get_base_dir()

API_PREFIXES = (
    '/object_info', '/prompt', '/history', '/view',
    '/upload', '/ws', '/queue', '/interrupt',
    '/free', '/system_stats', '/embeddings', '/extensions',
)


class Handler(BaseHTTPRequestHandler):
    def _is_api(self):
        return any(self.path.startswith(p) for p in API_PREFIXES)

    def _proxy(self, method):
        try:
            parsed = urlparse(COMFYUI_URL)
            host = parsed.hostname or '127.0.0.1'
            port = parsed.port or 8188

            body = None
            if method in ('POST', 'PUT'):
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length) if length > 0 else None

            conn = http.client.HTTPConnection(host, port, timeout=120)
            headers = {}
            skip_headers = ('host', 'connection', 'transfer-encoding',
                           'origin', 'referer', 'sec-fetch-site',
                           'sec-fetch-mode', 'sec-fetch-dest')
            for key, val in self.headers.items():
                if key.lower() not in skip_headers:
                    headers[key] = val

            conn.request(method, self.path, body=body, headers=headers)
            resp = conn.getresponse()
            resp_body = resp.read()

            self.send_response(resp.status)
            for key, val in resp.getheaders():
                low = key.lower()
                if low not in ('transfer-encoding', 'connection', 'keep-alive'):
                    self.send_header(key, val)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(resp_body)
            conn.close()
        except ConnectionRefusedError:
            self._error(502, "ComfyUI 未运行")
        except Exception as e:
            traceback.print_exc()
            self._error(500, str(e))

    def _serve_static(self):
        path = self.path.split('?')[0]
        if path == '/':
            path = '/index.html'

        filepath = os.path.join(STATIC_DIR, path.lstrip('/'))
        filepath = os.path.normpath(filepath)

        if not filepath.startswith(STATIC_DIR):
            self._error(403, "Forbidden")
            return

        if not os.path.isfile(filepath):
            self._error(404, "File not found")
            return

        mime, _ = mimetypes.guess_type(filepath)
        if mime is None:
            mime = 'application/octet-stream'

        try:
            with open(filepath, 'rb') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', mime)
            self.send_header('Content-Length', str(len(content)))
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self._error(500, str(e))

    def _error(self, code, msg):
        body = json.dumps({"error": msg}).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self._is_api():
            self._proxy('GET')
        else:
            self._serve_static()

    def do_POST(self):
        self._proxy('POST')

    def do_PUT(self):
        self._proxy('PUT')

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Max-Age', '86400')
        self.send_header('Content-Length', '0')
        self.end_headers()

    def log_message(self, format, *args):
        msg = format % args
        if 'favicon' not in msg:
            sys.stdout.write(f"  {msg}\n")
            sys.stdout.flush()


class ThreadedHTTPServer(socketserver.ThreadingMixIn, HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def start_ws_proxy(local_port, comfyui_host, comfyui_port):
    ws_port = local_port + 1
    try:
        srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        srv.bind(('0.0.0.0', ws_port))
        srv.listen(5)
    except OSError as e:
        print(f"  [警告] WebSocket 代理端口 {ws_port} 不可用: {e}", flush=True)
        return None

    def relay(src, dst):
        try:
            while True:
                data = src.recv(8192)
                if not data:
                    break
                dst.sendall(data)
        except:
            pass
        finally:
            try: src.close()
            except: pass
            try: dst.close()
            except: pass

    def handle(client):
        try:
            remote = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            remote.connect((comfyui_host, comfyui_port))
            init_data = client.recv(8192)
            remote.sendall(init_data)
            threading.Thread(target=relay, args=(client, remote), daemon=True).start()
            threading.Thread(target=relay, args=(remote, client), daemon=True).start()
        except:
            try: client.close()
            except: pass

    def loop():
        while True:
            try:
                client, _ = srv.accept()
                threading.Thread(target=handle, args=(client,), daemon=True).start()
            except:
                break

    threading.Thread(target=loop, daemon=True).start()
    print(f"  WebSocket 代理: ws://127.0.0.1:{ws_port}/ws", flush=True)
    return ws_port


def main():
    global COMFYUI_URL, PORT

    if len(sys.argv) > 1:
        PORT = int(sys.argv[1])
    if len(sys.argv) > 2:
        COMFYUI_URL = sys.argv[2].rstrip('/')

    parsed = urlparse(COMFYUI_URL)
    host = parsed.hostname or '127.0.0.1'
    port = parsed.port or 8188

    print(f"\n{'='*50}", flush=True)
    print(f"  ComfyUI Web 本地服务器", flush=True)
    print(f"{'='*50}", flush=True)
    print(f"  前端地址: http://127.0.0.1:{PORT}", flush=True)
    print(f"  ComfyUI:  {COMFYUI_URL}", flush=True)
    print(f"{'='*50}\n", flush=True)

    start_ws_proxy(PORT, host, port)

    httpd = ThreadedHTTPServer(('0.0.0.0', PORT), Handler)
    print(f"  HTTP 服务器已启动，按 Ctrl+C 停止\n", flush=True)

    threading.Timer(0.5, lambda: webbrowser.open(f"http://127.0.0.1:{PORT}")).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  服务器已关闭")
        httpd.shutdown()


if __name__ == '__main__':
    main()
