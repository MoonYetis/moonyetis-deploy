// Wallet Store Integration - Connects wallet system with MoonCoins Store
console.log('🏪 Wallet Store Integration Loading...');

// Initialize Store Modal when wallet is ready
let storeModal = null;

// Initialize the store modal after wallet manager is ready
function initializeStoreModal() {
    if (window.walletManager && !storeModal) {
        storeModal = new StoreModal(window.walletManager);
        window.storeModal = storeModal; // Make it globally accessible
        console.log('✅ Store Modal initialized');
    }
}

// Replace deposit tab with store tab
function replaceDepositWithStore() {
    // Update tab button
    const depositTab = document.querySelector('[data-tab="deposit"]');
    if (depositTab) {
        depositTab.setAttribute('data-tab', 'store');
        depositTab.innerHTML = '🏪 Store';
        depositTab.title = 'MoonCoins Store';
    }
    
    // Update tab content
    const depositContent = document.getElementById('deposit-tab');
    if (depositContent) {
        depositContent.id = 'store-tab';
        depositContent.innerHTML = `
            <div class="store-section">
                <div class="store-welcome">
                    <h3>🏪 MoonCoins Store</h3>
                    <p>Purchase MoonCoins to play at MoonYetis Casino!</p>
                    <div class="store-features">
                        <div class="store-feature">
                            <span class="feature-icon">💰</span>
                            <span class="feature-text">100 MoonCoins = $1 USD</span>
                        </div>
                        <div class="store-feature">
                            <span class="feature-icon">🎁</span>
                            <span class="feature-text">3% bonus when paying with MY tokens!</span>
                        </div>
                        <div class="store-feature">
                            <span class="feature-icon">⚡</span>
                            <span class="feature-text">Instant delivery after confirmation</span>
                        </div>
                    </div>
                    <button class="store-open-btn" id="openStoreBtn">
                        <span class="btn-icon">🛒</span>
                        <span class="btn-text">Open Store</span>
                    </button>
                </div>
                
                <div class="store-balance-info">
                    <h4>Your MoonCoins Balance</h4>
                    <div class="mooncoins-balance" id="mooncoinsBalance">0 MoonCoins</div>
                    <p class="balance-note">Use MoonCoins to play slots and other games!</p>
                </div>
                
                <div class="recent-purchases" id="recentPurchases">
                    <h4>Recent Purchases</h4>
                    <div class="purchases-list" id="purchasesList">
                        <p class="no-purchases">No purchases yet</p>
                    </div>
                </div>
            </div>
        `;
    }
}

// Handle store button click
function setupStoreEventListeners() {
    // Store button in wallet panel
    document.addEventListener('click', (e) => {
        if (e.target.id === 'openStoreBtn' || e.target.closest('#openStoreBtn')) {
            e.preventDefault();
            if (storeModal) {
                storeModal.open();
            } else {
                console.error('Store modal not initialized');
            }
        }
    });
    
    // Update tab switching to handle store tab
    const originalTabSwitch = window.switchWalletTab;
    if (originalTabSwitch) {
        window.switchWalletTab = function(tabName) {
            // Call original function
            originalTabSwitch(tabName);
            
            // If switching to store tab, update purchase history
            if (tabName === 'store') {
                updatePurchaseHistory();
            }
        };
    }
}

// Update purchase history in store tab
async function updatePurchaseHistory() {
    if (!window.walletManager || !window.walletManager.currentAddress) {
        return;
    }
    
    try {
        const response = await fetch(window.frontendConfig.getStoreEndpoints().transactions(window.walletManager.currentAddress));
        if (response.ok) {
            const data = await response.json();
            displayPurchaseHistory(data.transactions);
        }
    } catch (error) {
        console.error('Failed to fetch purchase history:', error);
    }
}

// Display purchase history
function displayPurchaseHistory(transactions) {
    const purchasesList = document.getElementById('purchasesList');
    if (!purchasesList) return;
    
    if (transactions.length === 0) {
        purchasesList.innerHTML = '<p class="no-purchases">No purchases yet</p>';
        return;
    }
    
    const recentTransactions = transactions.slice(0, 5); // Show last 5
    purchasesList.innerHTML = recentTransactions.map(tx => `
        <div class="purchase-item ${tx.status}">
            <div class="purchase-info">
                <span class="purchase-pack">${tx.packName}</span>
                <span class="purchase-amount">${tx.mooncoins} MoonCoins</span>
            </div>
            <div class="purchase-details">
                <span class="purchase-method">${tx.currency}</span>
                <span class="purchase-status status-${tx.status}">${tx.status}</span>
            </div>
            <div class="purchase-date">${new Date(tx.createdAt).toLocaleString()}</div>
        </div>
    `).join('');
}

// Update MoonCoins balance display
async function updateMoonCoinsBalance() {
    if (!window.walletManager || !window.walletManager.currentAddress) {
        return;
    }
    
    try {
        const response = await fetch(window.frontendConfig.getStoreEndpoints().balance(window.walletManager.currentAddress));
        if (response.ok) {
            const data = await response.json();
            const balanceElement = document.getElementById('mooncoinsBalance');
            if (balanceElement) {
                balanceElement.textContent = `${data.balance.toLocaleString()} MoonCoins`;
            }
            
            // Update game balance if available
            if (window.gameState) {
                window.gameState.balance = data.balance;
                if (window.updateUI) {
                    window.updateUI();
                }
            }
        }
    } catch (error) {
        console.error('Failed to fetch MoonCoins balance:', error);
    }
}

// Hook into wallet connection events
function setupWalletHooks() {
    // Override or extend wallet connection success
    const originalOnConnect = window.onWalletConnected;
    window.onWalletConnected = function(wallet) {
        // Call original if exists
        if (originalOnConnect) {
            originalOnConnect(wallet);
        }
        
        // Update MoonCoins balance
        updateMoonCoinsBalance();
    };
    
    // Periodic balance updates
    setInterval(() => {
        if (window.walletManager && window.walletManager.isConnected) {
            updateMoonCoinsBalance();
        }
    }, 30000); // Every 30 seconds
}

// Add custom styles for store section
function addStoreStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .store-section {
            padding: 20px;
        }
        
        .store-welcome {
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(0, 0, 0, 0.3) 100%);
            border: 2px solid rgba(255, 215, 0, 0.3);
            border-radius: 15px;
            padding: 25px;
            text-align: center;
            margin-bottom: 20px;
        }
        
        .store-welcome h3 {
            color: #FFD700;
            font-size: 24px;
            margin-bottom: 10px;
        }
        
        .store-welcome p {
            color: rgba(255, 255, 255, 0.8);
            margin-bottom: 20px;
        }
        
        .store-features {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin: 20px 0;
            flex-wrap: wrap;
        }
        
        .store-feature {
            display: flex;
            align-items: center;
            gap: 8px;
            color: rgba(255, 255, 255, 0.8);
        }
        
        .feature-icon {
            font-size: 20px;
        }
        
        .store-open-btn {
            background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
            color: #000;
            border: none;
            border-radius: 10px;
            padding: 15px 40px;
            font-size: 18px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            margin-top: 20px;
        }
        
        .store-open-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(255, 215, 0, 0.4);
        }
        
        .store-balance-info {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .mooncoins-balance {
            color: #FFD700;
            font-size: 32px;
            font-weight: 800;
            margin: 10px 0;
            text-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
        }
        
        .balance-note {
            color: rgba(255, 255, 255, 0.6);
            font-size: 14px;
        }
        
        .recent-purchases {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 10px;
            padding: 20px;
        }
        
        .recent-purchases h4 {
            color: #FFD700;
            margin-bottom: 15px;
        }
        
        .purchase-item {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            border: 1px solid rgba(255, 215, 0, 0.2);
        }
        
        .purchase-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        
        .purchase-pack {
            color: #FFD700;
            font-weight: 600;
        }
        
        .purchase-amount {
            color: #FFFFFF;
            font-weight: 700;
        }
        
        .purchase-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
        }
        
        .purchase-method {
            color: rgba(255, 255, 255, 0.6);
            font-size: 14px;
        }
        
        .purchase-status {
            font-size: 12px;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 600;
        }
        
        .status-completed {
            background: #4CAF50;
            color: white;
        }
        
        .status-pending {
            background: #FF9800;
            color: white;
        }
        
        .status-expired {
            background: #666;
            color: white;
        }
        
        .purchase-date {
            color: rgba(255, 255, 255, 0.5);
            font-size: 12px;
            text-align: right;
        }
        
        .no-purchases {
            text-align: center;
            color: rgba(255, 255, 255, 0.5);
            padding: 20px;
        }
    `;
    document.head.appendChild(style);
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏪 Initializing Store Integration...');
    
    // Add store styles
    addStoreStyles();
    
    // Replace deposit with store
    replaceDepositWithStore();
    
    // Initialize store modal
    setTimeout(() => {
        initializeStoreModal();
        setupStoreEventListeners();
        setupWalletHooks();
    }, 1000); // Give wallet manager time to initialize
    
    console.log('✅ Store Integration initialized');
});

// Export functions for external use
window.updateMoonCoinsBalance = updateMoonCoinsBalance;
window.updatePurchaseHistory = updatePurchaseHistory;