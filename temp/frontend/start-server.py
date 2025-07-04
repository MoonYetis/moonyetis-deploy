#!/usr/bin/env python3
import http.server
import socketserver
import os
import webbrowser

PORT = 8080

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"📝 {format % args}")

# Change to frontend directory
os.chdir('/Users/Warlink/Desktop/projects/moonyetis-backend/frontend')

try:
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"🚀 Python server running at http://localhost:{PORT}")
        print(f"📁 Serving files from: {os.getcwd()}")
        print(f"🧪 Test page: http://localhost:{PORT}/simple-wallet-test.html")
        print(f"🎮 Main game: http://localhost:{PORT}/index.html")
        print("Press Ctrl+C to stop the server")
        
        # Auto-open browser
        webbrowser.open(f'http://localhost:{PORT}/simple-wallet-test.html')
        
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\n🛑 Server stopped")
except OSError as e:
    if e.errno == 48:  # Port already in use
        print(f"❌ Port {PORT} is already in use. Try a different port.")
        PORT = 8081
        with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
            print(f"🚀 Python server running at http://localhost:{PORT}")
            webbrowser.open(f'http://localhost:{PORT}/simple-wallet-test.html')
            httpd.serve_forever()
    else:
        print(f"❌ Error: {e}")