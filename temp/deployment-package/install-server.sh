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
