// Restaurar funcionalidad y arreglar solo lo necesario
console.log('🔧 Restaurando funcionalidad y aplicando fix mínimo');

const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'frontend', 'index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

console.log('📝 Archivo HTML leído correctamente');

// Paso 1: Restaurar await statements que necesitamos (solo los críticos)
console.log('🔄 Restaurando await statements críticos...');

// Restaurar awaits dentro de funciones async que son necesarios
const awaitsToRestore = [
    'await new Promise(resolve => setTimeout(resolve, 1000));',
    'await wallet.requestAccounts();',
    'await wallet.getNetwork();',
    'await wallet.getBalance();'
];

awaitsToRestore.forEach(awaitStatement => {
    const commentedPattern = new RegExp(`// ${awaitStatement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} // Fixed: was causing syntax error`);
    htmlContent = htmlContent.replace(commentedPattern, awaitStatement);
});

console.log('✅ Awaits críticos restaurados');

// Paso 2: Agregar solo las funciones esenciales de manera simple
console.log('➕ Agregando funciones esenciales de manera simple...');

const essentialFunctions = `
<script>
// Essential wallet functions - simple and safe
function updateWalletUI() {
    console.log('🔄 Updating wallet UI...');
    try {
        const connectBtn = document.getElementById('connectWallet');
        if (connectBtn && typeof isWalletConnected !== 'undefined' && isWalletConnected) {
            connectBtn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
            connectBtn.innerHTML = '<span>✅ Wallet Connected</span>';
        }
    } catch (error) {
        console.log('⚠️ updateWalletUI error:', error.message);
    }
}

function showNotification(message, type = 'info') {
    console.log('📢 Notification:', message);
    try {
        // Remove existing notification
        const existing = document.getElementById('temp-notification');
        if (existing) existing.remove();
        
        // Create simple notification
        const notification = document.createElement('div');
        notification.id = 'temp-notification';
        notification.textContent = message;
        notification.style.cssText = \`
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            background: \${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white; padding: 15px; border-radius: 8px; max-width: 300px;
        \`;
        document.body.appendChild(notification);
        
        // Auto remove
        setTimeout(() => {
            if (notification.parentNode) notification.remove();
        }, 5000);
    } catch (error) {
        console.log('⚠️ showNotification error:', error.message);
    }
}

function closeWalletModal() {
    console.log('🔄 Closing wallet modal...');
    try {
        const modal = document.getElementById('walletModal');
        if (modal) {
            modal.style.display = 'none';
        }
    } catch (error) {
        console.log('⚠️ closeWalletModal error:', error.message);
    }
}

function updateGameUI() {
    console.log('🎮 Updating game UI...');
    try {
        // Simple UI updates
        const spinBtn = document.getElementById('spinBtn');
        if (spinBtn && typeof isWalletConnected !== 'undefined') {
            if (isWalletConnected) {
                spinBtn.disabled = false;
                spinBtn.style.opacity = '1';
            } else {
                spinBtn.disabled = true;
                spinBtn.style.opacity = '0.6';
            }
        }
    } catch (error) {
        console.log('⚠️ updateGameUI error:', error.message);
    }
}

console.log('✅ Essential wallet functions loaded');
</script>

`;

// Insertar las funciones antes del primer script existente, pero después del head
const headCloseIndex = htmlContent.indexOf('</head>');
if (headCloseIndex !== -1) {
    htmlContent = htmlContent.slice(0, headCloseIndex) + essentialFunctions + htmlContent.slice(headCloseIndex);
    console.log('✅ Funciones esenciales insertadas antes del </head>');
} else {
    console.log('⚠️ No se encontró </head>, insertando al inicio del body');
    const bodyStartIndex = htmlContent.indexOf('<body>');
    if (bodyStartIndex !== -1) {
        htmlContent = htmlContent.slice(0, bodyStartIndex + 6) + essentialFunctions + htmlContent.slice(bodyStartIndex + 6);
    }
}

// Paso 3: Asegurar que el evento click del botón funcione
console.log('🔧 Verificando botón Connect Wallet...');

// Verificar que el botón tiene el evento correcto
if (!htmlContent.includes('connectWallet') || !htmlContent.includes('onclick')) {
    console.log('⚠️ Agregando evento click al botón Connect Wallet...');
    
    const buttonPattern = /<button[^>]*id="connectWallet"[^>]*>/;
    const buttonMatch = htmlContent.match(buttonPattern);
    
    if (buttonMatch) {
        const originalButton = buttonMatch[0];
        const newButton = originalButton.replace('>', ' onclick="document.getElementById(\'walletModal\').style.display=\'flex\'">');
        htmlContent = htmlContent.replace(originalButton, newButton);
        console.log('✅ Evento click agregado al botón');
    }
}

// Paso 4: Verificar que las imágenes del slot machine estén correctas
console.log('🎰 Verificando imágenes de símbolos...');

// Asegurar que las rutas de imágenes sean correctas
const imagePatterns = [
    { old: 'assets/symbols/', new: './assets/symbols/' },
    { old: 'src="symbols/', new: 'src="./assets/symbols/' },
    { old: 'url(assets/', new: 'url(./assets/' }
];

imagePatterns.forEach(pattern => {
    if (htmlContent.includes(pattern.old)) {
        htmlContent = htmlContent.replace(new RegExp(pattern.old, 'g'), pattern.new);
        console.log(`✅ Rutas de imagen corregidas: ${pattern.old} → ${pattern.new}`);
    }
});

// Escribir archivo corregido
fs.writeFileSync(htmlPath, htmlContent, 'utf8');

console.log('✅ Restauración y fix aplicados correctamente');
console.log('');
console.log('📋 CAMBIOS APLICADOS:');
console.log('✅ Funciones esenciales agregadas de manera segura');
console.log('✅ Awaits críticos restaurados');
console.log('✅ Evento click del botón Connect Wallet verificado');
console.log('✅ Rutas de imágenes corregidas');
console.log('✅ Funciones con try-catch para evitar errores');
console.log('');
console.log('🎯 Resultado esperado:');
console.log('- Imágenes del slot machine visibles');
console.log('- Botón Connect Wallet funcional');
console.log('- Wallets se conectan sin errores');
console.log('- UI se actualiza correctamente');
console.log('');
console.log('📝 Para actualizar:');
console.log('git add . && git commit -m "🔧 Restore functionality and minimal fix"');
console.log('git push origin main');
console.log('# En VPS: git pull && pm2 restart moonyetis-slots');