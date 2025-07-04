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
