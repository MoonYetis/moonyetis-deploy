#!/bin/bash

# 🚀 MoonYetis Deploy Script
# Automatiza el deploy completo al VPS

echo "🚀 MoonYetis Deploy Starting..."
echo "=================================="

# Variables
VPS_IP="168.231.124.18"
VPS_USER="root"
PROJECT_NAME="moonyetis-backend"
LOCAL_DIR="."
REMOTE_DIR="/var/www/html"

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📦 Step 1: Compressing project...${NC}"
# Comprimir proyecto (excluyendo archivos innecesarios)
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='.DS_Store' \
    --exclude='*.log' \
    --exclude='deploy.sh' \
    -czf ${PROJECT_NAME}-deploy.tar.gz .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Project compressed successfully${NC}"
else
    echo -e "${RED}❌ Error compressing project${NC}"
    exit 1
fi

echo -e "${YELLOW}🚀 Step 2: Uploading to VPS...${NC}"
# Subir archivo al VPS
scp ${PROJECT_NAME}-deploy.tar.gz ${VPS_USER}@${VPS_IP}:${REMOTE_DIR}/

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Upload successful${NC}"
else
    echo -e "${RED}❌ Error uploading to VPS${NC}"
    exit 1
fi

echo -e "${YELLOW}⚙️  Step 3: Deploying on VPS...${NC}"
# Conectar al VPS y ejecutar comandos de deploy
ssh ${VPS_USER}@${VPS_IP} << 'EOF'
cd /var/www/html

echo "🗂️  Backing up current version..."
if [ -d "moonyetis-backend-backup" ]; then
    rm -rf moonyetis-backend-backup
fi
if [ -d "moonyetis-backend" ]; then
    mv moonyetis-backend moonyetis-backend-backup
fi

echo "📦 Extracting new version..."
tar -xzf moonyetis-backend-deploy.tar.gz -C moonyetis-backend/ --strip-components=0 || {
    mkdir -p moonyetis-backend
    tar -xzf moonyetis-backend-deploy.tar.gz -C moonyetis-backend/
}

cd moonyetis-backend

echo "📚 Installing dependencies..."
npm install --production

echo "🔄 Restarting backend..."
pm2 restart moonyetis-backend 2>/dev/null || pm2 start server.js --name "moonyetis-backend"

echo "🌐 Reloading Nginx..."
systemctl reload nginx

echo "🧹 Cleaning up..."
rm -f /var/www/html/moonyetis-backend-deploy.tar.gz

echo "✅ Deploy completed successfully!"
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ VPS deployment successful${NC}"
else
    echo -e "${RED}❌ Error during VPS deployment${NC}"
    exit 1
fi

echo -e "${YELLOW}🔍 Step 4: Verifying deployment...${NC}"
# Verificar que la API responde
sleep 3
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://${VPS_IP}/api/health)

if [ "$API_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ API is responding correctly${NC}"
    echo -e "${GREEN}🎉 DEPLOY SUCCESSFUL!${NC}"
    echo -e "${GREEN}🌐 Your app is live at: http://${VPS_IP}${NC}"
else
    echo -e "${RED}❌ API not responding (HTTP: $API_RESPONSE)${NC}"
    echo -e "${YELLOW}⚠️  Check VPS logs: ssh ${VPS_USER}@${VPS_IP} 'pm2 logs'${NC}"
fi

# Limpiar archivo local
rm -f ${PROJECT_NAME}-deploy.tar.gz

echo "=================================="
echo -e "${GREEN}🚀 MoonYetis Deploy Complete!${NC}"
