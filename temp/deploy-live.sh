#!/bin/bash

# =======================================================
# MoonYetis Slots - Live Deployment Script
# =======================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🎰 ============================================${NC}"
echo -e "${GREEN}🚀 MoonYetis Slots - Live Deployment${NC}"
echo -e "${CYAN}🎰 ============================================${NC}"
echo ""

# Check if parameters are provided
if [ $# -lt 3 ]; then
    echo -e "${RED}❌ Usage: $0 <server_ip> <ssh_user> <domain>${NC}"
    echo -e "${YELLOW}💡 Example: $0 192.168.1.100 root moonyetis.com${NC}"
    exit 1
fi

SERVER_IP="$1"
SSH_USER="$2"
DOMAIN="$3"

echo -e "${BLUE}📋 Deployment Configuration:${NC}"
echo -e "${GREEN}🖥️  Server IP:${NC} $SERVER_IP"
echo -e "${GREEN}👤 SSH User:${NC} $SSH_USER"
echo -e "${GREEN}🌐 Domain:${NC} $DOMAIN"
echo ""

# Verify files exist
echo -e "${BLUE}1️⃣ Verifying deployment files...${NC}"
REQUIRED_FILES=("moonyetis-slots-deploy.tar.gz" "server-setup.sh")

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Required file missing: $file${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Found: $file${NC}"
done

# Test SSH connection
echo -e "${BLUE}2️⃣ Testing SSH connection...${NC}"
if ssh -o ConnectTimeout=10 -o BatchMode=yes "$SSH_USER@$SERVER_IP" exit 2>/dev/null; then
    echo -e "${GREEN}✅ SSH connection successful${NC}"
else
    echo -e "${YELLOW}⚠️  SSH connection test failed (may require password)${NC}"
    echo -e "${BLUE}💡 Continuing with deployment...${NC}"
fi

# Upload files
echo -e "${BLUE}3️⃣ Uploading files to server...${NC}"
echo -e "${YELLOW}📤 Uploading deployment package...${NC}"
scp moonyetis-slots-deploy.tar.gz "$SSH_USER@$SERVER_IP":~/

echo -e "${YELLOW}📤 Uploading server setup script...${NC}"
scp server-setup.sh "$SSH_USER@$SERVER_IP":~/

echo -e "${GREEN}✅ Files uploaded successfully${NC}"

# Create deployment script for server
echo -e "${BLUE}4️⃣ Creating server deployment script...${NC}"
cat > temp-deploy-on-server.sh << EOF
#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "\${CYAN}🎰 MoonYetis Slots - Server Deployment\${NC}"
echo -e "\${CYAN}====================================\${NC}"
echo ""

# Step 1: Run server setup
echo -e "\${BLUE}1️⃣ Setting up server environment...\${NC}"
chmod +x server-setup.sh
./server-setup.sh

# Step 2: Deploy application
echo -e "\${BLUE}2️⃣ Deploying application...\${NC}"
cd /var/www
sudo tar -xzf ~/moonyetis-slots-deploy.tar.gz
if [ -d "moonyetis-slots" ]; then
    sudo rm -rf moonyetis-slots.backup
    sudo mv moonyetis-slots moonyetis-slots.backup
fi
sudo mv moonyetis-slots-deploy moonyetis-slots
sudo chown -R \$USER:\$USER /var/www/moonyetis-slots
cd /var/www/moonyetis-slots

# Step 3: Install dependencies
echo -e "\${BLUE}3️⃣ Installing Node.js dependencies...\${NC}"
npm install --production

# Step 4: Configure database
echo -e "\${BLUE}4️⃣ Setting up database...\${NC}"
# Database will be created by server-setup.sh, just run migrations
sudo -u postgres psql moonyetis_slots < migrate-production.sql

# Step 5: Configure environment
echo -e "\${BLUE}5️⃣ Configuring environment variables...\${NC}"
sed -i 's/your-domain\.com/$DOMAIN/g' .env.production
chmod 600 .env.production

# Step 6: Configure Nginx
echo -e "\${BLUE}6️⃣ Configuring Nginx...\${NC}"
sed -i 's/your-domain\.com/$DOMAIN/g' nginx-moonyetis.conf
sudo cp nginx-moonyetis.conf /etc/nginx/sites-available/moonyetis-slots
sudo ln -sf /etc/nginx/sites-available/moonyetis-slots /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t
sudo systemctl reload nginx

# Step 7: Setup SSL
echo -e "\${BLUE}7️⃣ Setting up SSL certificates...\${NC}"
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN || echo "SSL setup will be completed manually"

# Step 8: Start application
echo -e "\${BLUE}8️⃣ Starting MoonYetis Slots...\${NC}"
sudo mkdir -p /var/log/moonyetis-slots
sudo chown \$USER:\$USER /var/log/moonyetis-slots

pm2 start ecosystem.config.js --env production
pm2 save

# Configure PM2 startup
pm2 startup

echo -e "\${BLUE}9️⃣ Running final verification...\${NC}"
sleep 5

# Verify application is running
if pm2 list | grep -q "moonyetis-slots.*online"; then
    echo -e "\${GREEN}✅ Application is running\${NC}"
else
    echo -e "\${RED}❌ Application failed to start\${NC}"
    pm2 logs moonyetis-slots --lines 10
fi

# Test local connection
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo -e "\${GREEN}✅ Local API responding\${NC}"
else
    echo -e "\${YELLOW}⚠️  Local API not responding yet\${NC}"
fi

echo ""
echo -e "\${GREEN}🎉 DEPLOYMENT COMPLETED!\${NC}"
echo ""
echo -e "\${BLUE}📋 Next steps:\${NC}"
echo "1. Configure your domain DNS to point to this server IP"
echo "2. Access your site at: https://$DOMAIN"
echo "3. Monitor the application: https://$DOMAIN/monitoring-dashboard.html"
echo ""
echo -e "\${BLUE}📊 Useful commands:\${NC}"
echo "pm2 status                    # Check application status"
echo "pm2 logs moonyetis-slots     # View application logs"
echo "curl http://localhost:3000/api/health  # Test API locally"
echo ""
echo -e "\${GREEN}✅ MoonYetis Slots is now live on Fractal Bitcoin mainnet!\${NC}"

EOF

# Upload and execute deployment script
echo -e "${YELLOW}📤 Uploading deployment script to server...${NC}"
scp temp-deploy-on-server.sh "$SSH_USER@$SERVER_IP":~/deploy-on-server.sh

echo -e "${BLUE}5️⃣ Executing deployment on server...${NC}"
echo -e "${YELLOW}🚀 This will take 5-15 minutes depending on server speed...${NC}"
echo ""

ssh "$SSH_USER@$SERVER_IP" "chmod +x deploy-on-server.sh && ./deploy-on-server.sh"

# Clean up temporary file
rm temp-deploy-on-server.sh

echo ""
echo -e "${CYAN}🎰 ============================================${NC}"
echo -e "${GREEN}🎉 LIVE DEPLOYMENT COMPLETED!${NC}"
echo -e "${CYAN}🎰 ============================================${NC}"
echo ""
echo -e "${BLUE}🌐 Your MoonYetis Slots is now live at:${NC}"
echo -e "${GREEN}   Website: https://$DOMAIN${NC}"
echo -e "${GREEN}   Monitoring: https://$DOMAIN/monitoring-dashboard.html${NC}"
echo -e "${GREEN}   API Health: https://$DOMAIN/api/health${NC}"
echo ""
echo -e "${BLUE}📊 Final verification commands:${NC}"
echo -e "${YELLOW}   curl https://$DOMAIN/api/health${NC}"
echo -e "${YELLOW}   curl https://$DOMAIN/api/monitoring/health${NC}"
echo ""
echo -e "${GREEN}✅ MoonYetis Slots is ready for players!${NC} 🎰✨"
echo ""
EOF