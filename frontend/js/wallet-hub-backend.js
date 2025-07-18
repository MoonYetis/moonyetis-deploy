// Enhanced Backend Integration for Wallet Hub
// Provides real-time data integration with MoonYetis backend

class WalletHubBackend {
    constructor(walletHub) {
        this.walletHub = walletHub;
        this.apiEndpoints = {
            balance: '/api/balance',
            transactions: '/api/transactions',
            withdraw: '/api/withdraw',
            estimateFee: '/api/estimate-fee',
            prices: '/api/prices'
        };
        this.init();
    }
    
    init() {
        console.log('🔗 Initializing Wallet Hub Backend Integration...');
        
        // Set up real-time updates
        this.setupRealTimeUpdates();
        
        console.log('✅ Backend integration initialized');
    }
    
    // Real-time updates via WebSocket or polling
    setupRealTimeUpdates() {
        // Poll for balance updates every 30 seconds
        setInterval(() => {
            if (this.walletHub.isModalOpen() && this.walletHub.currentTab === 'balance') {
                this.refreshBalanceData();
            }
        }, 30000);
        
        // Poll for transaction updates every 60 seconds
        setInterval(() => {
            if (this.walletHub.isModalOpen() && this.walletHub.currentTab === 'balance') {
                this.refreshTransactionData();
            }
        }, 60000);
    }
    
    // Enhanced balance fetching with caching
    async fetchUserBalance() {
        try {
            const isConnected = this.walletHub.walletManager && 
                               typeof this.walletHub.walletManager.isConnected === 'function' ? 
                               this.walletHub.walletManager.isConnected() : false;
            
            if (!isConnected) return { my: 0, fb: 0 };
            
            const walletAddress = this.walletHub.walletManager.getCurrentAddress();
            const cacheKey = `balance_${walletAddress}`;
            
            // Check cache first (5 minute cache)
            const cachedBalance = this.getCachedData(cacheKey, 300000);
            if (cachedBalance) return cachedBalance;
            
            const response = await fetch(`${this.apiEndpoints.balance}?address=${walletAddress}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                const balance = {
                    my: data.balance.moonyetis || 0,
                    fb: data.balance.fractal || 0
                };
                
                // Cache the result
                this.setCachedData(cacheKey, balance);
                return balance;
            }
            
            return { my: 0, fb: 0 };
        } catch (error) {
            console.warn('Failed to fetch balance:', error);
            return { my: 0, fb: 0 };
        }
    }
    
    // Enhanced transaction history with pagination
    async fetchTransactionHistory(limit = 10, offset = 0) {
        try {
            const isConnected = this.walletHub.walletManager && 
                               typeof this.walletHub.walletManager.isConnected === 'function' ? 
                               this.walletHub.walletManager.isConnected() : false;
            
            if (!isConnected) return [];
            
            const walletAddress = this.walletHub.walletManager.getCurrentAddress();
            const cacheKey = `transactions_${walletAddress}_${limit}_${offset}`;
            
            // Check cache first (2 minute cache)
            const cachedTransactions = this.getCachedData(cacheKey, 120000);
            if (cachedTransactions) return cachedTransactions;
            
            const response = await fetch(`${this.apiEndpoints.transactions}?address=${walletAddress}&limit=${limit}&offset=${offset}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                const transactions = data.transactions.map(tx => ({
                    id: tx.id,
                    type: tx.type,
                    amount: tx.amount,
                    currency: tx.currency,
                    date: new Date(tx.timestamp).toLocaleDateString(),
                    status: tx.status,
                    hash: tx.hash || null,
                    confirmations: tx.confirmations || 0
                }));
                
                // Cache the result
                this.setCachedData(cacheKey, transactions);
                return transactions;
            }
            
            return [];
        } catch (error) {
            console.warn('Failed to fetch transaction history:', error);
            return [];
        }
    }
    
    // Real-time network fee estimation
    async fetchNetworkFee(amount) {
        try {
            const response = await fetch(this.apiEndpoints.estimateFee, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    amount: amount,
                    priority: 'medium' // low, medium, high
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                return {
                    fee: data.fee,
                    congestion: data.congestion || 'medium',
                    estimatedTime: data.estimatedTime || '5-10 min',
                    breakdown: data.breakdown || null
                };
            }
            
            // Fallback to local calculation
            return {
                fee: this.walletHub.calculateNetworkFee(amount),
                congestion: this.walletHub.getNetworkCongestionLevel(new Date().getHours()),
                estimatedTime: this.walletHub.getEstimatedTime(this.walletHub.getNetworkCongestionLevel(new Date().getHours()))
            };
        } catch (error) {
            console.warn('Failed to fetch network fee:', error);
            return {
                fee: this.walletHub.calculateNetworkFee(amount),
                congestion: this.walletHub.getNetworkCongestionLevel(new Date().getHours()),
                estimatedTime: this.walletHub.getEstimatedTime(this.walletHub.getNetworkCongestionLevel(new Date().getHours()))
            };
        }
    }
    
    // Enhanced withdrawal processing
    async processWithdrawal(withdrawalData) {
        try {
            const response = await fetch(this.apiEndpoints.withdraw, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: withdrawalData.amount,
                    address: withdrawalData.address,
                    walletAddress: withdrawalData.walletAddress,
                    timestamp: Date.now(),
                    nonce: Math.random().toString(36).substr(2, 9)
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Clear balance cache
                this.clearCachedData(`balance_${withdrawalData.walletAddress}`);
                
                return {
                    success: true,
                    transactionId: data.transactionId,
                    networkFee: data.networkFee,
                    finalAmount: data.finalAmount,
                    estimatedConfirmation: data.estimatedConfirmation
                };
            } else {
                return {
                    success: false,
                    message: data.message || 'Withdrawal failed'
                };
            }
        } catch (error) {
            console.error('Backend withdrawal error:', error);
            return {
                success: false,
                message: 'Network error. Please try again later.'
            };
        }
    }
    
    // Price fetching with automatic updates
    async fetchPrices() {
        try {
            const cacheKey = 'prices';
            const cachedPrices = this.getCachedData(cacheKey, 300000); // 5 minute cache
            if (cachedPrices) return cachedPrices;
            
            const response = await fetch(this.apiEndpoints.prices, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.setCachedData(cacheKey, data.prices);
                return data.prices;
            }
            
            return {
                fb: 0.00001,
                my: 0.0001
            };
        } catch (error) {
            console.warn('Failed to fetch prices:', error);
            return {
                fb: 0.00001,
                my: 0.0001
            };
        }
    }
    
    // Refresh balance data
    async refreshBalanceData() {
        try {
            const balance = await this.fetchUserBalance();
            
            // Update the wallet hub display
            if (this.walletHub.modal) {
                const myBalanceEl = this.walletHub.modal.querySelector('#my-balance');
                const myBalanceUsdEl = this.walletHub.modal.querySelector('#my-balance-usd');
                const fbBalanceEl = this.walletHub.modal.querySelector('#fb-balance');
                const fbBalanceUsdEl = this.walletHub.modal.querySelector('#fb-balance-usd');
                
                if (myBalanceEl && balance.my !== undefined) {
                    this.walletHub.animateBalanceCounter(myBalanceEl, balance.my, 'MY');
                }
                if (myBalanceUsdEl && this.walletHub.prices) {
                    const usdValue = (balance.my * this.walletHub.prices.my).toFixed(4);
                    myBalanceUsdEl.textContent = `~$${usdValue}`;
                }
                if (fbBalanceEl && balance.fb !== undefined) {
                    const fbAmount = (balance.fb / 100000000).toFixed(8);
                    this.walletHub.animateBalanceCounter(fbBalanceEl, fbAmount, 'FB');
                }
                if (fbBalanceUsdEl && this.walletHub.prices) {
                    const usdValue = (balance.fb * this.walletHub.prices.fb).toFixed(4);
                    fbBalanceUsdEl.textContent = `~$${usdValue}`;
                }
            }
        } catch (error) {
            console.error('Failed to refresh balance data:', error);
        }
    }
    
    // Refresh transaction data
    async refreshTransactionData() {
        try {
            const transactions = await this.fetchTransactionHistory();
            
            // Update the transaction list
            if (this.walletHub.modal) {
                this.walletHub.updateTransactionHistory(transactions);
            }
        } catch (error) {
            console.error('Failed to refresh transaction data:', error);
        }
    }
    
    // Simple cache system
    setCachedData(key, data) {
        const cacheItem = {
            data: data,
            timestamp: Date.now()
        };
        localStorage.setItem(`walletHub_${key}`, JSON.stringify(cacheItem));
    }
    
    getCachedData(key, maxAge) {
        try {
            const cached = localStorage.getItem(`walletHub_${key}`);
            if (!cached) return null;
            
            const cacheItem = JSON.parse(cached);
            if (Date.now() - cacheItem.timestamp > maxAge) {
                localStorage.removeItem(`walletHub_${key}`);
                return null;
            }
            
            return cacheItem.data;
        } catch (error) {
            return null;
        }
    }
    
    clearCachedData(key) {
        localStorage.removeItem(`walletHub_${key}`);
    }
    
    // Clear all cache
    clearAllCache() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('walletHub_')) {
                localStorage.removeItem(key);
            }
        });
    }
}

// Export for use in other modules
window.WalletHubBackend = WalletHubBackend;