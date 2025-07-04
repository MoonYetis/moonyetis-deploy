// Wallet Modal Component for MoonYetis Casino
// Handles wallet selection and connection UI

class WalletModal {
    constructor(walletManager) {
        this.walletManager = walletManager;
        this.isOpen = false;
        this.modal = null;
        this.onConnect = null;
        this.onClose = null;
        this.init();
    }

    init() {
        this.createModal();
        this.setupEventListeners();
    }

    createModal() {
        // Create modal overlay
        this.modal = document.createElement('div');
        this.modal.id = 'wallet-modal';
        this.modal.className = 'wallet-modal-overlay';
        this.modal.innerHTML = `
            <div class="wallet-modal">
                <div class="wallet-modal-header">
                    <h2>Connect Your Wallet</h2>
                    <button class="wallet-modal-close" id="wallet-modal-close">×</button>
                </div>
                <div class="wallet-modal-content">
                    <p class="wallet-modal-description">
                        Choose your preferred wallet to connect to MoonYetis Casino
                    </p>
                    <div class="wallet-list" id="wallet-list">
                        <!-- Wallets will be populated here -->
                    </div>
                    <div class="wallet-modal-footer">
                        <p class="wallet-modal-info">
                            <span class="info-icon">ℹ️</span>
                            Make sure you're on the Fractal Bitcoin network
                        </p>
                    </div>
                </div>
                <div class="wallet-modal-loading" id="wallet-modal-loading" style="display: none;">
                    <div class="loading-spinner"></div>
                    <p>Connecting wallet...</p>
                </div>
            </div>
        `;

        // Add to body but keep hidden
        document.body.appendChild(this.modal);
    }

    setupEventListeners() {
        // Close modal when clicking overlay
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Close modal when clicking close button
        const closeBtn = this.modal.querySelector('#wallet-modal-close');
        closeBtn.addEventListener('click', () => {
            this.close();
        });

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    open(options = {}) {
        if (this.isOpen) return;

        this.onConnect = options.onConnect || null;
        this.onClose = options.onClose || null;

        this.populateWallets();
        this.modal.style.display = 'flex';
        this.isOpen = true;

        // Add body class to prevent scrolling
        document.body.classList.add('wallet-modal-open');

        // Animate in
        setTimeout(() => {
            this.modal.classList.add('wallet-modal-visible');
        }, 10);
    }

    close() {
        if (!this.isOpen) return;

        this.modal.classList.remove('wallet-modal-visible');
        this.isOpen = false;

        // Remove body class
        document.body.classList.remove('wallet-modal-open');

        // Hide modal after animation
        setTimeout(() => {
            this.modal.style.display = 'none';
            this.hideLoading();
        }, 300);

        if (this.onClose) {
            this.onClose();
        }
    }

    populateWallets() {
        const walletList = this.modal.querySelector('#wallet-list');
        const availableWallets = this.walletManager.getAvailableWallets();
        
        walletList.innerHTML = '';

        if (availableWallets.length === 0) {
            walletList.innerHTML = `
                <div class="no-wallets">
                    <div class="no-wallets-icon">🚫</div>
                    <h3>No Wallets Detected</h3>
                    <p>Please install a supported wallet extension:</p>
                    <div class="wallet-install-links">
                        <a href="https://unisat.io/" target="_blank" class="install-link">
                            <span class="install-icon">🦄</span>
                            Install UniSat
                        </a>
                        <a href="https://www.okx.com/web3" target="_blank" class="install-link">
                            <span class="install-icon">🌟</span>
                            Install OKX
                        </a>
                        <a href="https://www.bybit.com/web3/" target="_blank" class="install-link">
                            <span class="install-icon">💎</span>
                            Install Bybit
                        </a>
                        <a href="https://web3.bitget.com/" target="_blank" class="install-link">
                            <span class="install-icon">🚀</span>
                            Install Bitget
                        </a>
                    </div>
                </div>
            `;
            return;
        }

        availableWallets.forEach(wallet => {
            const walletItem = document.createElement('div');
            walletItem.className = 'wallet-item';
            walletItem.innerHTML = `
                <div class="wallet-icon">${wallet.icon}</div>
                <div class="wallet-info">
                    <h3>${wallet.name}</h3>
                    <p>Connect with ${wallet.name}</p>
                </div>
                <div class="wallet-status">
                    <span class="status-dot status-available"></span>
                    <span class="status-text">Available</span>
                </div>
            `;

            walletItem.addEventListener('click', () => {
                this.connectWallet(wallet.id);
            });

            walletList.appendChild(walletItem);
        });
    }

    async connectWallet(walletId) {
        this.showLoading();

        try {
            const result = await this.walletManager.connectWallet(walletId);
            
            if (result.success) {
                this.showSuccess(result);
                setTimeout(() => {
                    this.close();
                    if (this.onConnect) {
                        this.onConnect(result);
                    }
                }, 1500);
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            this.showError(error.message);
        }
    }

    showLoading() {
        const loading = this.modal.querySelector('#wallet-modal-loading');
        const content = this.modal.querySelector('.wallet-modal-content');
        
        content.style.display = 'none';
        loading.style.display = 'flex';
    }

    hideLoading() {
        const loading = this.modal.querySelector('#wallet-modal-loading');
        const content = this.modal.querySelector('.wallet-modal-content');
        
        loading.style.display = 'none';
        content.style.display = 'block';
    }

    showSuccess(result) {
        const loading = this.modal.querySelector('#wallet-modal-loading');
        loading.innerHTML = `
            <div class="success-icon">✅</div>
            <h3>Wallet Connected!</h3>
            <p>Successfully connected to ${result.wallet}</p>
            <p class="success-address">${this.walletManager.formatAddress(result.address)}</p>
        `;
    }

    showError(error) {
        const loading = this.modal.querySelector('#wallet-modal-loading');
        loading.innerHTML = `
            <div class="error-icon">❌</div>
            <h3>Connection Failed</h3>
            <p>${error}</p>
            <button class="retry-btn" onclick="walletModal.hideLoading()">Try Again</button>
        `;
    }

    // Update wallet list when wallets are detected
    updateWalletList() {
        if (this.isOpen) {
            this.populateWallets();
        }
    }

    // Helper method to check if modal is open
    isModalOpen() {
        return this.isOpen;
    }
}

// Auto-detect wallet changes
setInterval(() => {
    if (window.walletManager && window.walletModal) {
        window.walletManager.detectWallets();
        window.walletModal.updateWalletList();
    }
}, 2000);

// Export for use in other modules
window.WalletModal = WalletModal;