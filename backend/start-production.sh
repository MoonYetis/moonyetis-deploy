#!/bin/bash

echo "🚀 Starting MoonYetis HD Wallet Server - PRODUCTION"
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

echo "🔐 Starting HD Wallet API Server..."
echo "🌐 Domain: moonyetis.io:3001"
echo "⚠️  USING REAL SEED PHRASE - PRODUCTION MODE"
echo ""

# Start the HD wallet server
node hd-wallet-server.js

echo "🛑 HD Wallet server stopped"