// Modular Wallet System for Fractal Bitcoin ($FB) and MoonYetis BRC-20 Tokens
// Version: 2.0.0 - TypeScript Implementation

// Prevent redeclaration errors
if (typeof window.WalletManager !== 'undefined') {
  console.warn('WalletManager already exists, skipping redeclaration');
} else {

interface WalletBalance {
  confirmed: number;
  unconfirmed: number;
  total?: number;
}

interface SimulatedWalletProvider {
  requestAccounts(): Promise<string[]>;
  getAccounts(): Promise<string[]>;
  getBalance(): Promise<WalletBalance>;
  signMessage(message: string): Promise<string>;
  on(event: string, callback: (data: any) => void): void;
}

interface WalletManagerState {
  connectedWallet: WalletInfo | null;
  walletAddress: string | null;
  balance: number;
  network: string;
  supportedWallets: WalletInfo[];
}

class WalletManager implements WalletManagerState {
  connectedWallet: WalletInfo | null = null;
  walletAddress: string | null = null;
  balance: number = 0;
  network: string = 'fractal-mainnet';
  supportedWallets: WalletInfo[] = [];

  constructor() {
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

  init(): void {
    this.detectWallets();
    this.setupEventListeners();
    console.log('✅ WalletManager initialized');
  }

  detectWallets(): void {
    // Check for UniSat
    if (window.unisat) {
      this.supportedWallets[0].detected = true;
      this.supportedWallets[0].provider = window.unisat;
    }

    // Check for OKX
    if (window.okxwallet?.bitcoin) {
      this.supportedWallets[1].detected = true;
      this.supportedWallets[1].provider = window.okxwallet.bitcoin;
    }

    // Check for Bybit
    if ((window as any).bybitWallet?.bitcoin) {
      this.supportedWallets[2].detected = true;
      this.supportedWallets[2].provider = (window as any).bybitWallet.bitcoin;
    }

    // Check for Bitget
    if ((window as any).bitkeep?.unisat) {
      this.supportedWallets[3].detected = true;
      this.supportedWallets[3].provider = (window as any).bitkeep.unisat;
    }

    // Development mode: Create simulated wallets if none detected
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      this.createSimulatedWallets();
    }

    console.log('🔍 Wallets detected:', this.supportedWallets.filter(w => w.detected).map(w => w.name));
  }
  
  createSimulatedWallets(): void {
    if (!this.supportedWallets[0].detected) {
      console.log('🦄 Creating simulated UniSat wallet for development');
      this.supportedWallets[0].detected = true;
      this.supportedWallets[0].provider = {
        requestAccounts: (): Promise<string[]> => Promise.resolve(['bc1qdev123456789abcdefghijklmnopqrstuvwxyz']),
        getAccounts: (): Promise<string[]> => Promise.resolve(['bc1qdev123456789abcdefghijklmnopqrstuvwxyz']),
        getBalance: (): Promise<WalletBalance> => Promise.resolve({confirmed: 100000000, unconfirmed: 0}),
        signMessage: (message: string): Promise<string> => Promise.resolve('simulated_signature_' + Date.now()),
        on: (event: string, callback: (data: any) => void): void => console.log('🦄 Simulated UniSat event:', event),
        getNetwork: (): Promise<string> => Promise.resolve('fractal-mainnet'),
        switchNetwork: (network: string): Promise<void> => Promise.resolve(),
        sendBitcoin: (toAddress: string, satoshis: number): Promise<string> => Promise.resolve('simulated_txid_' + Date.now()),
        getInscriptions: (): Promise<any[]> => Promise.resolve([]),
        sendInscription: (toAddress: string, inscriptionId: string): Promise<string> => Promise.resolve('simulated_txid_' + Date.now())
      } as SimulatedWalletProvider & WalletProvider;
    }
    
    if (!this.supportedWallets[1].detected) {
      console.log('🌟 Creating simulated OKX wallet for development');
      this.supportedWallets[1].detected = true;
      this.supportedWallets[1].provider = {
        requestAccounts: (): Promise<string[]> => Promise.resolve(['bc1qdev987654321zyxwvutsrqponmlkjihgfedcba']),
        getAccounts: (): Promise<string[]> => Promise.resolve(['bc1qdev987654321zyxwvutsrqponmlkjihgfedcba']),
        getBalance: (): Promise<WalletBalance> => Promise.resolve({confirmed: 200000000, unconfirmed: 0}),
        signMessage: (message: string): Promise<string> => Promise.resolve('simulated_okx_signature_' + Date.now()),
        on: (event: string, callback: (data: any) => void): void => console.log('🌟 Simulated OKX event:', event),
        getNetwork: (): Promise<string> => Promise.resolve('fractal-mainnet'),
        switchNetwork: (network: string): Promise<void> => Promise.resolve(),
        sendBitcoin: (toAddress: string, satoshis: number): Promise<string> => Promise.resolve('simulated_okx_txid_' + Date.now()),
        getInscriptions: (): Promise<any[]> => Promise.resolve([]),
        sendInscription: (toAddress: string, inscriptionId: string): Promise<string> => Promise.resolve('simulated_okx_txid_' + Date.now())
      } as SimulatedWalletProvider & WalletProvider;
    }
  }

  setupEventListeners(): void {
    // Listen for account changes in detected wallets
    this.supportedWallets.forEach(wallet => {
      if (wallet.detected && wallet.provider) {
        try {
          if ('on' in wallet.provider && typeof wallet.provider.on === 'function') {
            wallet.provider.on('accountsChanged', (accounts: string[]) => {
              this.handleAccountChange(accounts);
            });
            
            wallet.provider.on('networkChanged', (network: string) => {
              this.handleNetworkChange(network);
            });
          }
        } catch (error) {
          console.warn(`⚠️ Could not set up event listeners for ${wallet.name}:`, error);
        }
      }
    });
  }

  async connectWallet(walletId: string): Promise<boolean> {
    const wallet = this.supportedWallets.find(w => w.id === walletId);
    
    if (!wallet || !wallet.detected || !wallet.provider) {
      throw new Error(`Wallet ${walletId} not available`);
    }

    try {
      console.log(`🔗 Connecting to ${wallet.name}...`);
      
      const accounts = await wallet.provider.requestAccounts();
      if (accounts.length === 0) {
        throw new Error('No accounts returned from wallet');
      }

      this.connectedWallet = wallet;
      this.walletAddress = accounts[0];
      
      // Get balance
      try {
        const balanceResult = await wallet.provider.getBalance();
        this.balance = balanceResult.confirmed || balanceResult.total || 0;
      } catch (balanceError) {
        console.warn('⚠️ Could not get wallet balance:', balanceError);
        this.balance = 0;
      }

      // Get network
      try {
        if ('getNetwork' in wallet.provider && typeof wallet.provider.getNetwork === 'function') {
          this.network = await wallet.provider.getNetwork();
        }
      } catch (networkError) {
        console.warn('⚠️ Could not get wallet network:', networkError);
      }

      console.log(`✅ Connected to ${wallet.name}:`, {
        address: this.walletAddress,
        balance: this.balance,
        network: this.network
      });

      // Dispatch connection event
      this.dispatchWalletEvent('walletConnected', {
        wallet: this.connectedWallet,
        address: this.walletAddress,
        balance: this.balance,
        network: this.network
      });

      return true;
    } catch (error) {
      console.error(`❌ Failed to connect to ${wallet.name}:`, error);
      throw error;
    }
  }

  async disconnectWallet(): Promise<void> {
    if (!this.connectedWallet) {
      return;
    }

    const disconnectedWallet = this.connectedWallet.name;
    
    this.connectedWallet = null;
    this.walletAddress = null;
    this.balance = 0;
    this.network = 'fractal-mainnet';

    console.log(`🔌 Disconnected from ${disconnectedWallet}`);

    // Dispatch disconnection event
    this.dispatchWalletEvent('walletDisconnected', {});
  }

  async signMessage(message: string, type: string = 'ecdsa'): Promise<string> {
    if (!this.connectedWallet || !this.connectedWallet.provider) {
      throw new Error('No wallet connected');
    }

    try {
      const signature = await this.connectedWallet.provider.signMessage(message, type);
      console.log('✅ Message signed successfully');
      return signature;
    } catch (error) {
      console.error('❌ Failed to sign message:', error);
      throw error;
    }
  }

  async sendBitcoin(toAddress: string, satoshis: number): Promise<string> {
    if (!this.connectedWallet || !this.connectedWallet.provider) {
      throw new Error('No wallet connected');
    }

    if (!('sendBitcoin' in this.connectedWallet.provider)) {
      throw new Error('Wallet does not support Bitcoin transactions');
    }

    try {
      const txid = await this.connectedWallet.provider.sendBitcoin(toAddress, satoshis);
      console.log('✅ Bitcoin sent successfully:', txid);
      
      // Refresh balance after transaction
      setTimeout(() => this.refreshBalance(), 2000);
      
      return txid;
    } catch (error) {
      console.error('❌ Failed to send Bitcoin:', error);
      throw error;
    }
  }

  async refreshBalance(): Promise<number> {
    if (!this.connectedWallet || !this.connectedWallet.provider) {
      return 0;
    }

    try {
      const balanceResult = await this.connectedWallet.provider.getBalance();
      this.balance = balanceResult.confirmed || balanceResult.total || 0;
      
      // Dispatch balance update event
      this.dispatchWalletEvent('balanceUpdated', {
        balance: this.balance,
        address: this.walletAddress
      });

      return this.balance;
    } catch (error) {
      console.error('❌ Failed to refresh balance:', error);
      return this.balance;
    }
  }

  getConnectedWallet(): WalletInfo | null {
    return this.connectedWallet;
  }

  getWalletAddress(): string | null {
    return this.walletAddress;
  }

  getBalance(): number {
    return this.balance;
  }

  getNetwork(): string {
    return this.network;
  }

  getSupportedWallets(): WalletInfo[] {
    return this.supportedWallets;
  }

  getDetectedWallets(): WalletInfo[] {
    return this.supportedWallets.filter(w => w.detected);
  }

  isConnected(): boolean {
    return this.connectedWallet !== null && this.walletAddress !== null;
  }

  private handleAccountChange(accounts: string[]): void {
    if (accounts.length === 0) {
      this.disconnectWallet();
    } else if (accounts[0] !== this.walletAddress) {
      this.walletAddress = accounts[0];
      this.refreshBalance();
      
      console.log('🔄 Account changed:', this.walletAddress);
      
      this.dispatchWalletEvent('accountChanged', {
        address: this.walletAddress,
        wallet: this.connectedWallet
      });
    }
  }

  private handleNetworkChange(network: string): void {
    if (network !== this.network) {
      this.network = network;
      console.log('🌐 Network changed:', this.network);
      
      this.dispatchWalletEvent('networkChanged', {
        network: this.network,
        wallet: this.connectedWallet
      });
    }
  }

  private dispatchWalletEvent(eventType: string, data: any): void {
    const event = new CustomEvent(eventType, {
      detail: data,
      bubbles: true
    });
    
    window.dispatchEvent(event);
  }
}

// Export and set global
window.WalletManager = WalletManager;

// For ES6 module compatibility
export default WalletManager;
export type { WalletManagerState, WalletBalance, SimulatedWalletProvider };

} // End of redeclaration check