// Redeploy del código corregido al VPS
console.log('🚀 Redeployando código corregido al VPS...');

const fs = require('fs');
const path = require('path');

// Script para redeploy manual
const deployScript = `#!/bin/bash
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
`;

// Guardar script de deploy
fs.writeFileSync(path.join(__dirname, 'deploy-fixed.sh'), deployScript, 'utf8');

console.log('✅ Script de redeploy creado: deploy-fixed.sh');
console.log('');
console.log('📋 INSTRUCCIONES PARA EL VPS:');
console.log('');
console.log('1. Copia y pega este comando en el terminal del VPS:');
console.log('');
console.log('cat > /tmp/deploy-fixed.sh << \'EOF\'');
console.log(deployScript);
console.log('EOF');
console.log('');
console.log('2. Luego ejecuta:');
console.log('chmod +x /tmp/deploy-fixed.sh');
console.log('/tmp/deploy-fixed.sh');
console.log('');
console.log('💡 ALTERNATIVA SIMPLE:');
console.log('');
console.log('# Parar proceso');
console.log('pm2 stop moonyetis-slots');
console.log('');
console.log('# Clonar repo actualizado');
console.log('cd /tmp && git clone https://github.com/MoonYetis/moonyetis-slots-ultra-accessible.git');
console.log('');
console.log('# Copiar archivos');
console.log('cp -r /tmp/moonyetis-slots-ultra-accessible/* /root/Desktop/moonyetis-slots-FIXED-20250624-220958/');
console.log('');
console.log('# Reiniciar');
console.log('cd /root/Desktop/moonyetis-slots-FIXED-20250624-220958');
console.log('pm2 start server.js --name moonyetis-slots');

// También crear un script simple de verificación
const verifyScript = `#!/bin/bash
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
`;

fs.writeFileSync(path.join(__dirname, 'verify-casino.sh'), verifyScript, 'utf8');

console.log('✅ Script de verificación creado: verify-casino.sh');
console.log('');
console.log('🎯 OBJETIVO: Que aparezcan las imágenes y funcione el botón Connect Wallet');