// Dashboard Modal - Personal Account Hub for MoonYetis
// Handles user balance, deposits, withdrawals, transactions, and daily rewards

console.log('🚀 Dashboard Modal Fixed Version Loaded - Cache Broken Successfully!');

class DashboardModal {
    constructor() {
        this.isOpen = false;
        this.modal = null;
        this.user = null;
        this.connectedWallet = null;
        this.balance = 0;
        this.isDevelopmentMode = window.location.hostname === 'localhost';
        
        // Tab navigation system
        this.activeTab = 'balance';
        this.tabs = {
            balance: { name: 'Balance', icon: '💰' },
            receive: { name: 'Receive', icon: '⬇️' },
            swap: { name: 'Swap', icon: '🔄' },
            send: { name: 'Send', icon: '⬆️' }
            // SIMPLIFICADO: Pestaña Limits eliminada - no hay límites
        };
        
        // Daily rewards tracking
        this.dailyRewards = {
            lastClaim: null,
            currentStreak: 0,
            availableReward: 0
        };
        
        // Transaction history
        this.transactions = [];
        
        // Initialize
        this.init();
    }
    
    init() {
        console.log('🏠 Dashboard: Initializing...');
        this.createModal();
        this.setupEventListeners();
        this.setupPriceUpdateListener();
        this.checkAuthState();
        this.loadUserData();
        console.log('✅ Dashboard: Initialization complete');
        
        // MÉTODO DE VERIFICACIÓN PARA DEBUGGING
        this.debugAuthState = () => {
            console.log('🔍 === ESTADO DE AUTENTICACIÓN DEBUG ===');
            console.log('🔑 this.user.token:', this.user?.token ? 'PRESENTE (' + this.user.token.substring(0, 20) + '...)' : 'AUSENTE');
            console.log('📄 this.user.backendData:', this.user?.backendData ? 'PRESENTE' : 'AUSENTE');
            console.log('💾 localStorage auth_token:', localStorage.getItem('auth_token') ? 'PRESENTE' : 'AUSENTE');
            console.log('👤 localStorage auth_user:', localStorage.getItem('auth_user') ? 'PRESENTE' : 'AUSENTE');
            console.log('🔗 Wallet conectada:', window.walletConnectionModal?.isConnected() ? 'SÍ' : 'NO');
            
            if (this.user?.backendData) {
                console.log('🆔 Usuario backend:', this.user.backendData.username || 'Sin username');
                console.log('📧 Email backend:', this.user.backendData.email || 'Sin email');
            }
            
            return {
                hasToken: !!(this.user?.token),
                hasBackendData: !!(this.user?.backendData),
                hasLocalStorageToken: !!localStorage.getItem('auth_token'),
                hasLocalStorageUser: !!localStorage.getItem('auth_user'),
                walletConnected: window.walletConnectionModal?.isConnected() || false
            };
        };
        
        // Exponer globalmente para debugging
        window.debugDashboardAuth = this.debugAuthState;
    }
    
    createModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'dashboard-modal';
        this.modal.className = 'dashboard-modal-overlay';
        this.modal.innerHTML = `
            <div class="dashboard-modal">
                <div class="dashboard-header">
                    <div class="dashboard-title">
                        <h2>🏠 My Dashboard</h2>
                        <span class="dashboard-subtitle">Welcome back, <span id="user-name">User</span>!</span>
                    </div>
                    <button class="dashboard-close" id="dashboard-close">×</button>
                </div>
                
                <!-- Tab Navigation -->
                <div class="dashboard-nav">
                    <div class="dashboard-tabs">
                        ${Object.entries(this.tabs).map(([tabId, tab]) => `
                            <button class="dashboard-tab ${tabId === this.activeTab ? 'active' : ''}" 
                                    data-tab="${tabId}" id="tab-${tabId}">
                                <span class="tab-icon">${tab.icon}</span>
                                <span class="tab-name">${tab.name}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <div class="dashboard-content">
                    <!-- Balance Section -->
                    <div class="dashboard-section balance-section" data-section="balance">
                        <div class="section-header">
                            <h3>💰 Balance</h3>
                            <button class="refresh-balance-btn" id="refresh-balance" title="Refresh Balance">🔄</button>
                        </div>
                        
                        <div class="balance-display">
                            <div class="balance-grid">
                                <div class="balance-token">
                                    <div class="token-icon">₿</div>
                                    <div class="token-info">
                                        <div class="token-name">Fractal Bitcoin</div>
                                        <div class="token-amount" id="fb-balance">0.00000</div>
                                        <div class="token-symbol">FB</div>
                                    </div>
                                    <div class="token-value" id="fb-value">~$0.00</div>
                                </div>
                                
                                <div class="balance-token">
                                    <div class="token-icon">🪙</div>
                                    <div class="token-info">
                                        <div class="token-name">MoonYetis</div>
                                        <div class="token-amount" id="my-balance">0</div>
                                        <div class="token-symbol">MY</div>
                                    </div>
                                    <div class="token-value" id="my-value">~$0.00</div>
                                </div>
                                
                                <div class="balance-token">
                                    <div class="token-icon">🌙</div>
                                    <div class="token-info">
                                        <div class="token-name">MoonCoins</div>
                                        <div class="token-amount" id="mc-balance">0</div>
                                        <div class="token-symbol">MC</div>
                                    </div>
                                    <div class="token-value" id="mc-value">~$0.00</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Receive Section -->
                    <div class="dashboard-section receive-section" data-section="receive">
                        <div class="section-header">
                            <h3>⬇️ Receive</h3>
                        </div>
                        
                        <!-- Deposit Address Section -->
                        <div class="deposit-address-section">
                            <div class="deposit-address-header">
                                <h4>Your Unique Deposit Address</h4>
                                <p class="deposit-instructions">Send FB or MY tokens to this address</p>
                            </div>
                            
                            <div class="deposit-address-container">
                                <div class="address-qr-container" id="deposit-qr-container">
                                    <div class="qr-placeholder" id="deposit-qr-placeholder">
                                        <div class="loading-spinner">⏳</div>
                                        <p>Loading QR Code...</p>
                                    </div>
                                </div>
                                
                                <div class="address-info">
                                    <div class="address-display">
                                        <input type="text" id="deposit-address" class="address-input" readonly 
                                               value="Loading..." />
                                        <button class="copy-btn" id="copy-address-btn" title="Copy address">
                                            <span class="copy-icon">📋</span>
                                        </button>
                                    </div>
                                    
                                    <div class="deposit-features">
                                        <div class="feature-item">
                                            <span class="feature-icon">₿</span>
                                            <span class="feature-text">Fractal Bitcoin (FB)</span>
                                        </div>
                                        <div class="feature-item">
                                            <span class="feature-icon">🪙</span>
                                            <span class="feature-text">MoonYetis (MY)</span>
                                        </div>
                                        <div class="feature-item">
                                            <span class="feature-icon">✅</span>
                                            <span class="feature-text">Auto-credited to balance</span>
                                        </div>
                                        <div class="feature-item">
                                            <span class="feature-icon">🔒</span>
                                            <span class="feature-text">Secure HD Wallet</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Deposit History Section -->
                        <div class="deposit-history-section">
                            <div class="history-header">
                                <h4>Recent Deposits</h4>
                                <button class="refresh-btn" id="refresh-deposits-btn" title="Refresh">
                                    <span class="refresh-icon">🔄</span>
                                </button>
                            </div>
                            
                            <div class="deposits-list" id="deposits-list">
                                <div class="no-deposits">
                                    <p>No deposits yet</p>
                                    <p class="hint">Send FB or MY to your address above</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Swap Section -->
                    <div class="dashboard-section swap-section" data-section="swap">
                        <div class="section-header">
                            <h3>🔄 Swap</h3>
                        </div>
                        
                        <!-- Modern Swap Interface -->
                        <div class="modern-swap-container">
                            <!-- You Pay Section -->
                            <div class="swap-input-section">
                                <div class="swap-section-header">
                                    <span class="swap-label">You Pay</span>
                                    <div class="swap-balance-info" id="swap-from-balance">
                                        <span>Swap Balance: 0.99976</span>
                                        <button class="max-btn" id="swap-max-btn">Max</button>
                                    </div>
                                </div>
                                <div class="swap-input-row">
                                    <input type="number" 
                                           id="swap-from-amount" 
                                           class="swap-amount-input" 
                                           placeholder="1" 
                                           step="any">
                                    <div class="token-selector-clean" id="swap-from-token">
                                        <div class="token-display-clean">
                                            <span class="token-icon-clean" id="swap-from-icon">₿</span>
                                            <span class="token-symbol-clean" id="swap-from-symbol">FB</span>
                                            <span class="dropdown-arrow-clean">▼</span>
                                        </div>
                                        <div class="token-dropdown-clean" id="swap-from-dropdown">
                                            <div class="token-option-clean" data-token="FB">
                                                <span class="token-icon-clean">₿</span>
                                                <span class="token-name-clean">Fractal Bitcoin</span>
                                                <span class="token-symbol-clean">FB</span>
                                            </div>
                                            <div class="token-option-clean" data-token="MY">
                                                <span class="token-icon-clean">🪙</span>
                                                <span class="token-name-clean">MoonYetis</span>
                                                <span class="token-symbol-clean">MY</span>
                                            </div>
                                            <div class="token-option-clean" data-token="MC">
                                                <span class="token-icon-clean">💰</span>
                                                <span class="token-name-clean">MoonCoins</span>
                                                <span class="token-symbol-clean">MC</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="swap-usd-value" id="swap-from-usd">≈ $0.44</div>
                            </div>
                            
                            <!-- Swap Direction Button -->
                            <div class="swap-direction-container">
                                <button class="swap-direction-btn-clean" id="swap-flip-btn">
                                    <span class="swap-arrow">🔄</span>
                                </button>
                            </div>
                            
                            <!-- You Receive Section -->
                            <div class="swap-output-section">
                                <div class="swap-section-header">
                                    <span class="swap-label">You Receive</span>
                                    <div class="swap-balance-info" id="swap-to-balance">
                                        <span>PizzaSwap Balance: 407,321,270.11</span>
                                    </div>
                                </div>
                                <div class="swap-output-row">
                                    <div class="swap-amount-output-clean" id="swap-to-amount">12,750,632.31514473193447322</div>
                                    <div class="token-selector-clean" id="swap-to-token">
                                        <div class="token-display-clean">
                                            <span class="token-icon-clean" id="swap-to-icon">💰</span>
                                            <span class="token-symbol-clean" id="swap-to-symbol">MoonCoins</span>
                                            <span class="dropdown-arrow-clean">▼</span>
                                        </div>
                                        <div class="token-dropdown-clean" id="swap-to-dropdown">
                                            <div class="token-option-clean" data-token="FB">
                                                <span class="token-icon-clean">₿</span>
                                                <span class="token-name-clean">Fractal Bitcoin</span>
                                                <span class="token-symbol-clean">FB</span>
                                            </div>
                                            <div class="token-option-clean" data-token="MY">
                                                <span class="token-icon-clean">🪙</span>
                                                <span class="token-name-clean">MoonYetis</span>
                                                <span class="token-symbol-clean">MY</span>
                                            </div>
                                            <div class="token-option-clean" data-token="MC">
                                                <span class="token-icon-clean">💰</span>
                                                <span class="token-name-clean">MoonCoins</span>
                                                <span class="token-symbol-clean">MC</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="swap-usd-value" id="swap-to-usd">≈ $0.44</div>
                            </div>
                            
                            <!-- Exchange Info Section -->
                            <div class="swap-exchange-info" id="swap-exchange-info" style="display: none;">
                                <div class="exchange-rate-display">
                                    <span class="exchange-rate-label">Exchange Rate:</span>
                                    <span class="exchange-rate-value" id="exchange-rate-value">1 FB = 0 MC</span>
                                </div>
                                <div class="exchange-fee-display" id="exchange-fee-display" style="display: none;">
                                    <span class="exchange-fee-label">Fee:</span>
                                    <span class="exchange-fee-value" id="exchange-fee-value">3%</span>
                                </div>
                                <div class="exchange-net-display" id="exchange-net-display" style="display: none;">
                                    <span class="exchange-net-label">You'll receive:</span>
                                    <span class="exchange-net-value" id="exchange-net-value">0 MC</span>
                                </div>
                            </div>
                            
                            <!-- Swap Action Button -->
                            <div class="swap-action-container-clean">
                                <button class="swap-action-btn-insufficient" id="swap-action-btn" disabled>
                                    <span id="swap-action-text">Insufficient FB balance</span>
                                </button>
                                <div class="swap-help-link-clean">
                                    <a href="#" id="goto-deposit-link" class="deposit-link">Go to Deposit</a>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Send Section -->
                    <div class="dashboard-section send-section" data-section="send">
                        <div class="section-header">
                            <h3>⬆️ Send</h3>
                        </div>
                        
                        <div class="withdrawal-container" id="withdrawal-container">
                            <div class="withdrawal-disabled" id="withdrawal-disabled">
                                <div class="disabled-icon">🔒</div>
                                <div class="disabled-text">
                                    <h4>Wallet Connection Required</h4>
                                    <p>Connect your wallet to withdraw tokens</p>
                                </div>
                            </div>
                            
                            <div class="withdrawal-forms" id="withdrawal-forms" style="display: none;">
                                <div class="withdrawal-form">
                                    <h4>Withdraw Fractal Bitcoin</h4>
                                    <div class="form-group">
                                        <label for="withdraw-fb-amount">Amount</label>
                                        <input type="number" id="withdraw-fb-amount" placeholder="0.00000" step="0.00001">
                                        <span class="input-suffix">FB</span>
                                    </div>
                                    <div class="form-group">
                                        <label for="withdraw-fb-address">Destination Address</label>
                                        <input type="text" id="withdraw-fb-address" placeholder="Fractal Bitcoin address">
                                        <button class="use-connected-btn" id="use-connected-fb-address">Use Connected</button>
                                    </div>
                                    <button class="withdraw-btn" id="withdraw-fb-btn">Withdraw FB</button>
                                </div>
                                
                                <div class="withdrawal-form">
                                    <h4>Withdraw MoonYetis</h4>
                                    <div class="form-group">
                                        <label for="withdraw-my-amount">Amount</label>
                                        <input type="number" id="withdraw-my-amount" placeholder="0" step="1">
                                        <span class="input-suffix">MY</span>
                                    </div>
                                    <div class="form-group">
                                        <label for="withdraw-my-address">Destination Address</label>
                                        <input type="text" id="withdraw-my-address" placeholder="Fractal Bitcoin address">
                                        <button class="use-connected-btn" id="use-connected-my-address">Use Connected</button>
                                    </div>
                                    <button class="withdraw-btn" id="withdraw-my-btn">Withdraw MY</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Trading Limits Section -->
                    <div class="dashboard-section limits-section" data-section="limits">
                        <div class="section-header">
                            <h3>🛡️ Trading Limits</h3>
                            <button class="refresh-limits-btn" id="refresh-limits" title="Refresh Limits">🔄</button>
                        </div>
                        
                        <div class="limits-container" id="limits-container">
                            <div class="limits-overview">
                                <div class="limits-card">
                                    <div class="limits-card-header">
                                        <h4>📊 Daily Usage</h4>
                                    </div>
                                    <div class="limits-stats">
                                        <div class="limits-stat">
                                            <span class="limits-stat-label">Used Today</span>
                                            <span class="limits-stat-value" id="daily-usage">$0.00</span>
                                        </div>
                                        <div class="limits-stat">
                                            <span class="limits-stat-label">Daily Limit</span>
                                            <span class="limits-stat-value" id="daily-limit">$500.00</span>
                                        </div>
                                        <div class="limits-progress">
                                            <div class="limits-progress-bar" id="daily-progress-bar"></div>
                                            <span class="limits-progress-text" id="daily-progress-text">0%</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="limits-card">
                                    <div class="limits-card-header">
                                        <h4>⏱️ Swap Cooldown</h4>
                                    </div>
                                    <div class="limits-stats">
                                        <div class="limits-stat">
                                            <span class="limits-stat-label">Status</span>
                                            <span class="limits-stat-value" id="cooldown-status">Ready</span>
                                        </div>
                                        <div class="limits-stat">
                                            <span class="limits-stat-label">Next Swap</span>
                                            <span class="limits-stat-value" id="next-swap-time">Available now</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="limits-card">
                                    <div class="limits-card-header">
                                        <h4>🔍 Pattern Detection</h4>
                                    </div>
                                    <div class="limits-stats">
                                        <div class="limits-stat">
                                            <span class="limits-stat-label">Recent Swaps</span>
                                            <span class="limits-stat-value" id="recent-swaps-count">0</span>
                                        </div>
                                        <div class="limits-stat">
                                            <span class="limits-stat-label">Status</span>
                                            <span class="limits-stat-value" id="pattern-status">Normal</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="limits-info">
                                <h4>💡 How Trading Limits Work</h4>
                                <div class="limits-explanation">
                                    <div class="limit-rule">
                                        <span class="rule-icon">💰</span>
                                        <div class="rule-content">
                                            <strong>Daily Limits:</strong> Maximum $500 USD equivalent per day to prevent excessive trading.
                                        </div>
                                    </div>
                                    <div class="limit-rule">
                                        <span class="rule-icon">⏱️</span>
                                        <div class="rule-content">
                                            <strong>Swap Cooldown:</strong> 30-second cooldown between swaps to prevent rapid automated trading.
                                        </div>
                                    </div>
                                    <div class="limit-rule">
                                        <span class="rule-icon">🛡️</span>
                                        <div class="rule-content">
                                            <strong>Anti-Arbitrage:</strong> Higher fees (up to 2.5%) applied for suspicious trading patterns.
                                        </div>
                                    </div>
                                    <div class="limit-rule">
                                        <span class="rule-icon">🔍</span>
                                        <div class="rule-content">
                                            <strong>Pattern Detection:</strong> Circular trades (FB→MC→MY→FB) trigger additional protection measures.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Loading Overlay -->
                <div class="dashboard-loading" id="dashboard-loading" style="display: none;">
                    <div class="loading-spinner"></div>
                    <div class="loading-text" id="loading-text">Loading...</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
    }
    
    setupEventListeners() {
        // Close modal
        this.modal.querySelector('#dashboard-close').addEventListener('click', () => this.close());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });
        
        // Tab navigation
        this.modal.querySelectorAll('.dashboard-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabId = e.currentTarget.dataset.tab;
                this.switchTab(tabId);
            });
        });
        
        // Balance refresh
        this.modal.querySelector('#refresh-balance').addEventListener('click', () => this.refreshBalance());
        
        // SIMPLIFICADO: Sin límites que refrescar
        
        // Wallet connection (kept for compatibility)
        const connectBtn = this.modal.querySelector('#connect-wallet-btn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.openWalletConnection());
        }
        
        // Copy address button
        this.setupCopyAddress();
        
        // Refresh deposits button
        const refreshDepositsBtn = this.modal.querySelector('#refresh-deposits-btn');
        if (refreshDepositsBtn) {
            refreshDepositsBtn.addEventListener('click', () => this.loadDepositHistory());
        }
        
        // Modern Swap Interface
        this.setupModernSwapListeners();
        
        // Withdrawal forms
        this.modal.querySelector('#withdraw-fb-btn').addEventListener('click', () => this.processWithdrawal('FB'));
        this.modal.querySelector('#withdraw-my-btn').addEventListener('click', () => this.processWithdrawal('MY'));
        this.modal.querySelector('#use-connected-fb-address').addEventListener('click', () => this.useConnectedAddress('FB'));
        this.modal.querySelector('#use-connected-my-address').addEventListener('click', () => this.useConnectedAddress('MY'));
        
        // User authentication events
        window.addEventListener('userAuthenticated', (e) => this.handleUserAuthenticated(e.detail));
        window.addEventListener('userDisconnected', (e) => this.handleUserDisconnected(e.detail));
        
        // Wallet state changes
        window.addEventListener('walletStateChanged', (e) => this.handleWalletStateChange(e.detail));
        
        // Balance updates
        window.addEventListener('balanceUpdated', (e) => this.handleBalanceUpdate(e.detail));
    }
    
    // Tab navigation methods
    switchTab(tabId) {
        if (!this.tabs[tabId]) return;
        
        // Update active tab
        this.activeTab = tabId;
        
        // Update tab buttons
        this.modal.querySelectorAll('.dashboard-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });
        
        // Show/hide sections
        this.modal.querySelectorAll('.dashboard-section').forEach(section => {
            const sectionId = section.dataset.section;
            if (sectionId === tabId) {
                section.style.display = 'block';
                
                // Load deposit address when switching to receive tab
                if (tabId === 'receive' && this.user) {
                    console.log('🔄 Switching to receive tab - verifying authentication...');
                    // Ensure auth state is current before loading deposit address
                    this.checkAuthState();
                    
                    // Double check that we have a valid token
                    if (this.user && this.user.token) {
                        console.log('✅ Token verified, loading deposit address...');
                        this.loadDepositAddress();
                    } else {
                        console.warn('⚠️ No valid token found after auth check');
                        this.showAddressError('Authentication required - please refresh and reconnect wallet');
                    }
                }
                section.classList.add('section-active');
            } else {
                section.style.display = 'none';
                section.classList.remove('section-active');
            }
        });
        
        console.log(`🔄 Dashboard switched to ${this.tabs[tabId].name} tab`);
    }
    
    checkAuthState() {
        // Check if user is authenticated via wallet
        const walletHub = window.walletConnectionModal;
        if (walletHub && walletHub.isUserAuthenticated()) {
            this.user = walletHub.getCurrentUser();
            this.connectedWallet = walletHub.getConnectedWallet();
            
            // Load JWT token from localStorage for API authentication
            const authToken = localStorage.getItem('auth_token');
            const authUser = localStorage.getItem('auth_user');
            
            console.log('🔍 Dashboard checking auth state:');
            console.log('🔑 Auth token from localStorage:', authToken ? authToken.substring(0, 20) + '...' : 'NULL');
            console.log('👤 Auth user from localStorage:', authUser ? 'FOUND' : 'NULL');
            
            if (authToken && authUser) {
                this.user.token = authToken;
                try {
                    const backendUser = JSON.parse(authUser);
                    // Merge backend user data with wallet user
                    this.user.backendData = backendUser;
                    console.log('✅ JWT token loaded for API authentication');
                    console.log('🔗 User object now has token:', !!this.user.token);
                    console.log('🔑 Token assigned to user:', this.user.token.substring(0, 30) + '...');
                    console.log('👤 Complete user object:', this.user);
                } catch (error) {
                    console.error('❌ Error parsing auth user data:', error);
                }
            } else {
                console.warn('⚠️ No JWT token found - deposit address may not work');
                console.log('🛠️ localStorage keys available:', Object.keys(localStorage));
            }
            
            this.updateUserDisplay();
        }
    }
    
    loadUserData() {
        if (!this.user) return;
        
        this.loadBalance();
        this.updateWalletDisplay();
        this.updateLimitsDisplay();
        
        // Load deposit address when on receive tab
        if (this.activeTab === 'receive') {
            this.loadDepositAddress();
        }
    }
    
    loadBalance() {
        if (!this.user) return;
        
        // Get balances from wallet hub
        const walletHub = window.walletConnectionModal;
        if (walletHub) {
            this.user.balances = {
                FB: walletHub.getUserBalance('FB'),
                MY: walletHub.getUserBalance('MY'),
                MC: walletHub.getUserBalance('MC')
            };
            this.updateBalanceDisplay();
        }
    }
    
    loadDailyRewards() {
        // Load daily rewards data
        const lastClaimStr = localStorage.getItem('dailyReward_lastClaim');
        const streakStr = localStorage.getItem('dailyReward_streak');
        
        if (lastClaimStr) {
            this.dailyRewards.lastClaim = new Date(lastClaimStr);
        }
        
        this.dailyRewards.currentStreak = parseInt(streakStr) || 1;
        this.checkDailyRewardAvailability();
    }
    
    loadTransactionHistory() {
        // Load transaction history (mock data for now)
        this.transactions = this.getMockTransactions();
        this.updateTransactionHistory();
    }
    
    loadReferralData() {
        // Load referral data
        const referralCode = localStorage.getItem('user_referralCode') || this.generateReferralCode();
        const referralCount = localStorage.getItem('user_referralCount') || '0';
        const referralRewards = localStorage.getItem('user_referralRewards') || '0';
        
        this.modal.querySelector('#referral-code').textContent = referralCode;
        this.modal.querySelector('#referral-count').textContent = referralCount;
        this.modal.querySelector('#referral-rewards').textContent = referralRewards;
        
        localStorage.setItem('user_referralCode', referralCode);
    }
    
    generateReferralCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = 'MOON';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
    
    updateUserDisplay() {
        if (this.user) {
            // Show wallet address as user identifier
            const shortAddress = this.user.address.substring(0, 8) + '...' + this.user.address.substring(-6);
            this.modal.querySelector('#user-name').textContent = shortAddress;
        }
    }
    
    updateBalanceDisplay() {
        if (!this.user || !this.user.balances) return;
        
        const balances = this.user.balances;
        
        // Update FB balance
        const fbBalance = this.modal.querySelector('#fb-balance');
        const fbValue = this.modal.querySelector('#fb-value');
        if (fbBalance) {
            fbBalance.textContent = balances.FB.toFixed(5);
            fbValue.textContent = `~$${(balances.FB * 67500).toFixed(2)}`;
        }
        
        // Update MY balance
        const myBalance = this.modal.querySelector('#my-balance');
        const myValue = this.modal.querySelector('#my-value');
        if (myBalance) {
            myBalance.textContent = balances.MY.toLocaleString();
            myValue.textContent = `~$${(balances.MY * 0.02).toFixed(2)}`;
        }
        
        // Update MC balance
        const mcBalance = this.modal.querySelector('#mc-balance');
        const mcValue = this.modal.querySelector('#mc-value');
        if (mcBalance) {
            mcBalance.textContent = balances.MC.toLocaleString();
            mcValue.textContent = `~$${(balances.MC * 0.008).toFixed(2)}`;
        }
    }
    
    animateCounter(element, targetValue) {
        const startValue = parseInt(element.textContent) || 0;
        const duration = 1000;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentValue = Math.floor(startValue + (targetValue - startValue) * progress);
            element.textContent = currentValue.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    checkDailyRewardAvailability() {
        const now = new Date();
        const lastClaim = this.dailyRewards.lastClaim;
        
        if (!lastClaim || this.isNewDay(now, lastClaim)) {
            this.showRewardAvailable();
        } else {
            this.showRewardClaimed();
        }
    }
    
    isNewDay(date1, date2) {
        return date1.toDateString() !== date2.toDateString();
    }
    
    showRewardAvailable() {
        const availableElement = this.modal.querySelector('#reward-available');
        const claimedElement = this.modal.querySelector('#reward-claimed');
        const rewardAmount = this.modal.querySelector('#reward-amount');
        const streakCounter = this.modal.querySelector('#streak-counter');
        
        const reward = this.calculateDailyReward();
        
        availableElement.style.display = 'flex';
        claimedElement.style.display = 'none';
        rewardAmount.textContent = `+${reward} MoonCoins`;
        streakCounter.textContent = `Day ${this.dailyRewards.currentStreak}`;
        
        this.dailyRewards.availableReward = reward;
    }
    
    showRewardClaimed() {
        const availableElement = this.modal.querySelector('#reward-available');
        const claimedElement = this.modal.querySelector('#reward-claimed');
        const nextRewardTime = this.modal.querySelector('#next-reward-time');
        
        availableElement.style.display = 'none';
        claimedElement.style.display = 'flex';
        
        // Calculate time until next reward
        const nextReward = new Date(this.dailyRewards.lastClaim);
        nextReward.setDate(nextReward.getDate() + 1);
        nextReward.setHours(0, 0, 0, 0);
        
        this.startCountdown(nextRewardTime, nextReward);
    }
    
    calculateDailyReward() {
        const baseReward = 50;
        const streakBonus = Math.min(this.dailyRewards.currentStreak * 5, 100);
        return baseReward + streakBonus;
    }
    
    startCountdown(element, targetDate) {
        const updateCountdown = () => {
            const now = new Date();
            const diff = targetDate - now;
            
            if (diff <= 0) {
                this.checkDailyRewardAvailability();
                return;
            }
            
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            element.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };
        
        updateCountdown();
        setInterval(updateCountdown, 1000);
    }
    
    async claimDailyReward() {
        if (this.dailyRewards.availableReward <= 0) return;
        
        const claimBtn = this.modal.querySelector('#claim-reward');
        claimBtn.disabled = true;
        claimBtn.textContent = 'Claiming...';
        
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Update balance
            this.balance += this.dailyRewards.availableReward;
            this.updateBalanceDisplay();
            
            // Update reward data
            this.dailyRewards.lastClaim = new Date();
            this.dailyRewards.currentStreak++;
            
            localStorage.setItem('dailyReward_lastClaim', this.dailyRewards.lastClaim.toISOString());
            localStorage.setItem('dailyReward_streak', this.dailyRewards.currentStreak.toString());
            
            // Add transaction
            this.addTransaction({
                type: 'reward',
                amount: this.dailyRewards.availableReward,
                description: 'Daily login reward',
                timestamp: new Date()
            });
            
            this.showRewardClaimed();
            
        } catch (error) {
            console.error('Error claiming daily reward:', error);
            claimBtn.disabled = false;
            claimBtn.textContent = 'Claim Reward';
        }
    }
    
    addTransaction(transaction) {
        transaction.id = Date.now().toString();
        this.transactions.unshift(transaction);
        this.updateTransactionHistory();
    }
    
    getMockTransactions() {
        return [
            {
                id: '1',
                type: 'reward',
                amount: 50,
                description: 'Daily login reward',
                timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
                status: 'completed'
            },
            {
                id: '2',
                type: 'purchase',
                amount: 1000,
                description: 'Starter Pack purchase',
                timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                status: 'completed'
            }
        ];
    }
    
    updateTransactionHistory() {
        const listElement = this.modal.querySelector('#transaction-list');
        
        if (this.transactions.length === 0) {
            listElement.innerHTML = `
                <div class="no-transactions">
                    <div class="empty-icon">📝</div>
                    <div class="empty-text">No transactions yet</div>
                    <div class="empty-hint">Your transaction history will appear here</div>
                </div>
            `;
            return;
        }
        
        listElement.innerHTML = this.transactions.map(transaction => `
            <div class="transaction-item ${transaction.type}" data-type="${transaction.type}">
                <div class="transaction-icon">${this.getTransactionIcon(transaction.type)}</div>
                <div class="transaction-details">
                    <div class="transaction-description">${transaction.description}</div>
                    <div class="transaction-time">${this.formatDate(transaction.timestamp)}</div>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'withdrawal' ? '-' : '+'}${transaction.amount} MY
                </div>
                <div class="transaction-status ${transaction.status}">${transaction.status}</div>
            </div>
        `).join('');
    }
    
    getTransactionIcon(type) {
        const icons = {
            deposit: '⬇️',
            withdrawal: '⬆️',
            purchase: '🛒',
            reward: '🎁',
            referral: '👥'
        };
        return icons[type] || '📝';
    }
    
    formatDate(date) {
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
    
    filterTransactions(filter) {
        // Update active filter button
        this.modal.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        // Show/hide transactions
        const transactionItems = this.modal.querySelectorAll('.transaction-item');
        transactionItems.forEach(item => {
            const itemType = item.dataset.type;
            item.style.display = (filter === 'all' || itemType === filter) ? 'flex' : 'none';
        });
    }
    
    copyReferralCode() {
        const code = this.modal.querySelector('#referral-code').textContent;
        navigator.clipboard.writeText(code).then(() => {
            const copyBtn = this.modal.querySelector('#copy-referral');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✅';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        });
    }
    
    refreshBalance() {
        const refreshBtn = this.modal.querySelector('#refresh-balance');
        refreshBtn.classList.add('spinning');
        
        setTimeout(() => {
            this.loadBalance();
            refreshBtn.classList.remove('spinning');
        }, 1000);
    }
    
    refreshLimits() {
        const refreshBtn = this.modal.querySelector('#refresh-limits');
        refreshBtn.classList.add('spinning');
        
        setTimeout(() => {
            this.updateLimitsDisplay();
            refreshBtn.classList.remove('spinning');
        }, 500);
    }
    
    updateLimitsDisplay() {
        if (!this.connectedWallet || !window.arbitrageProtection) {
            // Show default/disabled state
            this.modal.querySelector('#daily-usage').textContent = '$0.00';
            this.modal.querySelector('#daily-progress-bar').style.width = '0%';
            this.modal.querySelector('#daily-progress-text').textContent = '0%';
            this.modal.querySelector('#cooldown-status').textContent = 'Not Connected';
            this.modal.querySelector('#next-swap-time').textContent = 'Connect wallet';
            this.modal.querySelector('#recent-swaps-count').textContent = '0';
            this.modal.querySelector('#pattern-status').textContent = 'Not Connected';
            return;
        }
        
        const walletAddress = this.connectedWallet.address;
        const userStatus = window.arbitrageProtection.getUserStatus(walletAddress);
        
        // Update daily usage
        const dailyUsageElement = this.modal.querySelector('#daily-usage');
        const dailyProgressBar = this.modal.querySelector('#daily-progress-bar');
        const dailyProgressText = this.modal.querySelector('#daily-progress-text');
        
        dailyUsageElement.textContent = `$${userStatus.dailyUsage.toFixed(2)}`;
        const usagePercentage = Math.min((userStatus.dailyUsage / userStatus.dailyLimit) * 100, 100);
        dailyProgressBar.style.width = `${usagePercentage}%`;
        dailyProgressText.textContent = `${usagePercentage.toFixed(0)}%`;
        
        // Color coding for progress bar
        if (usagePercentage < 50) {
            dailyProgressBar.style.backgroundColor = '#4caf50'; // Green
        } else if (usagePercentage < 80) {
            dailyProgressBar.style.backgroundColor = '#ff9800'; // Orange
        } else {
            dailyProgressBar.style.backgroundColor = '#f44336'; // Red
        }
        
        // Update cooldown status
        const cooldownStatusElement = this.modal.querySelector('#cooldown-status');
        const nextSwapTimeElement = this.modal.querySelector('#next-swap-time');
        
        if (userStatus.isBlacklisted) {
            cooldownStatusElement.textContent = 'Restricted';
            cooldownStatusElement.style.color = '#f44336';
            nextSwapTimeElement.textContent = `${userStatus.blacklistRemaining} min remaining`;
        } else if (userStatus.cooldownRemaining > 0) {
            cooldownStatusElement.textContent = 'Cooling Down';
            cooldownStatusElement.style.color = '#ff9800';
            nextSwapTimeElement.textContent = `${userStatus.cooldownRemaining}s remaining`;
        } else {
            cooldownStatusElement.textContent = 'Ready';
            cooldownStatusElement.style.color = '#4caf50';
            nextSwapTimeElement.textContent = 'Available now';
        }
        
        // Update pattern detection
        const recentSwapsElement = this.modal.querySelector('#recent-swaps-count');
        const patternStatusElement = this.modal.querySelector('#pattern-status');
        
        recentSwapsElement.textContent = userStatus.recentSwaps.toString();
        
        if (userStatus.isBlacklisted) {
            patternStatusElement.textContent = 'Restricted';
            patternStatusElement.style.color = '#f44336';
        } else if (userStatus.recentSwaps >= 3) {
            patternStatusElement.textContent = 'Monitoring';
            patternStatusElement.style.color = '#ff9800';
        } else {
            patternStatusElement.textContent = 'Normal';
            patternStatusElement.style.color = '#4caf50';
        }
    }
    
    refreshTransactionHistory() {
        const refreshBtn = this.modal.querySelector('#refresh-history');
        refreshBtn.classList.add('spinning');
        
        setTimeout(() => {
            this.loadTransactionHistory();
            refreshBtn.classList.remove('spinning');
        }, 1000);
    }
    
    openWalletConnection() {
        // Open wallet connection modal
        if (window.walletConnectionModal) {
            window.walletConnectionModal.open();
        }
    }
    
    openStore() {
        // Open store modal
        if (window.storeModal) {
            window.storeModal.open();
        }
    }
    
    updateWithdrawalSummary() {
        const amount = parseFloat(this.modal.querySelector('#withdraw-amount').value) || 0;
        const networkFee = 0.00001; // FB
        const receiveAmount = Math.max(0, amount - 1); // 1 MY processing fee
        
        this.modal.querySelector('#receive-amount').textContent = `${receiveAmount} MY`;
        this.validateWithdrawal();
    }
    
    validateWithdrawal() {
        const amount = parseFloat(this.modal.querySelector('#withdraw-amount').value) || 0;
        const address = this.modal.querySelector('#withdraw-address').value.trim();
        const withdrawBtn = this.modal.querySelector('#withdraw-btn');
        
        const isValid = amount >= 100 && amount <= this.balance && address.length > 0 && this.connectedWallet;
        
        withdrawBtn.disabled = !isValid;
        withdrawBtn.textContent = isValid ? 'Withdraw MoonCoins' : 'Invalid withdrawal';
    }
    
    useConnectedAddress() {
        if (this.connectedWallet && this.connectedWallet.address) {
            this.modal.querySelector('#withdraw-address').value = this.connectedWallet.address;
            this.validateWithdrawal();
        }
    }
    
    async processWithdrawal() {
        const amount = parseFloat(this.modal.querySelector('#withdraw-amount').value);
        const address = this.modal.querySelector('#withdraw-address').value.trim();
        
        if (!this.validateWithdrawalData(amount, address)) return;
        
        const withdrawBtn = this.modal.querySelector('#withdraw-btn');
        withdrawBtn.disabled = true;
        withdrawBtn.textContent = 'Processing...';
        
        try {
            // Simulate withdrawal process
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Update balance
            this.balance -= amount;
            this.updateBalanceDisplay();
            
            // Add transaction
            this.addTransaction({
                type: 'withdrawal',
                amount: amount,
                description: `Withdrawal to ${address.substring(0, 10)}...`,
                timestamp: new Date(),
                status: 'pending'
            });
            
            // Reset form
            this.modal.querySelector('#withdraw-amount').value = '';
            this.modal.querySelector('#withdraw-address').value = '';
            this.updateWithdrawalSummary();
            
            alert('Withdrawal submitted successfully!');
            
        } catch (error) {
            console.error('Withdrawal error:', error);
            alert('Withdrawal failed. Please try again.');
        } finally {
            withdrawBtn.disabled = false;
            withdrawBtn.textContent = 'Withdraw MoonCoins';
        }
    }
    
    validateWithdrawalData(amount, address) {
        if (amount < 100) {
            alert('Minimum withdrawal amount is 100 MY');
            return false;
        }
        
        if (amount > this.balance) {
            alert('Insufficient balance');
            return false;
        }
        
        if (!address || address.length < 10) {
            alert('Please enter a valid address');
            return false;
        }
        
        return true;
    }
    
    // New methods for Web3 architecture
    handleUserAuthenticated(detail) {
        this.user = detail.user;
        this.connectedWallet = detail.wallet;
        this.updateUserDisplay();
        
        // Force check auth state to load JWT token
        setTimeout(() => {
            console.log('🔄 Force re-checking auth state after user authenticated...');
            this.checkAuthState();
            this.loadUserData();
        }, 500);
    }
    
    handleUserDisconnected(detail) {
        this.user = null;
        this.connectedWallet = null;
        this.close();
    }
    
    handleBalanceUpdate(detail) {
        if (this.user) {
            this.user.balances[detail.tokenType] = detail.amount;
            this.updateBalanceDisplay();
            
            // 🔄 SYNC WITH BALANCEMANAGER: If MC balance was updated via wallet, sync with games
            if (detail.tokenType === 'MC' && window.balanceManager) {
                // Update BalanceManager without syncing back to wallet (avoid infinite loop)
                window.balanceManager.setBalance(detail.amount, true, false);
                console.log(`🔄 Dashboard synced MC balance with BalanceManager: ${detail.amount} MC`);
            }
        }
    }
    
    // Deposit methods
    async processDeposit(tokenType) {
        if (!this.connectedWallet) {
            alert('Please connect your wallet first');
            return;
        }
        
        const amountInput = this.modal.querySelector(`#deposit-${tokenType.toLowerCase()}-amount`);
        const amount = parseFloat(amountInput.value);
        
        if (!amount || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        
        try {
            // Simulate deposit process
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Update balance
            const walletHub = window.walletConnectionModal;
            if (walletHub) {
                const newBalance = walletHub.getUserBalance(tokenType) + amount;
                walletHub.updateUserBalance(tokenType, newBalance);
            }
            
            // Clear input
            amountInput.value = '';
            
            alert(`Successfully deposited ${amount} ${tokenType}!`);
            
        } catch (error) {
            console.error('Deposit error:', error);
            alert('Deposit failed. Please try again.');
        }
    }
    
    // Dynamic conversion with real-time hybrid prices and anti-arbitrage protection
    calculateDynamicConversion(amount, fromToken, toToken) {
        // Get current prices from hybrid service (backward compatible)
        const priceService = window.hybridPriceService || window.brc20PriceService;
        if (!priceService) {
            console.error('❌ Hybrid Price Service not available, using fallback');
            return this.calculateFallbackConversion(amount, fromToken, toToken);
        }
        
        const fromPrice = priceService.getPrice(fromToken);
        const toPrice = priceService.getPrice(toToken);
        
        if (!fromPrice || !toPrice) {
            console.warn('⚠️ Price not available for conversion, using fallback');
            return this.calculateFallbackConversion(amount, fromToken, toToken);
        }
        
        // Convert via USD
        const usdValue = amount * fromPrice;
        let grossAmount = usdValue / toPrice;
        
        // Apply bonus for MY → MC (3% bonus) - this remains unchanged
        if (fromToken === 'MY' && toToken === 'MC') {
            grossAmount *= 1.03; // 3% bonus
        }
        
        // 🛡️ ANTI-ARBITRAGE PROTECTION: Calculate dynamic fees
        let totalFeePercentage = 0;
        let feeBreakdown = [];
        let arbitrageWarning = null;
        
        // Check if arbitrage protection is available
        if (window.arbitrageProtection && this.connectedWallet) {
            const walletAddress = this.connectedWallet.address;
            const swapCheck = window.arbitrageProtection.checkSwapAllowed(walletAddress, fromToken, toToken, usdValue);
            
            // SIMPLIFICADO: Siempre permitir swaps, sin bloqueos
            
            // Use anti-arbitrage fees
            totalFeePercentage = swapCheck.fees.totalPercentage;
            feeBreakdown = swapCheck.fees.breakdown;
            
            if (swapCheck.fees.patternDetected) {
                arbitrageWarning = {
                    detected: true,
                    pattern: swapCheck.fees.patternType,
                    message: 'Suspicious trading pattern detected. Additional fees applied.'
                };
            }
        } else {
            // Fallback to old fee system if arbitrage protection not available
            if (fromToken === 'MC' && (toToken === 'FB' || toToken === 'MY')) {
                totalFeePercentage = 0.03; // 3% fee
                feeBreakdown = [{
                    type: 'Anti-Arbitrage Fee',
                    percentage: 0.03,
                    reason: 'Protection fee for MC to FB/MY conversion'
                }];
            }
        }
        
        const feeAmount = grossAmount * totalFeePercentage;
        let netAmount = grossAmount - feeAmount;
        
        // Round appropriately based on token type
        if (toToken === 'FB') {
            netAmount = Math.floor(netAmount * 100000) / 100000; // 5 decimals for FB
        } else if (toToken === 'MC') {
            netAmount = Math.floor(netAmount); // Integer for MC
        } else {
            netAmount = Math.floor(netAmount * 100) / 100; // 2 decimals for MY
        }
        
        return {
            grossAmount: grossAmount,
            feeAmount: feeAmount,
            netAmount: netAmount,
            effectiveRate: netAmount / amount,
            feePercentage: totalFeePercentage * 100,
            fromPrice: fromPrice,
            toPrice: toPrice,
            usdValue: usdValue,
            // Anti-arbitrage specific data
            feeBreakdown: feeBreakdown,
            arbitrageWarning: arbitrageWarning
        };
    }
    
    // Fallback conversion with static rates (if BRC20 service fails)
    calculateFallbackConversion(amount, fromToken, toToken) {
        let rate = 1;
        let fee = 0;
        
        // Static fallback rates
        if (fromToken === 'FB' && toToken === 'MC') {
            rate = 3000000; // $30,000 FB / $0.01 MC = 3,000,000 MC per FB
        } else if (fromToken === 'MY' && toToken === 'MC') {
            rate = 10 * 1.03; // $0.10 MY / $0.01 MC = 10 MC per MY + 3% bonus
        } else if (fromToken === 'MC' && toToken === 'MY') {
            rate = 0.1; // $0.01 MC / $0.10 MY = 0.1 MY per MC
            fee = 0.03; // 3% fee
        } else if (fromToken === 'MC' && toToken === 'FB') {
            rate = 1 / 3000000; // $0.01 MC / $30,000 FB = 0.00000033 FB per MC
            fee = 0.03; // 3% fee
        }
        
        const grossAmount = amount * rate;
        const feeAmount = grossAmount * fee;
        const netAmount = grossAmount - feeAmount;
        
        return {
            grossAmount: grossAmount,
            feeAmount: feeAmount,
            netAmount: Math.floor(netAmount * 100000) / 100000,
            effectiveRate: netAmount / amount,
            feePercentage: fee * 100,
            fromPrice: null,
            toPrice: null,
            usdValue: null
        };
    }
    
    updateChangePreview(fromToken, toToken) {
        const amountInput = this.modal.querySelector(`#${fromToken.toLowerCase()}-to-${toToken.toLowerCase()}-amount`);
        const receiveSpan = this.modal.querySelector(`#${fromToken.toLowerCase()}-to-${toToken.toLowerCase()}-receive`);
        const amount = parseFloat(amountInput.value) || 0;
        
        if (amount <= 0) {
            receiveSpan.textContent = `0${toToken === 'FB' ? '.00000' : ''} ${toToken}`;
            this.clearWarningDisplay(fromToken, toToken);
            return;
        }
        
        // Use dynamic conversion with real-time prices
        const conversion = this.calculateDynamicConversion(amount, fromToken, toToken);
        
        // SIMPLIFICADO: Sin verificaciones de bloqueo
        
        const willReceive = conversion.netAmount;
        
        // Format the display based on token type
        if (toToken === 'FB') {
            receiveSpan.textContent = `${willReceive.toFixed(5)} FB`;
        } else if (toToken === 'MC') {
            receiveSpan.textContent = `${Math.floor(willReceive)} MC`;
        } else {
            receiveSpan.textContent = `${willReceive.toFixed(2)} MY`;
        }
        
        // Reset color in case it was red before
        receiveSpan.style.color = '';
        
        // Show fee warning if fees are higher than normal
        if (conversion.feePercentage > 2) { // More than 2%
            this.showFeeWarning(fromToken, toToken, conversion);
        } else {
            this.clearWarningDisplay(fromToken, toToken);
        }
        
        // Update price display if available
        this.updatePriceDisplay(fromToken, toToken, conversion);
    }
    
    // Show warning messages in swap interface
    showWarningDisplay(fromToken, toToken, message) {
        const cardId = `${fromToken.toLowerCase()}-to-${toToken.toLowerCase()}`;
        const cardElement = this.modal.querySelector(`[data-swap="${cardId}"]`);
        
        if (cardElement) {
            let warningElement = cardElement.querySelector('.swap-warning');
            if (!warningElement) {
                warningElement = document.createElement('div');
                warningElement.className = 'swap-warning';
                warningElement.style.cssText = `
                    background: #ff6b6b20;
                    border: 1px solid #ff6b6b;
                    border-radius: 8px;
                    padding: 8px;
                    margin-top: 8px;
                    font-size: 12px;
                    color: #ff6b6b;
                `;
                cardElement.appendChild(warningElement);
            }
            warningElement.textContent = '⚠️ ' + message;
        }
    }
    
    // Show fee warning
    showFeeWarning(fromToken, toToken, conversion) {
        const cardId = `${fromToken.toLowerCase()}-to-${toToken.toLowerCase()}`;
        const cardElement = this.modal.querySelector(`[data-swap="${cardId}"]`);
        
        if (cardElement && conversion.feeBreakdown && conversion.feeBreakdown.length > 1) {
            let warningElement = cardElement.querySelector('.swap-warning');
            if (!warningElement) {
                warningElement = document.createElement('div');
                warningElement.className = 'swap-warning';
                warningElement.style.cssText = `
                    background: #ffa50020;
                    border: 1px solid #ffa500;
                    border-radius: 8px;
                    padding: 8px;
                    margin-top: 8px;
                    font-size: 12px;
                    color: #ffa500;
                `;
                cardElement.appendChild(warningElement);
            }
            
            let message = `💡 Higher fees applied (${conversion.feePercentage.toFixed(1)}%)`;
            if (conversion.arbitrageWarning) {
                message += ' - Suspicious pattern detected';
            }
            warningElement.textContent = message;
        }
    }
    
    // Clear warning display
    clearWarningDisplay(fromToken, toToken) {
        const cardId = `${fromToken.toLowerCase()}-to-${toToken.toLowerCase()}`;
        const cardElement = this.modal.querySelector(`[data-swap="${cardId}"]`);
        
        if (cardElement) {
            const warningElement = cardElement.querySelector('.swap-warning');
            if (warningElement) {
                warningElement.remove();
            }
        }
    }
    
    // Update price display in swap cards
    updatePriceDisplay(fromToken, toToken, conversion) {
        const priceService = window.hybridPriceService || window.brc20PriceService;
        if (!priceService) return;
        
        // Update current prices in the swap card header
        const cardId = `${fromToken.toLowerCase()}-to-${toToken.toLowerCase()}`;
        const cardElement = this.modal.querySelector(`[data-swap="${cardId}"]`);
        
        if (cardElement) {
            let priceHTML = '';
            
            if (conversion.fromPrice && conversion.toPrice) {
                priceHTML = `
                    <div class="price-info">
                        <span class="price-item">${fromToken}: $${conversion.fromPrice.toLocaleString()}</span>
                        <span class="price-item">${toToken}: $${conversion.toPrice.toFixed(toToken === 'MC' ? 2 : 0)}</span>
                        ${conversion.usdValue ? `<span class="usd-value">≈ $${conversion.usdValue.toFixed(2)} USD</span>` : ''}
                    </div>
                `;
            }
            
            // Update or create price display
            let priceDisplay = cardElement.querySelector('.price-info');
            if (priceDisplay) {
                priceDisplay.innerHTML = priceHTML;
            } else if (priceHTML) {
                const header = cardElement.querySelector('.change-header');
                if (header) {
                    header.insertAdjacentHTML('afterend', priceHTML);
                }
            }
        }
    }
    
    // Listen for price updates from BRC20 service
    setupPriceUpdateListener() {
        window.addEventListener('pricesUpdated', (event) => {
            console.log('💰 Prices updated, refreshing swap displays');
            
            // Update all active swap previews
            const activeInputs = this.modal.querySelectorAll('.change-form input[type="number"]');
            activeInputs.forEach(input => {
                if (input.value && parseFloat(input.value) > 0) {
                    // Trigger preview update for this input
                    const event = new Event('input');
                    input.dispatchEvent(event);
                }
            });
            
            // Update price displays (equivalence boxes)
            this.updateAllPriceDisplays();
        });
        
        // Also listen for PizzaSwap specific updates
        window.addEventListener('pizzaswapRatioUpdated', (event) => {
            console.log('🍕 Dashboard: Received PizzaSwap ratio update', event.detail);
            
            // Force update of all price displays
            setTimeout(() => {
                this.updateAllPriceDisplays();
            }, 100); // Small delay to ensure price service has updated
        });
    }
    
    // Update all price displays in swap section
    updateAllPriceDisplays() {
        const priceService = window.hybridPriceService || window.brc20PriceService;
        if (!priceService) return;
        
        const prices = priceService.getAllPrices();
        const pricesInfo = priceService.getAllPricesInfo();
        
        // Update exchange rate displays in swap cards
        const fbToMcRate = this.modal.querySelector('[data-swap="fb-to-mc"] .change-rate');
        const myToMcRate = this.modal.querySelector('[data-swap="my-to-mc"] .change-rate');
        const mcToMyRate = this.modal.querySelector('[data-swap="mc-to-my"] .change-rate');
        const mcToFbRate = this.modal.querySelector('[data-swap="mc-to-fb"] .change-rate');
        
        if (fbToMcRate && prices.FB && prices.MC) {
            const fbToMcAmount = Math.floor(prices.FB / prices.MC);
            fbToMcRate.textContent = `1 FB = ${fbToMcAmount.toLocaleString()} MC`;
        }
        
        if (myToMcRate && prices.MY && prices.MC) {
            const myToMcAmount = Math.floor((prices.MY / prices.MC) * 1.03); // Include 3% bonus
            if (myToMcAmount > 0) {
                myToMcRate.textContent = `1 MY = ${myToMcAmount} MC (+3% bonus)`;
            } else {
                const myToMcDecimal = ((prices.MY / prices.MC) * 1.03).toFixed(6);
                myToMcRate.textContent = `1 MY = ${myToMcDecimal} MC (+3% bonus)`;
            }
        }
        
        if (mcToMyRate && prices.MC && prices.MY) {
            const mcToMyAmount = ((prices.MC / prices.MY) * 0.97).toFixed(3); // Include 3% fee
            mcToMyRate.textContent = `1 MC = ${mcToMyAmount} MY (3% fee)`;
        }
        
        if (mcToFbRate && prices.MC && prices.FB) {
            const mcToFbAmount = ((prices.MC / prices.FB) * 0.97).toFixed(8); // Include 3% fee
            mcToFbRate.textContent = `1 MC = ${mcToFbAmount} FB (3% fee)`;
        }
        
        // Update last update timestamp
        this.updateLastUpdateDisplay(pricesInfo);
    }
    
    // Update last update timestamp display
    updateLastUpdateDisplay(pricesInfo) {
        const now = Date.now();
        let lastUpdate = null;
        
        // Find most recent update
        if (pricesInfo.FB && pricesInfo.FB.lastUpdate) {
            lastUpdate = pricesInfo.FB.lastUpdate;
        }
        if (pricesInfo.MY && pricesInfo.MY.lastUpdate && 
            (!lastUpdate || pricesInfo.MY.lastUpdate > lastUpdate)) {
            lastUpdate = pricesInfo.MY.lastUpdate;
        }
        
        if (lastUpdate) {
            const minutesAgo = Math.floor((now - lastUpdate) / (1000 * 60));
            const timeText = minutesAgo < 1 ? 'Just now' : `${minutesAgo} min ago`;
            
            // Update all price update indicators
            const updateIndicators = this.modal.querySelectorAll('.price-update-indicator');
            updateIndicators.forEach(indicator => {
                indicator.textContent = `Updated: ${timeText}`;
                
                // Add warning if prices are old
                if (minutesAgo > 10) {
                    indicator.classList.add('price-warning');
                    indicator.title = 'Prices may be outdated';
                } else {
                    indicator.classList.remove('price-warning');
                    indicator.title = '';
                }
            });
        }
    }
    
    async processChange(fromToken, toToken) {
        if (!this.connectedWallet) {
            alert('Please connect your wallet first');
            return;
        }
        
        const amountInput = this.modal.querySelector(`#${fromToken.toLowerCase()}-to-${toToken.toLowerCase()}-amount`);
        const amount = parseFloat(amountInput.value);
        
        if (!amount || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        
        const walletHub = window.walletConnectionModal;
        if (!walletHub) return;
        
        const fromBalance = walletHub.getUserBalance(fromToken);
        if (amount > fromBalance) {
            alert(`Insufficient ${fromToken} balance`);
            return;
        }
        
        try {
            // Calculate exchange with dynamic prices and anti-arbitrage fees
            const conversion = this.calculateDynamicConversion(amount, fromToken, toToken);
            
            // SIMPLIFICADO: Sin verificaciones de bloqueo
            
            const willReceive = conversion.netAmount;
            
            // Show fee breakdown if significant fees are applied
            if (conversion.feeBreakdown && conversion.feeBreakdown.length > 1) {
                let feeMessage = 'Fee Breakdown:\n';
                conversion.feeBreakdown.forEach(fee => {
                    feeMessage += `• ${fee.type}: ${(fee.percentage * 100).toFixed(1)}% - ${fee.reason}\n`;
                });
                feeMessage += `\nTotal Fee: ${conversion.feePercentage.toFixed(1)}%`;
                
                if (conversion.arbitrageWarning) {
                    feeMessage += `\n\n⚠️ ${conversion.arbitrageWarning.message}`;
                }
                
                const proceed = confirm(feeMessage + '\n\nDo you want to proceed with this swap?');
                if (!proceed) return;
            }
            
            // Simulate change process
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Log fee information for transparency
            if (conversion.feePercentage > 0) {
                console.log(`💰 Conversion fee: ${conversion.feeAmount.toFixed(5)} ${toToken} (${conversion.feePercentage.toFixed(2)}%)`);
                console.log(`📊 Gross: ${conversion.grossAmount.toFixed(5)} ${toToken} → Net: ${willReceive.toFixed(5)} ${toToken}`);
                if (conversion.feeBreakdown) {
                    console.log('🛡️ Fee breakdown:', conversion.feeBreakdown);
                }
            }
            
            // Update wallet balances
            walletHub.updateUserBalance(fromToken, fromBalance - amount);
            const newToBalance = walletHub.getUserBalance(toToken) + willReceive;
            walletHub.updateUserBalance(toToken, newToBalance);
            
            // 🔄 SYNC WITH BALANCEMANAGER: If conversion involves MC, sync with games
            if (toToken === 'MC' && window.balanceManager) {
                // Converting TO MC - update BalanceManager with new MC amount
                const currentMC = walletHub.getUserBalance('MC');
                window.balanceManager.setBalance(currentMC);
                console.log(`💱 Wallet conversion: ${amount} ${fromToken} → ${willReceive} MC. Total MC: ${currentMC}`);
            } else if (fromToken === 'MC' && window.balanceManager) {
                // Converting FROM MC - update BalanceManager with remaining MC
                const currentMC = walletHub.getUserBalance('MC');
                window.balanceManager.setBalance(currentMC);
                console.log(`💱 Wallet conversion: ${amount} MC → ${willReceive} ${toToken}. Remaining MC: ${currentMC}`);
            }
            
            // 🛡️ Record swap in arbitrage protection system
            if (window.arbitrageProtection && this.connectedWallet) {
                window.arbitrageProtection.recordSwap(
                    this.connectedWallet.address,
                    fromToken,
                    toToken,
                    conversion.usdValue
                );
            }
            
            // Clear input
            amountInput.value = '';
            this.updateChangePreview(fromToken, toToken);
            
            // Update limits display after successful swap
            this.updateLimitsDisplay();
            
            // Create success message with fee info if applicable
            let successMessage = `Successfully exchanged ${amount} ${fromToken} for ${toToken === 'FB' ? willReceive.toFixed(5) : willReceive.toFixed(2)} ${toToken}!`;
            if (conversion.feePercentage > 0) {
                successMessage += `\n💡 Transaction fee: ${conversion.feeAmount.toFixed(toToken === 'FB' ? 5 : 2)} ${toToken} (${conversion.feePercentage.toFixed(1)}%)`;
            }
            
            alert(successMessage);
            
        } catch (error) {
            console.error('Change error:', error);
            alert('Exchange failed. Please try again.');
        }
    }
    
    // Withdrawal methods
    async processWithdrawal(tokenType) {
        if (!this.connectedWallet) {
            alert('Please connect your wallet first');
            return;
        }
        
        const amountInput = this.modal.querySelector(`#withdraw-${tokenType.toLowerCase()}-amount`);
        const addressInput = this.modal.querySelector(`#withdraw-${tokenType.toLowerCase()}-address`);
        const amount = parseFloat(amountInput.value);
        const address = addressInput.value.trim();
        
        if (!amount || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        
        if (!address) {
            alert('Please enter a destination address');
            return;
        }
        
        const walletHub = window.walletConnectionModal;
        if (!walletHub) return;
        
        const balance = walletHub.getUserBalance(tokenType);
        if (amount > balance) {
            alert(`Insufficient ${tokenType} balance`);
            return;
        }
        
        try {
            // Simulate withdrawal process
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Update balance
            walletHub.updateUserBalance(tokenType, balance - amount);
            
            // Clear inputs
            amountInput.value = '';
            addressInput.value = '';
            
            alert(`Successfully withdrawn ${amount} ${tokenType}!`);
            
        } catch (error) {
            console.error('Withdrawal error:', error);
            alert('Withdrawal failed. Please try again.');
        }
    }
    
    useConnectedAddress(tokenType) {
        if (this.connectedWallet && this.connectedWallet.address) {
            const addressInput = this.modal.querySelector(`#withdraw-${tokenType.toLowerCase()}-address`);
            addressInput.value = this.connectedWallet.address;
        }
    }
    
    handleWalletStateChange(walletState) {
        this.connectedWallet = walletState.isConnected ? walletState.wallet : null;
        this.updateWalletDisplay();
        
        // If wallet connected, force re-check auth state after a delay
        if (walletState.isConnected) {
            setTimeout(() => {
                console.log('🔄 Force re-checking auth state after wallet state change...');
                this.checkAuthState();
            }, 1000);
        }
    }
    
    updateWalletDisplay() {
        const walletIndicator = this.modal.querySelector('#wallet-indicator');
        const walletText = this.modal.querySelector('#wallet-text');
        const depositForms = this.modal.querySelector('#deposit-forms');
        const withdrawalForms = this.modal.querySelector('#withdrawal-forms');
        const withdrawalDisabled = this.modal.querySelector('#withdrawal-disabled');
        
        if (this.connectedWallet) {
            if (walletIndicator) walletIndicator.className = 'status-indicator connected';
            if (walletText) walletText.textContent = `${this.connectedWallet.name} connected`;
            
            // Show deposit and withdrawal forms
            if (depositForms) depositForms.style.display = 'block';
            if (withdrawalForms) withdrawalForms.style.display = 'block';
            if (withdrawalDisabled) withdrawalDisabled.style.display = 'none';
        } else {
            if (walletIndicator) walletIndicator.className = 'status-indicator disconnected';
            if (walletText) walletText.textContent = 'No wallet connected';
            
            // Hide deposit and withdrawal forms
            if (depositForms) depositForms.style.display = 'none';
            if (withdrawalForms) withdrawalForms.style.display = 'none';
            if (withdrawalDisabled) withdrawalDisabled.style.display = 'block';
        }
    }
    
    // Public methods
    open() {
        // Check if user is authenticated via wallet
        const walletHub = window.walletConnectionModal;
        if (!walletHub || !walletHub.isUserAuthenticated()) {
            console.warn('Dashboard: Cannot open without authenticated user');
            return;
        }
        
        // Load user data from wallet hub
        this.user = walletHub.getCurrentUser();
        this.connectedWallet = walletHub.getConnectedWallet();
        
        this.modal.classList.add('dashboard-visible');
        this.isOpen = true;
        document.body.style.overflow = 'hidden';
        
        // Initialize with balance tab active
        this.switchTab('balance');
        
        // Refresh data when opening
        this.loadUserData();
        this.updateWalletDisplay();
        this.updateLimitsDisplay();
        
        // Initialize price displays immediately and periodically
        this.updateAllPriceDisplays();
        
        setTimeout(() => {
            this.updateAllPriceDisplays();
        }, 500);
        
        // Set up periodic updates
        this.priceUpdateInterval = setInterval(() => {
            this.updateAllPriceDisplays();
        }, 30000); // Update every 30 seconds
    }
    
    close() {
        this.modal.classList.remove('dashboard-visible');
        this.isOpen = false;
        document.body.style.overflow = '';
        
        // Clean up price update interval
        if (this.priceUpdateInterval) {
            clearInterval(this.priceUpdateInterval);
            this.priceUpdateInterval = null;
        }
    }
    
    isAuthenticated() {
        return !!this.user;
    }
    
    getUser() {
        return this.user;
    }
    
    getBalance() {
        return this.balance;
    }
    
    // Modern Swap Interface Listeners
    setupModernSwapListeners() {
        console.log('🔄 Setting up modern swap listeners...');
        
        // Token dropdown toggles
        const fromToken = this.modal.querySelector('#swap-from-token');
        const toToken = this.modal.querySelector('#swap-to-token');
        const fromDropdown = this.modal.querySelector('#swap-from-dropdown');
        const toDropdown = this.modal.querySelector('#swap-to-dropdown');
        
        // Toggle from token dropdown
        if (fromToken && fromDropdown) {
            fromToken.addEventListener('click', (e) => {
                e.stopPropagation();
                fromDropdown.classList.toggle('active');
                toDropdown.classList.remove('active');
            });
        }
        
        // Toggle to token dropdown
        if (toToken && toDropdown) {
            toToken.addEventListener('click', (e) => {
                e.stopPropagation();
                toDropdown.classList.toggle('active');
                fromDropdown.classList.remove('active');
            });
        }
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            if (fromDropdown) fromDropdown.classList.remove('active');
            if (toDropdown) toDropdown.classList.remove('active');
        });
        
        // Token selection handlers
        this.setupTokenSelection();
        
        // Max button functionality
        const maxBtn = this.modal.querySelector('#swap-max-btn');
        if (maxBtn) {
            maxBtn.addEventListener('click', () => this.handleMaxButton());
        }
        
        // Flip tokens button
        const flipBtn = this.modal.querySelector('#swap-flip-btn');
        if (flipBtn) {
            flipBtn.addEventListener('click', () => this.handleFlipTokens());
        }
        
        // Amount input changes
        const amountInput = this.modal.querySelector('#swap-from-amount');
        if (amountInput) {
            amountInput.addEventListener('input', () => this.calculateSwapOutput());
        }
        
        // Initialize dropdown options based on default state (FB -> MC)
        this.updateAvailableToTokens('FB');
        this.updateAvailableFromTokens('MC');
        
        console.log('✅ Modern swap listeners setup complete');
    }
    
    setupTokenSelection() {
        // From token options
        const fromOptions = this.modal.querySelectorAll('#swap-from-dropdown .token-option-clean');
        fromOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const token = e.currentTarget.dataset.token;
                this.selectFromToken(token);
            });
        });
        
        // To token options
        const toOptions = this.modal.querySelectorAll('#swap-to-dropdown .token-option-clean');
        toOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const token = e.currentTarget.dataset.token;
                this.selectToToken(token);
            });
        });
    }
    
    selectFromToken(token) {
        const icon = this.modal.querySelector('#swap-from-icon');
        const symbol = this.modal.querySelector('#swap-from-symbol');
        const dropdown = this.modal.querySelector('#swap-from-dropdown');
        
        const tokenData = this.getTokenData(token);
        if (icon) icon.textContent = tokenData.icon;
        if (symbol) symbol.textContent = tokenData.name;
        if (dropdown) dropdown.classList.remove('active');
        
        // Force MC on the "To" side if FB or MY is selected
        if (token === 'FB' || token === 'MY') {
            this.setToToken('MC');
        }
        
        this.updateSwapBalance('from', token);
        this.updateAvailableToTokens(token);
        this.calculateSwapOutput();
    }
    
    selectToToken(token) {
        const icon = this.modal.querySelector('#swap-to-icon');
        const symbol = this.modal.querySelector('#swap-to-symbol');
        const dropdown = this.modal.querySelector('#swap-to-dropdown');
        
        const tokenData = this.getTokenData(token);
        if (icon) icon.textContent = tokenData.icon;
        if (symbol) symbol.textContent = tokenData.name;
        if (dropdown) dropdown.classList.remove('active');
        
        // Force MC on the "From" side if FB or MY is selected
        if (token === 'FB' || token === 'MY') {
            this.setFromToken('MC');
        }
        
        this.updateSwapBalance('to', token);
        this.updateAvailableFromTokens(token);
        this.calculateSwapOutput();
    }
    
    getTokenData(token) {
        const tokens = {
            'FB': { icon: '₿', symbol: 'FB', name: 'Fractal Bitcoin' },
            'MY': { icon: '🪙', symbol: 'MY', name: 'MoonYetis' },
            'MC': { icon: '💰', symbol: 'MC', name: 'MoonCoins' }
        };
        return tokens[token] || tokens['FB'];
    }
    
    // Helper functions to set tokens without triggering events
    setFromToken(token) {
        const icon = this.modal.querySelector('#swap-from-icon');
        const symbol = this.modal.querySelector('#swap-from-symbol');
        
        const tokenData = this.getTokenData(token);
        if (icon) icon.textContent = tokenData.icon;
        if (symbol) symbol.textContent = tokenData.name;
        
        this.updateSwapBalance('from', token);
    }
    
    setToToken(token) {
        const icon = this.modal.querySelector('#swap-to-icon');
        const symbol = this.modal.querySelector('#swap-to-symbol');
        
        const tokenData = this.getTokenData(token);
        if (icon) icon.textContent = tokenData.icon;
        if (symbol) symbol.textContent = tokenData.name;
        
        this.updateSwapBalance('to', token);
    }
    
    // Update available tokens in dropdowns based on FB/MY <-> MC rule
    updateAvailableFromTokens(toToken) {
        const dropdown = this.modal.querySelector('#swap-from-dropdown');
        if (!dropdown) return;
        
        // If "To" is MC, "From" can be FB or MY (not MC)
        // If "To" is FB or MY, "From" must be MC
        let availableTokens;
        if (toToken === 'MC') {
            availableTokens = ['FB', 'MY'];
        } else {
            availableTokens = ['MC'];
        }
        
        this.updateDropdownOptions(dropdown, availableTokens);
    }
    
    updateAvailableToTokens(fromToken) {
        const dropdown = this.modal.querySelector('#swap-to-dropdown');
        if (!dropdown) return;
        
        // If "From" is MC, "To" can be FB or MY (not MC)
        // If "From" is FB or MY, "To" must be MC
        let availableTokens;
        if (fromToken === 'MC') {
            availableTokens = ['FB', 'MY'];
        } else {
            availableTokens = ['MC'];
        }
        
        this.updateDropdownOptions(dropdown, availableTokens);
    }
    
    updateDropdownOptions(dropdown, availableTokens) {
        const options = dropdown.querySelectorAll('.token-option-clean');
        options.forEach(option => {
            const token = option.dataset.token;
            if (availableTokens.includes(token)) {
                option.style.display = 'flex';
            } else {
                option.style.display = 'none';
            }
        });
    }
    
    handleMaxButton() {
        const amountInput = this.modal.querySelector('#swap-from-amount');
        const fromSymbol = this.modal.querySelector('#swap-from-symbol');
        
        if (amountInput && fromSymbol) {
            const token = fromSymbol.textContent;
            const balance = this.getTokenBalance(token);
            amountInput.value = balance;
            this.calculateSwapOutput();
        }
    }
    
    handleFlipTokens() {
        const fromIcon = this.modal.querySelector('#swap-from-icon');
        const fromSymbol = this.modal.querySelector('#swap-from-symbol');
        const toIcon = this.modal.querySelector('#swap-to-icon');
        const toSymbol = this.modal.querySelector('#swap-to-symbol');
        
        if (fromIcon && fromSymbol && toIcon && toSymbol) {
            // Get current token symbols by matching with token data
            const currentFromToken = this.getTokenByName(fromSymbol.textContent);
            const currentToToken = this.getTokenByName(toSymbol.textContent);
            
            // Swap the tokens
            this.setFromToken(currentToToken);
            this.setToToken(currentFromToken);
            
            // Update available options and recalculate
            this.updateAvailableToTokens(currentToToken);
            this.updateAvailableFromTokens(currentFromToken);
            this.calculateSwapOutput();
        }
    }
    
    // Helper function to get token symbol by name
    getTokenByName(name) {
        const tokenMap = {
            'Fractal Bitcoin': 'FB',
            'MoonYetis': 'MY',
            'MoonCoins': 'MC'
        };
        return tokenMap[name] || 'FB';
    }
    
    updateSwapBalance(direction, token) {
        const balance = this.getTokenBalance(token);
        const balanceElement = this.modal.querySelector(`#swap-${direction}-balance span`);
        
        if (balanceElement) {
            balanceElement.textContent = `Balance: ${balance}`;
        }
    }
    
    getTokenBalance(token) {
        // This would connect to your actual balance system
        const balances = {
            'FB': '0.00000',
            'MY': '0',
            'MC': '0'
        };
        return balances[token] || '0';
    }
    
    calculateSwapOutput() {
        const amountInput = this.modal.querySelector('#swap-from-amount');
        const outputElement = this.modal.querySelector('#swap-to-amount');
        const fromSymbol = this.modal.querySelector('#swap-from-symbol');
        const toSymbol = this.modal.querySelector('#swap-to-symbol');
        
        if (amountInput && outputElement && fromSymbol && toSymbol) {
            const inputAmount = parseFloat(amountInput.value) || 0;
            const fromToken = this.getTokenByName(fromSymbol.textContent);
            const toToken = this.getTokenByName(toSymbol.textContent);
            
            let outputAmount = 0;
            
            // Get real prices from HybridPriceService
            if (window.hybridPriceService) {
                try {
                    const fromPriceUSD = window.hybridPriceService.getPrice(fromToken);
                    const toPriceUSD = window.hybridPriceService.getPrice(toToken);
                    
                    if (fromPriceUSD && toPriceUSD && fromPriceUSD > 0 && toPriceUSD > 0) {
                        // Calculate conversion rate based on USD values
                        const conversionRate = fromPriceUSD / toPriceUSD;
                        outputAmount = inputAmount * conversionRate;
                        
                        console.log(`💱 Swap calculation: ${inputAmount} ${fromToken} (${fromPriceUSD} USD) → ${outputAmount.toFixed(8)} ${toToken} (${toPriceUSD} USD)`);
                    } else {
                        console.warn('⚠️ Price data not available, using fallback calculation');
                        outputAmount = this.calculateFallbackSwap(inputAmount, fromToken, toToken);
                    }
                } catch (error) {
                    console.error('❌ Error calculating swap output:', error);
                    outputAmount = this.calculateFallbackSwap(inputAmount, fromToken, toToken);
                }
            } else {
                console.warn('⚠️ HybridPriceService not available, using fallback');
                outputAmount = this.calculateFallbackSwap(inputAmount, fromToken, toToken);
            }
            
            // Apply fee if this is MC → FB/MY conversion
            let finalAmount = outputAmount;
            let feeApplied = 0;
            
            if (fromToken === 'MC' && (toToken === 'FB' || toToken === 'MY')) {
                // Check if arbitrage protection is available for consistent fee calculation
                if (window.arbitrageProtection && this.connectedWallet) {
                    const walletAddress = this.connectedWallet.address;
                    const usdValue = outputAmount * (window.hybridPriceService?.getPrice(toToken) || 1);
                    const swapCheck = window.arbitrageProtection.checkSwapAllowed(walletAddress, fromToken, toToken, usdValue);
                    
                    const feePercentage = swapCheck.fees.totalPercentage;
                    feeApplied = feePercentage;
                    finalAmount = outputAmount * (1 - feePercentage); // Aplicar fee: ej. 1 * (1 - 0.03) = 0.97
                } else {
                    // Fallback: aplicar 3% manualmente
                    feeApplied = 0.03;
                    finalAmount = outputAmount * 0.97; // 3% fee
                }
            }
            
            // Format output with appropriate decimal places
            const formattedOutput = this.formatSwapAmount(finalAmount, toToken);
            outputElement.textContent = formattedOutput;
            
            // Update USD values displayed (use finalAmount to show correct USD after fee)
            this.updateUSDValues(inputAmount, fromToken, finalAmount, toToken);
            
            // Update exchange info display
            this.updateExchangeInfo(inputAmount, fromToken, outputAmount, toToken);
            
            this.updateSwapButton(inputAmount > 0);
        }
    }
    
    // Fallback calculation if price service is unavailable
    calculateFallbackSwap(inputAmount, fromToken, toToken) {
        // Use backup rates based on approximate market values
        const fallbackRates = {
            'FB_MC': 43.9,  // ~$0.439 / $0.01
            'MC_FB': 1/43.9,
            'MY_MC': 0.000003529,  // Very small rate for MY to MC
            'MC_MY': 1/0.000003529
        };
        
        const rateKey = `${fromToken}_${toToken}`;
        const rate = fallbackRates[rateKey];
        
        return rate ? inputAmount * rate : 0;
    }
    
    // Format swap amounts based on token type
    formatSwapAmount(amount, token) {
        if (amount === 0) return '0';
        
        // Different formatting for different tokens
        switch (token) {
            case 'FB':
                return amount.toFixed(8); // Bitcoin precision
            case 'MY':
                return amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
            case 'MC':
                return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
            default:
                return amount.toLocaleString();
        }
    }
    
    // Update USD values displayed in the interface
    updateUSDValues(inputAmount, fromToken, outputAmount, toToken) {
        const fromUSDElement = this.modal.querySelector('#swap-from-usd');
        const toUSDElement = this.modal.querySelector('#swap-to-usd');
        
        if (window.hybridPriceService && fromUSDElement && toUSDElement) {
            try {
                const fromPriceUSD = window.hybridPriceService.getPrice(fromToken);
                const toPriceUSD = window.hybridPriceService.getPrice(toToken);
                
                if (fromPriceUSD && toPriceUSD) {
                    const fromUSDValue = (inputAmount * fromPriceUSD).toFixed(4);
                    const toUSDValue = (outputAmount * toPriceUSD).toFixed(4);
                    
                    fromUSDElement.textContent = `≈ $${fromUSDValue}`;
                    toUSDElement.textContent = `≈ $${toUSDValue}`;
                } else {
                    fromUSDElement.textContent = '≈ $0.00';
                    toUSDElement.textContent = '≈ $0.00';
                }
            } catch (error) {
                console.error('❌ Error updating USD values:', error);
                if (fromUSDElement) fromUSDElement.textContent = '≈ $0.00';
                if (toUSDElement) toUSDElement.textContent = '≈ $0.00';
            }
        }
    }
    
    // Update exchange info display
    updateExchangeInfo(inputAmount, fromToken, outputAmount, toToken) {
        const exchangeInfoContainer = this.modal.querySelector('#swap-exchange-info');
        const exchangeRateValue = this.modal.querySelector('#exchange-rate-value');
        const exchangeFeeDisplay = this.modal.querySelector('#exchange-fee-display');
        const exchangeFeeValue = this.modal.querySelector('#exchange-fee-value');
        const exchangeNetDisplay = this.modal.querySelector('#exchange-net-display');
        const exchangeNetValue = this.modal.querySelector('#exchange-net-value');
        
        if (!exchangeInfoContainer || inputAmount <= 0) {
            if (exchangeInfoContainer) exchangeInfoContainer.style.display = 'none';
            return;
        }
        
        // Show the exchange info container
        exchangeInfoContainer.style.display = 'block';
        
        // Calculate the exchange rate
        const rate = outputAmount / inputAmount;
        const formattedRate = this.formatSwapAmount(rate, toToken);
        exchangeRateValue.textContent = `1 ${fromToken} = ${formattedRate} ${toToken}`;
        
        // Check if fee applies (MC to FB/MY conversions have 3% fee)
        const hasFee = fromToken === 'MC' && (toToken === 'FB' || toToken === 'MY');
        
        if (hasFee) {
            // Add visual indicator for fee
            exchangeInfoContainer.classList.add('has-fee');
            
            // Show fee information
            exchangeFeeDisplay.style.display = 'block';
            exchangeFeeValue.textContent = '3%';
            
            // Calculate and show gross amount before fee
            const grossAmount = outputAmount / 0.97; // Since outputAmount is already after 3% fee
            exchangeNetDisplay.style.display = 'block';
            const formattedNet = this.formatSwapAmount(outputAmount, toToken);
            const formattedGross = this.formatSwapAmount(grossAmount, toToken);
            exchangeNetValue.textContent = `${formattedNet} ${toToken} (from ${formattedGross} ${toToken})`;
        } else {
            // Remove visual indicator for fee
            exchangeInfoContainer.classList.remove('has-fee');
            
            // Hide fee information for swaps without fees
            exchangeFeeDisplay.style.display = 'none';
            exchangeNetDisplay.style.display = 'none';
        }
    }
    
    updateSwapButton(hasAmount) {
        const button = this.modal.querySelector('#swap-action-btn');
        const buttonText = this.modal.querySelector('#swap-action-text');
        
        if (button && buttonText) {
            if (hasAmount) {
                button.disabled = false;
                buttonText.textContent = 'Exchange';
                button.classList.remove('disabled');
            } else {
                button.disabled = true;
                buttonText.textContent = 'Enter amount';
                button.classList.add('disabled');
            }
        }
    }
    
    // Load and display user's deposit address
    // Recover authentication token from localStorage
    recoverAuthToken() {
        console.log('🔄 Attempting to recover auth token from localStorage...');
        
        const authToken = localStorage.getItem('auth_token');
        const authUser = localStorage.getItem('auth_user');
        
        if (authToken && authUser && this.user) {
            console.log('✅ Auth token found in localStorage, restoring...');
            this.user.token = authToken;
            
            try {
                const backendUser = JSON.parse(authUser);
                this.user.backendData = backendUser;
                console.log('✅ Auth token successfully recovered');
                return true;
            } catch (error) {
                console.error('❌ Error parsing stored auth user data:', error);
                return false;
            }
        } else {
            console.warn('⚠️ No auth data found in localStorage');
            return false;
        }
    }

    async loadDepositAddress() {
        console.log('🔄 Loading deposit address...');
        console.log('🔍 Debug - this.user:', this.user);
        console.log('🔍 Debug - this.user.token:', this.user ? this.user.token : 'user is null');
        console.log('🔍 Debug - localStorage auth_token:', localStorage.getItem('auth_token'));
        
        // First attempt: check if we have valid auth
        if (!this.user || !this.user.token) {
            console.log('🔧 No token found, attempting recovery...');
            
            // Try to recover from localStorage
            if (this.user && this.recoverAuthToken()) {
                console.log('✅ Token recovered successfully');
            } else {
                console.warn('❌ Cannot load deposit address - user not authenticated');
                console.log('❌ Debug - Authentication check failed:');
                console.log('   - User exists:', !!this.user);
                console.log('   - User has token:', !!(this.user && this.user.token));
                console.log('   - localStorage has auth_token:', !!localStorage.getItem('auth_token'));
                this.showAddressError('Please login to view deposit address');
                return;
            }
        }
        
        // Show loading state
        const addressInput = this.modal.querySelector('#deposit-address');
        const qrContainer = this.modal.querySelector('#deposit-qr-container');
        
        if (addressInput) {
            addressInput.value = 'Loading...';
        }
        
        try {
            console.log(`🌐 Making request to: ${this.getApiUrl()}/api/wallet/deposit-address`);
            console.log(`🔑 Using token: ${this.user.token.substring(0, 20)}...`);
            
            const response = await fetch(`${this.getApiUrl()}/api/wallet/deposit-address`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.user.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log(`📡 Response status: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Response error:', errorText);
                
                // If we get 403, try to recover token and retry once
                if (response.status === 403 && this.user) {
                    console.log('🔧 Got 403 error, attempting token recovery and retry...');
                    if (this.recoverAuthToken()) {
                        console.log('🔄 Token recovered, retrying request...');
                        // Retry the request with recovered token
                        const retryResponse = await fetch(`${this.getApiUrl()}/api/wallet/deposit-address`, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${this.user.token}`,
                                'Content-Type': 'application/json'
                            }
                        });
                        
                        if (retryResponse.ok) {
                            console.log('✅ Retry successful with recovered token');
                            const retryData = await retryResponse.json();
                            if (retryData.success && retryData.address) {
                                // Update address display
                                if (addressInput) {
                                    addressInput.value = retryData.address;
                                }
                                
                                // Generate QR code
                                this.generateDepositQR(retryData.address);
                                
                                // Load deposit history
                                this.loadDepositHistory();
                                
                                console.log(`✅ Deposit address loaded after retry: ${retryData.address}`);
                                return; // Success, exit function
                            }
                        } else {
                            console.error('❌ Retry also failed:', await retryResponse.text());
                        }
                    }
                }
                
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('📦 Response data:', data);
            
            if (data.success && data.address) {
                // Update address display
                if (addressInput) {
                    addressInput.value = data.address;
                }
                
                // Generate QR code
                this.generateDepositQR(data.address);
                
                // Load deposit history
                this.loadDepositHistory();
                
                console.log(`✅ Deposit address loaded: ${data.address}`);
            } else {
                throw new Error(data.error || 'Invalid response from server');
            }
        } catch (error) {
            console.error('❌ Error loading deposit address:', error);
            this.showAddressError(error.message);
        }
    }
    
    // Show error in address section
    showAddressError(message) {
        const addressInput = this.modal.querySelector('#deposit-address');
        const qrContainer = this.modal.querySelector('#deposit-qr-container');
        
        if (addressInput) {
            addressInput.value = `Error: ${message}`;
            addressInput.style.color = '#ef4444';
        }
        
        if (qrContainer) {
            qrContainer.innerHTML = `
                <div class="qr-error">
                    <div class="error-icon">⚠️</div>
                    <p>Failed to load</p>
                    <small>${message}</small>
                </div>
            `;
        }
    }
    
    // Generate QR code for deposit address
    generateDepositQR(address) {
        const qrContainer = this.modal.querySelector('#deposit-qr-container');
        if (!qrContainer) return;
        
        // Clear existing content
        qrContainer.innerHTML = '';
        
        // Create QR code using a simple library or API
        // For now, we'll use a placeholder
        const qrImg = document.createElement('img');
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(address)}`;
        qrImg.alt = 'Deposit Address QR Code';
        qrImg.style.width = '200px';
        qrImg.style.height = '200px';
        
        qrContainer.appendChild(qrImg);
    }
    
    // Load user's deposit history
    async loadDepositHistory() {
        if (!this.user || !this.user.token) return;
        
        try {
            const response = await fetch(`${this.getApiUrl()}/api/wallet/deposits?limit=10`, {
                headers: {
                    'Authorization': `Bearer ${this.user.token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to get deposit history: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.deposits) {
                this.displayDepositHistory(data.deposits);
            }
        } catch (error) {
            console.error('❌ Error loading deposit history:', error);
        }
    }
    
    // Display deposit history in the UI
    displayDepositHistory(deposits) {
        const depositsList = this.modal.querySelector('#deposits-list');
        if (!depositsList) return;
        
        if (deposits.length === 0) {
            depositsList.innerHTML = `
                <div class="no-deposits">
                    <p>No deposits yet</p>
                    <p class="hint">Send FB or MY to your address above</p>
                </div>
            `;
            return;
        }
        
        // Create deposit items
        const depositsHTML = deposits.map(deposit => {
            const date = new Date(deposit.detected_at);
            const dateStr = date.toLocaleDateString();
            const timeStr = date.toLocaleTimeString();
            const statusClass = deposit.status === 'confirmed' ? 'confirmed' : 'pending';
            const statusText = deposit.status === 'confirmed' ? 'Confirmed' : `Pending (${deposit.confirmations}/1)`;
            
            return `
                <div class="deposit-item ${statusClass}">
                    <div class="deposit-header">
                        <span class="deposit-amount">${deposit.amount} ${deposit.token_type}</span>
                        <span class="deposit-status">${statusText}</span>
                    </div>
                    <div class="deposit-details">
                        <span class="deposit-date">${dateStr} ${timeStr}</span>
                        <a href="https://fractal.uniscan.cc/tx/${deposit.tx_hash}" 
                           target="_blank" class="tx-link">View TX →</a>
                    </div>
                </div>
            `;
        }).join('');
        
        depositsList.innerHTML = depositsHTML;
    }
    
    // Copy address to clipboard
    setupCopyAddress() {
        const copyBtn = this.modal.querySelector('#copy-address-btn');
        const addressInput = this.modal.querySelector('#deposit-address');
        
        if (!copyBtn || !addressInput) return;
        
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(addressInput.value);
                
                // Show feedback
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<span class="copy-icon">✓</span>';
                copyBtn.classList.add('copied');
                
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.classList.remove('copied');
                }, 2000);
            } catch (error) {
                console.error('Failed to copy address:', error);
                alert('Failed to copy address');
            }
        });
    }
    
    // Get API URL based on environment
    getApiUrl() {
        return this.isDevelopmentMode ? 
            'http://localhost:3002' : 
            'https://moonyetis.io';
    }
}

// Initialize dashboard when DOM is loaded
if (document.readyState === 'loading') {
    // DOM is still loading, wait for it
    document.addEventListener('DOMContentLoaded', () => {
        window.dashboardModal = new DashboardModal();
    });
} else {
    // DOM is already ready, initialize immediately
    window.dashboardModal = new DashboardModal();
}