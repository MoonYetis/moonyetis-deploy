#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${CYAN}🎰 MoonYetis Slots - Server Deployment${NC}"
echo -e "${CYAN}====================================${NC}"
echo ""

# Step 1: Run server setup
echo -e "${BLUE}1️⃣ Setting up server environment...${NC}"
chmod +x server-setup.sh
./server-setup.sh

# Step 2: Deploy application
echo -e "${BLUE}2️⃣ Deploying application...${NC}"
cd /var/www
sudo tar -xzf ~/moonyetis-slots-deploy.tar.gz
if [ -d "moonyetis-slots" ]; then
    sudo rm -rf moonyetis-slots.backup
    sudo mv moonyetis-slots moonyetis-slots.backup
fi
sudo mv moonyetis-slots-deploy moonyetis-slots
sudo chown -R $USER:$USER /var/www/moonyetis-slots
cd /var/www/moonyetis-slots

# Step 3: Install dependencies
echo -e "${BLUE}3️⃣ Installing Node.js dependencies...${NC}"
npm install --production

# Step 4: Configure database
echo -e "${BLUE}4️⃣ Setting up database...${NC}"
# Database will be created by server-setup.sh, just run migrations
sudo -u postgres psql moonyetis_slots < migrate-production.sql

# Step 5: Configure environment
echo -e "${BLUE}5️⃣ Configuring environment variables...${NC}"
sed -i 's/your-domain\.com/moonyetis.io/g' .env.production
chmod 600 .env.production

# Step 6: Configure Nginx
echo -e "${BLUE}6️⃣ Configuring Nginx...${NC}"
sed -i 's/your-domain\.com/moonyetis.io/g' nginx-moonyetis.conf
sudo cp nginx-moonyetis.conf /etc/nginx/sites-available/moonyetis-slots
sudo ln -sf /etc/nginx/sites-available/moonyetis-slots /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t
sudo systemctl reload nginx

# Step 7: Setup SSL
echo -e "${BLUE}7️⃣ Setting up SSL certificates...${NC}"
sudo certbot --nginx -d moonyetis.io -d www.moonyetis.io --non-interactive --agree-tos --email admin@moonyetis.io || echo "SSL setup will be completed manually"

# Step 8: Start application
echo -e "${BLUE}8️⃣ Starting MoonYetis Slots...${NC}"
sudo mkdir -p /var/log/moonyetis-slots
sudo chown $USER:$USER /var/log/moonyetis-slots

pm2 start ecosystem.config.js --env production
pm2 save

# Configure PM2 startup
pm2 startup

echo -e "${BLUE}9️⃣ Running final verification...${NC}"
sleep 5

# Verify application is running
if pm2 list | grep -q "moonyetis-slots.*online"; then
    echo -e "${GREEN}✅ Application is running${NC}"
else
    echo -e "${RED}❌ Application failed to start${NC}"
    pm2 logs moonyetis-slots --lines 10
fi

# Test local connection
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo -e "${GREEN}✅ Local API responding${NC}"
else
    echo -e "${YELLOW}⚠️  Local API not responding yet${NC}"
fi

echo ""
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETED!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Configure your domain DNS to point to this server IP"
echo "2. Access your site at: https://moonyetis.io"
echo "3. Monitor the application: https://moonyetis.io/monitoring-dashboard.html"
echo ""
echo -e "${BLUE}📊 Useful commands:${NC}"
echo "pm2 status                    # Check application status"
echo "pm2 logs moonyetis-slots     # View application logs"
echo "curl http://localhost:3000/api/health  # Test API locally"
echo ""
echo -e "${GREEN}✅ MoonYetis Slots is now live on Fractal Bitcoin mainnet!${NC}"

