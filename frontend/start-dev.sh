#!/bin/bash

# Development server startup script for MoonYetis frontend

echo "🚀 Starting MoonYetis development server..."

# Check if dependencies exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🔧 Starting Vite development server..."
npm run dev