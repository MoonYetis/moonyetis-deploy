#!/bin/bash

# ===============================================
# MoonYetis Slots - Direct SSH Deployment Script
# ===============================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SERVER_IP="168.231.124.18"
SERVER_HOST="srv876195.hstgr.cloud"
SERVER_USER="root"
REPO_URL="https://github.com/MoonYetis/moonyetis-production.git"
APP_DIR="/var/www/moonyetis-slots"

echo -e "${CYAN}🚀 ============================================${NC}"
echo -e "${GREEN}🎰 MoonYetis Slots - Direct SSH Deployment${NC}"
echo -e "${CYAN}🚀 ============================================${NC}"
echo ""

echo -e "${BLUE}📋 Deployment Configuration:${NC}"
echo "   🖥️  Server: $SERVER_IP ($SERVER_HOST)"
echo "   👤 User: $SERVER_USER"
echo "   📦 Repository: $REPO_URL"
echo "   📁 App Directory: $APP_DIR"
echo ""

# Test SSH connection
echo -e "${BLUE}1️⃣ Testing SSH connection...${NC}"
if ssh -o ConnectTimeout=10 -o BatchMode=yes $SERVER_USER@$SERVER_IP exit 2>/dev/null; then
    echo -e "${GREEN}✅ SSH connection successful${NC}"
else
    echo -e "${RED}❌ SSH connection failed${NC}"
    echo -e "${YELLOW}💡 Make sure you can access: ssh $SERVER_USER@$SERVER_IP${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}2️⃣ Deploying to server...${NC}"

# Execute deployment on server
ssh $SERVER_USER@$SERVER_IP << 'DEPLOY_SCRIPT'

# Colors for remote output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Starting server configuration...${NC}"

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
apt update && apt upgrade -y

# Install Node.js 18
echo -e "${YELLOW}📦 Installing Node.js 18...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    apt-get install -y nodejs
fi

echo "   Node.js version: $(node --version)"
echo "   NPM version: $(npm --version)"

# Install system dependencies
echo -e "${YELLOW}📦 Installing system dependencies...${NC}"
apt-get install -y git nginx postgresql postgresql-contrib

# Install PM2
echo -e "${YELLOW}📦 Installing PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# Configure firewall
echo -e "${YELLOW}🔒 Configuring firewall...${NC}"
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw allow 3000  # App (temporal)
ufw --force enable

# Clone or update repository
echo -e "${YELLOW}📦 Setting up application...${NC}"
if [ -d "/var/www/moonyetis-slots" ]; then
    echo "   Updating existing repository..."
    cd /var/www/moonyetis-slots
    git pull origin production-deploy
else
    echo "   Cloning repository..."
    cd /var/www
    git clone https://github.com/MoonYetis/moonyetis-production.git moonyetis-slots
    cd moonyetis-slots
    git checkout production-deploy
fi

# Install Node.js dependencies
echo -e "${YELLOW}📦 Installing Node.js dependencies...${NC}"
npm install --production

# Configure PostgreSQL
echo -e "${YELLOW}🗄️ Configuring PostgreSQL...${NC}"
sudo -u postgres psql << EOF
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'moonyetis_slots') THEN
        CREATE DATABASE moonyetis_slots;
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'moonyetis_user') THEN
        CREATE USER moonyetis_user WITH ENCRYPTED PASSWORD 'MoonYetis2024!Production';
        GRANT ALL PRIVILEGES ON DATABASE moonyetis_slots TO moonyetis_user;
        ALTER USER moonyetis_user CREATEDB;
    END IF;
END
\$\$;
EOF

# Run database migrations
echo -e "${YELLOW}🗄️ Running database migrations...${NC}"
if [ -f "migrate-production.sql" ]; then
    sudo -u postgres psql moonyetis_slots < migrate-production.sql
fi

# Create environment configuration
echo -e "${YELLOW}⚙️ Creating environment configuration...${NC}"
cat > .env.production << EOF
# Production Environment Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Domain Configuration
DOMAIN=168.231.124.18
ALLOWED_ORIGINS=http://168.231.124.18,https://168.231.124.18,http://srv876195.hstgr.cloud,https://srv876195.hstgr.cloud

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=moonyetis_slots
DB_USER=moonyetis_user
DB_PASSWORD=MoonYetis2024!Production

# Fractal Bitcoin Configuration (Mainnet)
FRACTAL_BITCOIN_NETWORK=mainnet
FRACTAL_RPC_USER=fractal_user
FRACTAL_RPC_PASSWORD=secure_password_here
FRACTAL_RPC_HOST=127.0.0.1
FRACTAL_RPC_PORT=8332

# Security
SESSION_SECRET=ultra_secure_session_secret_production_2024
JWT_SECRET=ultra_secure_jwt_secret_production_2024

# Rate Limiting
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW=900000

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/moonyetis-slots/app.log
EOF

chmod 600 .env.production

# Configure Nginx
echo -e "${YELLOW}🌐 Configuring Nginx...${NC}"
if [ -f "nginx-hostinger.conf" ]; then
    cp nginx-hostinger.conf /etc/nginx/sites-available/moonyetis
    ln -sf /etc/nginx/sites-available/moonyetis /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test and restart nginx
    if nginx -t; then
        systemctl restart nginx
        echo -e "${GREEN}   ✅ Nginx configured successfully${NC}"
    else
        echo -e "${RED}   ❌ Nginx configuration error${NC}"
    fi
fi

# Create log directories
echo -e "${YELLOW}📋 Creating log directories...${NC}"
mkdir -p /var/log/moonyetis-slots
chown $USER:$USER /var/log/moonyetis-slots

# Stop previous application if running
echo -e "${YELLOW}🔄 Managing application process...${NC}"
pm2 stop moonyetis-slots 2>/dev/null || echo "   No previous instance running"

# Start application with PM2
echo -e "${YELLOW}🚀 Starting application...${NC}"
if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js --env production
else
    # Fallback to direct start
    pm2 start start-production.js --name moonyetis-slots --env production
fi

# Save PM2 configuration
pm2 save

# Configure PM2 startup
pm2 startup

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Application Status:${NC}"
pm2 status

echo ""
echo -e "${BLUE}🧪 Testing application...${NC}"
sleep 3

# Test local API
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo -e "${GREEN}   ✅ Local API responding${NC}"
else
    echo -e "${RED}   ❌ Local API not responding${NC}"
fi

# Test external access
if curl -s http://168.231.124.18/api/health > /dev/null; then
    echo -e "${GREEN}   ✅ External access working${NC}"
else
    echo -e "${YELLOW}   ⚠️ External access may need configuration${NC}"
fi

echo ""
echo -e "${CYAN}🎰 ============================================${NC}"
echo -e "${GREEN}🎉 MoonYetis Slots is now LIVE!${NC}"
echo -e "${CYAN}🎰 ============================================${NC}"
echo ""
echo -e "${BLUE}🌐 Access your casino at:${NC}"
echo "   • http://168.231.124.18"
echo "   • http://srv876195.hstgr.cloud"
echo ""
echo -e "${BLUE}📊 Management commands:${NC}"
echo "   • pm2 status                  - Check status"
echo "   • pm2 logs moonyetis-slots    - View logs"
echo "   • pm2 restart moonyetis-slots - Restart app"
echo ""

DEPLOY_SCRIPT

echo ""
echo -e "${GREEN}🎉 Remote deployment completed!${NC}"
echo ""
echo -e "${BLUE}🌐 Your MoonYetis Slots casino is now live at:${NC}"
echo "   • http://168.231.124.18"
echo "   • http://srv876195.hstgr.cloud"
echo ""
echo -e "${YELLOW}💡 Next steps:${NC}"
echo "   1. Test the casino functionality"
echo "   2. Configure domain name (if you have one)"
echo "   3. Set up SSL certificates for HTTPS"
echo ""
echo -e "${CYAN}🎰 Deployment completed successfully! 🎰${NC}"