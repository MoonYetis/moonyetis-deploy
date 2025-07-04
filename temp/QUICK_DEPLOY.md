# ⚡ Deploy Rápido - MoonYetis Slots

## 🚀 Comandos de Deploy (Copiar y Pegar)

**IMPORTANTE**: Reemplaza `YOUR_SERVER_IP`, `YOUR_SSH_USER`, y `YOUR_DOMAIN.com` con tus valores reales.

### 1. Subir Archivos al Servidor

```bash
# Desde tu máquina local, subir archivos
scp moonyetis-slots-deploy.tar.gz YOUR_SSH_USER@YOUR_SERVER_IP:~/
scp server-setup.sh YOUR_SSH_USER@YOUR_SERVER_IP:~/
```

### 2. Configurar Servidor

```bash
# Conectar al servidor
ssh YOUR_SSH_USER@YOUR_SERVER_IP

# Configurar servidor (instala Node.js, PostgreSQL, Nginx, etc.)
chmod +x server-setup.sh
./server-setup.sh
```

### 3. Desplegar Aplicación

```bash
# Extraer aplicación
cd /var/www
sudo tar -xzf ~/moonyetis-slots-deploy.tar.gz
sudo mv moonyetis-slots-deploy moonyetis-slots
sudo chown -R $USER:$USER /var/www/moonyetis-slots
cd /var/www/moonyetis-slots

# Instalar dependencias
npm install --production
```

### 4. Configurar Base de Datos

```bash
# Crear base de datos
sudo -u postgres psql << EOF
CREATE DATABASE moonyetis_slots;
CREATE USER moonyetis_user WITH ENCRYPTED PASSWORD 'TU_PASSWORD_SEGURA';
GRANT ALL PRIVILEGES ON DATABASE moonyetis_slots TO moonyetis_user;
ALTER USER moonyetis_user CREATEDB;
\q
EOF

# Ejecutar migraciones
sudo -u postgres psql moonyetis_slots < migrate-production.sql
```

### 5. Configurar Variables de Entorno

```bash
# Editar .env.production con tu dominio
nano .env.production

# Cambiar estas líneas:
# DOMAIN=YOUR_DOMAIN.com
# DB_PASSWORD=TU_PASSWORD_SEGURA
# (mantener el resto como está)

# Proteger archivo
chmod 600 .env.production
```

### 6. Configurar Nginx

```bash
# Actualizar configuración con tu dominio
sed -i 's/your-domain\.com/YOUR_DOMAIN.com/g' nginx-moonyetis.conf

# Instalar configuración
sudo cp nginx-moonyetis.conf /etc/nginx/sites-available/moonyetis-slots
sudo ln -sf /etc/nginx/sites-available/moonyetis-slots /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Verificar y aplicar
sudo nginx -t && sudo systemctl reload nginx
```

### 7. Configurar SSL

```bash
# Configurar SSL con Let's Encrypt
sudo certbot --nginx -d YOUR_DOMAIN.com -d www.YOUR_DOMAIN.com --non-interactive --agree-tos --email admin@YOUR_DOMAIN.com

# Configurar renovación automática
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### 8. Iniciar Aplicación

```bash
# Crear logs y iniciar
sudo mkdir -p /var/log/moonyetis-slots
sudo chown $USER:$USER /var/log/moonyetis-slots

# Iniciar con PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# Seguir las instrucciones que muestre pm2 startup
```

### 9. Verificar Funcionamiento

```bash
# Verificar aplicación
pm2 status
curl http://localhost:3000/api/health

# Verificar desde exterior
curl https://YOUR_DOMAIN.com/api/health

# Ver logs
pm2 logs moonyetis-slots
```

## ✅ Verificación Final

Si todo está bien, deberías poder acceder a:

- **🌐 Sitio web**: https://YOUR_DOMAIN.com
- **📊 Monitoreo**: https://YOUR_DOMAIN.com/monitoring-dashboard.html
- **🔍 API Health**: https://YOUR_DOMAIN.com/api/health

## 🆘 Comandos de Emergencia

```bash
# Si algo falla, revisar logs
pm2 logs moonyetis-slots
sudo tail -f /var/log/nginx/error.log

# Reiniciar servicios
pm2 restart moonyetis-slots
sudo systemctl restart nginx

# Verificar firewall
sudo ufw status

# Estado de servicios
sudo systemctl status nginx postgresql
```

## 📞 Testing Rápido Post-Deploy

```bash
# Test de conectividad
curl -I https://YOUR_DOMAIN.com
# Debería devolver: HTTP/2 200

# Test de API
curl https://YOUR_DOMAIN.com/api/health
# Debería devolver JSON con status

# Test de monitoreo
curl https://YOUR_DOMAIN.com/api/monitoring/health
# Debería devolver métricas del sistema
```

---

**🎉 ¡Deploy Completado!**

**Tu MoonYetis Slots está ahora live en Fractal Bitcoin mainnet** 🎰✨

---

*Tiempo estimado de deploy: 15-30 minutos*  
*Para soporte detallado, consultar DEPLOY_INSTRUCTIONS.md*