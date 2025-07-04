# 🎰 MoonYetis Slots - Guía Completa de Producción

## 📋 Resumen Ejecutivo

MoonYetis Slots es un casino blockchain completamente integrado con Fractal Bitcoin mainnet, listo para lanzamiento en producción. Esta guía detalla todos los procedimientos necesarios para operar el sistema de manera segura y efectiva.

## 🏗️ Arquitectura del Sistema

### Componentes Principales

1. **Frontend**: Interfaz de usuario con integración de wallets (UniSat, OKX)
2. **Backend API**: Servidor Node.js con Express.js
3. **Blockchain Service**: Integración con Fractal Bitcoin mainnet
4. **Monitoring System**: Sistema de monitoreo y alertas en tiempo real
5. **Database**: PostgreSQL para datos de usuarios y transacciones
6. **Payment System**: Procesamiento de depósitos/retiros MOONYETIS

### Flujo de Transacciones

```
Usuario → Wallet → Depósito → Chips → Juego → Ganancias → Retiro → Wallet
```

## 🚀 Procedimientos de Despliegue

### 1. Preparación del Servidor

```bash
# 1. Actualizar sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar dependencias
sudo apt install -y nodejs npm postgresql nginx certbot

# 3. Instalar PM2
sudo npm install -g pm2

# 4. Crear directorios
sudo mkdir -p /var/www/moonyetis-slots
sudo mkdir -p /var/log/moonyetis-slots
```

### 2. Configuración de Base de Datos

```bash
# Crear base de datos
sudo -u postgres createdb moonyetis_slots
sudo -u postgres createuser moonyetis_user

# Ejecutar migraciones
sudo -u postgres psql moonyetis_slots < migrate-production.sql
```

### 3. Despliegue de Aplicación

```bash
# 1. Subir código
scp moonyetis-backend.tar.gz user@server:~/
ssh user@server
cd /var/www && sudo tar -xzf ~/moonyetis-backend.tar.gz

# 2. Instalar dependencias
cd moonyetis-slots
npm install --production

# 3. Configurar permisos
sudo chown -R $USER:$USER /var/www/moonyetis-slots
chmod 600 .env.production

# 4. Iniciar aplicación
pm2 start ecosystem.config.js --env production
pm2 save && pm2 startup
```

### 4. Configuración SSL y Nginx

```bash
# 1. Configurar Nginx
sudo cp nginx-moonyetis.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/nginx-moonyetis.conf /etc/nginx/sites-enabled/

# 2. Obtener certificados SSL
sudo certbot --nginx -d tu-dominio.com

# 3. Reiniciar servicios
sudo systemctl reload nginx
```

## 🔧 Configuración de Producción

### Variables de Entorno Críticas

```bash
# Blockchain
FRACTAL_NETWORK_TYPE=mainnet
FRACTAL_API_KEY=tu_api_key_real
HOUSE_WALLET_ADDRESS=tu_wallet_address
HOUSE_WALLET_PRIVATE_KEY=tu_private_key_segura

# Seguridad
SESSION_SECRET=clave_secreta_64_caracteres_minimo
DB_PASSWORD=contraseña_base_datos_segura

# Aplicación
NODE_ENV=production
DOMAIN=tu-dominio.com
PORT=3000
```

### Configuración de Seguridad

1. **Firewall**
```bash
sudo ufw enable
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
```

2. **Permisos de Archivos**
```bash
chmod 600 .env.production        # Solo propietario
chmod 700 scripts/              # Scripts ejecutables
chmod 755 frontend/             # Archivos públicos
```

3. **Backup de Credenciales**
```bash
# Crear backup cifrado
gpg --symmetric --cipher-algo AES256 .env.production
```

## 📊 Monitoreo y Alertas

### Dashboard de Monitoreo

Accede al dashboard en: `https://tu-dominio.com/monitoring-dashboard.html`

**Métricas Monitoreadas:**
- Balance de house wallet
- Estado de conexión blockchain
- Transacciones pendientes
- Errores del sistema
- Uso de recursos

### Alertas Automáticas

**Niveles de Alerta:**
- 🔴 **CRÍTICO**: Balance de wallet en 0, errores del sistema
- 🟡 **ALTO**: Balance bajo, alta tasa de retiros
- 🟠 **MEDIO**: Actividad sospechosa, servicios degradados
- 🔵 **BAJO**: Información general

### Comandos de Monitoreo

```bash
# Estado de la aplicación
pm2 status
pm2 logs moonyetis-slots

# Métricas del sistema
curl https://tu-dominio.com/api/monitoring/health

# Balance de house wallet
curl https://tu-dominio.com/api/monitoring/wallet/status

# Dashboard completo
curl https://tu-dominio.com/api/monitoring/dashboard
```

## 💰 Gestión de House Wallet

### Funding Inicial

**Cantidad Recomendada:**
- Mínimo: 1,000 MOONYETIS
- Óptimo: 10,000+ MOONYETIS
- Para testing: 100 MOONYETIS

### Monitoreo de Balance

```bash
# Verificar balance
NODE_ENV=production node -e "
const service = require('./services/fractalBitcoinService');
service.getHouseWalletBalance().then(console.log);
"

# Alertas de balance bajo
# Configuradas automáticamente en HOUSE_WALLET_LOW_BALANCE_ALERT
```

### Procedimientos de Recarga

1. **Detección de Balance Bajo**
   - Alerta automática cuando balance < 1,000 MOONYETIS
   - Notificación inmediata a administradores

2. **Proceso de Recarga**
   - Pausar retiros temporalmente
   - Transferir MOONYETIS desde wallet de reserva
   - Confirmar transacción (3 confirmaciones)
   - Reanudar operaciones normales

## 🎮 Operaciones de Juego

### Configuración Económica

```javascript
// Configuración actual en config/blockchain.js
GAME_ECONOMICS: {
    rtp: 0.96,              // 96% de retorno al jugador
    houseEdge: 0.04,        // 4% de ventaja de la casa
    minBet: 1,              // Apuesta mínima: 1 chip
    maxBet: 1000,           // Apuesta máxima: 1000 chips
    chipToTokenRatio: 10,   // 1 MOONYETIS = 10 chips
    depositFee: 0.01,       // 1% comisión depósito
    withdrawalFee: 0.02     // 2% comisión retiro
}
```

### Límites de Seguridad

```javascript
SECURITY: {
    maxDailyDeposit: 10000,     // Máximo 10k MOONYETIS/día
    maxDailyWithdrawal: 5000,   // Máximo 5k MOONYETIS/día
    suspiciousWinRate: 0.98,    // Alerta si tasa de victoria > 98%
    maxConsecutiveWins: 20      // Alerta si > 20 victorias consecutivas
}
```

## 🔒 Procedimientos de Seguridad

### Detección de Fraude

**Patrones Monitoreados:**
- Tasas de victoria anormales
- Patrones de apuesta repetitivos
- Múltiples retiros rápidos
- Actividad desde IPs sospechosas

**Acciones Automáticas:**
- Pausa temporal de cuenta
- Revisión manual requerida
- Notificación a administradores

### Respuesta a Incidentes

**Incidente de Seguridad:**
1. Pausar todas las transacciones
2. Evaluar el alcance del problema
3. Notificar a stakeholders
4. Implementar medidas correctivas
5. Reanudar operaciones gradualmente

**Comandos de Emergencia:**
```bash
# Pausar aplicación
pm2 stop moonyetis-slots

# Modo mantenimiento (Nginx)
sudo cp maintenance.html /var/www/html/
sudo nginx -s reload

# Revisar logs
tail -f /var/log/moonyetis-slots/error.log
```

## 🔄 Mantenimiento y Actualizaciones

### Mantenimiento Rutinario

**Diario:**
- Verificar balance de house wallet
- Revisar alertas del sistema
- Monitorear transacciones pendientes

**Semanal:**
- Backup de base de datos
- Revisar logs de errores
- Actualizar dependencias críticas

**Mensual:**
- Auditoría de seguridad
- Optimización de rendimiento
- Revisión de métricas financieras

### Actualizaciones de Código

```bash
# 1. Backup actual
cp -r /var/www/moonyetis-slots /var/www/moonyetis-slots.backup

# 2. Desplegar nueva versión
cd /var/www/moonyetis-slots
git pull origin main
npm install --production

# 3. Migrar base de datos (si necesario)
node scripts/migrate.js

# 4. Reiniciar aplicación
pm2 reload moonyetis-slots

# 5. Verificar funcionamiento
curl https://tu-dominio.com/api/health
```

## 📈 Métricas y Análisis

### KPIs Principales

1. **Financieros:**
   - Volumen total de depósitos
   - Volumen total de retiros
   - Ganancias de la casa
   - ROI por usuario

2. **Operacionales:**
   - Tiempo de actividad del sistema
   - Tiempo de procesamiento de transacciones
   - Número de usuarios activos
   - Juegos por día

3. **Seguridad:**
   - Número de alertas de seguridad
   - Intentos de fraude detectados
   - Tiempo de respuesta a incidentes

### Reportes Automatizados

```bash
# Reporte diario
node scripts/generate-daily-report.js

# Métricas en tiempo real
curl https://tu-dominio.com/api/monitoring/metrics

# Exportar datos
node scripts/export-data.js --format=csv --period=week
```

## 🆘 Contactos de Emergencia

### Escalación de Incidentes

**Nivel 1: Administrador del Sistema**
- Disponibilidad: 24/7
- Respuesta: < 30 minutos
- Responsabilidades: Monitoreo, mantenimiento rutinario

**Nivel 2: Desarrollador Principal**
- Disponibilidad: Horario laboral + emergencias
- Respuesta: < 2 horas
- Responsabilidades: Bugs críticos, actualizaciones

**Nivel 3: Arquitecto del Sistema**
- Disponibilidad: Emergencias críticas
- Respuesta: < 4 horas
- Responsabilidades: Decisiones arquitectónicas, incidentes mayores

## 🚨 Procedimientos de Emergencia

### Parada de Emergencia

```bash
# 1. Parar aplicación inmediatamente
pm2 stop all

# 2. Activar página de mantenimiento
sudo systemctl stop nginx
sudo systemctl start nginx-maintenance

# 3. Notificar usuarios
echo "Sistema en mantenimiento" > /var/www/html/status.txt

# 4. Investigar problema
tail -f /var/log/moonyetis-slots/error.log
```

### Recuperación de Desastres

**Backup de House Wallet:**
- Mnemonic phrase almacenada en múltiples ubicaciones seguras
- Private keys en hardware wallets
- Acceso de emergencia documentado

**Backup de Datos:**
- Base de datos replicada cada 4 horas
- Archivos de configuración en repositorio seguro
- Procedimientos de restauración documentados

## ✅ Checklist de Lanzamiento

### Pre-Lanzamiento

- [ ] Tests de integración mainnet: PASADOS
- [ ] House wallet financiada: ✅ CON TOKENS MOONYETIS
- [ ] Certificados SSL configurados
- [ ] Monitoreo activado: ✅ OPERACIONAL
- [ ] Backup procedures implementados
- [ ] Documentación completa: ✅ LISTA

### Post-Lanzamiento

- [ ] Verificar primeras transacciones
- [ ] Monitorear métricas 24/7 primeras 48h
- [ ] Confirmar alertas funcionando
- [ ] Validar wallet integrations
- [ ] Probar flujo completo depósito-juego-retiro

## 📝 Notas Importantes

### Consideraciones Legales

- Verificar regulaciones locales sobre gambling
- Implementar KYC/AML si requerido
- Mantener registros de transacciones
- Cumplir con normativas de protección de datos

### Mejores Prácticas

1. **Nunca** compartir private keys
2. **Siempre** probar en cantidades pequeñas primero
3. **Monitorear** constantemente el balance de house wallet
4. **Mantener** logs detallados de todas las operaciones
5. **Revisar** regularmente la seguridad del sistema

---

## 🎉 ¡Sistema Listo para Producción!

MoonYetis Slots está completamente preparado para lanzamiento en mainnet de Fractal Bitcoin. Todos los sistemas han sido probados y están operacionales.

**Status Final:**
- ✅ Integración blockchain completa
- ✅ Sistema de monitoreo activo  
- ✅ Procedimientos de seguridad implementados
- ✅ Documentación completa
- ✅ House wallet configurada con tokens MOONYETIS

**Para soporte técnico o consultas, revisar los logs del sistema y el dashboard de monitoreo.**

---

*🎰 MoonYetis Slots - Production Ready*  
*Fecha: 2025-06-23*  
*Versión: 1.0.0*  
*Network: Fractal Bitcoin Mainnet*