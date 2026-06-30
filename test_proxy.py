import http.server
import http.client
import socketserver
import json
import sys
import traceback

COMFYUI = ('127.0.0.1', 8188)

class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        print(f'[GET] {self.path}', flush=True)
        try:
            conn = http.client.HTTPConnection(*COMFYUI, timeout=30)
            conn.request('GET', self.path)
            resp = conn.getresponse()
            body = resp.read()
            self.send_response(resp.status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(body)
            conn.close()
            print(f'  -> {resp.status} ({len(body)} bytes)', flush=True)
        except Exception as e:
            traceback.print_exc()
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(e).encode())

    def do_POST(self):
        print(f'[POST] {self.path}', flush=True)
        try:
            length = int(self.headers.get('Content-Length', 0))
            print(f'  Content-Length: {length}', flush=True)
            body = self.rfile.read(length) if length > 0 else None
            print(f'  Read body: {len(body) if body else 0} bytes', flush=True)

            conn = http.client.HTTPConnection(*COMFYUI, timeout=60)
            headers = {'Content-Type': self.headers.get('Content-Type', 'application/json')}
            if body:
                headers['Content-Length'] = str(len(body))
            conn.request('POST', self.path, body=body, headers=headers)
            print(f'  Forwarded to ComfyUI', flush=True)

            resp = conn.getresponse()
            resp_body = resp.read()
            print(f'  ComfyUI responded: {resp.status} ({len(resp_body)} bytes)', flush=True)

            self.send_response(resp.status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(resp_body)
            conn.close()
        except Exception as e:
            print(f'  ERROR: {e}', flush=True)
            traceback.print_exc()
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(e).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

print('Starting debug proxy on port 8080...', flush=True)

with http.server.HTTPServer(('', 8080), H) as s:
    s.serve_forever()
