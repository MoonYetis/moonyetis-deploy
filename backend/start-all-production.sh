#!/bin/bash

echo "🚀 Starting MoonYetis Store - PRODUCTION"
echo "======================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing production dependencies..."
    npm install --production
fi

# Set production environment
export NODE_ENV=production

echo "🏪 Starting Store API Server on port 3002..."
echo ""

# Function to start store server
start_store() {
    echo "[Store] Starting..."
    STORE_PORT=3002 node store-server-v2.js 2>&1 | sed 's/^/[Store] /'
}

# Trap to ensure process is killed on exit
trap 'kill $(jobs -p)' EXIT

# Start store server in background
start_store &

echo "✅ Store service started"
echo "🏪 Store API: http://moonyetis.io:3002"
echo ""
echo "Press Ctrl+C to stop the service"

# Wait for background process
wait