// Wallet Flow Controller for MoonYetis Casino
// Manages the complete wallet connection and interaction flow

class WalletFlow {
    constructor() {
        this.walletManager = null;
        this.walletModal = null;
        this.isInitialized = false;
        this.autoConnectAttempted = false;
        this.depositAddress = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'; // House wallet
        this.init();
    }

    async init() {
        if (this.isInitialized) return;

        // Initialize wallet manager
        this.walletManager = new WalletManager();
        
        // Override wallet manager events
        this.walletManager.onWalletConnected = () => this.handleWalletConnected();
        this.walletManager.onWalletDisconnected = () => this.handleWalletDisconnected();
        this.walletManager.onAccountChanged = () => this.handleAccountChanged();
        this.walletManager.onNetworkChanged = () => this.handleNetworkChanged();

        // Initialize wallet modal
        this.walletModal = new WalletModal(this.walletManager);

        // Set up UI event listeners
        this.setupUIEventListeners();

        // Try to auto-connect to previously connected wallet
        this.attemptAutoConnect();

        this.isInitialized = true;
        
        // Make instances globally available
        window.walletManager = this.walletManager;
        window.walletModal = this.walletModal;
        window.walletFlow = this;
    }

    setupUIEventListeners() {
        // Connect wallet button
        const connectBtn = document.getElementById('connect-wallet');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                this.showWalletModal();
            });
        }

        // Disconnect wallet button
        const disconnectBtn = document.getElementById('disconnect-wallet');
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => {
                this.disconnectWallet();
            });
        }

        // Deposit button
        const depositBtn = document.getElementById('deposit-btn');
        if (depositBtn) {
            depositBtn.addEventListener('click', () => {
                this.showDepositModal();
            });
        }

        // Withdraw button
        const withdrawBtn = document.getElementById('withdraw-btn');
        if (withdrawBtn) {
            withdrawBtn.addEventListener('click', () => {
                this.showWithdrawModal();
            });
        }

        // Refresh balance button
        const refreshBtn = document.getElementById('refresh-balance');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshBalance();
            });
        }
    }

    attemptAutoConnect() {
        if (this.autoConnectAttempted) return;
        
        const savedWallet = localStorage.getItem('moonyetis_connected_wallet');
        if (savedWallet) {
            const availableWallets = this.walletManager.getAvailableWallets();
            const wallet = availableWallets.find(w => w.id === savedWallet);
            
            if (wallet) {
                // Attempt silent connection
                this.walletManager.connectWallet(savedWallet)
                    .then(result => {
                        if (result.success) {
                            console.log('Auto-connected to', savedWallet);
                        } else {
                            localStorage.removeItem('moonyetis_connected_wallet');
                        }
                    })
                    .catch(error => {
                        console.log('Auto-connect failed:', error);
                        localStorage.removeItem('moonyetis_connected_wallet');
                    });
            }
        }
        
        this.autoConnectAttempted = true;
    }

    showWalletModal() {
        this.walletModal.open({
            onConnect: (result) => {
                this.handleWalletConnected();
                // Save connected wallet for auto-connect
                localStorage.setItem('moonyetis_connected_wallet', result.wallet);
            },
            onClose: () => {
                console.log('Wallet modal closed');
            }
        });
    }

    disconnectWallet() {
        this.walletManager.disconnect();
        localStorage.removeItem('moonyetis_connected_wallet');
    }

    handleWalletConnected() {
        console.log('Wallet connected successfully');
        this.updateUI();
        this.showNotification('Wallet connected successfully!', 'success');
    }

    handleWalletDisconnected() {
        console.log('Wallet disconnected');
        this.updateUI();
        this.showNotification('Wallet disconnected', 'info');
    }

    handleAccountChanged() {
        console.log('Account changed');
        this.updateUI();
        this.showNotification('Account changed', 'info');
    }

    handleNetworkChanged() {
        console.log('Network changed');
        this.updateUI();
        this.showNotification('Network changed', 'info');
    }

    updateUI() {
        const isConnected = this.walletManager.isConnected();
        
        // Update connect/disconnect buttons
        const connectBtn = document.getElementById('connect-wallet');
        const disconnectBtn = document.getElementById('disconnect-wallet');
        const walletInfo = document.getElementById('wallet-info');
        
        if (connectBtn) {
            connectBtn.style.display = isConnected ? 'none' : 'block';
        }
        
        if (disconnectBtn) {
            disconnectBtn.style.display = isConnected ? 'block' : 'none';
        }

        // Update wallet info display
        if (walletInfo) {
            if (isConnected) {
                const address = this.walletManager.getCurrentAddress();
                const balance = this.walletManager.getCurrentBalance();
                const walletName = this.walletManager.getCurrentWallet();
                
                walletInfo.innerHTML = `
                    <div class="wallet-connected">
                        <div class="wallet-header">
                            <span class="wallet-name">${walletName}</span>
                            <span class="wallet-status">Connected</span>
                        </div>
                        <div class="wallet-address">${this.walletManager.formatAddress(address)}</div>
                        <div class="wallet-balance">
                            Balance: ${this.walletManager.formatSats(balance)} BTC
                        </div>
                    </div>
                `;
                walletInfo.style.display = 'block';
            } else {
                walletInfo.style.display = 'none';
            }
        }

        // Update deposit/withdraw buttons
        const depositBtn = document.getElementById('deposit-btn');
        const withdrawBtn = document.getElementById('withdraw-btn');
        
        if (depositBtn) {
            depositBtn.disabled = !isConnected;
        }
        
        if (withdrawBtn) {
            withdrawBtn.disabled = !isConnected;
        }
    }

    async refreshBalance() {
        if (!this.walletManager.isConnected()) return;
        
        try {
            this.showNotification('Refreshing balance...', 'info');
            await this.walletManager.updateBalance();
            this.updateUI();
            this.showNotification('Balance updated', 'success');
        } catch (error) {
            this.showNotification('Failed to refresh balance', 'error');
        }
    }

    showDepositModal() {
        if (!this.walletManager.isConnected()) {
            this.showWalletModal();
            return;
        }

        // Create deposit modal
        const modal = document.createElement('div');
        modal.className = 'deposit-modal-overlay';
        modal.innerHTML = `
            <div class="deposit-modal">
                <div class="modal-header">
                    <h2>Deposit BTC</h2>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-content">
                    <p>Send BTC to this address to deposit:</p>
                    <div class="deposit-address">
                        <input type="text" value="${this.depositAddress}" readonly>
                        <button class="copy-btn">Copy</button>
                    </div>
                    <div class="deposit-qr">
                        <img src="images/deposit-qr.png" alt="Deposit QR Code">
                    </div>
                    <div class="deposit-warning">
                        ⚠️ Only send BTC to this address. Other tokens will be lost.
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.querySelector('.copy-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(this.depositAddress);
            this.showNotification('Address copied to clipboard', 'success');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    showWithdrawModal() {
        if (!this.walletManager.isConnected()) {
            this.showWalletModal();
            return;
        }

        // Create withdraw modal
        const modal = document.createElement('div');
        modal.className = 'withdraw-modal-overlay';
        modal.innerHTML = `
            <div class="withdraw-modal">
                <div class="modal-header">
                    <h2>Withdraw BTC</h2>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-content">
                    <div class="withdraw-form">
                        <div class="form-group">
                            <label>Amount (BTC)</label>
                            <input type="number" id="withdraw-amount" placeholder="0.00000000" step="0.00000001">
                        </div>
                        <div class="form-group">
                            <label>To Address</label>
                            <input type="text" id="withdraw-address" placeholder="bc1...">
                        </div>
                        <button class="withdraw-btn" id="execute-withdraw">Withdraw</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.querySelector('#execute-withdraw').addEventListener('click', () => {
            this.executeWithdraw(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    async executeWithdraw(modal) {
        const amount = parseFloat(document.getElementById('withdraw-amount').value);
        const address = document.getElementById('withdraw-address').value;

        if (!amount || amount <= 0) {
            this.showNotification('Please enter a valid amount', 'error');
            return;
        }

        if (!address) {
            this.showNotification('Please enter a valid address', 'error');
            return;
        }

        try {
            this.showNotification('Processing withdrawal...', 'info');
            const result = await this.walletManager.sendTransaction(address, Math.round(amount * 100000000));
            
            if (result.success) {
                this.showNotification('Withdrawal successful!', 'success');
                document.body.removeChild(modal);
                this.refreshBalance();
            } else {
                this.showNotification(`Withdrawal failed: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showNotification(`Withdrawal failed: ${error.message}`, 'error');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => {
            notification.classList.add('notification-show');
        }, 100);

        // Hide notification
        setTimeout(() => {
            notification.classList.remove('notification-show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Public methods for external access
    getWalletManager() {
        return this.walletManager;
    }

    getWalletModal() {
        return this.walletModal;
    }

    isWalletConnected() {
        return this.walletManager ? this.walletManager.isConnected() : false;
    }

    getCurrentAddress() {
        return this.walletManager ? this.walletManager.getCurrentAddress() : null;
    }

    getCurrentBalance() {
        return this.walletManager ? this.walletManager.getCurrentBalance() : 0;
    }
}

// Initialize wallet flow when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.walletFlow = new WalletFlow();
});

// Export for use in other modules
window.WalletFlow = WalletFlow;