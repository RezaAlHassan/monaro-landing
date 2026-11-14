"""Run the Reordia page and save waitlist entries: python server.py."""

import json
import os
from pathlib import Path
import re
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parent
DATABASE = ROOT / "data" / "waitlist.sqlite3"
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def save_email(email):
    DATABASE.parent.mkdir(exist_ok=True)
    with sqlite3.connect(DATABASE) as connection:
        connection.execute(
            "CREATE TABLE IF NOT EXISTS waitlist "
            "(email TEXT PRIMARY KEY, joined_at TEXT DEFAULT CURRENT_TIMESTAMP)"
        )
        connection.execute("INSERT OR IGNORE INTO waitlist (email) VALUES (?)", (email,))


class Handler(BaseHTTPRequestHandler):
    def respond(self, status, data):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        routes = {
            "/": (ROOT / "index.html", "text/html; charset=utf-8"),
            "/index.html": (ROOT / "index.html", "text/html; charset=utf-8"),
            "/assets/reordia-mark.png": (ROOT / "assets" / "reordia-mark.png", "image/png"),
            "/assets/reordia-favicon.png": (ROOT / "assets" / "reordia-favicon.png", "image/png"),
            "/assets/chat-pattern.svg": (ROOT / "assets" / "chat-pattern.svg", "image/svg+xml"),
        }
        resource = routes.get(self.path.split("?", 1)[0])
        if resource is None:
            self.respond(404, {"error": "Not found"})
            return
        path, content_type = resource
        body = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != "/api/waitlist":
            self.respond(404, {"error": "Not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 4096:
                self.respond(413, {"error": "Invalid request size."})
                return
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict) or not isinstance(data.get("email"), str):
                raise ValueError("Invalid email")
            email = data["email"].strip().lower()
            if len(email) > 254 or not EMAIL_PATTERN.fullmatch(email):
                raise ValueError("Invalid email")
            if data.get("website"):
                self.respond(200, {"ok": True})
                return
            save_email(email)
            self.respond(200, {"ok": True})
        except (ValueError, UnicodeDecodeError):
            self.respond(400, {"error": "Please enter a valid email address."})
        except sqlite3.Error:
            self.respond(503, {"error": "We couldn’t save your email. Please try again shortly."})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "3000"))
    print(f"Reordia is running at http://localhost:{port}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
