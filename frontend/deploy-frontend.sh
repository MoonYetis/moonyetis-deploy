#!/bin/bash

echo "🌐 MoonYetis Frontend Deployment Script"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root or with sudo"
   exit 1
fi

# Navigate to frontend directory
FRONTEND_DIR="/var/www/moonyetis-frontend"
print_status "Setting up frontend directory: $FRONTEND_DIR"

# Create frontend directory if it doesn't exist
mkdir -p $FRONTEND_DIR

# Copy all frontend files
print_status "Copying frontend files..."
cp -r /var/www/moonyetis-backend/frontend/* $FRONTEND_DIR/

# Set proper permissions
print_status "Setting file permissions..."
chown -R www-data:www-data $FRONTEND_DIR
chmod -R 755 $FRONTEND_DIR

# Update API endpoints in JavaScript files to use production URLs
print_status "Updating API endpoints for production..."

# Update config.js if it exists
if [ -f "$FRONTEND_DIR/js/config.js" ]; then
    sed -i 's/localhost:3002/moonyetis.io\/api/g' "$FRONTEND_DIR/js/config.js"
    sed -i 's/127.0.0.1:3002/moonyetis.io\/api/g' "$FRONTEND_DIR/js/config.js"
fi

# Update any other JavaScript files that might contain API endpoints
find $FRONTEND_DIR -name "*.js" -type f -exec sed -i 's/localhost:3002/moonyetis.io\/api/g' {} \;
find $FRONTEND_DIR -name "*.js" -type f -exec sed -i 's/127.0.0.1:3002/moonyetis.io\/api/g' {} \;

# Update HTML files
find $FRONTEND_DIR -name "*.html" -type f -exec sed -i 's/localhost:3002/moonyetis.io\/api/g' {} \;
find $FRONTEND_DIR -name "*.html" -type f -exec sed -i 's/127.0.0.1:3002/moonyetis.io\/api/g' {} \;

print_status "✅ Frontend deployment completed successfully!"
print_status "🌐 Frontend is now available at: http://moonyetis.io"
print_status "🏪 API endpoints configured for: http://moonyetis.io/api"