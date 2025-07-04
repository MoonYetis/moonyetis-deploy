#!/bin/bash

echo "🚀 Starting MoonYetis Advanced Wallet Testing Environment"
echo ""

# Check if backend is already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Backend server already running on port 3000"
else
    echo "🔄 Starting backend server on port 3000..."
    node server-simple-test.js &
    BACKEND_PID=$!
    echo "✅ Backend server started (PID: $BACKEND_PID)"
    sleep 2
fi

# Check if frontend is already running
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Frontend server already running on port 8080"
else
    echo "🔄 Starting frontend server on port 8080..."
    python3 start-frontend.py &
    FRONTEND_PID=$!
    echo "✅ Frontend server started (PID: $FRONTEND_PID)"
    sleep 2
fi

echo ""
echo "🎯 Testing Environment Ready!"
echo ""
echo "📋 Available URLs:"
echo "   🌐 Main App: http://localhost:8080/index.html"
echo "   🧪 Test Suite: http://localhost:8080/test-advanced-wallet.html"
echo "   ⚙️  Backend API: http://localhost:3000/api/health"
echo ""
echo "🔗 Both servers are running. You can now:"
echo "   1. Open http://localhost:8080/test-advanced-wallet.html to test the backend"
echo "   2. Open http://localhost:8080/index.html to use the main app"
echo ""
echo "Press Ctrl+C to stop this script (servers will continue running)"
echo ""

# Keep script running
trap 'echo "🔄 Script stopped. Servers are still running."; exit 0' INT
while true; do
    sleep 1
done