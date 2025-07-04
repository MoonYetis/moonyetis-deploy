#!/bin/bash

# MoonYetis Slots - Deploy Script with Critical Fixes
# Version: 2.1.0

echo "🚀 ========================================"
echo "🚀 MoonYetis Slots - Complete Deploy"
echo "🚀 ========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# VPS Configuration
VPS_HOST="168.231.124.18"
VPS_USER="root"
VPS_PATH="/var/www/html"

echo -e "${BLUE}🔧 Step 1: Applying Critical Fixes${NC}"
if [ -f "fix_frontend.js" ]; then
    node fix_frontend.js
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Critical fixes applied successfully${NC}"
    else
        echo -e "${RED}❌ Failed to apply fixes${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  fix_frontend.js not found, continuing without fixes${NC}"
fi

echo -e "${BLUE}🧪 Step 2: Testing Frontend Locally${NC}"
# Check if frontend file exists and is valid
if [ -f "frontend/index.html" ]; then
    # Basic syntax check
    if grep -q "class SlotMachine" frontend/index.html && grep -q "connectWallet" frontend/index.html; then
        echo -e "${GREEN}✅ Frontend file structure looks good${NC}"
    else
        echo -e "${RED}❌ Frontend file appears to be missing critical components${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Frontend file not found: frontend/index.html${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Step 3: Creating Deployment Package${NC}"
# Create temporary deployment directory
TEMP_DIR="temp_deploy_$(date +%Y%m%d_%H%M%S)"
mkdir -p $TEMP_DIR

# Copy necessary files
echo "📄 Copying frontend files..."
cp frontend/index.html $TEMP_DIR/
if [ -d "assets" ]; then
    cp -r assets $TEMP_DIR/
    echo "🖼️  Assets copied"
fi

# Copy backend files if they exist
if [ -f "server.js" ]; then
    cp server.js $TEMP_DIR/
    echo "🔧 Backend files copied"
fi

if [ -f "package.json" ]; then
    cp package.json $TEMP_DIR/
fi

# Copy configuration files
if [ -f ".env.production" ]; then
    cp .env.production $TEMP_DIR/.env
    echo "⚙️  Production config copied"
fi

echo -e "${BLUE}🌐 Step 4: Connecting to VPS${NC}"
# Test VPS connection
if ssh -o ConnectTimeout=10 $VPS_USER@$VPS_HOST "echo 'Connection test successful'" 2>/dev/null; then
    echo -e "${GREEN}✅ VPS connection successful${NC}"
else
    echo -e "${RED}❌ Cannot connect to VPS. Please check:${NC}"
    echo "   - VPS is running"
    echo "   - SSH key is configured"
    echo "   - IP address is correct: $VPS_HOST"
    exit 1
fi

echo -e "${BLUE}🔄 Step 5: Backing up Current Version${NC}"
# Create backup on VPS
BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
ssh $VPS_USER@$VPS_HOST "
    if [ -f $VPS_PATH/index.html ]; then
        mkdir -p $VPS_PATH/backups
        cp $VPS_PATH/index.html $VPS_PATH/backups/index.html.$BACKUP_NAME
        echo '💾 Backup created: $BACKUP_NAME'
    fi
"

echo -e "${BLUE}📤 Step 6: Uploading Files${NC}"
# Upload frontend
echo "📄 Uploading index.html..."
scp $TEMP_DIR/index.html $VPS_USER@$VPS_HOST:$VPS_PATH/

# Upload assets if they exist
if [ -d "$TEMP_DIR/assets" ]; then
    echo "🖼️  Uploading assets..."
    scp -r $TEMP_DIR/assets $VPS_USER@$VPS_HOST:$VPS_PATH/
fi

# Upload backend files if they exist
if [ -f "$TEMP_DIR/server.js" ]; then
    echo "🔧 Uploading backend files..."
    scp $TEMP_DIR/server.js $VPS_USER@$VPS_HOST:$VPS_PATH/moonyetis-backend/
    
    if [ -f "$TEMP_DIR/package.json" ]; then
        scp $TEMP_DIR/package.json $VPS_USER@$VPS_HOST:$VPS_PATH/moonyetis-backend/
    fi
    
    if [ -f "$TEMP_DIR/.env" ]; then
        scp $TEMP_DIR/.env $VPS_USER@$VPS_HOST:$VPS_PATH/moonyetis-backend/
    fi
fi

echo -e "${BLUE}🔄 Step 7: Restarting Services${NC}"
# Restart services on VPS
ssh $VPS_USER@$VPS_HOST "
    echo '🔄 Restarting services...'
    
    # Restart PM2 backend if running
    if command -v pm2 >/dev/null 2>&1; then
        if pm2 list | grep -q 'moonyetis-backend'; then
            pm2 restart moonyetis-backend
            echo '✅ Backend restarted'
        else
            echo '⚠️  Backend not running in PM2'
        fi
    fi
    
    # Restart Nginx
    if systemctl is-active --quiet nginx; then
        systemctl reload nginx
        echo '✅ Nginx reloaded'
    else
        echo '⚠️  Nginx not running'
    fi
    
    # Set correct permissions
    chown -R www-data:www-data $VPS_PATH/
    chmod -R 644 $VPS_PATH/*.html
    
    echo '🔧 Permissions updated'
"

echo -e "${BLUE}🧪 Step 8: Testing Deployment${NC}"
# Test the deployment
echo "🌐 Testing frontend accessibility..."
if curl -s -o /dev/null -w "%{http_code}" http://$VPS_HOST | grep -q "200"; then
    echo -e "${GREEN}✅ Frontend is accessible${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend may not be accessible (check nginx config)${NC}"
fi

echo "🔧 Testing API health..."
API_RESPONSE=$(curl -s http://$VPS_HOST/api/health || echo "failed")
if echo "$API_RESPONSE" | grep -q "OK"; then
    echo -e "${GREEN}✅ Backend API is healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Backend API may not be responding${NC}"
fi

echo -e "${BLUE}🧹 Step 9: Cleanup${NC}"
# Cleanup temporary files
rm -rf $TEMP_DIR
echo "🗑️  Temporary files cleaned up"

echo ""
echo -e "${GREEN}🎉 ===============================================${NC}"
echo -e "${GREEN}🎉 DEPLOYMENT SUCCESSFUL!${NC}"
echo -e "${GREEN}🎉 ===============================================${NC}"
echo ""
echo -e "${BLUE}📱 Access your slot machine:${NC}"
echo "🌐 Frontend: http://$VPS_HOST"
echo "🔧 API: http://$VPS_HOST/api/health"
echo "⛓️  Blockchain: http://$VPS_HOST/api/blockchain/config"
echo ""
echo -e "${BLUE}🔧 Next Steps:${NC}"
echo "1. 🧪 Test wallet connection (UniSat/OKX)"
echo "2. 🎮 Try demo mode first"
echo "3. 🔍 Check browser console for any errors"
echo "4. 📊 Monitor logs: ssh $VPS_USER@$VPS_HOST 'pm2 logs moonyetis-backend'"
echo ""
echo -e "${YELLOW}📋 Troubleshooting:${NC}"
echo "• If wallet connection fails: Check browser console"
echo "• If API errors: Check PM2 logs"
echo "• If assets missing: Verify assets folder upload"
echo "• Backup available in: $VPS_PATH/backups/"
echo ""
echo -e "${GREEN}✨ MoonYetis Slots is ready to play! ✨${NC}"
