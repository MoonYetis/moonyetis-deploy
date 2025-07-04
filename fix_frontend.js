const fs = require('fs');
const path = require('path');

// Script para aplicar las correcciones críticas a MoonYetis Slots
console.log('🔧 Aplicando correcciones críticas a MoonYetis Slots...');

const frontendPath = path.join(__dirname, 'frontend', 'index.html');
const backupPath = path.join(__dirname, 'frontend', `index.html.backup.${Date.now()}`);

try {
    // Crear backup
    const originalContent = fs.readFileSync(frontendPath, 'utf8');
    fs.writeFileSync(backupPath, originalContent);
    console.log(`📦 Backup creado: ${backupPath}`);
    
    let content = originalContent;
    
    // Fix 1: Arreglar constructor de SlotMachine con inicialización segura de audioManager
    const oldSlotMachineConstructor = /class SlotMachine \{[\s\S]*?constructor\(\) \{[\s\S]*?this\.cleanupInterval = setInterval\(\(\) => \{[\s\S]*?\}, 30000\); \/\/ Clean every 30 seconds[\s\S]*?\}/;
    
    const newSlotMachineConstructor = `class SlotMachine {
            constructor() {
                this.initializeReels();
                this.bindEvents();
                this.updateUI();
                this.startBackgroundEffects();
                
                // Initialize audio FIRST, then assign to global variable
                try {
                    this.audioManager = new AudioManager();
                    window.audioManager = this.audioManager; // Make globally available
                    console.log('🎵 Audio system initialized successfully');
                } catch (error) {
                    console.warn('🎵 Audio initialization failed:', error);
                    window.audioManager = null;
                    // Create a mock audioManager to prevent errors
                    window.audioManager = {
                        playSound: () => {},
                        toggleAudio: () => {},
                        setMasterVolume: () => {},
                        startBackgroundMusic: () => {},
                        stopBackgroundMusic: () => {}
                    };
                }
                
                // Initialize bonus game manager
                this.bonusManager = new BonusGameManager(this);
                
                // Initialize WebSocket connection safely (without spam)
                this.initializeWebSocketSafely();
                
                // Cleanup interval to prevent memory leaks
                this.cleanupInterval = setInterval(() => {
                    this.performCleanup();
                }, 30000); // Clean every 30 seconds
            }

            // Safe WebSocket initialization that doesn't spam errors
            initializeWebSocketSafely() {
                try {
                    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                    const wsUrl = \`\${protocol}//\${window.location.host}\`;
                    
                    console.log('🔌 Attempting WebSocket connection...');
                    
                    this.ws = new WebSocket(wsUrl);
                    this.wsConnected = false;
                    this.wsRetryCount = 0;
                    this.maxRetries = 3;
                    
                    this.ws.onopen = () => {
                        console.log('🔌 Blockchain WebSocket connected');
                        this.wsConnected = true;
                        this.wsRetryCount = 0;
                        gameState.websocketConnected = true;
                        this.updateUI();
                    };
                    
                    this.ws.onmessage = (event) => {
                        try {
                            const data = JSON.parse(event.data);
                            this.handleWebSocketMessage(data);
                        } catch (error) {
                            console.warn('⚠️ Invalid WebSocket message format');
                        }
                    };
                    
                    this.ws.onclose = () => {
                        console.log('🔌 WebSocket disconnected');
                        this.wsConnected = false;
                        gameState.websocketConnected = false;
                        this.updateUI();
                        
                        // Only retry a limited number of times
                        if (this.wsRetryCount < this.maxRetries) {
                            this.wsRetryCount++;
                            console.log(\`🔌 Will retry WebSocket connection (\${this.wsRetryCount}/\${this.maxRetries}) in 5 seconds...\`);
                            setTimeout(() => {
                                if (!this.wsConnected) {
                                    this.initializeWebSocketSafely();
                                }
                            }, 5000);
                        } else {
                            console.log('🔌 WebSocket max retries reached. Running in offline mode.');
                        }
                    };
                    
                    this.ws.onerror = (error) => {
                        console.warn('🔌 WebSocket error occurred, will handle in onclose');
                        // Don't log the error details to avoid spam
                    };
                    
                } catch (error) {
                    console.warn('🔌 WebSocket initialization failed:', error.message);
                    gameState.websocketConnected = false;
                }
            }

            handleWebSocketMessage(data) {
                switch(data.type) {
                    case 'balance_update':
                        gameState.balance = data.balance;
                        this.updateUI();
                        break;
                    case 'jackpot_update':
                        document.getElementById('jackpotAmount').textContent = \`\${data.jackpot.toLocaleString()} MY\`;
                        break;
                    case 'game_result':
                        this.handleGameResult(data);
                        break;
                    default:
                        console.log('📨 WebSocket message:', data.type);
                }
            }`;
    
    // Aplicar Fix 1
    if (oldSlotMachineConstructor.test(content)) {
        content = content.replace(oldSlotMachineConstructor, newSlotMachineConstructor);
        console.log('✅ Fix 1: SlotMachine constructor actualizado');
    } else {
        console.log('⚠️  Fix 1: No se encontró el patrón del constructor SlotMachine');
    }
    
    // Fix 2: Arreglar función connectWallet
    const oldConnectWallet = /async function connectWallet\(walletType\) \{[\s\S]*?(?=\s*function\s|\s*class\s|\s*\/\/\s*===|\s*<\/script>)/;
    
    const newConnectWallet = `async function connectWallet(walletType) {
            const statusEl = document.getElementById('connectionStatus');
            const statusText = document.getElementById('statusText');
            const walletBtnText = document.getElementById('walletBtnText');
            
            // Set loading state
            statusEl.className = 'status-indicator processing';
            statusText.textContent = 'Connecting...';
            walletBtnText.innerHTML = '<div class="loading"></div>';
            
            try {
                console.log(\`🔗 Attempting to connect \${walletType} wallet...\`);
                
                const success = await walletManager.connectWallet(walletType);
                
                if (success) {
                    // Success - update UI and close modal
                    console.log(\`✅ \${walletType} wallet connected successfully\`);
                    slotMachine.closeModal('walletModal');
                    slotMachine.updateUI();
                    
                    if (walletType === 'demo') {
                        slotMachine.showAchievement('🎮 Demo Mode', 'Welcome to MoonYetis Slots demo!');
                    } else {
                        slotMachine.showAchievement('🔗 Wallet Connected', \`\${walletType} wallet connected successfully!\`);
                    }
                } else {
                    // Connection failed
                    console.log(\`❌ \${walletType} wallet connection failed\`);
                    statusEl.className = 'status-indicator disconnected';
                    statusText.textContent = 'Connection Failed';
                    walletBtnText.textContent = 'Try Again';
                    
                    slotMachine.showAchievement('❌ Connection Failed', 'Please try again or contact support');
                }
            } catch (error) {
                console.error('Wallet connection error:', error);
                
                // Handle specific error types
                if (error.code === 4001) {
                    // User rejected the request
                    console.log('👤 User cancelled wallet connection');
                    statusEl.className = 'status-indicator disconnected';
                    statusText.textContent = 'User Cancelled';
                    walletBtnText.textContent = 'Connect Wallet';
                    slotMachine.showAchievement('👋 Cancelled', 'Wallet connection was cancelled');
                } else if (error.message?.includes('not found') || error.message?.includes('not installed')) {
                    // Wallet not installed
                    console.log('📱 Wallet not found/installed');
                    statusEl.className = 'status-indicator disconnected';
                    statusText.textContent = 'Wallet Not Found';
                    walletBtnText.textContent = 'Install Wallet';
                    slotMachine.showAchievement('📱 Wallet Required', \`Please install \${walletType} wallet to continue\`);
                } else {
                    // Other errors
                    console.log('⚠️ Generic wallet connection error');
                    statusEl.className = 'status-indicator disconnected';
                    statusText.textContent = 'Connection Error';
                    walletBtnText.textContent = 'Try Again';
                    slotMachine.showAchievement('⚠️ Error', 'Connection failed. Please try again.');
                }
                
                // Always close the modal on error
                slotMachine.closeModal('walletModal');
            }
        }`;
    
    // Aplicar Fix 2
    if (oldConnectWallet.test(content)) {
        content = content.replace(oldConnectWallet, newConnectWallet);
        console.log('✅ Fix 2: Función connectWallet actualizada');
    } else {
        console.log('⚠️  Fix 2: No se encontró la función connectWallet');
    }
    
    // Fix 3: Arreglar inicialización DOMContentLoaded
    const oldDOMContentLoaded = /document\.addEventListener\('DOMContentLoaded', function\(\) \{[\s\S]*?console\.log\('✅ MoonYetis Slots initialized successfully'\);[\s\S]*?\}\);/;
    
    const newDOMContentLoaded = `document.addEventListener('DOMContentLoaded', function() {
            console.log('🎰 Initializing MoonYetis Slots...');
            
            try {
                // Initialize slot machine
                slotMachine = new SlotMachine();
                
                // Initialize audio context on first user interaction
                document.addEventListener('click', function initAudio() {
                    if (window.audioManager && window.audioManager.audioContext && window.audioManager.audioContext.state === 'suspended') {
                        window.audioManager.audioContext.resume();
                        console.log('🎵 Audio context resumed');
                    }
                    document.removeEventListener('click', initAudio);
                }, { once: true });
                
                // Show welcome message with sound
                setTimeout(() => {
                    slotMachine.showAchievement('🌙 Welcome to MoonYetis Slots!', 'Connect your wallet to start playing with real tokens');
                    if (window.audioManager) {
                        window.audioManager.playSound('celebration');
                    }
                }, 1000);
                
                // Add keyboard shortcuts info
                console.log('⌨️ Keyboard shortcuts: SPACE = Spin, T = Toggle Turbo, M = Toggle Audio');
                
                console.log('✅ MoonYetis Slots initialized successfully');
                
            } catch (error) {
                console.error('❌ Critical initialization error:', error);
                
                // Fallback: show basic error message
                document.body.innerHTML = \`
                    <div style="text-align: center; padding: 50px; font-family: Arial; background: #0A0E1A; color: #F8FAFC; min-height: 100vh;">
                        <h1 style="color: #FF6B35;">🎰 MoonYetis Slots</h1>
                        <p style="margin: 20px 0;">Initialization error. Please refresh the page.</p>
                        <button onclick="window.location.reload()" style="background: #FF6B35; color: #0A0E1A; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold;">
                            🔄 Refresh Page
                        </button>
                        <div style="margin-top: 30px; padding: 20px; background: rgba(255,107,53,0.1); border-radius: 8px; border: 1px solid #FF6B35;">
                            <p style="font-size: 0.9rem; opacity: 0.8;">Error details: \${error.message}</p>
                        </div>
                    </div>
                \`;
            }
        });`;
    
    // Aplicar Fix 3
    if (oldDOMContentLoaded.test(content)) {
        content = content.replace(oldDOMContentLoaded, newDOMContentLoaded);
        console.log('✅ Fix 3: Inicialización DOMContentLoaded actualizada');
    } else {
        console.log('⚠️  Fix 3: No se encontró la inicialización DOMContentLoaded');
    }
    
    // Fix 4: Agregar inicialización segura de walletManager antes del </script>
    const scriptEndPattern = /(.*)<\/script>(\s*<\/body>\s*<\/html>)$/s;
    
    if (scriptEndPattern.test(content)) {
        content = content.replace(scriptEndPattern, `$1
        
        // === SAFE WALLET MANAGER INITIALIZATION ===
        try {
            window.walletManager = new WalletManager();
            console.log('💼 Wallet manager initialized');
        } catch (error) {
            console.error('❌ Wallet manager initialization failed:', error);
            
            // Create a mock wallet manager to prevent errors
            window.walletManager = {
                connectWallet: async (type) => {
                    console.warn('⚠️ Using mock wallet manager');
                    if (type === 'demo') {
                        gameState.connectedWallet = 'demo';
                        gameState.demoMode = true;
                        gameState.balance = 10000;
                        return { success: true };
                    }
                    return { success: false, error: 'Wallet manager not available' };
                },
                disconnectWallet: () => {
                    gameState.connectedWallet = null;
                    gameState.demoMode = false;
                    gameState.balance = 0;
                },
                get connectedWallet() { return gameState.connectedWallet; },
                get balance() { return gameState.balance; }
            };
        }
        
        console.log('🔧 MoonYetis Slots fixes applied successfully');
        
    </script>$2`);
        console.log('✅ Fix 4: Inicialización segura de walletManager agregada');
    } else {
        console.log('⚠️  Fix 4: No se encontró el patrón </script>');
    }
    
    // Escribir el archivo actualizado
    fs.writeFileSync(frontendPath, content);
    
    console.log('🎉 Correcciones aplicadas exitosamente!');
    console.log('📁 Archivo actualizado:', frontendPath);
    console.log('💾 Backup disponible:', backupPath);
    console.log('');
    console.log('🚀 Próximos pasos:');
    console.log('1. Probar el frontend localmente');
    console.log('2. Subir al servidor con ./deploy.sh');
    console.log('3. Verificar que la conexión de wallets funciona');

} catch (error) {
    console.error('❌ Error aplicando correcciones:', error.message);
    process.exit(1);
}
