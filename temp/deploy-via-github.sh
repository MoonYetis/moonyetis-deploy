#!/bin/bash

# ===============================================
# MoonYetis Slots - GitHub Deployment Alternative
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

echo -e "${CYAN}🚀 ============================================${NC}"
echo -e "${GREEN}📦 MoonYetis - Deployment via GitHub${NC}"
echo -e "${CYAN}🚀 ============================================${NC}"
echo ""

# Configuration
REPO_NAME="moonyetis-production"
GITHUB_USER="YOUR_GITHUB_USERNAME"  # Cambiar por tu username
SERVER_IP="168.231.124.18"
SERVER_HOST="srv876195.hstgr.cloud"

echo -e "${BLUE}1️⃣ Preparando repositorio GitHub...${NC}"

# Create production ready files
echo "✅ Copiando archivos de producción..."

# Create .gitignore for production
cat > .gitignore << 'EOF'
node_modules/
logs/
*.log
.env.local
.env.development
coverage/
.DS_Store
temp/
*.tmp
.nyc_output
dist/
EOF

# Create production package.json with only essential dependencies
cat > package-production.json << 'EOF'
{
  "name": "moonyetis-slots-production",
  "version": "1.0.0",
  "description": "MoonYetis Slots Casino - Production Ready",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "production": "NODE_ENV=production node start-production.js",
    "install-deps": "npm install --production",
    "setup": "chmod +x install-server.sh && ./install-server.sh"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "compression": "^1.8.0",
    "helmet": "^7.2.0",
    "express-rate-limit": "^7.5.1",
    "ws": "^8.18.2",
    "dotenv": "^16.5.0",
    "pg": "^8.16.2",
    "axios": "^1.6.2",
    "winston": "^3.11.0"
  }
}
EOF

# Create deployment instructions for GitHub
cat > GITHUB_DEPLOY_INSTRUCTIONS.md << 'EOF'
# 🚀 Deployment via GitHub - Paso a Paso

## 1. Preparar Repositorio GitHub

```bash
# Crear nuevo repositorio en GitHub (repositorio privado recomendado)
# Nombre: moonyetis-production

# Desde terminal local:
git init
git add .
git branch -M main
git remote add origin https://github.com/TU_USERNAME/moonyetis-production.git
git commit -m "🚀 Initial production commit"
git push -u origin main
```

## 2. Comandos para ejecutar en Hostinger VPS

**Via Terminal Web de Hostinger o SSH:**

```bash
# 1. Instalar dependencias del sistema
apt update && apt upgrade -y

# 2. Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# 3. Instalar herramientas adicionales
apt-get install -y git nginx postgresql postgresql-contrib
npm install -g pm2

# 4. Clonar repositorio
cd /var/www
git clone https://github.com/TU_USERNAME/moonyetis-production.git moonyetis-slots
cd moonyetis-slots

# 5. Configurar aplicación
cp package-production.json package.json
npm install --production

# 6. Configurar base de datos
sudo -u postgres psql << EOSQL
CREATE DATABASE moonyetis_slots;
CREATE USER moonyetis_user WITH ENCRYPTED PASSWORD 'TU_PASSWORD_SEGURA';
GRANT ALL PRIVILEGES ON DATABASE moonyetis_slots TO moonyetis_user;
ALTER USER moonyetis_user CREATEDB;
\q
EOSQL

# 7. Ejecutar migraciones
sudo -u postgres psql moonyetis_slots < migrate-production.sql

# 8. Configurar variables de entorno
nano .env.production
# Configurar con tus valores específicos

# 9. Configurar Nginx
cp nginx-hostinger.conf /etc/nginx/sites-available/moonyetis
ln -sf /etc/nginx/sites-available/moonyetis /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# 10. Iniciar aplicación
mkdir -p /var/log/moonyetis-slots
chown $USER:$USER /var/log/moonyetis-slots
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# 11. Verificar funcionamiento
curl http://localhost:3000/api/health
curl http://168.231.124.18/api/health
```

## 3. Configurar dominio (si tienes uno)

```bash
# Actualizar configuración con tu dominio
sed -i 's/168\.231\.124\.18/tu-dominio.com/g' /etc/nginx/sites-available/moonyetis
nginx -t && systemctl reload nginx

# Configurar SSL
certbot --nginx -d tu-dominio.com --non-interactive --agree-tos --email admin@tu-dominio.com
```

## 4. Monitoreo y mantenimiento

```bash
# Ver logs
pm2 logs moonyetis-slots

# Reiniciar aplicación
pm2 restart moonyetis-slots

# Actualizar desde GitHub
cd /var/www/moonyetis-slots
git pull origin main
npm install --production
pm2 reload moonyetis-slots
```
EOF

echo -e "${GREEN}✅ Archivos de GitHub deployment creados${NC}"
echo ""

echo -e "${YELLOW}📋 PRÓXIMOS PASOS:${NC}"
echo ""
echo "1. 📂 Crear repositorio GitHub:"
echo "   - Ve a github.com"
echo "   - Crear nuevo repositorio 'moonyetis-production' (privado recomendado)"
echo ""
echo "2. 🔄 Subir código:"
echo "   git init"
echo "   git add ."
echo "   git branch -M main"
echo "   git remote add origin https://github.com/TU_USERNAME/moonyetis-production.git"
echo "   git commit -m \"🚀 Initial production commit\""
echo "   git push -u origin main"
echo ""
echo "3. 🖥️  En Hostinger VPS (via Terminal Web):"
echo "   - Seguir instrucciones en GITHUB_DEPLOY_INSTRUCTIONS.md"
echo ""
echo "4. 🌐 Tu casino estará disponible en:"
echo "   http://168.231.124.18"
echo "   http://srv876195.hstgr.cloud"
echo ""

echo -e "${PURPLE}💡 VENTAJAS de este método:${NC}"
echo "✅ No requiere SSH local"
echo "✅ Usa terminal web de Hostinger"
echo "✅ Fácil actualización via git pull"
echo "✅ Control de versiones completo"
echo "✅ Backup automático en GitHub"
echo ""

echo -e "${GREEN}📄 Documentación creada:${NC}"
echo "- HOSTINGER_SSH_SETUP.md (si prefieres SSH)"
echo "- GITHUB_DEPLOY_INSTRUCTIONS.md (método recomendado)"
echo ""

echo -e "${CYAN}🎰 ¡Elige el método que prefieras para continuar!${NC}"