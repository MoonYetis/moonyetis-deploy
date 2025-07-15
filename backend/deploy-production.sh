#!/bin/bash

# MoonYetis Production Deployment Script
# This script helps deploy the MoonYetis backend services to production

echo "🚀 MoonYetis Production Deployment"
echo "=================================="
echo ""

# Configuration
DEPLOY_USER="root"
DEPLOY_HOST="168.231.124.18"
DEPLOY_PATH="/root/moonyetis-deploy"
LOCAL_PATH="$(pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    print_error "This script must be run from the backend directory"
    exit 1
fi

# Step 1: Generate secrets if needed
echo ""
echo "📝 Step 1: Security Configuration"
echo "---------------------------------"
if [ ! -f ".env" ]; then
    print_warning ".env file not found locally"
    echo "Please create .env from .env.example and configure it"
    exit 1
fi

read -p "Have you updated the WEBHOOK_SECRET and ADMIN_KEY in .env? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Running secret generator..."
    ./generate-secrets.sh
    echo ""
    print_warning "Please update .env with the generated secrets before continuing"
    exit 1
fi

# Step 2: Test connection
echo ""
echo "🔗 Step 2: Testing SSH Connection"
echo "---------------------------------"
ssh -o ConnectTimeout=5 $DEPLOY_USER@$DEPLOY_HOST "echo 'SSH connection successful'" 2>/dev/null
if [ $? -eq 0 ]; then
    print_status "SSH connection successful"
else
    print_error "SSH connection failed. Please check your credentials"
    exit 1
fi

# Step 3: Create deployment package
echo ""
echo "📦 Step 3: Creating Deployment Package"
echo "-------------------------------------"
DEPLOY_PACKAGE="moonyetis-backend-$(date +%Y%m%d-%H%M%S).tar.gz"

# Files to include in deployment
tar -czf $DEPLOY_PACKAGE \
    *.js \
    services/*.js \
    package.json \
    package-lock.json \
    .env \
    *.sh \
    ecosystem.config.js \
    *.service \
    --exclude=node_modules \
    --exclude=*.log \
    --exclude=deploy-production.sh

if [ $? -eq 0 ]; then
    print_status "Deployment package created: $DEPLOY_PACKAGE"
else
    print_error "Failed to create deployment package"
    exit 1
fi

# Step 4: Upload to server
echo ""
echo "📤 Step 4: Uploading to Server"
echo "------------------------------"
scp $DEPLOY_PACKAGE $DEPLOY_USER@$DEPLOY_HOST:/tmp/
if [ $? -eq 0 ]; then
    print_status "Package uploaded successfully"
else
    print_error "Failed to upload package"
    rm $DEPLOY_PACKAGE
    exit 1
fi

# Step 5: Deploy on server
echo ""
echo "🚀 Step 5: Deploying on Server"
echo "------------------------------"

ssh $DEPLOY_USER@$DEPLOY_HOST << 'ENDSSH'
set -e

echo "Creating backup..."
if [ -d "/root/moonyetis-deploy/backend" ]; then
    cp -r /root/moonyetis-deploy/backend /root/moonyetis-deploy/backend.backup.$(date +%Y%m%d-%H%M%S)
fi

echo "Creating directories..."
mkdir -p /root/moonyetis-deploy/backend
mkdir -p /root/moonyetis-deploy/backend/services
mkdir -p /root/moonyetis-deploy/backend/logs
mkdir -p /var/log/moonyetis

echo "Extracting deployment package..."
cd /root/moonyetis-deploy/backend
tar -xzf /tmp/moonyetis-backend-*.tar.gz

echo "Setting permissions..."
chmod 600 .env
chmod +x *.sh

echo "Installing dependencies..."
npm install --production

echo "Checking for PM2..."
if command -v pm2 &> /dev/null; then
    echo "PM2 found, using PM2 for deployment..."
    
    # Stop existing services
    pm2 stop all || true
    
    # Start services
    pm2 start ecosystem.config.js
    
    # Save PM2 configuration
    pm2 save
    
    # Show status
    pm2 status
else
    echo "PM2 not found, using systemd..."
    
    # Copy service files
    sudo cp moonyetis-*.service /etc/systemd/system/
    
    # Reload systemd
    sudo systemctl daemon-reload
    
    # Stop existing services
    sudo systemctl stop moonyetis-wallet || true
    sudo systemctl stop moonyetis-store || true
    
    # Start services
    sudo systemctl start moonyetis-wallet
    sudo systemctl start moonyetis-store
    
    # Enable services
    sudo systemctl enable moonyetis-wallet
    sudo systemctl enable moonyetis-store
    
    # Show status
    sudo systemctl status moonyetis-wallet --no-pager
    sudo systemctl status moonyetis-store --no-pager
fi

echo "Cleaning up..."
rm -f /tmp/moonyetis-backend-*.tar.gz

echo "Deployment complete!"
ENDSSH

if [ $? -eq 0 ]; then
    print_status "Deployment successful!"
else
    print_error "Deployment failed"
    rm $DEPLOY_PACKAGE
    exit 1
fi

# Step 6: Verify deployment
echo ""
echo "✅ Step 6: Verifying Deployment"
echo "-------------------------------"

# Clean up local package
rm $DEPLOY_PACKAGE

# Test endpoints
echo "Testing endpoints..."
sleep 5 # Give services time to start

# Test store health
curl -s http://$DEPLOY_HOST:3002/api/store/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_status "Store API is responding"
else
    print_warning "Store API is not responding yet. Please check logs"
fi

# Test wallet API
curl -s http://$DEPLOY_HOST:3001/api/deposit/addresses > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_status "Wallet API is responding"
else
    print_warning "Wallet API is not responding yet. Please check logs"
fi

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "📊 Next Steps:"
echo "1. Monitor logs: ssh $DEPLOY_USER@$DEPLOY_HOST 'pm2 logs' (or journalctl -f)"
echo "2. Check endpoints:"
echo "   - Store Health: curl http://$DEPLOY_HOST:3002/api/store/health"
echo "   - Store Prices: curl http://$DEPLOY_HOST:3002/api/store/prices"
echo "   - Monitor Status: curl http://$DEPLOY_HOST:3002/api/store/monitor-status"
echo "3. Test frontend integration"
echo "4. Monitor first transactions carefully"
echo ""
print_warning "Remember to monitor the first 24 hours closely!"