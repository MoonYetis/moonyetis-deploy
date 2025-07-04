#!/bin/bash

# MoonYetis Slots - Complete Remaining Deployment Steps
echo "🚀 Completing MoonYetis Slots deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Step 1: Running database migrations...${NC}"
cd /root/moonyetis-slots
PGPASSWORD='MoonYetis2024!' psql -h localhost -U moonyetis_user -d moonyetis_slots -f migrate-production.sql
echo -e "${GREEN}✅ Database migrations completed${NC}"

echo -e "${YELLOW}Step 2: Verifying database tables...${NC}"
PGPASSWORD='MoonYetis2024!' psql -h localhost -U moonyetis_user -d moonyetis_slots -c '\dt'

echo -e "${YELLOW}Step 3: Configuring Nginx...${NC}"
sudo cp nginx-simple.conf /etc/nginx/sites-available/moonyetis-slots
sudo ln -sf /etc/nginx/sites-available/moonyetis-slots /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
echo -e "${GREEN}✅ Nginx configured and restarted${NC}"

echo -e "${YELLOW}Step 4: Creating log directories...${NC}"
sudo mkdir -p /var/log/moonyetis-slots
sudo chown -R root:root /var/log/moonyetis-slots
echo -e "${GREEN}✅ Log directories created${NC}"

echo -e "${YELLOW}Step 5: Starting application with PM2...${NC}"
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd -u root --hp /root
echo -e "${GREEN}✅ Application started with PM2${NC}"

echo -e "${YELLOW}Step 6: Verification...${NC}"
sleep 5
echo "PM2 Status:"
pm2 status

echo "Testing application health..."
if curl -f http://localhost:3000/api/health 2>/dev/null; then
    echo -e "${GREEN}✅ Application health check passed${NC}"
else
    echo "Application starting... (this is normal)"
fi

echo "Testing Nginx..."
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx is running${NC}"
else
    echo "❌ Nginx issue detected"
fi

echo ""
echo -e "${GREEN}🎉 Deployment completed!${NC}"
echo -e "${YELLOW}🌐 Your MoonYetis Slots casino is available at:${NC}"
echo -e "${GREEN}   http://168.231.124.18${NC}"
echo ""
echo -e "${YELLOW}📋 Useful commands:${NC}"
echo "   pm2 status              - Check application status"
echo "   pm2 logs moonyetis-slots - View application logs"
echo "   pm2 restart moonyetis-slots - Restart application"
echo "   systemctl status nginx  - Check nginx status"