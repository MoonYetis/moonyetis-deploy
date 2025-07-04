// Verificar archivos críticos del casino
console.log('🔍 Verificando archivos críticos...');

const fs = require('fs');
const path = require('path');

// Archivos críticos que deben existir
const criticalFiles = [
    'frontend/index.html',
    'frontend/js/moonyetis-slots.js',
    'frontend/assets/symbols/moon.png',
    'frontend/assets/symbols/yeti.png',
    'frontend/assets/symbols/rocket.png',
    'frontend/assets/symbols/planet.png',
    'frontend/css/styles.css',
    'server.js',
    'package.json'
];

console.log('📂 Verificando archivos en el repositorio local:');
criticalFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`✅ ${file} (${Math.round(stats.size/1024)}KB)`);
    } else {
        console.log(`❌ ${file} - NO EXISTE`);
    }
});

// Verificar contenido del index.html
console.log('\n📝 Verificando contenido de index.html:');
const htmlPath = path.join(__dirname, 'frontend/index.html');
if (fs.existsSync(htmlPath)) {
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    console.log('🔍 Scripts incluidos:');
    const scriptMatches = htmlContent.match(/<script[^>]*src="[^"]*"[^>]*>/g) || [];
    scriptMatches.forEach(script => {
        console.log(`  📜 ${script}`);
    });
    
    console.log('\n🔍 Verificando elementos críticos:');
    const checks = [
        { name: 'moonyetis-slots.js incluido', pattern: 'moonyetis-slots.js' },
        { name: 'Botón Connect Wallet', pattern: 'id="connectWallet"' },
        { name: 'Modal de wallet', pattern: 'id="walletModal"' },
        { name: 'Contenedor de símbolos', pattern: 'symbols-container' },
        { name: 'Función connectWallet', pattern: 'function connectWallet' },
        { name: 'Función showWalletModal', pattern: 'function showWalletModal' }
    ];
    
    checks.forEach(check => {
        if (htmlContent.includes(check.pattern)) {
            console.log(`✅ ${check.name}`);
        } else {
            console.log(`❌ ${check.name}`);
        }
    });
    
    console.log(`\n📊 Tamaño del HTML: ${Math.round(htmlContent.length/1024)}KB`);
} else {
    console.log('❌ index.html no existe');
}

// Verificar estructura de directorios
console.log('\n📁 Estructura de directorios:');
function listDirectory(dir, prefix = '') {
    try {
        const items = fs.readdirSync(path.join(__dirname, dir));
        items.forEach(item => {
            const itemPath = path.join(__dirname, dir, item);
            const stats = fs.statSync(itemPath);
            if (stats.isDirectory()) {
                console.log(`${prefix}📁 ${item}/`);
                if (prefix.length < 6) { // Evitar recursión infinita
                    listDirectory(path.join(dir, item), prefix + '  ');
                }
            } else {
                console.log(`${prefix}📄 ${item} (${Math.round(stats.size/1024)}KB)`);
            }
        });
    } catch (error) {
        console.log(`${prefix}❌ Error leyendo directorio ${dir}: ${error.message}`);
    }
}

listDirectory('frontend');

console.log('\n🚀 COMANDOS PARA VPS:');
console.log('# Verificar archivos en VPS:');
console.log('ls -la /root/Desktop/moonyetis-slots-FIXED-20250624-220958/frontend/');
console.log('ls -la /root/Desktop/moonyetis-slots-FIXED-20250624-220958/frontend/js/');
console.log('ls -la /root/Desktop/moonyetis-slots-FIXED-20250624-220958/frontend/assets/symbols/');
console.log('');
console.log('# Verificar proceso:');
console.log('pm2 logs moonyetis-slots --lines 20');
console.log('');
console.log('# Si faltan archivos, usa el casino simple:');
console.log('cp /root/Desktop/moonyetis-slots-FIXED-20250624-220958/frontend/simple-slot.html /root/Desktop/moonyetis-slots-FIXED-20250624-220958/frontend/index.html');