// Store Modal Component for MoonYetis Casino
// Handles MoonCoins store UI and purchase flow

class StoreModal {
    constructor(walletManager) {
        this.walletManager = walletManager;
        this.isOpen = false;
        this.modal = null;
        this.selectedPack = null;
        this.selectedPaymentMethod = null;
        this.packs = [
            {
                id: 'pack1',
                name: 'Starter Pack',
                icon: '🌙',
                mooncoins: 300,
                usdPrice: 3.00
            },
            {
                id: 'pack2',
                name: 'Player Pack',
                icon: '⭐',
                mooncoins: 600,
                usdPrice: 6.00
            },
            {
                id: 'pack3',
                name: 'Pro Pack',
                icon: '🚀',
                mooncoins: 1200,
                usdPrice: 12.00
            }
        ];
        this.paymentMethods = [
            {
                id: 'fb',
                name: 'Fractal Bitcoin',
                icon: '₿',
                bonus: 0
            },
            {
                id: 'my',
                name: 'MoonYetis',
                icon: '🌙',
                bonus: 3 // 3% bonus
            }
        ];
        this.prices = {
            fb: 0.00001, // Default price, will be updated dynamically
            my: 0.0001   // Default price, will be updated dynamically
        };
        this.init();
    }

    init() {
        this.createModal();
        this.setupEventListeners();
        this.updatePrices(); // Initial price fetch
        // Update prices every 30 seconds
        setInterval(() => this.updatePrices(), 30000);
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'store-modal';
        this.modal.className = 'store-modal-overlay';
        this.modal.style.display = 'none';
        document.body.appendChild(this.modal);
        this.renderModal();
    }

    renderModal() {
        this.modal.innerHTML = `
            <div class="store-modal">
                <div class="store-modal-header">
                    <h2>MoonCoins Store</h2>
                    <button class="store-modal-close" id="store-modal-close">×</button>
                </div>
                <div class="store-modal-content">
                    <p class="store-modal-description">
                        Purchase MoonCoins to play at MoonYetis Casino!<br>
                        100 MoonCoins = $1 USD
                    </p>
                    
                    <div class="mooncoins-packs" id="mooncoins-packs">
                        ${this.renderPacks()}
                    </div>
                    
                    <div class="payment-section" id="payment-section">
                        <h3>Select Payment Method</h3>
                        <div class="payment-methods" id="payment-methods">
                            ${this.renderPaymentMethods()}
                        </div>
                        <button class="purchase-button" id="purchase-button" disabled>
                            Select Pack & Payment Method
                        </button>
                    </div>
                </div>
                <div class="store-modal-footer">
                    <p class="store-modal-info">
                        <span class="info-icon">ℹ️</span>
                        Prices update automatically based on current market rates
                    </p>
                </div>
                <div class="store-modal-loading" id="store-modal-loading" style="display: none;">
                    <div class="loading-spinner"></div>
                    <p>Processing your purchase...</p>
                </div>
            </div>
        `;
    }

    renderPacks() {
        return this.packs.map(pack => `
            <div class="pack-card" data-pack-id="${pack.id}">
                <div class="pack-icon">${pack.icon}</div>
                <h3 class="pack-name">${pack.name}</h3>
                <div class="pack-amount">${pack.mooncoins}</div>
                <div class="pack-coins-label">MoonCoins</div>
                <div class="pack-price">
                    <div class="pack-usd-price">$${pack.usdPrice.toFixed(2)} USD</div>
                    <div class="pack-crypto-prices" id="pack-${pack.id}-prices">
                        ${this.renderPackPrices(pack)}
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderPackPrices(pack) {
        const fbPrice = (pack.usdPrice / this.prices.fb).toFixed(8);
        const myPrice = (pack.usdPrice / this.prices.my).toFixed(2);
        const myBonus = Math.floor(pack.mooncoins * 0.03);
        
        return `
            <div class="crypto-price">
                <span class="currency">FB</span>
                <span class="amount">${fbPrice} FB</span>
            </div>
            <div class="crypto-price">
                <span class="currency">MY</span>
                <span class="amount">${myPrice} MY</span>
                ${myBonus > 0 ? `<span class="payment-method-bonus">+${myBonus} bonus</span>` : ''}
            </div>
        `;
    }

    renderPaymentMethods() {
        return this.paymentMethods.map(method => `
            <div class="payment-method" data-method-id="${method.id}">
                <span class="payment-method-icon">${method.icon}</span>
                <span class="payment-method-name">${method.name}</span>
                ${method.bonus > 0 ? `<span class="payment-method-bonus">+${method.bonus}%</span>` : ''}
            </div>
        `).join('');
    }

    setupEventListeners() {
        // Close modal
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal || e.target.id === 'store-modal-close') {
                this.close();
            }
        });

        // Pack selection
        this.modal.addEventListener('click', (e) => {
            const packCard = e.target.closest('.pack-card');
            if (packCard) {
                this.selectPack(packCard.dataset.packId);
            }
        });

        // Payment method selection
        this.modal.addEventListener('click', (e) => {
            const paymentMethod = e.target.closest('.payment-method');
            if (paymentMethod) {
                this.selectPaymentMethod(paymentMethod.dataset.methodId);
            }
        });

        // Purchase button
        this.modal.addEventListener('click', (e) => {
            if (e.target.id === 'purchase-button' && !e.target.disabled) {
                this.processPurchase();
            }
        });

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    selectPack(packId) {
        // Remove previous selection
        this.modal.querySelectorAll('.pack-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Add selection to clicked pack
        const selectedCard = this.modal.querySelector(`[data-pack-id="${packId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
            this.selectedPack = this.packs.find(p => p.id === packId);
            this.updatePurchaseButton();
        }
    }

    selectPaymentMethod(methodId) {
        // Remove previous selection
        this.modal.querySelectorAll('.payment-method').forEach(method => {
            method.classList.remove('selected');
        });
        
        // Add selection to clicked method
        const selectedMethod = this.modal.querySelector(`[data-method-id="${methodId}"]`);
        if (selectedMethod) {
            selectedMethod.classList.add('selected');
            this.selectedPaymentMethod = this.paymentMethods.find(m => m.id === methodId);
            this.updatePurchaseButton();
        }
    }

    updatePurchaseButton() {
        const button = this.modal.querySelector('#purchase-button');
        if (this.selectedPack && this.selectedPaymentMethod) {
            button.disabled = false;
            const bonus = this.selectedPaymentMethod.bonus;
            const totalCoins = this.selectedPack.mooncoins + Math.floor(this.selectedPack.mooncoins * bonus / 100);
            button.textContent = `Purchase ${totalCoins} MoonCoins`;
        } else {
            button.disabled = true;
            button.textContent = 'Select Pack & Payment Method';
        }
    }

    async updatePrices() {
        try {
            // Fetch current prices from backend
            const response = await fetch(window.frontendConfig.getStoreEndpoints().prices);
            if (response.ok) {
                const data = await response.json();
                this.prices = data.prices;
                
                // Update displayed prices if modal is open
                if (this.isOpen) {
                    this.packs.forEach(pack => {
                        const pricesDiv = this.modal.querySelector(`#pack-${pack.id}-prices`);
                        if (pricesDiv) {
                            pricesDiv.innerHTML = this.renderPackPrices(pack);
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Failed to update prices:', error);
        }
    }

    async processPurchase() {
        if (!this.selectedPack || !this.selectedPaymentMethod) {
            return;
        }

        // Check wallet connection
        if (!this.walletManager.isConnected) {
            alert('Please connect your wallet first');
            this.close();
            return;
        }

        this.showLoading();

        try {
            const purchaseData = {
                packId: this.selectedPack.id,
                paymentMethod: this.selectedPaymentMethod.id,
                userWallet: this.walletManager.currentAddress,
                expectedCoins: this.selectedPack.mooncoins + Math.floor(this.selectedPack.mooncoins * this.selectedPaymentMethod.bonus / 100)
            };

            // Get payment address and amount from backend
            const response = await fetch(window.frontendConfig.getStoreEndpoints().purchase, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(purchaseData)
            });

            if (response.ok) {
                const result = await response.json();
                this.showPaymentInstructions(result);
            } else {
                throw new Error('Failed to process purchase');
            }
        } catch (error) {
            this.showError(error.message);
        }
    }

    showPaymentInstructions(paymentInfo) {
        const loading = this.modal.querySelector('#store-modal-loading');
        loading.innerHTML = `
            <div class="payment-instructions">
                <h3>Complete Your Purchase</h3>
                <p>Send exactly <strong>${paymentInfo.amount} ${paymentInfo.currency}</strong> to:</p>
                <div class="payment-address">
                    <code>${paymentInfo.address}</code>
                    <button onclick="navigator.clipboard.writeText('${paymentInfo.address}')">📋 Copy</button>
                </div>
                <p>Your ${paymentInfo.expectedCoins} MoonCoins will be credited after confirmation.</p>
                <button class="purchase-button" onclick="storeModal.checkPaymentStatus('${paymentInfo.orderId}')">
                    Check Payment Status
                </button>
                <button class="purchase-button" onclick="storeModal.hideLoading()">
                    Back
                </button>
            </div>
        `;
    }

    async checkPaymentStatus(orderId) {
        try {
            const response = await fetch(window.frontendConfig.getStoreEndpoints().order(orderId));
            if (response.ok) {
                const order = await response.json();
                if (order.status === 'completed') {
                    this.showSuccess(order);
                } else {
                    alert(`Order status: ${order.status}`);
                }
            }
        } catch (error) {
            this.showError('Failed to check payment status');
        }
    }

    showLoading() {
        const loading = this.modal.querySelector('#store-modal-loading');
        const content = this.modal.querySelector('.store-modal-content');
        content.style.display = 'none';
        loading.style.display = 'flex';
    }

    hideLoading() {
        const loading = this.modal.querySelector('#store-modal-loading');
        const content = this.modal.querySelector('.store-modal-content');
        loading.style.display = 'none';
        content.style.display = 'block';
        // Reset loading content
        loading.innerHTML = `
            <div class="loading-spinner"></div>
            <p>Processing your purchase...</p>
        `;
    }

    showSuccess(order) {
        const loading = this.modal.querySelector('#store-modal-loading');
        loading.innerHTML = `
            <div class="success-animation">✅</div>
            <h3>Purchase Successful!</h3>
            <p>${order.mooncoins} MoonCoins have been added to your account.</p>
            <p>Transaction ID: ${order.transactionId}</p>
        `;
        
        setTimeout(() => {
            this.close();
            // Refresh balance or trigger balance update
            if (window.updateBalance) {
                window.updateBalance();
            }
        }, 3000);
    }

    showError(message) {
        const loading = this.modal.querySelector('#store-modal-loading');
        loading.innerHTML = `
            <div class="error-icon">❌</div>
            <h3>Purchase Failed</h3>
            <p>${message}</p>
            <button class="purchase-button" onclick="storeModal.hideLoading()">Try Again</button>
        `;
    }

    open() {
        if (this.isOpen) return;
        
        // Reset selections
        this.selectedPack = null;
        this.selectedPaymentMethod = null;
        this.renderModal();
        
        this.modal.style.display = 'flex';
        this.isOpen = true;
        document.body.classList.add('store-modal-open');
        
        // Animate in
        setTimeout(() => {
            this.modal.classList.add('store-modal-visible');
        }, 10);
        
        // Update prices when opening
        this.updatePrices();
    }

    close() {
        if (!this.isOpen) return;
        
        this.modal.classList.remove('store-modal-visible');
        this.isOpen = false;
        document.body.classList.remove('store-modal-open');
        
        // Hide modal after animation
        setTimeout(() => {
            this.modal.style.display = 'none';
            this.hideLoading();
        }, 300);
    }
}

// Export for use in other modules
window.StoreModal = StoreModal;