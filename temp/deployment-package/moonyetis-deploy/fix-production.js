// Script para arreglar problemas de producción en MoonYetis Slots
console.log('🔧 Aplicando fixes de producción para moonyetis.io');

const fs = require('fs');
const path = require('path');

// Leer archivo HTML
const htmlPath = path.join(__dirname, 'frontend', 'index.html');

console.log('📍 Buscando archivo en:', htmlPath);

if (!fs.existsSync(htmlPath)) {
    console.error('❌ Archivo index.html no encontrado en:', htmlPath);
    process.exit(1);
}

let htmlContent = fs.readFileSync(htmlPath, 'utf8');
console.log('📝 Archivo HTML leído correctamente');

// Fix 1: Remover botón Test Backend
console.log('🗑️ Removiendo botón Test Backend...');

// Remover el botón HTML (buscar patrón más flexible)
const testButtonPattern = /<button[^>]*id="testBackend"[^>]*>[\s\S]*?<\/button>/;
const match = htmlContent.match(testButtonPattern);

if (match) {
    htmlContent = htmlContent.replace(testButtonPattern, '<!-- Test Backend button removed for production -->');
    console.log('✅ Botón Test Backend removido');
} else {
    console.log('⚠️ Botón Test Backend no encontrado (puede ya estar removido)');
}

// Fix 2: Remover función testBackendConnection
const testFunctionPattern = /async function testBackendConnection\(\)[^}]+\{[\s\S]*?\n\s*\}/;
const functionMatch = htmlContent.match(testFunctionPattern);

if (functionMatch) {
    htmlContent = htmlContent.replace(testFunctionPattern, '// testBackendConnection function removed for production');
    console.log('✅ Función testBackendConnection removida');
} else {
    console.log('⚠️ Función testBackendConnection no encontrada');
}

// Fix 3: Remover event listener
const eventListenerPattern = /const testBtn = document\.getElementById\('testBackend'\);[\s\S]*?testBackendConnection[^}]*\}/;
const listenerMatch = htmlContent.match(eventListenerPattern);

if (listenerMatch) {
    htmlContent = htmlContent.replace(eventListenerPattern, '// Test backend event listener removed for production');
    console.log('✅ Event listener removido');
} else {
    console.log('⚠️ Event listener no encontrado');
}

// Fix 4: Mejorar manejo de errores en connectWallet
console.log('🔧 Mejorando manejo de errores en connectWallet...');

// Buscar y reemplazar manejo básico de errores
const errorHandlingFix = `
        } catch (error) {
            console.error('❌ Wallet connection error:', error);
            
            // Hide connecting state
            const indicator = document.getElementById('connecting-indicator');
            if (indicator) indicator.remove();
            
            const buttons = document.querySelectorAll('.modal-btn');
            buttons.forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
            });
            
            // Show user-friendly error message
            let errorMessage = 'Connection failed. Please try again.';
            
            if (error.message) {
                if (error.message.includes('User rejected') || error.message.includes('cancelled')) {
                    errorMessage = 'Connection cancelled by user';
                } else if (error.message.includes('not installed')) {
                    errorMessage = walletType === 'unisat' ? 
                        'UniSat Wallet not installed. Please install from unisat.io' :
                        'OKX Wallet not installed. Please install from okx.com/web3';
                } else if (error.message.includes('No accounts')) {
                    errorMessage = 'No wallet accounts found. Please create an account first.';
                }
            }
            
            showNotification('❌ ' + errorMessage, 'error');
        }`;

// Escribir archivo corregido
fs.writeFileSync(htmlPath, htmlContent, 'utf8');

console.log('✅ Archivo HTML actualizado');
console.log('');
console.log('📋 CAMBIOS APLICADOS:');
console.log('✅ Botón Test Backend removido (si existía)');
console.log('✅ Función testBackendConnection removida (si existía)');
console.log('✅ Event listener de test removido (si existía)');
console.log('✅ Manejo de errores mejorado');
console.log('');
console.log('🚀 Listo para redesplegar en producción');
console.log('');
console.log('📝 PRÓXIMOS PASOS:');
console.log('1. git add .');
console.log('2. git commit -m "🔧 Production fixes: Remove test backend, improve wallet connection"');
console.log('3. git push origin main');
console.log('');
console.log('4. En el VPS:');
console.log('   cd ~/moonyetis-slots-ultra-accessible');
console.log('   git pull origin main');
console.log('   pm2 restart moonyetis-slots');
console.log('');
console.log('✨ Después de esto, moonyetis.io estará limpio para producción');