# Guía de Implementación a Producción - MoonYetis Store V2

## 📋 Checklist Pre-Despliegue

### 1. Seguridad
- [ ] Generar nuevo WEBHOOK_SECRET con `./generate-secrets.sh`
- [ ] Generar nuevo ADMIN_KEY con `./generate-secrets.sh`
- [ ] Actualizar archivo `.env` con los nuevos valores
- [ ] Verificar que `.env` NO esté en git
- [ ] Guardar backup de secrets en gestor de contraseñas

### 2. Preparación Local
- [ ] Instalar dependencias: `npm install`
- [ ] Verificar que todos los tests pasen
- [ ] Commit de todos los cambios
- [ ] Push al repositorio

## 🚀 Proceso de Despliegue

### Opción A: Despliegue Automatizado (Recomendado)

```bash
cd backend
./deploy-production.sh
```

Este script automáticamente:
- Verifica la configuración de seguridad
- Crea un paquete de despliegue
- Sube los archivos al servidor
- Instala dependencias
- Configura los servicios
- Verifica que todo esté funcionando

### Opción B: Despliegue Manual

#### 1. Conectar al servidor
```bash
ssh ubuntu@moonyetis.io
```

#### 2. Actualizar código
```bash
cd /home/ubuntu/moonyetis-deploy
git pull origin main
```

#### 3. Navegar al backend
```bash
cd backend
```

#### 4. Configurar ambiente
```bash
# Copiar configuración
cp .env.example .env

# Editar con valores seguros
nano .env
```

#### 5. Instalar dependencias
```bash
npm install --production
```

#### 6. Iniciar servicios

**Con PM2 (Recomendado):**
```bash
# Instalar PM2 si no está instalado
npm install -g pm2

# Iniciar servicios
pm2 start ecosystem.config.js

# Guardar configuración
pm2 save

# Auto-inicio en boot
pm2 startup
```

**Con systemd:**
```bash
# Copiar archivos de servicio
sudo cp moonyetis-*.service /etc/systemd/system/

# Recargar systemd
sudo systemctl daemon-reload

# Iniciar servicios
sudo systemctl start moonyetis-wallet
sudo systemctl start moonyetis-store

# Habilitar auto-inicio
sudo systemctl enable moonyetis-wallet
sudo systemctl enable moonyetis-store
```

## 🧪 Verificación Post-Despliegue

### 1. Test Rápido
```bash
# Desde tu máquina local
cd backend
./test-production.sh
```

### 2. Test Manual
```bash
# Store Health
curl http://moonyetis.io:3002/api/store/health

# Precios actuales
curl http://moonyetis.io:3002/api/store/prices

# Estado del monitor
curl http://moonyetis.io:3002/api/store/monitor-status
```

### 3. Test Frontend
1. Abrir https://moonyetis.io en el navegador
2. Conectar wallet
3. Abrir Store desde el panel de wallet
4. Verificar que los packs se muestran correctamente
5. Verificar que los precios se actualizan

## 📊 Monitoreo

### Con PM2
```bash
# Ver logs en tiempo real
pm2 logs

# Ver estado de servicios
pm2 status

# Monitoreo detallado
pm2 monit
```

### Con systemd
```bash
# Logs del store
sudo journalctl -u moonyetis-store -f

# Logs del wallet
sudo journalctl -u moonyetis-wallet -f

# Estado de servicios
sudo systemctl status moonyetis-store
sudo systemctl status moonyetis-wallet
```

## 🔧 Comandos Útiles

### Reiniciar servicios
```bash
# Con PM2
pm2 restart all

# Con systemd
sudo systemctl restart moonyetis-store
sudo systemctl restart moonyetis-wallet
```

### Detener servicios
```bash
# Con PM2
pm2 stop all

# Con systemd
sudo systemctl stop moonyetis-store
sudo systemctl stop moonyetis-wallet
```

### Ver logs
```bash
# Últimas 100 líneas
pm2 logs --lines 100

# Logs de errores
pm2 logs --err
```

## 🚨 Solución de Problemas

### El servicio no inicia
1. Verificar logs para errores
2. Verificar que Node.js esté instalado: `node --version`
3. Verificar permisos del archivo .env: `ls -la .env`
4. Verificar que los puertos no estén en uso: `sudo lsof -i:3002`

### No se pueden obtener precios
1. Verificar API key de UniSat en .env
2. Verificar conectividad: `curl https://open-api.unisat.io`
3. Revisar logs del servicio

### El frontend no conecta
1. Verificar firewall: `sudo ufw status`
2. Verificar que los puertos estén abiertos
3. Verificar CORS en el backend

## 🔐 Seguridad en Producción

### 1. Rotación de Secrets
Rotar los secrets cada 3-6 meses:
```bash
./generate-secrets.sh
# Actualizar .env
# Reiniciar servicios
```

### 2. Backup
```bash
# Backup de configuración
cp .env .env.backup.$(date +%Y%m%d)

# Backup de todo el directorio
tar -czf moonyetis-backup-$(date +%Y%m%d).tar.gz backend/
```

### 3. Monitoreo de Seguridad
- Revisar logs regularmente
- Monitorear intentos de acceso no autorizado
- Configurar alertas para errores críticos

## 📞 Contacto de Emergencia

Si algo sale mal:
1. Revisar logs inmediatamente
2. Hacer rollback si es necesario
3. Contactar al equipo de desarrollo

## 🔄 Proceso de Rollback

Si necesitas volver a la versión anterior:
```bash
# Detener servicios actuales
pm2 stop all

# Restaurar backup
cd /home/ubuntu/moonyetis-deploy
mv backend backend.failed
mv backend.backup.<fecha> backend

# Reiniciar servicios
cd backend
pm2 start ecosystem.config.js
```

## ✅ Checklist Post-Producción

- [ ] Todos los endpoints responden correctamente
- [ ] Los precios se actualizan automáticamente
- [ ] El monitor de transacciones está activo
- [ ] El frontend puede conectar y mostrar el Store
- [ ] Los logs no muestran errores
- [ ] Backup de configuración guardado
- [ ] Documentación actualizada
- [ ] Equipo notificado del despliegue