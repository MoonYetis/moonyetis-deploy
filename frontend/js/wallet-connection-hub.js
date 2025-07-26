// Wallet Connection Hub - Centralized wallet connection management
// Extracts wallet connection logic from wallet-hub-modal.js
// Version: 1753490000 - DEFINITIVE FIX

console.log('🚀 wallet-connection-hub.js LOADED - Version: 1753490000 - DEFINITIVE FIX');
console.log('✅ This is the MODERN wallet system with PNG logo support');

class WalletConnectionHub {
    constructor() {
        this.isOpen = false;
        this.modal = null;
        this.connectedWallet = null;
        this.availableWallets = [];
        this.isDevelopmentMode = window.location.hostname === 'localhost';
        
        // Connection state
        this.connectionState = {
            isConnected: false,
            isConnecting: false,
            wallet: null,
            address: null,
            balance: null
        };
        
        // Initialize
        this.init();
    }
    
    init() {
        console.log('🔗 Wallet Connection Hub: Initializing...');
        console.log('📍 Current URL:', window.location.href);
        console.log('🏷️ Version Check: wallet-connection-hub.js v1753490000 - DEFINITIVE FIX');
        this.createModal();
        this.setupEventListeners();
        this.detectWallets();
        this.loadConnectionState();
        console.log('✅ Wallet Connection Hub: Initialization complete');
        console.log('🎯 Available wallets:', this.availableWallets.length);
    }
    
    createModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'wallet-connection-modal';
        this.modal.className = 'wallet-connection-overlay';
        this.modal.innerHTML = `
            <div class="wallet-connection-modal">
                <div class="wallet-connection-header">
                    <div class="connection-title">
                        <h2>🔗 Connect Wallet</h2>
                        <span class="connection-subtitle">Choose your Fractal Bitcoin wallet</span>
                    </div>
                    <button class="connection-close" id="connection-close">×</button>
                </div>
                
                <div class="wallet-connection-content">
                    <!-- Wallet Selection -->
                    <div class="wallet-selection" id="wallet-selection">
                        <div class="wallets-grid" id="wallets-grid">
                            <!-- Wallet options will be loaded here -->
                        </div>
                        
                        <div class="connection-info">
                            <div class="info-item">
                                <span class="info-icon">🔒</span>
                                <span class="info-text">Secure connection via browser extension</span>
                            </div>
                            <div class="info-item">
                                <span class="info-icon">⚡</span>
                                <span class="info-text">Instant balance and transaction updates</span>
                            </div>
                            <div class="info-item">
                                <span class="info-icon">🎯</span>
                                <span class="info-text">Support for Fractal Bitcoin network</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Connection Status -->
                    <div class="connection-status" id="connection-status" style="display: none;">
                        <div class="status-content">
                            <div class="status-icon" id="status-icon">🔄</div>
                            <div class="status-text">
                                <h3 id="status-title">Connecting...</h3>
                                <p id="status-message">Please approve the connection in your wallet</p>
                            </div>
                        </div>
                        
                        <div class="connection-steps">
                            <div class="step active" id="step-1">
                                <div class="step-number">1</div>
                                <div class="step-text">Open wallet extension</div>
                            </div>
                            <div class="step" id="step-2">
                                <div class="step-number">2</div>
                                <div class="step-text">Approve connection</div>
                            </div>
                            <div class="step" id="step-3">
                                <div class="step-number">3</div>
                                <div class="step-text">Wallet connected</div>
                            </div>
                        </div>
                        
                        <button class="cancel-connection-btn" id="cancel-connection">Cancel</button>
                    </div>
                    
                    <!-- Connected Wallet -->
                    <div class="connected-wallet" id="connected-wallet" style="display: none;">
                        <div class="wallet-info">
                            <div class="wallet-icon" id="connected-wallet-icon">🔗</div>
                            <div class="wallet-details">
                                <h3 id="connected-wallet-name">UniSat Wallet</h3>
                                <div class="wallet-address" id="connected-wallet-address">fb1q...</div>
                                <div class="wallet-balance" id="connected-wallet-balance">Loading...</div>
                            </div>
                        </div>
                        
                        <div class="wallet-actions">
                            <button class="copy-address-btn" id="copy-address">
                                <span class="btn-icon">📋</span>
                                <span class="btn-text">Copy Address</span>
                            </button>
                            <button class="disconnect-btn" id="disconnect-wallet">
                                <span class="btn-icon">🔌</span>
                                <span class="btn-text">Disconnect</span>
                            </button>
                        </div>
                        
                        <div class="network-info">
                            <div class="network-item">
                                <span class="network-label">Network:</span>
                                <span class="network-value">Fractal Bitcoin</span>
                            </div>
                            <div class="network-item">
                                <span class="network-label">Status:</span>
                                <span class="network-value connected">Connected</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
    }
    
    setupEventListeners() {
        // Close modal
        this.modal.querySelector('#connection-close').addEventListener('click', () => this.close());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });
        
        // Cancel connection
        this.modal.querySelector('#cancel-connection').addEventListener('click', () => this.cancelConnection());
        
        // Disconnect wallet
        this.modal.querySelector('#disconnect-wallet').addEventListener('click', () => this.disconnectWallet());
        
        // Copy address
        this.modal.querySelector('#copy-address').addEventListener('click', () => this.copyAddress());
        
        // Wallet selection (delegated event) - Only respond to button clicks
        this.modal.querySelector('#wallets-grid').addEventListener('click', (e) => {
            // Check if the click was on the connect button
            const connectBtn = e.target.closest('.connect-btn');
            if (connectBtn) {
                const walletOption = connectBtn.closest('.wallet-option');
                if (walletOption && walletOption.dataset.wallet) {
                    // Add visual feedback
                    connectBtn.disabled = true;
                    connectBtn.textContent = 'Connecting...';
                    this.connectWallet(walletOption.dataset.wallet);
                }
            }
            
            // Handle install button clicks (already has onclick attribute)
            const installBtn = e.target.closest('.install-btn');
            if (installBtn) {
                // Prevent default to avoid any conflicts
                e.preventDefault();
            }
        });
        
        // Window events for wallet detection
        window.addEventListener('load', () => this.detectWallets());
    }
    
    detectWallets() {
        this.availableWallets = [];
        
        // Check for UniSat Wallet
        if (window.unisat) {
            this.availableWallets.push({
                id: 'unisat',
                name: 'UniSat Wallet',
                icon: '<img src="images/Unisat-wallet.png" alt="UniSat" style="width: 24px; height: 24px;">',
                description: 'The most popular Bitcoin wallet',
                installed: true,
                provider: window.unisat
            });
        } else {
            this.availableWallets.push({
                id: 'unisat',
                name: 'UniSat Wallet',
                icon: '<img src="images/Unisat-wallet.png" alt="UniSat" style="width: 24px; height: 24px;">',
                description: 'The most popular Bitcoin wallet',
                installed: false,
                downloadUrl: 'https://unisat.io/'
            });
        }
        
        
        
        this.renderWallets();
    }
    
    renderWallets() {
        const grid = this.modal.querySelector('#wallets-grid');
        
        grid.innerHTML = this.availableWallets.map(wallet => `
            <div class="wallet-option ${wallet.installed ? 'installed' : 'not-installed'}" 
                 data-wallet="${wallet.id}">
                <div class="wallet-icon">${wallet.icon}</div>
                <div class="wallet-info">
                    <h4>${wallet.name}</h4>
                    <p>${wallet.description}</p>
                    <div class="wallet-status">
                        ${wallet.installed ? 
                            '<span class="status-badge installed">Installed</span>' : 
                            '<span class="status-badge not-installed">Not Installed</span>'
                        }
                    </div>
                </div>
                <div class="wallet-action">
                    ${wallet.installed ? 
                        '<button class="connect-btn">Connect Wallet</button>' : 
                        `<button class="install-btn" onclick="window.open('${wallet.downloadUrl}', '_blank')">Install</button>`
                    }
                </div>
            </div>
        `).join('');
    }
    
    async connectWallet(walletId) {
        // Prevent multiple connection attempts
        if (this.connectionState.isConnecting) {
            console.log('Already connecting to a wallet...');
            return;
        }
        
        const wallet = this.availableWallets.find(w => w.id === walletId);
        if (!wallet || !wallet.installed) return;
        
        this.showConnectionStatus();
        
        try {
            this.connectionState.isConnecting = true;
            this.updateConnectionStep(1);
            
            let address, balance;
            
            if (walletId === 'unisat') {
                const accounts = await window.unisat.requestAccounts();
                address = accounts[0];
                balance = await window.unisat.getBalance();
            }
            
            this.updateConnectionStep(2);
            
            // Simulate connection delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.connectionState = {
                isConnected: true,
                isConnecting: false,
                wallet: wallet,
                address: address,
                balance: balance
            };
            
            this.updateConnectionStep(3);
            
            // Save connection state
            localStorage.setItem('connected_wallet', JSON.stringify({
                id: walletId,
                address: address,
                name: wallet.name
            }));
            
            // Create user session with wallet data
            const user = this.createUserSession({
                address: address,
                wallet: wallet,
                balance: balance
            });
            
            // Show connected wallet
            setTimeout(async () => {
                // Authenticate with backend to get JWT token
                await this.authenticateWithBackend(user);
                
                this.showConnectedWallet();
                this.emitWalletStateChange();
                
                // Emit user authenticated event
                window.dispatchEvent(new CustomEvent('userAuthenticated', {
                    detail: { user, wallet: this.connectionState }
                }));
            }, 1000);
            
        } catch (error) {
            console.error('Wallet connection failed:', error);
            this.showConnectionError(error.message);
            this.connectionState.isConnecting = false;
            
            // Reset button state after error
            setTimeout(() => {
                this.renderWallets(); // Re-render to reset button states
            }, 2000);
        }
    }
    
    showConnectionStatus() {
        this.modal.querySelector('#wallet-selection').style.display = 'none';
        this.modal.querySelector('#connection-status').style.display = 'block';
        this.modal.querySelector('#connected-wallet').style.display = 'none';
    }
    
    showConnectedWallet() {
        this.modal.querySelector('#wallet-selection').style.display = 'none';
        this.modal.querySelector('#connection-status').style.display = 'none';
        this.modal.querySelector('#connected-wallet').style.display = 'block';
        
        // Update connected wallet display
        const nameElement = this.modal.querySelector('#connected-wallet-name');
        const addressElement = this.modal.querySelector('#connected-wallet-address');
        const balanceElement = this.modal.querySelector('#connected-wallet-balance');
        const iconElement = this.modal.querySelector('#connected-wallet-icon');
        
        nameElement.textContent = this.connectionState.wallet.name;
        addressElement.textContent = this.formatAddress(this.connectionState.address);
        balanceElement.textContent = this.formatBalance(this.connectionState.balance);
        iconElement.innerHTML = this.connectionState.wallet.icon;
    }
    
    showWalletSelection() {
        this.modal.querySelector('#wallet-selection').style.display = 'block';
        this.modal.querySelector('#connection-status').style.display = 'none';
        this.modal.querySelector('#connected-wallet').style.display = 'none';
    }
    
    updateConnectionStep(step) {
        // Reset all steps
        this.modal.querySelectorAll('.step').forEach(s => s.classList.remove('active', 'completed'));
        
        // Update steps
        for (let i = 1; i <= step; i++) {
            const stepElement = this.modal.querySelector(`#step-${i}`);
            if (i < step) {
                stepElement.classList.add('completed');
            } else {
                stepElement.classList.add('active');
            }
        }
        
        // Update status
        if (step === 1) {
            this.modal.querySelector('#status-title').textContent = 'Opening wallet...';
            this.modal.querySelector('#status-message').textContent = 'Please wait while we connect to your wallet extension';
        } else if (step === 2) {
            this.modal.querySelector('#status-title').textContent = 'Approve connection';
            this.modal.querySelector('#status-message').textContent = 'Please approve the connection request in your wallet';
        } else if (step === 3) {
            this.modal.querySelector('#status-title').textContent = 'Connected!';
            this.modal.querySelector('#status-message').textContent = 'Your wallet has been successfully connected';
            this.modal.querySelector('#status-icon').textContent = '✅';
        }
    }
    
    showConnectionError(message) {
        this.modal.querySelector('#status-title').textContent = 'Connection Failed';
        this.modal.querySelector('#status-message').textContent = message;
        this.modal.querySelector('#status-icon').textContent = '❌';
        
        setTimeout(() => {
            this.showWalletSelection();
        }, 3000);
    }
    
    cancelConnection() {
        this.connectionState.isConnecting = false;
        this.showWalletSelection();
    }
    
    disconnectWallet() {
        this.connectionState = {
            isConnected: false,
            isConnecting: false,
            wallet: null,
            address: null,
            balance: null
        };
        
        // Clean up user session
        this.destroyUserSession();
        localStorage.removeItem('connected_wallet');
        
        this.showWalletSelection();
        this.emitWalletStateChange();
        
        // Emit user disconnected event
        window.dispatchEvent(new CustomEvent('userDisconnected', {
            detail: { disconnected: true }
        }));
    }
    
    copyAddress() {
        if (this.connectionState.address) {
            navigator.clipboard.writeText(this.connectionState.address).then(() => {
                const copyBtn = this.modal.querySelector('#copy-address');
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<span class="btn-icon">✅</span><span class="btn-text">Copied!</span>';
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                }, 2000);
            });
        }
    }
    
    formatAddress(address) {
        if (!address) return '';
        return address.substring(0, 6) + '...' + address.substring(address.length - 4);
    }
    
    formatBalance(balance) {
        if (!balance) return '0 FB';
        return `${(balance.confirmed / 100000000).toFixed(6)} FB`;
    }
    
    loadConnectionState() {
        const saved = localStorage.getItem('connected_wallet');
        if (saved) {
            try {
                const walletData = JSON.parse(saved);
                const wallet = this.availableWallets.find(w => w.id === walletData.id);
                if (wallet && wallet.installed) {
                    this.connectionState = {
                        isConnected: true,
                        isConnecting: false,
                        wallet: wallet,
                        address: walletData.address,
                        balance: null
                    };
                    
                    // Re-establish connection
                    this.refreshConnection();
                }
            } catch (error) {
                console.error('Error loading connection state:', error);
                localStorage.removeItem('connected_wallet');
            }
        }
    }
    
    async refreshConnection() {
        if (!this.connectionState.isConnected) return;
        
        try {
            const walletId = this.connectionState.wallet.id;
            let balance;
            
            if (walletId === 'unisat' && window.unisat) {
                balance = await window.unisat.getBalance();
            }
            
            this.connectionState.balance = balance;
            this.emitWalletStateChange();
            
        } catch (error) {
            console.error('Error refreshing connection:', error);
        }
    }
    
    emitWalletStateChange() {
        const event = new CustomEvent('walletStateChanged', {
            detail: {
                isConnected: this.connectionState.isConnected,
                wallet: this.connectionState.wallet,
                address: this.connectionState.address,
                balance: this.connectionState.balance
            }
        });
        window.dispatchEvent(event);
    }
    
    // Public methods
    open() {
        this.modal.classList.add('connection-visible');
        this.isOpen = true;
        document.body.style.overflow = 'hidden';
        
        // Show appropriate view
        if (this.connectionState.isConnected) {
            this.showConnectedWallet();
        } else {
            this.showWalletSelection();
        }
        
        // Refresh wallet detection
        this.detectWallets();
    }
    
    close() {
        this.modal.classList.remove('connection-visible');
        this.isOpen = false;
        document.body.style.overflow = '';
        
        // Reset connection state if connecting
        if (this.connectionState.isConnecting) {
            this.cancelConnection();
        }
    }
    
    isConnected() {
        return this.connectionState.isConnected;
    }
    
    getWallet() {
        return this.connectionState.wallet;
    }
    
    getAddress() {
        return this.connectionState.address;
    }
    
    getBalance() {
        return this.connectionState.balance;
    }
    
    // User session management methods
    createUserSession(walletData) {
        const user = {
            id: walletData.address,
            address: walletData.address,
            walletType: walletData.wallet.name,
            connectedAt: new Date().toISOString(),
            balances: {
                FB: 0,
                MY: 0,
                MC: 0
            }
        };
        
        // Store user session
        localStorage.setItem('wallet_user_session', JSON.stringify(user));
        localStorage.setItem('wallet_connection_data', JSON.stringify(walletData));
        
        // Load user balances
        this.loadUserBalances(user);
        
        console.log('✅ User session created:', user);
        return user;
    }
    
    loadUserBalances(user) {
        // In a real app, this would fetch from blockchain/backend
        const savedBalances = localStorage.getItem(`user_balances_${user.address}`);
        if (savedBalances) {
            user.balances = JSON.parse(savedBalances);
        } else {
            // Mock initial balances
            user.balances = {
                FB: 0.00045,
                MY: 1250,
                MC: 500
            };
            this.saveUserBalances(user);
        }
    }
    
    saveUserBalances(user) {
        localStorage.setItem(`user_balances_${user.address}`, JSON.stringify(user.balances));
    }

    // Authenticate with backend to get JWT token
    async authenticateWithBackend(user) {
        try {
            console.log('🔐 Authenticating with backend for address:', user.address);
            
            const response = await fetch('/api/auth/wallet-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    walletAddress: user.address
                })
            });

            const result = await response.json();
            
            if (result.success && result.token) {
                // Save JWT token and user data to localStorage
                localStorage.setItem('auth_token', result.token);
                localStorage.setItem('auth_user', JSON.stringify(result.user));
                
                console.log('✅ JWT authentication successful');
                console.log('🔑 Token saved to localStorage');
                console.log('👤 User data saved:', result.user?.username);
            } else {
                console.error('❌ Backend authentication failed:', result.error || 'Unknown error');
            }
        } catch (error) {
            console.error('❌ Failed to authenticate with backend:', error);
        }
    }
    
    getCurrentUser() {
        const sessionData = localStorage.getItem('wallet_user_session');
        return sessionData ? JSON.parse(sessionData) : null;
    }
    
    isUserAuthenticated() {
        const user = this.getCurrentUser();
        return user && this.connectionState.isConnected;
    }

    getConnectedWallet() {
        if (!this.connectionState.isConnected) {
            return null;
        }
        
        return {
            id: this.connectionState.walletId,
            name: this.connectionState.walletName,
            address: this.connectionState.address,
            balance: this.connectionState.balance
        };
    }
    
    getUserBalance(tokenType = 'MC') {
        const user = this.getCurrentUser();
        return user ? user.balances[tokenType] || 0 : 0;
    }
    
    updateUserBalance(tokenType, amount) {
        const user = this.getCurrentUser();
        if (user) {
            user.balances[tokenType] = amount;
            this.saveUserBalances(user);
            localStorage.setItem('wallet_user_session', JSON.stringify(user));
            
            // Emit balance update event
            window.dispatchEvent(new CustomEvent('balanceUpdated', {
                detail: { tokenType, amount, user }
            }));
        }
    }
    
    destroyUserSession() {
        localStorage.removeItem('wallet_user_session');
        localStorage.removeItem('wallet_connection_data');
        console.log('✅ User session destroyed');
    }
}

// SIMPLE initialization - no more complex events
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 SIMPLE wallet-connection-hub.js: DOM ready');
    try {
        window.walletConnectionModal = new WalletConnectionHub();
        console.log('✅ SIMPLE: WalletConnectionHub ready and available');
    } catch (error) {
        console.error('❌ SIMPLE: Failed to initialize wallet modal:', error);
    }
});