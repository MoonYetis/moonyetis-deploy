#!/bin/bash
echo "🔍 Verificando estado del casino..."
echo ""
echo "📊 Estado de PM2:"
pm2 status
echo ""
echo "📝 Últimos logs:"
pm2 logs moonyetis-slots --lines 20
echo ""
echo "🌐 Probando URLs:"
curl -I http://localhost:3000 || echo "❌ Puerto 3000 no responde"
curl -I http://168.231.124.18:3000 || echo "❌ IP externa no responde"
echo ""
echo "📂 Verificando archivos críticos:"
ls -la /root/Desktop/moonyetis-slots-FIXED-20250624-220958/frontend/index.html
ls -la /root/Desktop/moonyetis-slots-FIXED-20250624-220958/frontend/js/moonyetis-slots.js
echo ""
echo "✅ Verificación completada"
