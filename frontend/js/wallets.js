// Modular Wallet System for Fractal Bitcoin ($FB) and MoonYetis BRC-20 Tokens
// Version: 1.0.0

// Prevent redeclaration errors
if (typeof window.WalletManager !== 'undefined') {
    console.warn('WalletManager already exists, skipping redeclaration');
} else {

class WalletManager {
    constructor() {
        this.connectedWallet = null;
        this.walletAddress = null;
        this.balance = 0;
        this.network = 'fractal-mainnet';
        this.supportedWallets = [
            {
                id: 'unisat',
                name: 'UniSat Wallet',
                icon: '🦄',
                detected: false,
                provider: null
            },
            {
                id: 'okx',
                name: 'OKX Wallet',
                icon: '🌟',
                detected: false,
                provider: null
            },
            {
                id: 'bybit',
                name: 'Bybit Wallet',
                icon: '💎',
                detected: false,
                provider: null
            },
            {
                id: 'bitget',
                name: 'Bitget Wallet',
                icon: '🚀',
                detected: false,
                provider: null
            }
        ];
        this.init();
    }

    init() {
        this.detectWallets();
        this.setupEventListeners();
        console.log('✅ WalletManager initialized');
    }

    detectWallets() {
        // Check for UniSat
        if (window.unisat) {
            this.supportedWallets[0].detected = true;
            this.supportedWallets[0].provider = window.unisat;
        }

        // Check for OKX
        if (window.okxwallet && window.okxwallet.bitcoin) {
            this.supportedWallets[1].detected = true;
            this.supportedWallets[1].provider = window.okxwallet.bitcoin;
        }

        // Check for Bybit
        if (window.bybitWallet && window.bybitWallet.bitcoin) {
            this.supportedWallets[2].detected = true;
            this.supportedWallets[2].provider = window.bybitWallet.bitcoin;
        }

        // Check for Bitget
        if (window.bitkeep && window.bitkeep.unisat) {
            this.supportedWallets[3].detected = true;
            this.supportedWallets[3].provider = window.bitkeep.unisat;
        }

        // Development mode: Create simulated wallets if none detected
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            this.createSimulatedWallets();
        }

        console.log('🔍 Wallets detected:', this.supportedWallets.filter(w => w.detected).map(w => w.name));
    }
    
    createSimulatedWallets() {
        if (!this.supportedWallets[0].detected) {
            console.log('🦄 Creating simulated UniSat wallet for development');
            this.supportedWallets[0].detected = true;
            this.supportedWallets[0].provider = {
                requestAccounts: () => Promise.resolve(['bc1qdev123456789abcdefghijklmnopqrstuvwxyz']),
                getAccounts: () => Promise.resolve(['bc1qdev123456789abcdefghijklmnopqrstuvwxyz']),
                getBalance: () => Promise.resolve({confirmed: 100000000, unconfirmed: 0}),
                signMessage: (message) => Promise.resolve('simulated_signature_' + Date.now()),
                on: (event, callback) => console.log('🦄 Simulated UniSat event:', event)
            };
        }
        
        if (!this.supportedWallets[1].detected) {
            console.log('🌟 Creating simulated OKX wallet for development');
            this.supportedWallets[1].detected = true;
            this.supportedWallets[1].provider = {
                connect: () => Promise.resolve({address: 'bc1qdev987654321zyxwvutsrqponmlkjihgfedcba'}),
                getAccounts: () => Promise.resolve(['bc1qdev987654321zyxwvutsrqponmlkjihgfedcba']),
                getBalance: () => Promise.resolve({confirmed: 50000000, unconfirmed: 0}),
                signMessage: (message) => Promise.resolve('simulated_okx_signature_' + Date.now()),
                on: (event, callback) => console.log('🌟 Simulated OKX event:', event)
            };
        }
    }

    setupEventListeners() {
        // Listen for wallet account changes
        if (window.unisat) {
            window.unisat.on('accountsChanged', (accounts) => {
                if (this.connectedWallet === 'unisat') {
                    this.handleAccountChange(accounts);
                }
            });
        }

        // Listen for network changes
        if (window.unisat) {
            window.unisat.on('networkChanged', (network) => {
                if (this.connectedWallet === 'unisat') {
                    this.handleNetworkChange(network);
                }
            });
        }
    }

    async connectWallet(walletId) {
        try {
            const wallet = this.supportedWallets.find(w => w.id === walletId);
            if (!wallet || !wallet.detected) {
                throw new Error(`${walletId} wallet not detected`);
            }

            let accounts = [];
            
            switch (walletId) {
                case 'unisat':
                    accounts = await window.unisat.requestAccounts();
                    break;
                case 'okx':
                    accounts = await window.okxwallet.bitcoin.requestAccounts();
                    break;
                case 'bybit':
                    accounts = await window.bybitWallet.bitcoin.requestAccounts();
                    break;
                case 'bitget':
                    accounts = await window.bitkeep.unisat.requestAccounts();
                    break;
                default:
                    throw new Error(`Unsupported wallet: ${walletId}`);
            }

            if (accounts.length === 0) {
                throw new Error('No accounts found');
            }

            this.connectedWallet = walletId;
            this.walletAddress = accounts[0];
            
            // Get balance
            await this.updateBalance();

            this.onWalletConnected();
            return {
                success: true,
                wallet: walletId,
                address: this.walletAddress,
                balance: this.balance
            };

        } catch (error) {
            console.error('Error connecting wallet:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async updateBalance() {
        if (!this.connectedWallet || !this.walletAddress) return;

        try {
            let balance = 0;
            
            switch (this.connectedWallet) {
                case 'unisat':
                    balance = await window.unisat.getBalance();
                    break;
                case 'okx':
                    balance = await window.okxwallet.bitcoin.getBalance();
                    break;
                case 'bybit':
                    balance = await window.bybitWallet.bitcoin.getBalance();
                    break;
                case 'bitget':
                    balance = await window.bitkeep.unisat.getBalance();
                    break;
            }

            this.balance = balance.confirmed || balance.total || 0;
            
        } catch (error) {
            console.error('Error updating balance:', error);
        }
    }

    async sendTransaction(toAddress, amount) {
        if (!this.connectedWallet) {
            throw new Error('No wallet connected');
        }

        try {
            let txid;
            
            switch (this.connectedWallet) {
                case 'unisat':
                    txid = await window.unisat.sendBitcoin(toAddress, amount);
                    break;
                case 'okx':
                    txid = await window.okxwallet.bitcoin.sendBitcoin(toAddress, amount);
                    break;
                case 'bybit':
                    txid = await window.bybitWallet.bitcoin.sendBitcoin(toAddress, amount);
                    break;
                case 'bitget':
                    txid = await window.bitkeep.unisat.sendBitcoin(toAddress, amount);
                    break;
            }

            return { success: true, txid };

        } catch (error) {
            console.error('Error sending transaction:', error);
            return { success: false, error: error.message };
        }
    }

    async signMessage(message) {
        if (!this.connectedWallet) {
            throw new Error('No wallet connected');
        }

        try {
            let signature;
            
            switch (this.connectedWallet) {
                case 'unisat':
                    signature = await window.unisat.signMessage(message);
                    break;
                case 'okx':
                    signature = await window.okxwallet.bitcoin.signMessage(message);
                    break;
                case 'bybit':
                    signature = await window.bybitWallet.bitcoin.signMessage(message);
                    break;
                case 'bitget':
                    signature = await window.bitkeep.unisat.signMessage(message);
                    break;
            }

            return { success: true, signature };

        } catch (error) {
            console.error('Error signing message:', error);
            return { success: false, error: error.message };
        }
    }

    disconnect() {
        this.connectedWallet = null;
        this.walletAddress = null;
        this.balance = 0;
        this.onWalletDisconnected();
    }

    handleAccountChange(accounts) {
        if (accounts.length === 0) {
            this.disconnect();
        } else {
            this.walletAddress = accounts[0];
            this.updateBalance();
            this.onAccountChanged();
        }
    }

    handleNetworkChange(network) {
        this.network = network;
        this.updateBalance();
        this.onNetworkChanged();
    }

    // Event handlers (to be overridden)
    onWalletConnected() {
        console.log('Wallet connected:', this.connectedWallet);
    }

    onWalletDisconnected() {
        console.log('Wallet disconnected');
    }

    onAccountChanged() {
        console.log('Account changed:', this.walletAddress);
    }

    onNetworkChanged() {
        console.log('Network changed:', this.network);
    }

    // Helper methods
    getAvailableWallets() {
        return this.supportedWallets.filter(wallet => wallet.detected);
    }

    isConnected() {
        return this.connectedWallet !== null;
    }

    getCurrentWallet() {
        return this.connectedWallet;
    }

    getCurrentAddress() {
        return this.walletAddress;
    }

    getCurrentBalance() {
        return this.balance;
    }

    formatSats(sats) {
        return (sats / 100000000).toFixed(8);
    }

    formatAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
}

// Export for use in other modules and close redeclaration protection
window.WalletManager = WalletManager;

} // End of redeclaration protection