import http.server
import socketserver
import json
import sys

class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        print('GOT GET', flush=True)
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'ok')

    def do_POST(self):
        print('GOT POST', flush=True)
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length)
        print(f'Body length: {len(body)}', flush=True)
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'received': len(body)}).encode())

with socketserver.TCPServer(('', 9999), H) as s:
    print('Listening on 9999...', flush=True)
    s.serve_forever()
