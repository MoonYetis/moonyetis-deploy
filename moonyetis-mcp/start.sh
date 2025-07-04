#!/bin/bash

# MoonYetis Casino MCP Server Startup Script
# Ensures all dependencies are met and starts the server properly

set -e

echo "🎰 Starting MoonYetis Casino MCP Server..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the correct directory?"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Copying from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created .env file. Please configure it with your actual values."
    else
        echo "❌ Error: .env.example not found. Cannot create .env file."
        exit 1
    fi
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js version 18 or higher is required. Current version: $(node --version)"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check database connection
echo "🔗 Testing database connection..."
node -e "
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.query('SELECT 1', (err, result) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Database connection successful');
        pool.end();
    }
});
" || {
    echo "❌ Database connection failed. Please check your .env configuration."
    exit 1
}

# Run database migrations
echo "🗄️  Running database setup..."
if command -v psql > /dev/null; then
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f config/database.sql
    echo "✅ Database setup completed"
else
    echo "⚠️  psql not found. Skipping database setup. Make sure tables are created manually."
fi

# Check if all required environment variables are set
echo "🔧 Checking environment configuration..."
required_vars=(
    "DB_HOST"
    "DB_PORT" 
    "DB_NAME"
    "DB_USER"
    "DB_PASSWORD"
    "JWT_SECRET"
    "SESSION_SECRET"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo "❌ Missing required environment variables:"
    printf ' - %s\n' "${missing_vars[@]}"
    echo "Please configure these in your .env file."
    exit 1
fi

echo "✅ Environment configuration check passed"

# Start the MCP server
echo "🚀 Starting MoonYetis Casino MCP Server..."
echo "📊 Server will be available for Claude Desktop integration"
echo "🔗 Database: $DB_HOST:$DB_PORT/$DB_NAME"
echo "🎰 Casino features: Real-time monitoring, security alerts, player analytics"
echo ""

# Export required variables for Node.js
export NODE_ENV="${NODE_ENV:-production}"
export LOG_LEVEL="${LOG_LEVEL:-info}"

# Start the server with proper error handling
exec node src/index.js