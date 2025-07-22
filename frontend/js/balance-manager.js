// BalanceManager - Centralized MC Balance Management for MoonYetis Ecosystem
// Handles synchronization of MoonCoins (MC) balance across all games and wallet

class BalanceManager {
    constructor() {
        this.balance = 0; // MC balance
        this.initialized = false;
        this.subscribers = new Set(); // Components listening to balance changes
        
        // Event listeners cache
        this.eventListeners = new Map();
        
        this.init();
    }
    
    init() {
        console.log('💰 BalanceManager: Initializing centralized MC balance system...');
        
        // Load balance from localStorage if available
        this.loadBalanceFromStorage();
        
        // Setup wallet integration
        this.setupWalletIntegration();
        
        this.initialized = true;
        console.log(`✅ BalanceManager: Initialized with ${this.balance} MC`);
        
        // Emit initial balance to all subscribers
        this.emitBalanceChanged();
    }
    
    loadBalanceFromStorage() {
        try {
            const savedBalance = localStorage.getItem('moonyetis_mc_balance');
            if (savedBalance !== null) {
                this.balance = parseInt(savedBalance) || 0;
                console.log(`💾 Loaded MC balance from storage: ${this.balance} MC`);
            }
        } catch (error) {
            console.warn('⚠️ Could not load balance from storage:', error);
        }
    }
    
    saveBalanceToStorage() {
        try {
            localStorage.setItem('moonyetis_mc_balance', this.balance.toString());
        } catch (error) {
            console.warn('⚠️ Could not save balance to storage:', error);
        }
    }
    
    setupWalletIntegration() {
        // Listen for wallet balance changes (from MY ↔ MC swaps)
        window.addEventListener('mcBalanceUpdatedFromWallet', (e) => {
            const newBalance = e.detail.balance;
            console.log(`🔄 Wallet updated MC balance to: ${newBalance} MC`);
            this.setBalance(newBalance, false); // false = don't save to storage (wallet handles it)
        });
        
        // Listen for wallet disconnection
        window.addEventListener('walletDisconnected', () => {
            console.log('🔌 Wallet disconnected, preserving local MC balance');
            // Keep local balance but stop syncing with wallet
        });
    }
    
    // === CORE BALANCE METHODS ===
    
    getBalance() {
        return this.balance;
    }
    
    setBalance(newBalance, saveToStorage = true, syncWithWallet = true) {
        const oldBalance = this.balance;
        this.balance = Math.max(0, Math.floor(newBalance)); // Ensure non-negative integer
        
        if (saveToStorage) {
            this.saveBalanceToStorage();
        }
        
        console.log(`💰 Balance updated: ${oldBalance} MC → ${this.balance} MC${syncWithWallet ? '' : ' (from wallet)'}`);
        
        // Emit balance change event (with wallet sync control)
        this.emitBalanceChanged(syncWithWallet);
        
        return this.balance;
    }
    
    addBalance(amount, reason = 'Unknown') {
        if (amount <= 0) return this.balance;
        
        const oldBalance = this.balance;
        this.balance += Math.floor(amount);
        
        this.saveBalanceToStorage();
        
        console.log(`💰 Balance increased: +${amount} MC (${reason}) | ${oldBalance} → ${this.balance} MC`);
        
        this.emitBalanceChanged();
        
        return this.balance;
    }
    
    subtractBalance(amount, reason = 'Unknown') {
        if (amount <= 0) return this.balance;
        
        const flooredAmount = Math.floor(amount);
        
        if (flooredAmount > this.balance) {
            console.warn(`⚠️ Insufficient balance: Tried to subtract ${flooredAmount} MC but only have ${this.balance} MC`);
            return false;
        }
        
        const oldBalance = this.balance;
        this.balance -= flooredAmount;
        
        this.saveBalanceToStorage();
        
        console.log(`💰 Balance decreased: -${flooredAmount} MC (${reason}) | ${oldBalance} → ${this.balance} MC`);
        
        this.emitBalanceChanged();
        
        return true;
    }
    
    hasBalance(amount) {
        return this.balance >= Math.floor(amount);
    }
    
    // === EVENT SYSTEM ===
    
    emitBalanceChanged(syncWithWallet = true) {
        const balanceData = {
            balance: this.balance,
            timestamp: Date.now()
        };
        
        // Emit to all games and components
        const event = new CustomEvent('mcBalanceChanged', {
            detail: balanceData
        });
        
        window.dispatchEvent(event);
        
        // 🔄 SYNC WITH WALLET: Update WalletConnectionHub MC balance (only if not coming from wallet)
        if (syncWithWallet && window.walletConnectionModal && window.walletConnectionModal.isUserAuthenticated()) {
            try {
                window.walletConnectionModal.updateUserBalance('MC', this.balance);
                console.log(`🔄 Synced ${this.balance} MC with WalletConnectionHub`);
            } catch (error) {
                console.warn('⚠️ Could not sync MC balance with wallet:', error);
            }
        }
        
        // Also emit to dashboard/wallet for display updates  
        const walletEvent = new CustomEvent('mcBalanceUpdatedForWallet', {
            detail: balanceData
        });
        
        window.dispatchEvent(walletEvent);
        
        console.log(`📢 Emitted mcBalanceChanged: ${this.balance} MC${syncWithWallet ? '' : ' (no wallet sync)'}`);
    }
    
    // === COMPONENT INTEGRATION ===
    
    subscribe(component, callback) {
        if (typeof callback !== 'function') {
            console.error('❌ BalanceManager.subscribe: callback must be a function');
            return;
        }
        
        const subscriberId = `${component}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        this.subscribers.add({
            id: subscriberId,
            component: component,
            callback: callback
        });
        
        // Immediately call with current balance
        callback({
            balance: this.balance,
            timestamp: Date.now()
        });
        
        console.log(`📝 Component '${component}' subscribed to balance changes`);
        
        return subscriberId;
    }
    
    unsubscribe(subscriberId) {
        for (const subscriber of this.subscribers) {
            if (subscriber.id === subscriberId) {
                this.subscribers.delete(subscriber);
                console.log(`📝 Component '${subscriber.component}' unsubscribed from balance changes`);
                return true;
            }
        }
        return false;
    }
    
    // === GAME INTEGRATION HELPERS ===
    
    // For games to register their balance update functions
    registerGame(gameName, updateFunction) {
        if (typeof updateFunction !== 'function') {
            console.error(`❌ registerGame: updateFunction for ${gameName} must be a function`);
            return;
        }
        
        // Remove existing listener if any
        const existingListener = this.eventListeners.get(gameName);
        if (existingListener) {
            window.removeEventListener('mcBalanceChanged', existingListener);
        }
        
        // Create new listener
        const listener = (event) => {
            try {
                updateFunction(event.detail);
            } catch (error) {
                console.error(`❌ Error updating ${gameName} balance:`, error);
            }
        };
        
        // Store and add listener
        this.eventListeners.set(gameName, listener);
        window.addEventListener('mcBalanceChanged', listener);
        
        console.log(`🎮 Game '${gameName}' registered for balance updates`);
        
        // Immediately update with current balance
        updateFunction({
            balance: this.balance,
            timestamp: Date.now()
        });
    }
    
    unregisterGame(gameName) {
        const listener = this.eventListeners.get(gameName);
        if (listener) {
            window.removeEventListener('mcBalanceChanged', listener);
            this.eventListeners.delete(gameName);
            console.log(`🎮 Game '${gameName}' unregistered from balance updates`);
        }
    }
    
    // === DEVELOPMENT & DEBUG ===
    
    getDebugInfo() {
        return {
            balance: this.balance,
            initialized: this.initialized,
            subscribersCount: this.subscribers.size,
            registeredGames: Array.from(this.eventListeners.keys()),
            timestamp: new Date().toISOString()
        };
    }
    
    // For development - simulate balance changes
    simulateEarn(amount, reason = 'Simulation') {
        this.addBalance(amount, reason);
    }
    
    simulateSpend(amount, reason = 'Simulation') {
        return this.subtractBalance(amount, reason);
    }
}

// Create global instance
if (!window.balanceManager) {
    window.balanceManager = new BalanceManager();
    console.log('🌍 Global BalanceManager instance created');
} else {
    console.log('🌍 BalanceManager already exists, using existing instance');
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BalanceManager;
}

console.log('✅ BalanceManager class loaded successfully');