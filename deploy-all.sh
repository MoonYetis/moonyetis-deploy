#!/bin/bash

echo "🚀 MoonYetis Complete Production Deployment"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root or with sudo"
   exit 1
fi

print_step "1/3 - Deploying Backend Services"
echo "================================="
bash /var/www/moonyetis-backend/backend/deploy-production.sh

if [ $? -eq 0 ]; then
    print_status "✅ Backend deployment completed successfully"
else
    print_error "❌ Backend deployment failed"
    exit 1
fi

print_step "2/3 - Deploying Frontend"
echo "========================="
bash /var/www/moonyetis-backend/frontend/deploy-frontend.sh

if [ $? -eq 0 ]; then
    print_status "✅ Frontend deployment completed successfully"
else
    print_error "❌ Frontend deployment failed"
    exit 1
fi

print_step "3/3 - Final System Check"
echo "========================="

# Check if PM2 is running
print_status "Checking PM2 status..."
pm2 status

# Check if Nginx is running
print_status "Checking Nginx status..."
systemctl status nginx --no-pager

# Check if ports are open
print_status "Checking port availability..."
ss -tlnp | grep -E ':80|:443|:3002'

print_status "🎉 Complete deployment finished!"
print_status "==============================="
print_status "🌐 Website: http://moonyetis.io"
print_status "🏪 Store API: http://moonyetis.io:3002"
print_status "📊 API via Nginx: http://moonyetis.io/api"
print_status ""
print_status "Useful commands:"
print_status "  pm2 status        - Check application status"
print_status "  pm2 logs          - View application logs"
print_status "  pm2 restart all   - Restart all services"
print_status "  nginx -t          - Test Nginx configuration"
print_status "  systemctl restart nginx - Restart Nginx"