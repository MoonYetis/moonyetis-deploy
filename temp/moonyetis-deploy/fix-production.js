// Script para arreglar problemas de producción en MoonYetis Slots
console.log('🔧 Aplicando fixes de producción para moonyetis.io');

const fs = require('fs');
const path = require('path');

// Leer archivo HTML
const htmlPath = path.join(__dirname, 'frontend', 'index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

console.log('📝 Archivo HTML leído correctamente');

// Fix 1: Remover botón Test Backend
console.log('🗑️ Removiendo botón Test Backend...');

// Remover el botón HTML
const testButtonHTML = `<!-- Test Button for Backend Connection -->
<button class="connect-wallet-btn" id="testBackend" style="background: #28a745; margin-left: 10px;">
    🧪 Test Backend
</button>`;

htmlContent = htmlContent.replace(testButtonHTML, '<!-- Test Backend button removed for production -->');

// Remover la función testBackendConnection
const testFunctionStart = 'async function testBackendConnection() {';
const testFunctionEnd = '    }\n}';

const testFunctionRegex = /async function testBackendConnection\(\) \{[\s\S]*?\n\s*\}\n\}/;
htmlContent = htmlContent.replace(testFunctionRegex, '// testBackendConnection function removed for production');

// Remover el event listener
const eventListenerCode = `const testBtn = document.getElementById('testBackend');
if (testBtn) {
    testBtn.addEventListener('click', testBackendConnection);
}`;

htmlContent = htmlContent.replace(eventListenerCode, '// Test backend event listener removed for production');

console.log('✅ Botón Test Backend removido');

// Fix 2: Mejorar manejo de wallet connection
console.log('🔧 Mejorando conexión de wallets...');

// Buscar la función connectWallet y mejorarla
const oldConnectWallet = /async function connectWallet\(walletType\) \{[\s\S]*?(?=async function|\n\n)/;

const newConnectWallet = `async function connectWallet(walletType) {
    console.log(\`🔗 Connecting to \${walletType} wallet...\`);
    
    try {
        showConnectingState();
        
        if (walletType === 'demo') {
            // Demo mode connection
            isWalletConnected = true;
            connectedWallet = 'demo';
            walletAddress = 'demo_wallet_address_12345';
            balance = 1000000000; // 1B MOONYETIS demo
            
            updateWalletUI();
            closeWalletModal();
            updateGameUI();
            showNotification('🎮 Demo mode activated!', 'success');
            return;
        }
        
        let wallet;
        let accounts;
        
        if (walletType === 'unisat') {
            if (typeof window.unisat === 'undefined') {
                throw new Error('UniSat Wallet not installed. Please install from unisat.io');
            }
            wallet = window.unisat;
            
            // Request account access
            accounts = await wallet.requestAccounts();
            console.log('✅ UniSat accounts:', accounts);
            
            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found in UniSat wallet');
            }
            
            // Get network info
            const network = await wallet.getNetwork();
            console.log('🌐 Network:', network);
            
            // Get balance
            const balanceData = await wallet.getBalance();
            console.log('💰 Balance data:', balanceData);
            
        } else if (walletType === 'okx') {
            if (typeof window.okxwallet === 'undefined') {
                throw new Error('OKX Wallet not installed. Please install from okx.com/web3');
            }
            wallet = window.okxwallet.bitcoin;
            
            // Request account access
            accounts = await wallet.requestAccounts();
            console.log('✅ OKX accounts:', accounts);
            
            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found in OKX wallet');
            }
            
            // Get balance
            const balanceData = await wallet.getBalance();
            console.log('💰 Balance data:', balanceData);
            
        } else {
            throw new Error('Unsupported wallet type');
        }
        
        // Update global state
        isWalletConnected = true;
        connectedWallet = walletType;
        walletAddress = accounts[0];
        
        // For now, set demo balance until we implement real BRC-20 balance checking
        balance = 500000000; // 500M MOONYETIS placeholder
        
        // Update UI
        updateWalletUI();
        closeWalletModal();
        updateGameUI();
        
        // Show success notification
        showNotification(\`✅ \${walletType.toUpperCase()} wallet connected successfully!\`, 'success');
        
        // Optional: Fetch real MOONYETIS balance
        // await fetchMOONYETISBalance();
        
    } catch (error) {
        console.error('❌ Wallet connection error:', error);
        hideConnectingState();
        
        let errorMessage = error.message;
        if (errorMessage.includes('User rejected')) {
            errorMessage = 'Connection cancelled by user';
        } else if (errorMessage.includes('not installed')) {
            errorMessage = \`\${walletType.toUpperCase()} Wallet not installed\`;
        }
        
        showNotification(\`❌ \${errorMessage}\`, 'error');
    }
}

function showConnectingState() {
    const buttons = document.querySelectorAll('.modal-btn');
    buttons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.6';
    });
    
    const connectingIndicator = document.createElement('div');
    connectingIndicator.id = 'connecting-indicator';
    connectingIndicator.innerHTML = '🔄 Connecting to wallet...';
    connectingIndicator.style.cssText = \`
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4ECDC4;
        color: white;
        padding: 10px 20px;
        border-radius: 10px;
        z-index: 10000;
        animation: pulse 1s infinite;
    \`;
    document.body.appendChild(connectingIndicator);
}

function hideConnectingState() {
    const buttons = document.querySelectorAll('.modal-btn');
    buttons.forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
    });
    
    const indicator = document.getElementById('connecting-indicator');
    if (indicator) {
        indicator.remove();
    }
}

`;

htmlContent = htmlContent.replace(oldConnectWallet, newConnectWallet);

console.log('✅ Función connectWallet mejorada');

// Fix 3: Agregar detección de producción
console.log('🌐 Agregando detección de entorno...');

const environmentDetection = `
// Environment detection
const isProduction = window.location.hostname === 'moonyetis.io' || window.location.hostname === 'www.moonyetis.io';
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1');

console.log(\`🌍 Environment: \${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}\`);
console.log(\`🌐 Hostname: \${window.location.hostname}\`);

// Production-specific configurations
if (isProduction) {
    console.log('🚀 Running in PRODUCTION mode');
    // Disable debug logs in production
    const originalLog = console.log;
    console.log = function(...args) {
        if (args[0] && typeof args[0] === 'string' && args[0].includes('🧪')) {
            return; // Skip debug logs
        }
        originalLog.apply(console, args);
    };
}
`;

// Insertar detección de entorno al inicio del script
const scriptStart = '<script>';
htmlContent = htmlContent.replace(scriptStart, scriptStart + environmentDetection);

// Escribir archivo corregido
fs.writeFileSync(htmlPath, htmlContent, 'utf8');

console.log('✅ Archivo HTML actualizado');
console.log('');
console.log('📋 CAMBIOS APLICADOS:');
console.log('✅ Botón Test Backend removido');
console.log('✅ Función testBackendConnection removida');
console.log('✅ Event listener de test removido');
console.log('✅ Función connectWallet mejorada');
console.log('✅ Manejo de errores mejorado');
console.log('✅ Estados de conexión añadidos');
console.log('✅ Detección de entorno agregada');
console.log('');
console.log('🚀 Listo para redesplegar en producción');
console.log('');
console.log('📝 Comandos para actualizar en VPS:');
console.log('git add .');
console.log('git commit -m "🔧 Production fixes: Remove test backend, improve wallet connection"');
console.log('git push origin main');
console.log('');
console.log('# En el VPS:');
console.log('cd ~/moonyetis-slots-ultra-accessible');
console.log('git pull origin main');
console.log('pm2 restart moonyetis-slots');