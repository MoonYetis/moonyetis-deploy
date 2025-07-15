#!/bin/bash

echo "🚀 Starting MoonYetis Backend Services - PRODUCTION"
echo "==================================================="

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

echo "🔐 Starting HD Wallet API Server on port 3001..."
echo "🏪 Starting Store API Server on port 3002..."
echo ""

# Function to start HD wallet server
start_hd_wallet() {
    echo "[HD-Wallet] Starting..."
    node hd-wallet-server.js 2>&1 | sed 's/^/[HD-Wallet] /'
}

# Function to start store server
start_store() {
    echo "[Store] Starting..."
    STORE_PORT=3002 node store-server-v2.js 2>&1 | sed 's/^/[Store] /'
}

# Trap to ensure both processes are killed on exit
trap 'kill $(jobs -p)' EXIT

# Start both servers in background
start_hd_wallet &
start_store &

echo "✅ All services started"
echo "🌐 HD Wallet API: http://moonyetis.io:3001"
echo "🏪 Store API: http://moonyetis.io:3002"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for all background processes
wait