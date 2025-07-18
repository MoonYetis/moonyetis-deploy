// Dashboard Modal - Personal Account Hub for MoonYetis
// Handles user balance, deposits, withdrawals, transactions, and daily rewards

class DashboardModal {
    constructor() {
        this.isOpen = false;
        this.modal = null;
        this.user = null;
        this.connectedWallet = null;
        this.balance = 0;
        this.isDevelopmentMode = window.location.hostname === 'localhost';
        
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
        this.checkAuthState();
        this.loadUserData();
        console.log('✅ Dashboard: Initialization complete');
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
                
                <div class="dashboard-content">
                    <!-- Balance Section -->
                    <div class="dashboard-section balance-section">
                        <div class="section-header">
                            <h3>💰 Your Balance</h3>
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
                    
                    <!-- Deposit Section -->
                    <div class="dashboard-section deposit-section">
                        <div class="section-header">
                            <h3>⬇️ Deposit</h3>
                        </div>
                        
                        <div class="deposit-options">
                            <div class="deposit-option wallet-connect" id="wallet-connect-option">
                                <div class="option-icon">🔗</div>
                                <div class="option-content">
                                    <h4>Connect Wallet</h4>
                                    <p>Connect your Fractal Bitcoin wallet to deposit funds</p>
                                    <div class="wallet-status" id="wallet-status">
                                        <span class="status-indicator disconnected" id="wallet-indicator">●</span>
                                        <span class="status-text" id="wallet-text">No wallet connected</span>
                                    </div>
                                </div>
                                <button class="connect-wallet-btn" id="connect-wallet-btn">Connect Wallet</button>
                            </div>
                            
                            <div class="deposit-forms" id="deposit-forms" style="display: none;">
                                <div class="deposit-form">
                                    <h4>Deposit Fractal Bitcoin</h4>
                                    <div class="form-group">
                                        <label for="deposit-fb-amount">Amount</label>
                                        <input type="number" id="deposit-fb-amount" placeholder="0.00000" step="0.00001">
                                        <span class="input-suffix">FB</span>
                                    </div>
                                    <button class="deposit-btn" id="deposit-fb-btn">Deposit FB</button>
                                </div>
                                
                                <div class="deposit-form">
                                    <h4>Deposit MoonYetis</h4>
                                    <div class="form-group">
                                        <label for="deposit-my-amount">Amount</label>
                                        <input type="number" id="deposit-my-amount" placeholder="0" step="1">
                                        <span class="input-suffix">MY</span>
                                    </div>
                                    <button class="deposit-btn" id="deposit-my-btn">Deposit MY</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Change Section -->
                    <div class="dashboard-section change-section">
                        <div class="section-header">
                            <h3>🔄 Change</h3>
                        </div>
                        
                        <div class="change-options">
                            <div class="change-option">
                                <div class="change-card">
                                    <div class="change-header">
                                        <h4>FB → MC</h4>
                                        <span class="change-rate">1 FB = 67,500 MC</span>
                                    </div>
                                    <div class="change-form">
                                        <div class="form-group">
                                            <label for="fb-to-mc-amount">Amount</label>
                                            <input type="number" id="fb-to-mc-amount" placeholder="0.00000" step="0.00001">
                                            <span class="input-suffix">FB</span>
                                        </div>
                                        <div class="will-receive">
                                            <span>You'll receive: </span>
                                            <span id="fb-to-mc-receive">0 MC</span>
                                        </div>
                                        <button class="change-btn" id="fb-to-mc-btn">Buy MoonCoins</button>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="change-option">
                                <div class="change-card">
                                    <div class="change-header">
                                        <h4>MY → MC</h4>
                                        <span class="change-rate">1 MY = 0.8 MC (+3% bonus)</span>
                                    </div>
                                    <div class="change-form">
                                        <div class="form-group">
                                            <label for="my-to-mc-amount">Amount</label>
                                            <input type="number" id="my-to-mc-amount" placeholder="0" step="1">
                                            <span class="input-suffix">MY</span>
                                        </div>
                                        <div class="will-receive">
                                            <span>You'll receive: </span>
                                            <span id="my-to-mc-receive">0 MC</span>
                                        </div>
                                        <button class="change-btn" id="my-to-mc-btn">Buy MoonCoins</button>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="change-option">
                                <div class="change-card">
                                    <div class="change-header">
                                        <h4>MC → MY</h4>
                                        <span class="change-rate">1 MC = 1.2 MY</span>
                                    </div>
                                    <div class="change-form">
                                        <div class="form-group">
                                            <label for="mc-to-my-amount">Amount</label>
                                            <input type="number" id="mc-to-my-amount" placeholder="0" step="1">
                                            <span class="input-suffix">MC</span>
                                        </div>
                                        <div class="will-receive">
                                            <span>You'll receive: </span>
                                            <span id="mc-to-my-receive">0 MY</span>
                                        </div>
                                        <button class="change-btn" id="mc-to-my-btn">Sell MoonCoins</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Withdrawal Section -->
                    <div class="dashboard-section withdrawal-section">
                        <div class="section-header">
                            <h3>⬆️ Withdraw</h3>
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
        
        // Balance refresh
        this.modal.querySelector('#refresh-balance').addEventListener('click', () => this.refreshBalance());
        
        // Wallet connection
        this.modal.querySelector('#connect-wallet-btn').addEventListener('click', () => this.openWalletConnection());
        
        // Deposit forms
        this.modal.querySelector('#deposit-fb-btn').addEventListener('click', () => this.processDeposit('FB'));
        this.modal.querySelector('#deposit-my-btn').addEventListener('click', () => this.processDeposit('MY'));
        
        // Change forms
        this.modal.querySelector('#fb-to-mc-btn').addEventListener('click', () => this.processChange('FB', 'MC'));
        this.modal.querySelector('#my-to-mc-btn').addEventListener('click', () => this.processChange('MY', 'MC'));
        this.modal.querySelector('#mc-to-my-btn').addEventListener('click', () => this.processChange('MC', 'MY'));
        
        // Change amount calculators
        this.modal.querySelector('#fb-to-mc-amount').addEventListener('input', () => this.updateChangePreview('FB', 'MC'));
        this.modal.querySelector('#my-to-mc-amount').addEventListener('input', () => this.updateChangePreview('MY', 'MC'));
        this.modal.querySelector('#mc-to-my-amount').addEventListener('input', () => this.updateChangePreview('MC', 'MY'));
        
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
    
    checkAuthState() {
        // Check if user is authenticated via wallet
        const walletHub = window.walletConnectionModal;
        if (walletHub && walletHub.isUserAuthenticated()) {
            this.user = walletHub.getCurrentUser();
            this.connectedWallet = walletHub.getConnectedWallet();
            this.updateUserDisplay();
        }
    }
    
    loadUserData() {
        if (!this.user) return;
        
        this.loadBalance();
        this.updateWalletDisplay();
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
        this.loadUserData();
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
    
    // Change methods
    updateChangePreview(fromToken, toToken) {
        const amountInput = this.modal.querySelector(`#${fromToken.toLowerCase()}-to-${toToken.toLowerCase()}-amount`);
        const receiveSpan = this.modal.querySelector(`#${fromToken.toLowerCase()}-to-${toToken.toLowerCase()}-receive`);
        const amount = parseFloat(amountInput.value) || 0;
        
        let rate = 1;
        if (fromToken === 'FB' && toToken === 'MC') {
            rate = 67500;
        } else if (fromToken === 'MY' && toToken === 'MC') {
            rate = 0.8 * 1.03; // 3% bonus
        } else if (fromToken === 'MC' && toToken === 'MY') {
            rate = 1.2;
        }
        
        const willReceive = amount * rate;
        receiveSpan.textContent = `${willReceive.toFixed(fromToken === 'FB' ? 0 : 2)} ${toToken}`;
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
            // Simulate change process
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Calculate exchange
            let rate = 1;
            if (fromToken === 'FB' && toToken === 'MC') {
                rate = 67500;
            } else if (fromToken === 'MY' && toToken === 'MC') {
                rate = 0.8 * 1.03; // 3% bonus
            } else if (fromToken === 'MC' && toToken === 'MY') {
                rate = 1.2;
            }
            
            const willReceive = amount * rate;
            
            // Update balances
            walletHub.updateUserBalance(fromToken, fromBalance - amount);
            walletHub.updateUserBalance(toToken, walletHub.getUserBalance(toToken) + willReceive);
            
            // Clear input
            amountInput.value = '';
            this.updateChangePreview(fromToken, toToken);
            
            alert(`Successfully exchanged ${amount} ${fromToken} for ${willReceive.toFixed(2)} ${toToken}!`);
            
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
    }
    
    updateWalletDisplay() {
        const walletIndicator = this.modal.querySelector('#wallet-indicator');
        const walletText = this.modal.querySelector('#wallet-text');
        const depositForms = this.modal.querySelector('#deposit-forms');
        const withdrawalForms = this.modal.querySelector('#withdrawal-forms');
        const withdrawalDisabled = this.modal.querySelector('#withdrawal-disabled');
        
        if (this.connectedWallet) {
            walletIndicator.className = 'status-indicator connected';
            walletText.textContent = `${this.connectedWallet.name} connected`;
            
            // Show deposit and withdrawal forms
            if (depositForms) depositForms.style.display = 'block';
            if (withdrawalForms) withdrawalForms.style.display = 'block';
            if (withdrawalDisabled) withdrawalDisabled.style.display = 'none';
        } else {
            walletIndicator.className = 'status-indicator disconnected';
            walletText.textContent = 'No wallet connected';
            
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
        
        // Refresh data when opening
        this.loadUserData();
        this.updateWalletDisplay();
    }
    
    close() {
        this.modal.classList.remove('dashboard-visible');
        this.isOpen = false;
        document.body.style.overflow = '';
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
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardModal = new DashboardModal();
});