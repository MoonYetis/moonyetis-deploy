# 🚀 MoonYetis Deploy Package

## 📁 Estructura del Deploy

```
moonyetis-deploy/
├── frontend/          → Subir a /var/www/html/
│   ├── index.html     (archivo principal del casino)
│   ├── assets/        (símbolos del juego)
│   ├── images/        (imágenes QR, etc.)
│   ├── css/           (estilos)
│   ├── js/            (scripts)
│   └── favicon.ico
│
└── backend/           → Subir a /var/www/api/
    ├── hd-wallet-server.js    (servidor API HD wallet)
    ├── package.json           (dependencias)
    └── start-production.sh    (script de inicio)
```

## 🎯 Pasos de Deploy

### 1. Frontend
```bash
# En el servidor:
cd /var/www/html
sudo rm -f index.html  # Remover versión anterior

# Subir TODA la carpeta frontend/ a /var/www/html/
# index.html será el archivo principal
```

### 2. Backend
```bash
# En el servidor:
sudo mkdir -p /var/www/api
cd /var/www/api

# Subir TODA la carpeta backend/ a /var/www/api/

# Instalar dependencias:
npm install --production

# Iniciar servidor:
npm start
# O usar: ./start-production.sh
```

### 3. Verificación
- Frontend: https://moonyetis.io
- Backend: https://moonyetis.io:3001/api/deposit/addresses

## ⚠️ Importante
- Backend contiene tu seed phrase real
- Puerto 3001 debe estar abierto
- Wallets solo funcionan en HTTPS

## 🎮 Funcionalidades Nuevas
✅ Direcciones HD únicas por usuario
✅ Monitoreo de depósitos en tiempo real  
✅ Conexión UniSat/OKX en HTTPS
✅ Comisión de retiro 1%
✅ Interfaz completamente en inglés
✅ Sistema sin datos demo