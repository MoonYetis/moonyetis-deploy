# 🚀 Comandos de Deployment para Hostinger VPS

## 📍 **Tu Servidor Hostinger:**
- **IP**: 168.231.124.18
- **Hostname**: srv876195.hstgr.cloud
- **Plan**: KVM 2 (2 CPU, 8GB RAM, 100GB)
- **Ubicación**: Lithuania - Vilnius

## 🎯 **PASO 1: Acceder al VPS**

### Opción A: Terminal Web (Recomendado)
1. Ve a [hpanel.hostinger.com](https://hpanel.hostinger.com)
2. Inicia sesión → Ve a **VPS** → Selecciona tu VPS
3. Haz clic en **"Browser Terminal"** o **"Web Terminal"**

### Opción B: SSH (Si tienes configurado)
```bash
ssh root@168.231.124.18
# o
ssh root@srv876195.hstgr.cloud
```

---

## 🔧 **PASO 2: Configurar Servidor (Copiar y Pegar)**

```bash
# ============================================
# 1. ACTUALIZAR SISTEMA
# ============================================
apt update && apt upgrade -y

# ============================================
# 2. INSTALAR NODE.JS 18
# ============================================
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Verificar instalación
node --version
npm --version

# ============================================
# 3. INSTALAR DEPENDENCIAS DEL SISTEMA
# ============================================
apt-get install -y git nginx postgresql postgresql-contrib

# Instalar PM2 para gestión de procesos
npm install -g pm2

# ============================================
# 4. CONFIGURAR FIREWALL
# ============================================
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw allow 3000  # App (temporal)
ufw --force enable

echo "✅ Sistema configurado correctamente"
```

---

## 📦 **PASO 3: Clonar y Configurar Aplicación**

```bash
# ============================================
# 1. CLONAR REPOSITORIO DESDE GITHUB
# ============================================
cd /var/www
git clone https://github.com/MoonYetis/moonyetis-production.git moonyetis-slots
cd moonyetis-slots

# Cambiar al branch de producción
git checkout production-deploy

# ============================================
# 2. INSTALAR DEPENDENCIAS DE NODE.JS
# ============================================
npm install --production

echo "✅ Aplicación clonada y dependencias instaladas"
```

---

## 🗄️ **PASO 4: Configurar Base de Datos PostgreSQL**

```bash
# ============================================
# 1. CONFIGURAR POSTGRESQL
# ============================================
sudo -u postgres psql << EOF
CREATE DATABASE moonyetis_slots;
CREATE USER moonyetis_user WITH ENCRYPTED PASSWORD 'MoonYetis2024!Production';
GRANT ALL PRIVILEGES ON DATABASE moonyetis_slots TO moonyetis_user;
ALTER USER moonyetis_user CREATEDB;
\q
EOF

# ============================================
# 2. EJECUTAR MIGRACIONES DE BASE DE DATOS
# ============================================
sudo -u postgres psql moonyetis_slots < migrate-production.sql

echo "✅ Base de datos configurada correctamente"
```

---

## ⚙️ **PASO 5: Configurar Variables de Entorno**

```bash
# ============================================
# 1. CREAR ARCHIVO DE CONFIGURACIÓN
# ============================================
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

# Proteger archivo de configuración
chmod 600 .env.production

echo "✅ Variables de entorno configuradas"
```

---

## 🌐 **PASO 6: Configurar Nginx**

```bash
# ============================================
# 1. CONFIGURAR NGINX
# ============================================
cp nginx-hostinger.conf /etc/nginx/sites-available/moonyetis
ln -sf /etc/nginx/sites-available/moonyetis /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Verificar configuración
nginx -t

# Si la configuración es válida, reiniciar nginx
if [ $? -eq 0 ]; then
    systemctl restart nginx
    echo "✅ Nginx configurado correctamente"
else
    echo "❌ Error en configuración de Nginx"
fi
```

---

## 🚀 **PASO 7: Iniciar Aplicación**

```bash
# ============================================
# 1. CREAR DIRECTORIOS DE LOGS
# ============================================
mkdir -p /var/log/moonyetis-slots
chown $USER:$USER /var/log/moonyetis-slots

# ============================================
# 2. INICIAR APLICACIÓN CON PM2
# ============================================
pm2 start ecosystem.config.js --env production

# Guardar configuración PM2
pm2 save

# Configurar inicio automático
pm2 startup

# Ejecutar el comando que PM2 te muestre

echo "✅ Aplicación iniciada con PM2"
```

---

## ✅ **PASO 8: Verificar Funcionamiento**

```bash
# ============================================
# 1. VERIFICAR ESTADO DE LA APLICACIÓN
# ============================================
pm2 status

# ============================================
# 2. VERIFICAR API FUNCIONANDO
# ============================================
curl http://localhost:3000/api/health

# ============================================
# 3. VERIFICAR ACCESO EXTERNO
# ============================================
curl http://168.231.124.18/api/health

# ============================================
# 4. VER LOGS EN TIEMPO REAL
# ============================================
pm2 logs moonyetis-slots
```

---

## 🎰 **¡CASINO LISTO!**

Si todo salió bien, tu MoonYetis Slots estará disponible en:

- **🌐 URL Principal**: http://168.231.124.18
- **🔗 URL Alternativa**: http://srv876195.hstgr.cloud
- **📊 API Health**: http://168.231.124.18/api/health

---

## 🆘 **Comandos de Emergencia**

```bash
# Si algo falla, revisar logs
pm2 logs moonyetis-slots

# Reiniciar aplicación
pm2 restart moonyetis-slots

# Reiniciar nginx
systemctl restart nginx

# Ver estado de servicios
systemctl status nginx postgresql

# Verificar puertos abiertos
netstat -tlnp | grep :3000
netstat -tlnp | grep :80
```

---

**🎉 ¡Deployment completado exitosamente!**

**Tu MoonYetis Slots con Advanced Wallet System está ahora live en producción! 🎰✨**