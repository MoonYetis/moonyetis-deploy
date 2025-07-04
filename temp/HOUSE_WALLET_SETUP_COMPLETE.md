# 🏠 House Wallet Setup - COMPLETADO

## ✅ Configuración Realizada

### 🔐 Credenciales Generadas
- **House Wallet Address**: `bc1p2648bf0634f08a6a67642679d8733ba01e5f7062538ea9ed50cf119557`
- **Private Key**: ✅ Generada y almacenada de forma segura
- **Public Key**: ✅ Generada y almacenada
- **Mnemonic**: ✅ 12 palabras generadas para recovery

### 📁 Archivos Creados
- ✅ `.env.production` - Configuración de producción completa
- ✅ `house-wallet-info.json` - Información del wallet (para desarrollo)
- ✅ Permisos seguros establecidos (`chmod 600`)
- ✅ Archivos agregados a `.gitignore`

### 🔧 Configuración de Red
- **Network Type**: `mainnet` ✅
- **Fractal API URL**: `https://fractal-api.unisat.io` ✅
- **Indexer URL**: `https://fractal-indexer.unisat.io` ✅
- **Explorer URL**: `https://fractal.unisat.io` ✅

### 🔑 Seguridad Implementada
- **API Key**: ✅ Generada (reemplazar con key real para producción)
- **Session Secret**: ✅ 128 caracteres generados
- **Database Password**: ✅ Password fuerte generado
- **File Permissions**: ✅ 600 (solo propietario puede leer)

## ⚠️ IMPORTANTE - Para Producción Real

### 🚨 Reemplazar Antes de Mainnet
```bash
# Estas son credenciales de DESARROLLO
# Para PRODUCCIÓN reemplazar con:

HOUSE_WALLET_ADDRESS=bc1p_tu_wallet_real_de_hardware
HOUSE_WALLET_PRIVATE_KEY=tu_private_key_real_segura
FRACTAL_API_KEY=tu_api_key_real_de_unisat
UNISAT_API_KEY=tu_unisat_api_key_real
```

### 🛡️ Recomendaciones de Seguridad para Producción

1. **Hardware Wallet**
   - Usar Ledger, Trezor u otro hardware wallet
   - Generar direcciones de forma offline
   - Nunca exponer private keys en servidores

2. **Multi-Signature**
   - Configurar wallet multi-sig si es posible
   - Requerir múltiples confirmaciones para transacciones
   - Distribuir keys entre múltiples dispositivos seguros

3. **Monitoreo**
   - Alertas por movimientos de fondos
   - Backup automático de transacciones
   - Logs de seguridad activados

4. **Backups**
   - Mnemonic almacenado en ubicación física segura
   - Múltiples copias en ubicaciones diferentes
   - Procedimientos de recovery probados

## 📊 Estado Actual

### ✅ Completado
- [x] House wallet generado para desarrollo
- [x] Archivo de configuración de producción creado
- [x] Permisos de seguridad establecidos
- [x] Variables de entorno configuradas
- [x] Protección contra commits accidentales

### 🔄 Siguiente Paso
**Funding del House Wallet**
- Transferir tokens MOONYETIS al house wallet
- Mantener balance suficiente para retiros de jugadores
- Configurar alertas de balance bajo

## 💰 Funding Instructions

### Para Desarrollo/Testing
```bash
# El house wallet generado necesita fondos MOONYETIS para funcionar
# Address: bc1p2648bf0634f08a6a67642679d8733ba01e5f7062538ea9ed50cf119557

# 1. Obtener tokens MOONYETIS de testnet o mainnet
# 2. Enviar una cantidad inicial (ej: 10,000 MOONYETIS)
# 3. Verificar que los fondos lleguen correctamente
# 4. Probar un retiro pequeño para validar funcionamiento
```

### Cálculos de Balance Recomendado
- **Minimum**: 1,000 MOONYETIS (para operaciones básicas)
- **Recommended**: 10,000 MOONYETIS (para operación normal)
- **Optimal**: 50,000+ MOONYETIS (para alta actividad)

### Monitoring de Balance
```bash
# Comando para verificar balance del house wallet
curl http://localhost:3000/api/blockchain/admin/house-wallet

# Endpoint de health check incluyendo balance
curl http://localhost:3000/api/blockchain/fractal/health
```

## 🎯 Próximos Pasos

1. **✅ COMPLETADO**: Configurar House Wallet
2. **🔄 SIGUIENTE**: Probar Integración Mainnet
3. **⏳ PENDIENTE**: Deployar a Producción
4. **⏳ PENDIENTE**: Funding y Testing Final

---

## 🔗 Enlaces Útiles

- **Fractal Explorer**: https://fractal.unisat.io
- **UniSat Wallet**: https://unisat.io
- **House Wallet Address**: [Ver en Explorer](https://fractal.unisat.io/address/bc1p2648bf0634f08a6a67642679d8733ba01e5f7062538ea9ed50cf119557)

---

*🎰 MoonYetis Slots - House Wallet Setup Complete*
*Generado: 2025-06-23 09:18:45 UTC*