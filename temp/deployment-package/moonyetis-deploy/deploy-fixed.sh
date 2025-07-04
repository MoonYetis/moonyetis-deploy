#!/bin/bash
echo "🚀 Redeployando MoonYetis Slots con fixes..."

# 1. Parar el proceso actual
echo "⏹️ Parando proceso actual..."
pm2 stop moonyetis-slots || true

# 2. Crear backup del directorio actual
echo "💾 Creando backup..."
cp -r /root/Desktop/moonyetis-slots-FIXED-20250624-220958 /root/Desktop/moonyetis-slots-backup-$(date +%Y%m%d-%H%M%S) || true

# 3. Limpiar directorio actual
echo "🧹 Limpiando directorio..."
rm -rf /root/Desktop/moonyetis-slots-FIXED-20250624-220958/*

# 4. Clonar repositorio actualizado
echo "📥 Clonando código actualizado..."
cd /root/Desktop
git clone https://github.com/MoonYetis/moonyetis-slots-ultra-accessible.git temp-repo

# 5. Copiar archivos al directorio correcto
echo "📂 Copiando archivos..."
cp -r temp-repo/* /root/Desktop/moonyetis-slots-FIXED-20250624-220958/
rm -rf temp-repo

# 6. Instalar dependencias
echo "📦 Instalando dependencias..."
cd /root/Desktop/moonyetis-slots-FIXED-20250624-220958
npm install || echo "⚠️ npm install falló, continuando..."

# 7. Reiniciar con PM2
echo "🔄 Reiniciando con PM2..."
pm2 start server.js --name moonyetis-slots --max-memory-restart 500M

# 8. Verificar estado
echo "✅ Verificando estado..."
pm2 status
pm2 logs moonyetis-slots --lines 10

echo "🎉 Redeploy completado!"
echo ""
echo "🌐 URLs para verificar:"
echo "- http://168.231.124.18:3000"
echo "- http://moonyetis.io"
echo ""
echo "🔧 Para verificar logs:"
echo "pm2 logs moonyetis-slots"
