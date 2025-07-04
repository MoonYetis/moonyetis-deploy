#!/usr/bin/env python3
"""
Simple HTTP Server for MoonYetis Wallet Testing
Serves files on localhost to enable wallet extension injection
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

# Configuration
PORT = 8000
DIRECTORY = Path(__file__).parent

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        # Add CORS headers to prevent issues
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        # Prevent caching for development
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    
    def log_message(self, format, *args):
        # Custom logging format
        print(f"🌐 {self.address_string()} - {format % args}")

def main():
    """Start the HTTP server"""
    try:
        os.chdir(DIRECTORY)
        
        with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
            print("🚀 MoonYetis Wallet Testing Server")
            print("=" * 50)
            print(f"📂 Serving directory: {DIRECTORY}")
            print(f"🌐 Local server: http://localhost:{PORT}")
            print("=" * 50)
            print("\n📋 Available pages:")
            print(f"   🧪 Main Test: http://localhost:{PORT}/index-test.html")
            print(f"   🔍 Extension Detector: http://localhost:{PORT}/extension-detector.html")
            print(f"   🎰 Full Game: http://localhost:{PORT}/index.html")
            print(f"   🔬 Wallet Test: http://localhost:{PORT}/wallet-connection-test.html")
            print("\n💡 Tips:")
            print("   - Wallet extensions will now be detected properly")
            print("   - Use Ctrl+C to stop the server")
            print("   - Refresh browser if you had pages open with file://")
            print("\n🔄 Starting server...")
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped by user")
        sys.exit(0)
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Error: Port {PORT} is already in use")
            print(f"💡 Try a different port or stop the existing server")
            sys.exit(1)
        else:
            print(f"❌ Error starting server: {e}")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()