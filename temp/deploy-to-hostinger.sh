#!/bin/bash
# Script de Despliegue a Hostinger VPS - MoonYetis Slots Ultra-Accessible
# =======================================================================

echo "🚀 Desplegando MoonYetis Slots a Hostinger VPS"
echo "=============================================="
echo "📍 Servidor: srv876195.hstgr.cloud (168.231.124.18)"
echo "🌍 Ubicación: Lithuania - Vilnius"
echo "💻 Plan: KVM 2 (2 CPU, 8GB RAM, 100GB)"
echo ""

# Configuración del servidor
SERVER_IP="168.231.124.18"
SERVER_HOST="srv876195.hstgr.cloud"
SSH_USER="root"
DOMAIN="moonyetis-slots.com"  # Cambiar por tu dominio real
APP_DIR="/var/www/moonyetis-slots"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 PASO 1: Preparando archivos locales${NC}"
echo "========================================"

# Crear directorio temporal para deployment
mkdir -p deployment-package
echo "✅ Directorio de deployment creado"

# Copiar archivos esenciales
cp -r frontend deployment-package/
cp -r config deployment-package/
cp -r routes deployment-package/
cp -r sql deployment-package/
cp package.json deployment-package/
cp server-simple.js deployment-package/server.js
cp .env.production deployment-package/.env
cp docker-compose.yml deployment-package/
cp nginx.conf deployment-package/
cp Dockerfile deployment-package/
cp healthcheck.js deployment-package/

echo "✅ Archivos copiados al package de deployment"

# Crear script de instalación para el servidor
cat > deployment-package/install-server.sh << 'EOF'
#!/bin/bash
# Script de instalación en el servidor Hostinger

echo "🔧 Instalando dependencias en Ubuntu 22.04..."

# Actualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Instalar Docker
apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Instalar nginx
apt-get install -y nginx

# Instalar PM2 para gestión de procesos
npm install -g pm2

# Crear usuario para la aplicación
useradd -m -s /bin/bash moonyetis || echo "Usuario ya existe"

# Crear directorios
mkdir -p /var/www/moonyetis-slots
mkdir -p /var/log/moonyetis
mkdir -p /etc/ssl/moonyetis

# Configurar firewall
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw allow 3000  # App (temporal)
ufw --force enable

echo "✅ Dependencias instaladas correctamente"
EOF

chmod +x deployment-package/install-server.sh

echo "✅ Script de instalación creado"

echo ""
echo -e "${BLUE}🔧 PASO 2: Configuración personalizada para Hostinger${NC}"
echo "=================================================="

# Crear configuración de nginx específica para Hostinger
cat > deployment-package/nginx-hostinger.conf << 'EOF'
server {
    listen 80;
    server_name srv876195.hstgr.cloud 168.231.124.18;
    
    # Redirect to HTTPS (cuando tengamos SSL)
    # return 301 https://$server_name$request_uri;
    
    # Por ahora servir HTTP directamente
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
    
    # Static files
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Crear configuración de PM2
cat > deployment-package/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'moonyetis-slots',
    script: './server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_file: '/var/log/moonyetis/combined.log',
    out_file: '/var/log/moonyetis/out.log',
    error_file: '/var/log/moonyetis/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF

echo "✅ Configuraciones personalizadas creadas"

echo ""
echo -e "${BLUE}🔧 PASO 3: Comandos para ejecutar en el VPS${NC}"
echo "==========================================="

echo ""
echo -e "${YELLOW}Ejecuta estos comandos paso a paso:${NC}"
echo ""

echo -e "${GREEN}1. Conectar al servidor:${NC}"
echo "ssh root@168.231.124.18"
echo "# o"
echo "ssh root@srv876195.hstgr.cloud"
echo ""

echo -e "${GREEN}2. Subir archivos (ejecutar desde tu máquina local):${NC}"
echo "cd deployment-package"
echo "scp -r . root@168.231.124.18:/var/www/moonyetis-slots/"
echo ""

echo -e "${GREEN}3. En el servidor, instalar dependencias:${NC}"
echo "cd /var/www/moonyetis-slots"
echo "chmod +x install-server.sh"
echo "./install-server.sh"
echo ""

echo -e "${GREEN}4. Configurar nginx:${NC}"
echo "cp nginx-hostinger.conf /etc/nginx/sites-available/moonyetis"
echo "ln -s /etc/nginx/sites-available/moonyetis /etc/nginx/sites-enabled/"
echo "rm /etc/nginx/sites-enabled/default"
echo "nginx -t"
echo "systemctl restart nginx"
echo ""

echo -e "${GREEN}5. Instalar dependencias de Node.js:${NC}"
echo "npm install --production"
echo ""

echo -e "${GREEN}6. Iniciar aplicación con PM2:${NC}"
echo "pm2 start ecosystem.config.js"
echo "pm2 save"
echo "pm2 startup"
echo ""

echo -e "${GREEN}7. Verificar que funciona:${NC}"
echo "curl http://localhost:3000/health"
echo "curl http://168.231.124.18/health"
echo ""

echo ""
echo -e "${BLUE}🔧 PASO 4: Crear script automatizado${NC}"
echo "======================================="

# Crear script de despliegue automático
cat > auto-deploy.sh << 'SCRIPT'
#!/bin/bash
echo "🚀 Despliegue automático a Hostinger VPS"
echo "========================================"

SERVER="root@168.231.124.18"
APP_DIR="/var/www/moonyetis-slots"

echo "📤 Subiendo archivos..."
cd deployment-package
scp -o StrictHostKeyChecking=no -r . $SERVER:$APP_DIR/

echo "🔧 Instalando en el servidor..."
ssh -o StrictHostKeyChecking=no $SERVER << 'REMOTE'
cd /var/www/moonyetis-slots

# Hacer ejecutable e instalar dependencias
chmod +x install-server.sh
./install-server.sh

# Configurar nginx
cp nginx-hostinger.conf /etc/nginx/sites-available/moonyetis
ln -sf /etc/nginx/sites-available/moonyetis /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# Instalar dependencias Node.js
npm install --production --silent

# Parar aplicación anterior si existe
pm2 stop moonyetis-slots 2>/dev/null || echo "No hay app previa"

# Iniciar aplicación
pm2 start ecosystem.config.js
pm2 save

echo "✅ Despliegue completado"
echo "🌐 Casino disponible en: http://168.231.124.18"
echo "🏥 Health check: http://168.231.124.18/health"
REMOTE

echo "🎉 ¡Despliegue automático completado!"
echo "🌐 Accede a: http://168.231.124.18"
SCRIPT

chmod +x auto-deploy.sh

echo "✅ Script de despliegue automático creado: ./auto-deploy.sh"

echo ""
echo -e "${BLUE}📋 RESUMEN${NC}"
echo "=========="
echo -e "${GREEN}✅ Archivos preparados en: ./deployment-package/${NC}"
echo -e "${GREEN}✅ Script automático: ./auto-deploy.sh${NC}"
echo -e "${GREEN}✅ Configuraciones para Hostinger VPS listas${NC}"
echo ""
echo -e "${YELLOW}🎯 OPCIONES DE DESPLIEGUE:${NC}"
echo "1. Manual: Seguir los comandos paso a paso"
echo "2. Automático: Ejecutar ./auto-deploy.sh"
echo ""
echo -e "${BLUE}🌐 El casino estará disponible en:${NC}"
echo "   http://168.231.124.18"
echo "   http://srv876195.hstgr.cloud"
echo ""
echo -e "${RED}⚠️ IMPORTANTE:${NC}"
echo "- Asegúrate de tener acceso SSH al servidor"
echo "- El despliegue inicial puede tomar 5-10 minutos"
echo "- Configura un dominio propio para producción"
echo ""
echo "🎰 ¡MoonYetis Slots Ultra-Accessible listo para desplegarse!"