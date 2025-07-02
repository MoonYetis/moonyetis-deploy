// Wallet Integration - Bridge between wallet-manager and slot-machine
console.log('🔗 Wallet Integration Bridge Loading... [FIXED VERSION v3.0]');

// Main wallet connection function
async function connectWallet() {
    console.log('🔗 Iniciando conexión real de wallet...');
    
    try {
        // Detectar wallets disponibles
        const availableWallets = await walletManager.detectAvailableWallets();
        
        if (!availableWallets.unisat.available && !availableWallets.okx.available) {
            showWalletInstallationMessage(availableWallets);
            return;
        }
        
        // Mostrar selector de wallet
        const walletChoice = await showWalletSelector(availableWallets);
        if (!walletChoice) {
            slotMachine.showMessage('⚠️ Conexión cancelada', 'lose');
            return;
        }
        
        // Mostrar loading
        slotMachine.showMessage('🔄 Conectando wallet...', 'neutral');
        
        // Conectar wallet seleccionada
        let connectionResult;
        if (walletChoice === 'unisat') {
            slotMachine.showMessage('🦄 Conectando UniSat... Por favor autoriza en la extensión', 'neutral');
            connectionResult = await walletManager.connectUniSat();
        } else if (walletChoice === 'okx') {
            slotMachine.showMessage('🟠 Conectando OKX... Por favor autoriza en la extensión', 'neutral');
            connectionResult = await walletManager.connectOKX();
        }
        
        if (connectionResult.success) {
            // Verificar conexión con backend
            const backendVerification = await verifyWalletWithBackend(connectionResult);
            
            if (backendVerification.success) {
                // Actualizar estado del juego
                gameState.connectedWallet = true;
                gameState.walletAddress = connectionResult.address;
                gameState.walletType = connectionResult.walletType;
                gameState.balance = connectionResult.balance.total;
                
                // Actualizar UI
                updateWalletUI(connectionResult);
                slotMachine.updateUI();
                
                // Setup listeners para cambios de wallet
                setupWalletEventListeners();
                
                // Registrar para monitoreo de depósitos
                await registerForDepositMonitoring();
                
                slotMachine.showMessage(`🎉 Wallet ${connectionResult.walletType.toUpperCase()} conectada!`, 'win');
                console.log('✅ Wallet conectada exitosamente:', connectionResult.address);
            } else {
                slotMachine.showMessage(`❌ Error verificando wallet: ${backendVerification.error}`, 'lose');
            }
        } else {
            slotMachine.showMessage(`❌ Error conectando: ${connectionResult.error}`, 'lose');
        }
        
    } catch (error) {
        console.error('❌ Error en conexión de wallet:', error);
        slotMachine.showMessage(`❌ Error inesperado: ${error.message}`, 'lose');
    }
}

// Mostrar selector de wallet
async function showWalletSelector(availableWallets) {
    console.log('🔗 Mostrando selector de wallet:', availableWallets);
    
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'wallet-selector-modal';
        modal.innerHTML = `
            <div class="wallet-selector-content">
                <h3>🔗 Conecta tu Wallet</h3>
                <p>Selecciona tu wallet preferida para jugar MoonYetis Slots</p>
                <div class="wallet-buttons">
                    ${availableWallets.unisat.available ? 
                        `<button class="wallet-btn" data-wallet="unisat">
                            ${availableWallets.unisat.icon} ${availableWallets.unisat.name}
                            <span class="wallet-status">✅ Detectada</span>
                        </button>` : 
                        `<button class="wallet-btn disabled" data-wallet="unisat" data-action="install">
                            ${availableWallets.unisat.icon} ${availableWallets.unisat.name}
                            <span class="wallet-status">❌ No instalada</span>
                        </button>`
                    }
                    ${availableWallets.okx.available ? 
                        `<button class="wallet-btn" data-wallet="okx">
                            ${availableWallets.okx.icon} ${availableWallets.okx.name}
                            <span class="wallet-status">✅ Detectada</span>
                        </button>` : 
                        `<button class="wallet-btn disabled" data-wallet="okx" data-action="install">
                            ${availableWallets.okx.icon} ${availableWallets.okx.name}
                            <span class="wallet-status">❌ No instalada</span>
                        </button>`
                    }
                </div>
                <button class="cancel-btn" data-action="cancel">Cancelar</button>
                <div style="margin-top: 1rem; font-size: 0.8rem; color: #666;">
                    <p>🔍 Debug: UniSat=${availableWallets.unisat.available}, OKX=${availableWallets.okx.available}</p>
                </div>
            </div>
        `;
        
        // Usar addEventListener en lugar de onclick
        modal.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) return;
            
            const walletType = button.dataset.wallet;
            const action = button.dataset.action;
            
            console.log('👆 Click detectado:', { walletType, action, button });
            
            if (action === 'install') {
                const urls = {
                    unisat: 'https://unisat.io/',
                    okx: 'https://okx.com/web3'
                };
                console.log('🔗 Abriendo URL de instalación:', urls[walletType]);
                window.open(urls[walletType], '_blank');
                return;
            }
            
            if (action === 'cancel') {
                console.log('❌ Cancelando selección de wallet');
                document.body.removeChild(modal);
                resolve(null);
                return;
            }
            
            if (walletType && !button.classList.contains('disabled')) {
                console.log('✅ Wallet seleccionada:', walletType);
                document.body.removeChild(modal);
                resolve(walletType);
            }
        });
        
        // Cleanup de funciones globales anteriores
        delete window.selectWallet;
        delete window.installWallet;
        delete window.cancelWalletSelection;
        
        document.body.appendChild(modal);
        console.log('📋 Modal de wallet agregado al DOM');
    });
}

// Verificar wallet con backend
async function verifyWalletWithBackend(connectionData) {
    try {
        console.log('🔄 Verificando wallet con backend...');
        console.log('📤 Datos de conexión:', connectionData);
        
        slotMachine.showMessage('🔍 Verificando firma con servidor...', 'neutral');
        
        const payload = {
            address: connectionData.address,
            signature: connectionData.signature.signature,
            message: connectionData.signature.message,
            walletType: connectionData.walletType,
            timestamp: connectionData.signature.timestamp
        };
        
        console.log('📤 Payload enviado:', payload);
        
        // Check if we're in development mode (no backend running)
        const isDevelopment = connectionData.signature === 'fake_signature_for_development_testing_only' || 
                             connectionData.signature === 'fake_okx_signature_for_development_testing_only';
        
        if (isDevelopment) {
            console.log('🚧 MODO DESARROLLO: Simulando verificación exitosa del backend');
            return {
                success: true,
                message: 'Verificación simulada para desarrollo',
                address: connectionData.address,
                walletType: connectionData.walletType,
                developmentMode: true
            };
        }
        
        const response = await fetch('/api/wallet/connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        console.log('📥 Response status:', response.status);
        
        const result = await response.json();
        console.log('📥 Response data:', result);
        
        if (!response.ok) {
            throw new Error(result.error?.message || result.error || `HTTP ${response.status}`);
        }
        
        return result;
    } catch (error) {
        console.error('❌ Error verificando con backend:', error);
        
        // Proporcionar errores más específicos
        let errorMessage = error.message;
        if (error.message.includes('firma inválida')) {
            errorMessage = 'La firma no es válida. Intenta conectar de nuevo.';
        } else if (error.message.includes('expirado')) {
            errorMessage = 'El mensaje de firma expiró. Intenta de nuevo.';
        } else if (error.message.includes('network')) {
            errorMessage = 'Error de conexión con el servidor. Verifica tu internet.';
        }
        
        return { success: false, error: errorMessage };
    }
}

// Actualizar UI de wallet
function updateWalletUI(connectionData) {
    // Actualizar botón de wallet
    const walletBtn = document.getElementById('connectWallet');
    const walletBtnText = document.getElementById('walletBtnText');
    if (walletBtn && walletBtnText) {
        walletBtnText.textContent = `${connectionData.walletType === 'unisat' ? '🦄' : '🟠'} ${connectionData.address.substring(0, 6)}...${connectionData.address.substring(-4)}`;
        walletBtn.onclick = disconnectWallet;
        walletBtn.title = 'Click to disconnect wallet';
    }
    
    // Actualizar status de conexión
    const connectionStatus = document.getElementById('connectionStatus');
    const statusText = document.getElementById('statusText');
    if (connectionStatus && statusText) {
        connectionStatus.className = 'status-indicator connected';
        statusText.textContent = `Connected (${connectionData.walletType.toUpperCase()})`;
    }
    
    // Actualizar balance
    const balanceDisplay = document.getElementById('balanceDisplay');
    const balance = document.getElementById('balance');
    if (balanceDisplay && balance) {
        balanceDisplay.style.display = 'block';
        balance.textContent = connectionData.balance.total;
    }
}

// Setup event listeners para wallet
function setupWalletEventListeners() {
    walletManager.onAccountChanged = (newAccount) => {
        slotMachine.showMessage('🔄 Cuenta de wallet cambiada, reconectando...', 'neutral');
        setTimeout(() => {
            disconnectWallet();
        }, 2000);
    };
    
    walletManager.onNetworkChanged = (network) => {
        console.log('🌐 Red cambiada:', network);
        slotMachine.showMessage('⚠️ Red de wallet cambiada', 'neutral');
    };
}

// Desconectar wallet
function disconnectWallet() {
    console.log('🔌 Desconectando wallet...');
    
    walletManager.disconnect();
    
    gameState.connectedWallet = false;
    gameState.walletAddress = null;
    gameState.walletType = null;
    gameState.balance = 0;
    
    // Restaurar botón de wallet
    const walletBtn = document.getElementById('connectWallet');
    const walletBtnText = document.getElementById('walletBtnText');
    if (walletBtn && walletBtnText) {
        walletBtnText.textContent = 'Connect Wallet';
        walletBtn.onclick = connectWallet;
        walletBtn.title = 'Connect your wallet to start playing';
    }
    
    // Actualizar status de conexión
    const connectionStatus = document.getElementById('connectionStatus');
    const statusText = document.getElementById('statusText');
    if (connectionStatus && statusText) {
        connectionStatus.className = 'status-indicator disconnected';
        statusText.textContent = 'Not Connected';
    }
    
    // Ocultar balance
    const balanceDisplay = document.getElementById('balanceDisplay');
    if (balanceDisplay) {
        balanceDisplay.style.display = 'none';
    }
    
    slotMachine.updateUI();
    slotMachine.showMessage('🔌 Wallet desconectada', 'neutral');
}

// Mostrar mensaje de instalación de wallets
function showWalletInstallationMessage(availableWallets) {
    const message = `
        ⚠️ No se encontraron wallets compatibles.
        
        Instala una de estas wallets:
        ${!availableWallets.unisat.installed ? '• UniSat Wallet (https://unisat.io/)' : ''}
        ${!availableWallets.okx.installed ? '• OKX Wallet (https://okx.com/web3)' : ''}
    `;
    
    slotMachine.showMessage(message, 'lose');
}

// Registrar para monitoreo de depósitos
async function registerForDepositMonitoring() {
    try {
        console.log('📝 Registrando para monitoreo de depósitos...');
        
        const response = await fetch('/api/transactions/monitor/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Registrado para monitoreo de depósitos');
            
            // Iniciar verificación periódica de depósitos
            startDepositCheck();
        } else {
            console.warn('⚠️ Error registrando para monitoreo:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Error en registro de monitoreo:', error);
    }
}

// Verificar depósitos pendientes periódicamente
function startDepositCheck() {
    // Verificar depósitos cada 30 segundos
    setInterval(async () => {
        await checkPendingDeposits();
    }, 30000);
    
    // Verificar inmediatamente
    checkPendingDeposits();
}

// Verificar depósitos pendientes
async function checkPendingDeposits() {
    try {
        const response = await fetch('/api/transactions/deposits/pending');
        const result = await response.json();
        
        if (result.success && result.pendingDeposits.length > 0) {
            console.log(`💰 ${result.pendingDeposits.length} depósitos pendientes encontrados`);
            
            // Mostrar notificación si hay depósitos nuevos
            result.pendingDeposits.forEach(deposit => {
                if (!deposit.notified) {
                    slotMachine.showMessage(`💰 Depósito detectado: ${deposit.amount} sats (${deposit.confirmations} confirmaciones)`, 'neutral');
                    deposit.notified = true;
                }
            });
        }
    } catch (error) {
        console.error('❌ Error verificando depósitos:', error);
    }
}

// Refrescar balance y verificar depósitos
async function refreshBalanceAndDeposits() {
    try {
        slotMachine.showMessage('🔄 Actualizando balance...', 'neutral');
        
        const response = await fetch('/api/transactions/balance/refresh');
        const result = await response.json();
        
        if (result.success) {
            // Actualizar balance local
            gameState.balance = result.balance.total;
            slotMachine.updateUI();
            
            if (result.pendingDeposits.length > 0) {
                slotMachine.showMessage(`💰 Balance actualizado. ${result.pendingDeposits.length} depósitos pendientes.`, 'win');
            } else {
                slotMachine.showMessage('✅ Balance actualizado', 'win');
            }
        } else {
            slotMachine.showMessage(`❌ Error actualizando: ${result.error}`, 'lose');
        }
        
    } catch (error) {
        console.error('❌ Error refrescando balance:', error);
        slotMachine.showMessage('❌ Error de conexión', 'lose');
    }
}

// Additional utility functions for UI feedback
function showSuccessMessage(message) {
    slotMachine.showMessage(`✅ ${message}`, 'win');
}

function showErrorMessage(message) {
    slotMachine.showMessage(`❌ ${message}`, 'lose');
}

function showNotification(message, type = 'neutral') {
    slotMachine.showMessage(message, type);
}

// Wallet modal functionality (if needed)
function showWalletModal() {
    // This is handled by connectWallet() function
    connectWallet();
}

function closeWalletModal() {
    // Close any existing wallet modals
    const existingModals = document.querySelectorAll('.wallet-selector-modal');
    existingModals.forEach(modal => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    });
}

// Initialize wallet connection setup when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔗 Wallet Integration DOM Ready');
    console.log('🔍 Initial globals check:', {
        gameState: typeof gameState !== 'undefined',
        walletManager: typeof walletManager !== 'undefined',
        slotMachine: typeof slotMachine !== 'undefined'
    });
    
    // Ensure button exists and setup click handler
    const connectBtn = document.getElementById('connectWallet');
    console.log('🔘 Button search result:', connectBtn ? 'Found' : 'Not found');
    
    if (connectBtn) {
        // Remove any existing listeners to avoid duplicates
        const newBtn = connectBtn.cloneNode(true);
        connectBtn.parentNode.replaceChild(newBtn, connectBtn);
        
        // Add our consolidated event listener
        newBtn.addEventListener('click', function() {
            console.log('🔗 Connect button clicked');
            console.log('🔍 Available globals:', {
                gameState: typeof gameState !== 'undefined',
                walletManager: typeof walletManager !== 'undefined',
                connectWallet: typeof connectWallet === 'function'
            });
            
            // Verificar que gameState esté disponible
            if (typeof gameState !== 'undefined') {
                console.log('🎮 gameState.connectedWallet:', gameState.connectedWallet);
                
                if (gameState.connectedWallet) {
                    disconnectWallet();
                } else {
                    connectWallet();
                }
            } else {
                console.error('❌ gameState no está disponible');
                // Intentar conectar directamente si gameState no está disponible
                connectWallet();
            }
        });
        
        console.log('✅ Connect wallet button setup completed');
    } else {
        console.warn('⚠️ Connect wallet button not found');
    }
});

// Expose functions globally
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.refreshBalanceAndDeposits = refreshBalanceAndDeposits;
window.showSuccessMessage = showSuccessMessage;
window.showErrorMessage = showErrorMessage;
window.showNotification = showNotification;
window.showWalletModal = showWalletModal;
window.closeWalletModal = closeWalletModal;

console.log('✅ Wallet Integration Bridge Loaded [v3.0 - FIXED VERSION - Backend Simulation Applied]');