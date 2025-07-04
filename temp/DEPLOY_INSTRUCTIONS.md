# 🚀 Instrucciones de Deploy - MoonYetis Slots

## 📋 Preparación para Deploy

### Archivos Necesarios Generados ✅

- `server-setup.sh` - Configuración inicial del servidor
- `migrate-production.sql` - Migración de base de datos
- `ecosystem.config.js` - Configuración PM2
- `nginx-moonyetis.conf` - Configuración Nginx
- `.env.production` - Variables de entorno
- `PRODUCTION_GUIDE.md` - Guía completa

## 🎯 Pasos de Deploy a Servidor de Producción

### 1. Preparar Información del Servidor

**Necesitas tener:**
- IP del servidor: `YOUR_SERVER_IP`
- Usuario SSH: `YOUR_SSH_USER` (ej: root, ubuntu, deploy)
- Dominio: `YOUR_DOMAIN.com`
- SSH key configurado o password del servidor

### 2. Crear Paquete de Deploy

```bash
# Crear paquete con todos los archivos
tar -czf moonyetis-slots-deploy.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=*.log \
  --exclude=.DS_Store \
  .

echo "✅ Paquete de deploy creado: moonyetis-slots-deploy.tar.gz"
ls -lh moonyetis-slots-deploy.tar.gz
```

### 3. Subir Archivos al Servidor

```bash
# Subir paquete al servidor
scp moonyetis-slots-deploy.tar.gz YOUR_SSH_USER@YOUR_SERVER_IP:~/

# Subir script de configuración
scp server-setup.sh YOUR_SSH_USER@YOUR_SERVER_IP:~/

echo "✅ Archivos subidos al servidor"
```

### 4. Conectar al Servidor y Configurar

```bash
# Conectar por SSH
ssh YOUR_SSH_USER@YOUR_SERVER_IP

# Hacer ejecutable y correr setup
chmod +x server-setup.sh
./server-setup.sh

# El script instalará:
# - Node.js 18
# - PostgreSQL
# - PM2
# - Nginx
# - Certbot
# - Configurará firewall y seguridad
```

### 5. Desplegar Aplicación

```bash
# En el servidor, extraer aplicación
cd /var/www
sudo tar -xzf ~/moonyetis-slots-deploy.tar.gz
sudo mv moonyetis-slots-deploy moonyetis-slots

# Cambiar permisos
sudo chown -R $USER:$USER /var/www/moonyetis-slots
cd /var/www/moonyetis-slots

# Instalar dependencias
npm install --production
```

### 6. Configurar Base de Datos

```bash
# Crear base de datos y usuario
sudo -u postgres psql -c "CREATE DATABASE moonyetis_slots;"
sudo -u postgres psql -c "CREATE USER moonyetis_user WITH ENCRYPTED PASSWORD 'YOUR_DB_PASSWORD';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE moonyetis_slots TO moonyetis_user;"

# Ejecutar migraciones
sudo -u postgres psql moonyetis_slots < migrate-production.sql

echo "✅ Base de datos configurada"
```

### 7. Configurar Variables de Entorno

```bash
# Editar archivo de producción
nano .env.production

# Actualizar con valores reales:
DOMAIN=YOUR_DOMAIN.com
DB_PASSWORD=YOUR_SECURE_DB_PASSWORD
HOUSE_WALLET_ADDRESS=bc1pnhnqmuhx9xtqd8naa9wa60ur2n5fv9emjpcethzdwn8kzkx4gv4sf7xkr5
# ... (mantener otras variables ya configuradas)

# Proteger archivo
chmod 600 .env.production
```

### 8. Configurar Nginx

```bash
# Actualizar configuración con tu dominio
sed -i 's/your-domain\.com/YOUR_DOMAIN.com/g' nginx-moonyetis.conf

# Instalar configuración
sudo cp nginx-moonyetis.conf /etc/nginx/sites-available/moonyetis-slots
sudo ln -sf /etc/nginx/sites-available/moonyetis-slots /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Verificar configuración
sudo nginx -t

# Si está bien, reiniciar
sudo systemctl reload nginx
```

### 9. Configurar SSL

```bash
# Opción A: Let's Encrypt (Gratuito)
sudo certbot --nginx -d YOUR_DOMAIN.com -d www.YOUR_DOMAIN.com

# Opción B: Si usas Cloudflare, seguir DOMAIN_SSL_SETUP.md

# Configurar renovación automática
sudo crontab -e
# Agregar: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 10. Iniciar Aplicación

```bash
# Crear directorio de logs
sudo mkdir -p /var/log/moonyetis-slots
sudo chown $USER:$USER /var/log/moonyetis-slots

# Iniciar con PM2
pm2 start ecosystem.config.js --env production

# Guardar configuración PM2
pm2 save
pm2 startup

# Verificar que está corriendo
pm2 status
pm2 logs moonyetis-slots
```

### 11. Verificación Final

```bash
# Test local
curl http://localhost:3000/api/health

# Test desde exterior
curl https://YOUR_DOMAIN.com/api/health

# Test del dashboard de monitoreo
curl https://YOUR_DOMAIN.com/api/monitoring/health

# Verificar SSL
openssl s_client -connect YOUR_DOMAIN.com:443 -servername YOUR_DOMAIN.com
```

## 🔧 Comandos Útiles Post-Deploy

### Administración de la Aplicación

```bash
# Ver estado
pm2 status
pm2 logs moonyetis-slots

# Reiniciar aplicación
pm2 restart moonyetis-slots

# Recargar sin downtime
pm2 reload moonyetis-slots

# Parar aplicación
pm2 stop moonyetis-slots

# Ver recursos
pm2 monit
```

### Monitoreo del Sistema

```bash
# Ver logs de Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Ver logs de aplicación
tail -f /var/log/moonyetis-slots/app.log

# Estado de servicios
sudo systemctl status nginx
sudo systemctl status postgresql

# Uso de disco y memoria
df -h
free -h
```

### Backup y Mantenimiento

```bash
# Backup de base de datos
sudo -u postgres pg_dump moonyetis_slots > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup de configuración
cp .env.production .env.production.backup.$(date +%Y%m%d)

# Actualizar aplicación (futuras versiones)
pm2 stop moonyetis-slots
git pull origin main  # o subir nuevo paquete
npm install --production
pm2 start ecosystem.config.js --env production
```

## 🚨 Solución de Problemas

### Aplicación no inicia

```bash
# Verificar logs
pm2 logs moonyetis-slots

# Verificar variables de entorno
cat .env.production

# Verificar puertos
sudo netstat -tlnp | grep :3000

# Verificar base de datos
sudo -u postgres psql moonyetis_slots -c "SELECT 1;"
```

### SSL no funciona

```bash
# Verificar certificados
sudo certbot certificates

# Renovar manualmente
sudo certbot renew

# Verificar configuración Nginx
sudo nginx -t
```

### Error 502 Bad Gateway

```bash
# Verificar que PM2 está corriendo
pm2 status

# Verificar configuración Nginx
sudo nginx -t
sudo systemctl restart nginx

# Verificar firewall
sudo ufw status
```

## ✅ Checklist de Deploy Completo

- [ ] Servidor configurado con server-setup.sh
- [ ] Aplicación desplegada en /var/www/moonyetis-slots
- [ ] Base de datos creada y migrada
- [ ] Variables de entorno configuradas
- [ ] Nginx configurado y funcionando
- [ ] SSL configurado (Let's Encrypt o Cloudflare)
- [ ] PM2 iniciado y configurado para auto-start
- [ ] Firewall configurado
- [ ] Tests de conectividad pasados
- [ ] Monitoreo funcionando
- [ ] Backups configurados

## 📞 Contacto y Soporte

Una vez completado el deploy:

1. **Verificar la aplicación**: https://YOUR_DOMAIN.com
2. **Dashboard de monitoreo**: https://YOUR_DOMAIN.com/monitoring-dashboard.html
3. **API Health**: https://YOUR_DOMAIN.com/api/health

**¡Tu MoonYetis Slots estará listo para recibir jugadores en Fractal Bitcoin mainnet!** 🎰✨

---

*🚀 Deploy realizado exitosamente*  
*MoonYetis Slots - Production Ready*