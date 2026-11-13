#!/usr/bin/env python3
"""Servidor local para Repertorio.

Sirve la carpeta actual en http://localhost:8080 y evita que el navegador
guarde versiones antiguas en caché (útil al actualizar la aplicación).
"""
import http.server
import os
import socketserver
import threading
import webbrowser

PORT = 8080
os.chdir(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, format, *args):  # silenciar el registro
        pass


def open_browser():
    webbrowser.open("http://localhost:8080")


if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        threading.Timer(1.2, open_browser).start()
        print("Repertorio disponible en http://localhost:8080")
        print("Pulsa Ctrl+C para detener el servidor.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido.")
