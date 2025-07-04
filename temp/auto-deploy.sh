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
