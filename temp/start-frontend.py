#!/usr/bin/env python3
import http.server
import socketserver
import os
import webbrowser
from threading import Timer

PORT = 8080
DIRECTORY = "frontend"

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

def open_browser():
    webbrowser.open(f'http://localhost:{PORT}')
    print(f'🌐 Opening browser at http://localhost:{PORT}')

if __name__ == "__main__":
    # Change to the project root directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print("")
        print("🚀 MoonYetis Frontend Server Started!")
        print("")
        print(f"✅ Frontend server running on: http://localhost:{PORT}")
        print(f"📱 Main app available at: http://localhost:{PORT}/index.html")
        print(f"🧪 Test suite available at: http://localhost:{PORT}/test-advanced-wallet.html")
        print("")
        print("🔗 Backend server should be running on: http://localhost:3000")
        print("")
        print("📋 Quick Links:")
        print(f"   • Main App: http://localhost:{PORT}/index.html")
        print(f"   • Test Suite: http://localhost:{PORT}/test-advanced-wallet.html")
        print("")
        print("Press Ctrl+C to stop the server")
        print("")
        
        # Open browser after 2 seconds
        Timer(2.0, open_browser).start()
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🔄 Shutting down frontend server...")
            httpd.shutdown()