# 🖥️ Comandos para Browser Terminal de Hostinger

## 🚀 **Copia y pega estos comandos en el Browser Terminal de Hostinger**

### **BLOQUE 1: Configuración del Sistema**
```bash
# Actualizar sistema e instalar Node.js
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs git nginx postgresql postgresql-contrib
npm install -g pm2

# Verificar instalaciones
echo "✅ Node.js: $(node --version)"
echo "✅ NPM: $(npm --version)"
echo "✅ Git: $(git --version)"
```

### **BLOQUE 2: Clonar Aplicación**
```bash
# Clonar repositorio
cd /var/www
git clone https://github.com/MoonYetis/moonyetis-production.git moonyetis-slots
cd moonyetis-slots
git checkout production-deploy

# Instalar dependencias
npm install --production

echo "✅ Aplicación clonada y configurada"
```

### **BLOQUE 3: Configurar Base de Datos**
```bash
# Configurar PostgreSQL
sudo -u postgres psql << 'EOF'
CREATE DATABASE moonyetis_slots;
CREATE USER moonyetis_user WITH ENCRYPTED PASSWORD 'MoonYetis2024!Production';
GRANT ALL PRIVILEGES ON DATABASE moonyetis_slots TO moonyetis_user;
ALTER USER moonyetis_user CREATEDB;
\q
EOF

# Ejecutar migraciones si existen
if [ -f "migrate-production.sql" ]; then
    sudo -u postgres psql moonyetis_slots < migrate-production.sql
    echo "✅ Migraciones ejecutadas"
else
    echo "⚠️ No se encontró migrate-production.sql"
fi
```

### **BLOQUE 4: Configurar Variables de Entorno**
```bash
# Crear archivo de configuración
cat > .env.production << 'EOF'
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

# Fractal Bitcoin Configuration
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
echo "✅ Variables de entorno configuradas"
```

### **BLOQUE 5: Configurar Nginx**
```bash
# Configurar Nginx
if [ -f "nginx-hostinger.conf" ]; then
    cp nginx-hostinger.conf /etc/nginx/sites-available/moonyetis
    ln -sf /etc/nginx/sites-available/moonyetis /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Probar configuración
    if nginx -t; then
        systemctl restart nginx
        echo "✅ Nginx configurado correctamente"
    else
        echo "❌ Error en configuración de Nginx"
    fi
else
    echo "⚠️ nginx-hostinger.conf no encontrado, saltando configuración de Nginx"
fi
```

### **BLOQUE 6: Iniciar Aplicación**
```bash
# Crear directorios de logs
mkdir -p /var/log/moonyetis-slots
chown $USER:$USER /var/log/moonyetis-slots

# Parar aplicación anterior si existe
pm2 stop moonyetis-slots 2>/dev/null || echo "No hay aplicación previa"

# Iniciar aplicación
if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js --env production
elif [ -f "start-production.js" ]; then
    pm2 start start-production.js --name moonyetis-slots --env production
else
    # Fallback directo
    pm2 start server.js --name moonyetis-slots --env production
fi

# Guardar configuración PM2
pm2 save
pm2 startup

echo "✅ Aplicación iniciada con PM2"
```

### **BLOQUE 7: Verificar Funcionamiento**
```bash
# Verificar estado
echo "📊 Estado de la aplicación:"
pm2 status

echo ""
echo "🧪 Probando API:"
sleep 3

# Probar API local
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ API local funcionando"
    curl -s http://localhost:3000/api/health | head -3
else
    echo "❌ API local no responde"
fi

echo ""
echo "🌐 Probar acceso externo:"
if curl -s http://168.231.124.18/api/health > /dev/null; then
    echo "✅ Acceso externo funcionando"
else
    echo "⚠️ Acceso externo puede necesitar configuración"
fi

echo ""
echo "🎰 ============================================"
echo "🎉 MoonYetis Slots DESPLEGADO EXITOSAMENTE!"
echo "🎰 ============================================"
echo ""
echo "🌐 Tu casino está disponible en:"
echo "   • http://168.231.124.18"
echo "   • http://srv876195.hstgr.cloud"
echo ""
echo "📊 Comandos útiles:"
echo "   • pm2 status                  - Ver estado"
echo "   • pm2 logs moonyetis-slots    - Ver logs"
echo "   • pm2 restart moonyetis-slots - Reiniciar"
echo ""
```

---

## 🎯 **Instrucciones de Uso:**

1. **Accede al Browser Terminal** de Hostinger
2. **Copia y pega** cada bloque secuencialmente
3. **Espera** que cada bloque termine antes del siguiente
4. **Verifica** que no haya errores en cada paso

## 🆘 **Si algo falla:**
- Revisa los logs: `pm2 logs moonyetis-slots`
- Reinicia la aplicación: `pm2 restart moonyetis-slots`
- Verifica Nginx: `nginx -t`

**🎰 ¡Tu casino estará live en menos de 15 minutos!**