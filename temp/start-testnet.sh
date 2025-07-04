#!/bin/bash

# MoonYetis Testnet Startup Script
# Este script inicia el servidor en modo testnet

echo "🧪 ========================================"
echo "🚀 INICIANDO MOONYETIS EN MODO TESTNET"
echo "🧪 ========================================"

# Verificar que Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js no está instalado"
    echo "   Instala Node.js desde: https://nodejs.org/"
    exit 1
fi

# Verificar que las dependencias están instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Error instalando dependencias"
        exit 1
    fi
fi

# Copiar configuración de testnet
if [ -f ".env.testnet" ]; then
    echo "📝 Copiando configuración de testnet..."
    cp .env.testnet .env
else
    echo "⚠️  Advertencia: .env.testnet no encontrado, creando configuración básica..."
    cat > .env << EOF
NODE_ENV=development
PORT=3000
FRACTAL_NETWORK=testnet
FRACTAL_API_URL=https://mempool-testnet.fractal.io/api
SESSION_SECRET=moonyetis-testnet-secret
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=debug
ENABLE_VERBOSE_LOGGING=true
EOF
fi

# Crear directorio de logs si no existe
mkdir -p logs

# Función para limpiar al salir
cleanup() {
    echo ""
    echo "🛑 Deteniendo servidor testnet..."
    kill $SERVER_PID 2>/dev/null
    echo "✅ Servidor detenido"
    exit 0
}

# Registrar función de limpieza para señales
trap cleanup SIGINT SIGTERM

echo ""
echo "🌐 Configuración de testnet:"
echo "   • Puerto: 3000"
echo "   • Red: Fractal Bitcoin Testnet"
echo "   • Frontend: http://localhost:3000"
echo "   • API Health: http://localhost:3000/api/health"
echo "   • Wallet API: http://localhost:3000/api/wallet/status"
echo ""

echo "🚀 Iniciando servidor..."

# Iniciar servidor en background
node server.js &
SERVER_PID=$!

# Esperar a que el servidor inicie
echo "⏳ Esperando a que el servidor inicie..."
sleep 3

# Verificar que el servidor está corriendo
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "❌ Error: El servidor no pudo iniciarse"
    echo "   Revisa los logs para más detalles"
    exit 1
fi

echo "✅ Servidor iniciado exitosamente (PID: $SERVER_PID)"
echo ""

# Ejecutar tests automáticos
echo "🧪 Ejecutando tests de integración..."
sleep 2

node test-wallet-integration.js
TEST_RESULT=$?

echo ""
if [ $TEST_RESULT -eq 0 ]; then
    echo "✅ Todos los tests pasaron!"
    echo ""
    echo "🎯 INSTRUCCIONES PARA TESTEAR MANUALMENTE:"
    echo ""
    echo "1. 📱 Instala una wallet compatible:"
    echo "   • UniSat Wallet: https://unisat.io/"
    echo "   • OKX Wallet: https://okx.com/web3"
    echo ""
    echo "2. 🌐 Abre el frontend:"
    echo "   http://localhost:3000"
    echo ""
    echo "3. 🔗 Conecta tu wallet:"
    echo "   • Cambia a Fractal Bitcoin Testnet en tu wallet"
    echo "   • Haz clic en 'Conectar Wallet'"
    echo "   • Selecciona tu wallet y firma el mensaje"
    echo ""
    echo "4. 🎰 Prueba el slot machine:"
    echo "   • Ajusta la apuesta"
    echo "   • Haz clic en 'GIRAR'"
    echo "   • Observa las animaciones y resultados"
    echo ""
    echo "5. 🔍 Monitorea los logs:"
    echo "   • Revisa la consola para logs detallados"
    echo "   • Observa las llamadas a APIs de blockchain"
    echo ""
else
    echo "⚠️  Algunos tests fallaron, pero el servidor está corriendo"
    echo "   Revisa los resultados de los tests arriba"
    echo "   Puedes continuar con tests manuales"
fi

echo ""
echo "📊 ENDPOINTS DISPONIBLES:"
echo "   • GET  /api/health              - Estado del servidor"
echo "   • GET  /api/wallet/status       - Estado de wallet"
echo "   • POST /api/wallet/connect      - Conectar wallet"
echo "   • GET  /api/wallet/balance/:addr - Consultar balance"
echo "   • POST /api/wallet/disconnect   - Desconectar wallet"
echo ""

echo "🔄 El servidor está corriendo..."
echo "   Presiona Ctrl+C para detener"
echo ""

# Mantener el script corriendo
wait $SERVER_PID