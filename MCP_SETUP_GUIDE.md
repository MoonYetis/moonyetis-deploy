# 🔧 Guía de Configuración de MCPs para MoonYetis

## 📋 MCPs Configurados

### ✅ MCPs Activos
1. **GitHub** - Gestión de repositorios
2. **PostgreSQL** - Base de datos principal
3. **DigitalOcean** - Infraestructura cloud
4. **CoinGecko** - Datos de precios crypto
5. **Moralis** - APIs Web3
6. **Playwright** - Automatización de navegador

### 🆕 MCPs Nuevos Agregados
7. **Bitcoin** - Interacciones con Bitcoin/Fractal Bitcoin
8. **Web3** - Operaciones blockchain generales
9. **Redis** - Cache y sesiones de gaming
10. **MongoDB** - Datos de NFTs y achievements
11. **Docker** - Containerización
12. **Prometheus** - Métricas y monitoreo
13. **Context7** - Documentación actualizada en tiempo real

## 🔑 Tokens y Keys Necesarios

### 1. Tokens Existentes (Verificar si están actualizados)
```bash
# En el archivo: ~/Library/Application Support/Claude/claude_desktop_config.json

# GitHub
GITHUB_PERSONAL_ACCESS_TOKEN="ghp_your_github_token_here"

# DigitalOcean
DO_TOKEN="dop_v1_your_digitalocean_token_here"

# CoinGecko
COINGECKO_API_KEY="CG-your_coingecko_api_key_here"

# Moralis
MORALIS_API_KEY="your_moralis_api_key_here"
```

### 2. Nuevos Tokens Requeridos

#### Bitcoin/Blockchain
```bash
# Recomendado: Alchemy para Bitcoin
BITCOIN_RPC_URL="https://bitcoin-mainnet.g.alchemy.com/v2/your_alchemy_key"
BITCOIN_NETWORK="mainnet"

# Web3 Provider
WEB3_PROVIDER_URL="https://eth-mainnet.g.alchemy.com/v2/your_alchemy_key"
PRIVATE_KEY="your_wallet_private_key_here"
```

#### Bases de Datos
```bash
# Redis (Local o Cloud)
REDIS_URL="redis://localhost:6379"
# Para Redis Cloud: "redis://username:password@host:port"

# MongoDB (Local o Cloud)
MONGODB_URI="mongodb://localhost:27017/moonyetis"
# Para MongoDB Atlas: "mongodb+srv://username:password@cluster.mongodb.net/moonyetis"
```

#### Métricas
```bash
# Prometheus
PROMETHEUS_URL="http://localhost:9090"
```

#### Documentación
```bash
# Context7 (No requiere configuración adicional)
# Se conecta automáticamente para obtener documentación actualizada
```

## 🚀 Instrucciones de Configuración

### Paso 1: Configurar Servicios Bitcoin
1. Crear cuenta en [Alchemy](https://www.alchemy.com/)
2. Crear una app Bitcoin y una app Ethereum
3. Copiar las API keys

### Paso 2: Configurar Redis
```bash
# Opción 1: Redis Local
brew install redis
brew services start redis

# Opción 2: Redis Cloud
# Crear cuenta en Redis Cloud y obtener connection string
```

### Paso 3: Configurar MongoDB
```bash
# Opción 1: MongoDB Local
brew install mongodb-community
brew services start mongodb-community

# Opción 2: MongoDB Atlas
# Crear cuenta en MongoDB Atlas y obtener connection string
```

### Paso 4: Configurar Prometheus
```bash
# Prometheus Local
brew install prometheus
brew services start prometheus
```

### Paso 5: Actualizar Configuración
```bash
# Editar el archivo de configuración
nano ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Reemplazar todos los placeholders con tokens reales
```

## 🎮 Utilidad para MoonYetis

### Bitcoin/Web3 MCPs
- **Transacciones BRC-20**: Gestión de tokens MYTO
- **NFT Ordinals**: Achievements y collectibles
- **Wallet Integration**: Conexión con wallets de usuarios
- **Blockchain Verification**: Provably fair gaming

### Redis MCP
- **Session Management**: Sesiones de gaming
- **Leaderboards**: Rankings en tiempo real
- **Game State**: Estado de slots y juegos
- **Cache**: Datos frecuentemente accedidos

### MongoDB MCP
- **NFT Metadata**: Información de achievements
- **User Profiles**: Datos de jugadores
- **Game History**: Historial de juegos
- **Analytics**: Métricas de gaming

### Docker MCP
- **Containerización**: Desarrollo y producción
- **Microservicios**: Arquitectura escalable
- **CI/CD**: Deploy automatizado

### Prometheus MCP
- **Gaming Metrics**: Spins, wins, losses
- **Performance**: Latencia, throughput
- **Business Metrics**: Revenue, DAU, retention
- **Alerts**: Notificaciones críticas

### Context7 MCP
- **Documentación Actualizada**: Ejemplos de código Web3 actualizados
- **Blockchain Libraries**: Referencias actuales para BRC-20 y Ordinals
- **Smart Contracts**: Patrones y ejemplos de contratos
- **Crypto APIs**: Documentación en tiempo real de APIs blockchain

## 🔍 Verificación de Configuración

### Comando de Prueba
```bash
# Verificar que todos los MCPs están funcionando
claude-code --test-mcps

# O revisar logs
tail -f ~/.config/claude-code/logs/mcp.log
```

### Signos de Éxito
- ✅ Todos los MCPs aparecen como "connected"
- ✅ No hay errores de authentication
- ✅ Los servicios responden a comandos básicos

## 🚨 Seguridad

### Buenas Prácticas
1. **Nunca compartir private keys** en repos públicos
2. **Usar variables de entorno** para tokens sensibles
3. **Rotar keys regularmente** (cada 90 días)
4. **Permisos mínimos** en todos los tokens
5. **Monitoreo de uso** de APIs

### Almacenamiento Seguro
```bash
# Usar 1Password, Bitwarden o similar para tokens
# Configurar vault para development team
```

## 📞 Soporte

### Documentación Oficial
- [MCP Documentation](https://docs.anthropic.com/claude/docs/mcp)
- [Bitcoin MCP](https://github.com/modelcontextprotocol/servers/tree/main/bitcoin)
- [Web3 MCP](https://github.com/modelcontextprotocol/servers/tree/main/web3)

### Troubleshooting
Si tienes problemas, revisa:
1. Logs de MCPs
2. Conectividad de red
3. Validez de tokens
4. Permisos de archivos

---

*Actualizado: 2025-01-18*
*Versión: 1.0*