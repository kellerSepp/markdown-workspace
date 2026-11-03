"""Temporary loopback-only server, restricted to spike assets. No vault HTTP access."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os

os.chdir(Path(__file__).resolve().parent)

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split('?', 1)[0] not in ('/', '/index.html', '/app.mjs', '/storage.mjs'):
            self.send_error(404)
            return
        super().do_GET()

    def do_HEAD(self):
        if self.path.split('?', 1)[0] not in ('/', '/index.html', '/app.mjs', '/storage.mjs'):
            self.send_error(404)
            return
        super().do_HEAD()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Security-Policy', "default-src 'self'; connect-src 'none'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        super().end_headers()

    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.mjs': 'text/javascript'}

print('Storage-Spike: http://127.0.0.1:8765 – Ende mit Strg+C', flush=True)
ThreadingHTTPServer(('127.0.0.1', 8765), Handler).serve_forever()
