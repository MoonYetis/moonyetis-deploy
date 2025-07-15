#!/bin/bash

echo "🏪 Starting MoonYetis Store Server - PRODUCTION"
echo "=================================================="

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
export STORE_PORT=3002

echo "🏪 Starting Store API Server..."
echo "🌐 Domain: moonyetis.io:3002"
echo "💰 Features: MoonCoins Store with FB/MY payments"
echo ""

# Start the store server (v2 with UniSat integration)
node store-server-v2.js

echo "🛑 Store server stopped"