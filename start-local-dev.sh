#!/bin/bash

echo "🚀 MoonYetis Local Development Server"
echo "===================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if Python is installed for frontend server
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed. Please install Python3 first."
    exit 1
fi

# Change to backend directory
cd backend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🔧 Starting development servers..."
echo ""

# Function to start backend server
start_backend() {
    echo "[Backend] Starting development server..."
    npm run dev 2>&1 | sed 's/^/[Backend] /'
}

# Function to start frontend server
start_frontend() {
    echo "[Frontend] Starting development server..."
    cd ../frontend
    python3 -m http.server 8080 2>&1 | sed 's/^/[Frontend] /'
}

# Trap to ensure both processes are killed on exit
trap 'echo ""; echo "🛑 Stopping development servers..."; kill $(jobs -p)' EXIT

echo "🏪 Backend will start on: http://localhost:3002"
echo "🌐 Frontend will start on: http://localhost:8080"
echo ""

# Start both servers in background
start_backend &
start_frontend &

echo "✅ Development servers started"
echo ""
echo "📱 Open in browser: http://localhost:8080"
echo "🔌 API available at: http://localhost:3002"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for all background processes
wait