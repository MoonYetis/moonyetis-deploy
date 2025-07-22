# MoonYetis Local Development Guide

## 🚀 Quick Start

### Iniciar Servidores de Desarrollo
```bash
# Desde el directorio raíz del proyecto
./start-local-dev.sh
```

Este script iniciará automáticamente:
- **Backend**: `http://localhost:3002` (API Store)
- **Frontend**: `http://localhost:8080` (Interfaz web)

### Comandos Individuales

#### Backend
```bash
cd backend
npm run dev          # Iniciar con nodemon (auto-reload)
npm run dev:config   # Ver configuración actual
npm run test:local   # Ejecutar tests locales
```

#### Frontend
```bash
cd backend
npm run serve:frontend  # Iniciar servidor Python en puerto 8080
```

## 🔧 Configuración Local

### Variables de Entorno
- **Producción**: `.env`
- **Desarrollo**: `.env.local` (se carga automáticamente)

### Diferencias Desarrollo vs Producción
| Aspecto | Desarrollo | Producción |
|---------|------------|------------|
| API URL | `localhost:3002` | `moonyetis.io:3002` |
| Frontend | `localhost:8080` | `moonyetis.io` |
| Price Updates | 10 segundos | 60 segundos |
| Transaction Check | 5 segundos | 30 segundos |
| Logs | Debug verbose | Info level |
| CORS | Localhost permitido | Solo moonyetis.io |

## 📡 Endpoints API Locales

### Store API (`localhost:3002`)
- `GET /api/store/health` - Estado del servidor
- `GET /api/store/prices` - Precios actuales FB/MY
- `GET /api/store/products` - Productos disponibles
- `POST /api/store/purchase` - Crear nueva orden
- `GET /api/store/order/:id` - Estado de orden
- `GET /api/store/monitor-status` - Estado del monitor

### Ejemplos de Uso
```bash
# Verificar que el API funciona
curl http://localhost:3002/api/store/health

# Obtener precios actuales
curl http://localhost:3002/api/store/prices

# Ver productos disponibles
curl http://localhost:3002/api/store/products
```

## 🧪 Testing Local

### Wallets Simuladas
En `localhost`, las wallets se simulan automáticamente:
- **UniSat**: Simulación completa con direcciones fake
- **OKX**: Simulación completa con direcciones fake
- **Firmas**: Generadas automáticamente para testing

### Datos de Prueba
- **Dirección de pago**: `bc1pnhnqmuhx9xtqd8naa9wa60ur2n5fv9emjpcethzdwn8kzkx4gv4sf7xkr5`
- **Precios**: Obtenidos de UniSat API real
- **Transacciones**: Monitoreadas en tiempo real

## 🔍 Debugging

### Logs del Backend
```bash
# Ver logs en tiempo real
cd backend
npm run dev

# Ver configuración
npm run dev:config
```

### Logs del Frontend
Abre Developer Tools en el navegador:
- **Console**: Logs de JavaScript
- **Network**: Requests a la API
- **Application**: Estado de wallets

## 🛠️ Desarrollo

### Estructura de Archivos
```
backend/
├── .env.local          # Config desarrollo
├── config.js           # Gestor de configuración
├── store-server-v2.js  # Servidor principal
└── services/           # Servicios auxiliares

frontend/
├── js/config.js        # Config frontend
├── js/store-modal.js   # Modal de store
└── js/wallet-*.js      # Gestión de wallets
```

### Hot Reload
- **Backend**: Nodemon detecta cambios automáticamente
- **Frontend**: Recarga manual del navegador

## 🚨 Solución de Problemas

### Backend no inicia
```bash
# Verificar Node.js
node --version

# Instalar dependencias
cd backend && npm install

# Verificar puerto disponible
lsof -i :3002
```

### Frontend no carga
```bash
# Verificar Python3
python3 --version

# Verificar puerto disponible
lsof -i :8080

# Iniciar manualmente
cd frontend && python3 -m http.server 8080
```

### API no responde
```bash
# Verificar que el backend está corriendo
curl http://localhost:3002/api/store/health

# Verificar logs del backend
# (ver terminal donde se ejecuta npm run dev)
```

## ✅ Checklist Pre-Producción

Antes de subir a producción, verifica:
- [ ] Store modal se abre correctamente
- [ ] Precios se actualizan automáticamente
- [ ] Wallets se detectan/simulan correctamente
- [ ] Órdenes se crean sin errores
- [ ] Monitor de transacciones funciona
- [ ] Logs no muestran errores críticos

## 🔄 Workflow Recomendado

1. **Iniciar desarrollo**: `./start-local-dev.sh`
2. **Abrir navegador**: `http://localhost:8080`
3. **Hacer cambios** en código
4. **Verificar** en navegador
5. **Repetir** hasta completar funcionalidad
6. **Probar** con diferentes wallets/escenarios
7. **Subir a producción** cuando esté listo