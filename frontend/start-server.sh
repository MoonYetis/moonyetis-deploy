#!/bin/bash
echo "🚀 Iniciando servidor HTTP para MoonYetis Wallet Testing"
echo "=================================================="
echo "📂 Directorio: $(pwd)"
echo "🌐 Servidor: http://localhost:8080"
echo "=================================================="
echo ""
echo "📋 Páginas disponibles:"
echo "   🧪 Test Principal: http://localhost:8080/index-test.html"
echo "   🔍 Detector: http://localhost:8080/extension-detector.html"
echo "   🎰 Juego Completo: http://localhost:8080/index.html"
echo ""
echo "💡 Para detener: Ctrl+C"
echo "🔄 Iniciando..."
echo ""

python3 -m http.server 8080