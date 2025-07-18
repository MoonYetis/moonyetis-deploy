// Modular Integration - Coordinates communication between Web3 components
// Ensures proper initialization and event handling across the new architecture

class ModularIntegration {
    constructor() {
        this.components = {
            wallet: null,
            dashboard: null
        };
        
        this.state = {
            isAuthenticated: false,
            user: null,
            walletConnected: false,
            wallet: null
        };
        
        this.init();
    }
    
    init() {
        console.log('🔗 Modular Integration: Initializing component coordination...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupComponents());
        } else {
            this.setupComponents();
        }
    }
    
    setupComponents() {
        // Initialize components in order
        this.initializeWallet();
        this.initializeDashboard();
        
        // Setup cross-component communication
        this.setupEventListeners();
        
        console.log('✅ Modular Integration: All components coordinated');
    }
    
    initializeWallet() {
        // Wait for wallet hub to be available
        const checkWallet = () => {
            if (window.walletConnectionModal) {
                this.components.wallet = window.walletConnectionModal;
                console.log('✅ Wallet Connection Hub found');
                return true;
            }
            return false;
        };
        
        if (!checkWallet()) {
            // Retry after a short delay
            setTimeout(() => {
                if (!checkWallet()) {
                    console.warn('⚠️ Wallet Connection Hub not found after retry');
                }
            }, 500);
        }
    }
    
    initializeDashboard() {
        // Wait for dashboard to be available
        const checkDashboard = () => {
            if (window.dashboardModal) {
                this.components.dashboard = window.dashboardModal;
                console.log('✅ Dashboard component found');
                return true;
            }
            return false;
        };
        
        if (!checkDashboard()) {
            // Retry after a short delay
            setTimeout(() => {
                if (!checkDashboard()) {
                    console.warn('⚠️ Dashboard component not found after retry');
                }
            }, 500);
        }
    }
    
    
    setupEventListeners() {
        // Listen for user authentication (wallet connection)
        window.addEventListener('userAuthenticated', (e) => {
            this.handleUserAuthenticated(e.detail);
        });
        
        // Listen for user disconnection
        window.addEventListener('userDisconnected', (e) => {
            this.handleUserDisconnected(e.detail);
        });
        
        // Listen for wallet state changes
        window.addEventListener('walletStateChanged', (e) => {
            this.handleWalletStateChange(e.detail);
        });
        
        // Listen for balance updates
        window.addEventListener('balanceUpdated', (e) => {
            this.handleBalanceUpdate(e.detail);
        });
        
        // Setup cross-component method calls
        this.setupCrossComponentCalls();
    }
    
    setupCrossComponentCalls() {
        // Dashboard -> Wallet integration
        if (this.components.dashboard) {
            // Override dashboard's openWalletConnection method
            this.components.dashboard.openWalletConnection = () => {
                if (this.components.wallet) {
                    this.components.wallet.open();
                } else {
                    console.warn('⚠️ Wallet component not available');
                }
            };
        }
        
        console.log('✅ Cross-component method calls setup');
    }
    
    handleUserAuthenticated(detail) {
        this.state.isAuthenticated = true;
        this.state.user = detail.user;
        this.state.walletConnected = true;
        this.state.wallet = detail.wallet;
        
        console.log('🔐 User authenticated:', detail);
        
        // Update navigation buttons
        this.updateNavigationButtons(true);
    }
    
    handleUserDisconnected(detail) {
        this.state.isAuthenticated = false;
        this.state.user = null;
        this.state.walletConnected = false;
        this.state.wallet = null;
        
        console.log('🔐 User disconnected:', detail);
        
        // Update navigation buttons
        this.updateNavigationButtons(false);
    }
    
    handleBalanceUpdate(detail) {
        console.log('💰 Balance updated:', detail);
        // The dashboard will handle this automatically via its own event listener
    }
    
    handleWalletStateChange(walletState) {
        this.state.walletConnected = walletState.isConnected;
        this.state.wallet = walletState.wallet;
        
        console.log('🔗 Wallet state changed:', walletState);
        
        // Update all components with new wallet state
        this.propagateWalletState(walletState);
        
        // Update navigation if needed
        this.updateWalletButton(walletState);
    }
    
    propagateAuthState(authState) {
        // Propagate to dashboard
        if (this.components.dashboard && this.components.dashboard.handleAuthStateChange) {
            this.components.dashboard.handleAuthStateChange(authState);
        }
        
        // Propagate to store
        if (this.components.store && this.components.store.handleAuthStateChange) {
            this.components.store.handleAuthStateChange(authState);
        }
        
        // Propagate to wallet
        if (this.components.wallet && this.components.wallet.handleAuthStateChange) {
            this.components.wallet.handleAuthStateChange(authState);
        }
    }
    
    propagateWalletState(walletState) {
        // Propagate to dashboard
        if (this.components.dashboard && this.components.dashboard.handleWalletStateChange) {
            this.components.dashboard.handleWalletStateChange(walletState);
        }
        
        // Propagate to store
        if (this.components.store && this.components.store.handleWalletStateChange) {
            this.components.store.handleWalletStateChange(walletState);
        }
        
        // Propagate to auth
        if (this.components.auth && this.components.auth.handleWalletStateChange) {
            this.components.auth.handleWalletStateChange(walletState);
        }
    }
    
    updateNavigationButtons(isAuthenticated) {
        const walletBtn = document.getElementById('ecosystemWalletBtn');
        const dashboardBtn = document.getElementById('ecosystemDashboardBtn');
        
        if (isAuthenticated) {
            // Hide wallet button, show dashboard button
            if (walletBtn) walletBtn.style.display = 'none';
            if (dashboardBtn) dashboardBtn.style.display = 'block';
        } else {
            // Show wallet button, hide dashboard button
            if (walletBtn) walletBtn.style.display = 'block';
            if (dashboardBtn) dashboardBtn.style.display = 'none';
        }
    }
    
    updateWalletButton(walletState) {
        const walletBtn = document.getElementById('ecosystemWalletBtn');
        
        if (walletBtn) {
            if (walletState.isConnected) {
                walletBtn.textContent = `🔗 ${walletState.wallet.name}`;
                walletBtn.title = `Connected to ${walletState.wallet.name}`;
            } else {
                walletBtn.textContent = '🔗 Connect Wallet';
                walletBtn.title = 'Connect your wallet';
            }
        }
    }
    
    // Public methods for external use
    getAuthState() {
        return {
            isAuthenticated: this.state.isAuthenticated,
            user: this.state.user
        };
    }
    
    getWalletState() {
        return {
            isConnected: this.state.walletConnected,
            wallet: this.state.wallet
        };
    }
    
    openDashboard() {
        if (this.components.dashboard) {
            this.components.dashboard.open();
        } else {
            console.warn('⚠️ Dashboard component not available');
        }
    }
    
    openStore() {
        if (this.components.store) {
            this.components.store.open();
        } else {
            console.warn('⚠️ Store component not available');
        }
    }
    
    openWalletConnection() {
        if (this.components.wallet) {
            this.components.wallet.open();
        } else {
            console.warn('⚠️ Wallet component not available');
        }
    }
    
    isComponentReady(componentName) {
        return this.components[componentName] !== null;
    }
    
    waitForComponent(componentName, callback) {
        if (this.isComponentReady(componentName)) {
            callback(this.components[componentName]);
            return;
        }
        
        // Wait for component to be ready
        const checkComponent = () => {
            if (this.isComponentReady(componentName)) {
                callback(this.components[componentName]);
            } else {
                setTimeout(checkComponent, 100);
            }
        };
        
        setTimeout(checkComponent, 100);
    }
    
    // Legacy compatibility methods
    openWalletHub() {
        console.warn('⚠️ openWalletHub is deprecated. Use openDashboard() instead.');
        this.openDashboard();
    }
    
    openWalletModal() {
        console.warn('⚠️ openWalletModal is deprecated. Use openWalletConnection() instead.');
        this.openWalletConnection();
    }
}

// Initialize modular integration
window.modularIntegration = new ModularIntegration();

// Export for compatibility
window.ModularIntegration = ModularIntegration;