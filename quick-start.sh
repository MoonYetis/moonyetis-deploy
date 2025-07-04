#!/bin/bash

echo "🎰 Starting MoonYetis Gaming Platform..."

# Create .env if not exists
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Environment file created"
fi

# Create directories
mkdir -p logs uploads temp

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "⚠️  Node.js not found. Installing dependencies skipped."
    echo "   Install Node.js from: https://nodejs.org"
else
    # Install dependencies
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if Docker is available
if command -v docker &> /dev/null; then
    echo "🐳 Starting Docker services..."
    docker-compose up -d
    echo "⏳ Waiting for services..."
    sleep 5
fi

echo "✅ MoonYetis setup complete!"
echo "🌐 Frontend: http://localhost:3000"
echo "📊 Health: http://localhost:3000/api/health"

# Ask to start server
read -p "🚀 Start development server? (Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    if command -v node &> /dev/null; then
        npm start
    else
        echo "Install Node.js first, then run: npm start"
    fi
fi
