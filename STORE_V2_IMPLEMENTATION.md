# MoonYetis Store V2 - Implementation Complete

## 🚀 Nuevas Características Implementadas

### 1. **Integración con UniSat API**
- ✅ Servicio completo para obtener precios reales de FB y MY
- ✅ API key configurado: `fc77d31a8981cb27425b73f93d2d2354c81d2e3c429137bbfc19d55d7a0dfe12`
- ✅ Actualización automática de precios cada minuto
- ✅ Cache de precios para mejor rendimiento

### 2. **Monitoreo de Transacciones en Tiempo Real**
- ✅ Servicio de monitoreo que verifica transacciones entrantes cada 30 segundos
- ✅ Verificación automática de confirmaciones
- ✅ Procesamiento automático de pagos cuando se confirman
- ✅ Prevención de procesamiento duplicado de transacciones

### 3. **Seguridad de Webhooks**
- ✅ Autenticación HMAC implementada para webhooks
- ✅ Verificación de firma en cada request
- ✅ Prevención de falsificación de pagos
- ✅ Logging de intentos no autorizados

### 4. **Configuración con Variables de Entorno**
- ✅ Archivo `.env` creado con todas las configuraciones
- ✅ `.gitignore` actualizado para proteger información sensible
- ✅ Valores por defecto seguros

## 📁 Archivos Nuevos/Actualizados

### Backend:
- `store-server-v2.js` - Servidor principal con todas las nuevas características
- `services/unisat-api.js` - Cliente API para UniSat
- `services/price-service.js` - Servicio de gestión de precios
- `services/transaction-monitor.js` - Monitor de transacciones en blockchain
- `.env` - Configuración de variables de entorno
- `.env.example` - Plantilla de configuración
- `package.json` - Actualizado con nuevas dependencias y scripts

### Scripts de Despliegue:
- Actualizados para usar `store-server-v2.js`

## 🔧 Configuración Requerida

### 1. Instalar Dependencias
```bash
cd backend
npm install
```

### 2. Configurar Variables de Entorno
El archivo `.env` ya está configurado con:
- API key de UniSat
- Dirección de pago real
- Configuraciones de seguridad

**IMPORTANTE**: Cambiar `WEBHOOK_SECRET` en producción

### 3. Iniciar el Servidor
```bash
# Opción 1: Solo el store
./start-store-production.sh

# Opción 2: Todos los servicios
./start-all-production.sh
```

## 🔒 Seguridad Implementada

### Autenticación de Webhooks
Para confirmar un pago manualmente, se debe incluir la firma HMAC:

```javascript
const crypto = require('crypto');
const secret = 'moonyetis-webhook-secret-2024-change-this-in-production';

const payload = {
    orderId: 'order-id-here',
    txHash: 'transaction-hash-here'
};

const signature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

// Enviar request con header
headers: {
    'x-webhook-signature': signature,
    'Content-Type': 'application/json'
}
```

## 🔍 Monitoreo de Transacciones

El sistema monitorea automáticamente:
1. Transacciones entrantes a la dirección de pago
2. Confirmaciones de blockchain
3. Procesamiento automático cuando se alcanza el mínimo de confirmaciones

## 📊 Endpoints de la API

### Públicos:
- `GET /api/store/prices` - Precios actuales
- `GET /api/store/products` - Productos disponibles
- `POST /api/store/purchase` - Crear orden de compra
- `GET /api/store/order/:orderId` - Estado de orden
- `GET /api/store/balance/:userWallet` - Balance de usuario
- `GET /api/store/transactions/:userWallet` - Historial de transacciones

### Protegidos (requieren autenticación):
- `POST /api/store/confirm-payment` - Confirmar pago (webhook)
- `POST /api/store/admin/credit` - Acreditar MoonCoins (admin)

### Monitoreo:
- `GET /api/store/health` - Estado del sistema
- `GET /api/store/monitor-status` - Estado del monitor de transacciones
- `GET /api/store/market-stats` - Estadísticas de mercado

## 🧪 Pruebas

### 1. Verificar Precios
```bash
curl http://moonyetis.io:3002/api/store/prices
```

### 2. Verificar Estado del Sistema
```bash
curl http://moonyetis.io:3002/api/store/health
```

### 3. Simular Compra
1. Conectar wallet en el frontend
2. Abrir Store desde el panel de wallet
3. Seleccionar pack y método de pago
4. Seguir instrucciones de pago

## ⚠️ Notas Importantes

1. **Precios de UniSat**: Actualmente usando valores simulados. La API real de UniSat puede requerir endpoints específicos para obtener precios de mercado.

2. **Confirmaciones**: Configurado para 1 confirmación mínima. Aumentar para mayor seguridad.

3. **Webhook Secret**: DEBE cambiarse en producción a un valor seguro.

4. **Persistencia**: Los datos se almacenan en memoria. Considerar agregar base de datos para producción.

## 🚀 Próximos Pasos Recomendados

1. Integrar base de datos persistente (MongoDB/PostgreSQL)
2. Agregar sistema de logs robusto (Winston)
3. Implementar notificaciones por email
4. Agregar dashboard de administración
5. Crear tests automatizados
6. Configurar HTTPS/SSL

## 📞 Soporte

Para problemas o preguntas:
- Revisar logs del servidor
- Verificar configuración de `.env`
- Comprobar conectividad con UniSat API
- Verificar transacciones en blockchain explorer