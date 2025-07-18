// Global type definitions for MoonYetis Ecosystem

/* === WALLET TYPES === */

interface WalletProvider {
  requestAccounts(): Promise<string[]>;
  getAccounts(): Promise<string[]>;
  getNetwork(): Promise<string>;
  switchNetwork(network: string): Promise<void>;
  signMessage(message: string, type?: string): Promise<string>;
  sendBitcoin(toAddress: string, satoshis: number): Promise<string>;
  getBalance(): Promise<{ confirmed: number; unconfirmed: number; total: number }>;
  getInscriptions(): Promise<any[]>;
  sendInscription(toAddress: string, inscriptionId: string): Promise<string>;
}

interface WalletInfo {
  id: string;
  name: string;
  icon: string;
  detected: boolean;
  provider: WalletProvider | null;
}

interface WalletState {
  connectedWallet: WalletInfo | null;
  walletAddress: string | null;
  balance: number;
  network: string;
  isConnecting: boolean;
}

/* === UNISAT WALLET === */
interface UnisatWallet extends WalletProvider {
  requestAccounts(): Promise<string[]>;
  getAccounts(): Promise<string[]>;
  getPublicKey(): Promise<string>;
  getBalance(): Promise<{ confirmed: number; unconfirmed: number; total: number }>;
  getNetwork(): Promise<string>;
  switchNetwork(network: string): Promise<void>;
  signMessage(message: string, type?: 'ecdsa' | 'bip322-simple'): Promise<string>;
  signPsbt(psbtHex: string, options?: any): Promise<string>;
  sendBitcoin(toAddress: string, satoshis: number, options?: any): Promise<string>;
  getInscriptions(cursor?: number, size?: number): Promise<{ total: number; list: any[] }>;
  sendInscription(toAddress: string, inscriptionId: string, options?: any): Promise<string>;
}

/* === OKX WALLET === */
interface OKXBitcoin extends WalletProvider {
  connect(): Promise<{ address: string; publicKey: string }>;
  requestAccounts(): Promise<string[]>;
  getAccounts(): Promise<string[]>;
  getPublicKey(): Promise<string>;
  getBalance(): Promise<{ confirmed: number; unconfirmed: number; total: number }>;
  getNetwork(): Promise<string>;
  switchNetwork(network: string): Promise<void>;
  signMessage(message: string, type?: 'ecdsa' | 'bip322-simple'): Promise<string>;
  signPsbt(psbtHex: string, options?: any): Promise<string>;
  sendBitcoin(toAddress: string, satoshis: number, options?: any): Promise<string>;
  getInscriptions(cursor?: number, size?: number): Promise<{ total: number; list: any[] }>;
  sendInscription(toAddress: string, inscriptionId: string, options?: any): Promise<string>;
}

interface OKXWallet {
  bitcoin: OKXBitcoin;
  bitcoinTestnet: OKXBitcoin;
}

/* === GAME TYPES === */

interface GameConfig {
  version: string;
  environment: 'development' | 'production' | 'staging';
  api: {
    baseUrl: string;
    timeout: number;
  };
  wallet: {
    network: string;
    supportedWallets: string[];
  };
  game: {
    minBet: number;
    maxBet: number;
    defaultBet: number;
  };
}

interface SlotSymbol {
  id: string;
  name: string;
  value: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  image: string;
  animation?: string;
}

interface SpinResult {
  symbols: string[][];
  winLines: WinLine[];
  totalWin: number;
  multiplier: number;
  isJackpot: boolean;
  transactionHash?: string;
}

interface WinLine {
  line: number;
  symbols: string[];
  count: number;
  payout: number;
}

interface GameState {
  balance: number;
  connectedWallet: string | null;
  demoMode: boolean;
  isSpinning: boolean;
  currentBet: number;
  autoPlay: boolean;
  soundEnabled: boolean;
}

/* === AUTHENTICATION TYPES === */

interface User {
  id: string;
  username: string;
  email?: string;
  walletAddress?: string;
  mooncoinsBalance: number;
  referralCode: string;
  createdAt: string;
  lastLogin: string;
  isVerified: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
}

interface LoginCredentials {
  username: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  referralCode?: string;
}

/* === API TYPES === */

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: number;
}

interface EcosystemStats {
  totalUsers: number;
  totalVolume: number;
  totalWins: number;
  activeProducts: number;
}

/* === ANIMATION TYPES === */

interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
  iterations?: number;
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
}

interface GraphicsContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  pixelRatio: number;
}

/* === ROUTER TYPES === */

interface RouteConfig {
  path: string;
  component: string;
  title: string;
  requiresAuth?: boolean;
  meta?: Record<string, any>;
}

interface NavigationState {
  currentRoute: string;
  previousRoute: string;
  params: Record<string, string>;
  query: Record<string, string>;
}

/* === WINDOW EXTENSIONS === */

declare global {
  interface Window {
    // Wallet providers
    unisat?: UnisatWallet;
    okxwallet?: OKXWallet;
    okx?: { bitcoin: OKXBitcoin };
    bitcoin?: WalletProvider;
    
    // MoonYetis globals
    WalletManager?: any;
    EcosystemRouter?: any;
    AuthModal?: any;
    SlotMachine?: any;
    GraphicsEngine?: any;
    AnimationSystem?: any;
    
    // Game state
    gameState?: GameState;
    ecosystemState?: {
      initialized: boolean;
      currentProduct: any;
      user: User | null;
      router: any;
    };
    
    // External libraries
    PIXI?: any;
    gsap?: any;
    
    // Development
    __DEV__?: boolean;
    __APP_VERSION__?: string;
    __BUILD_TIME__?: string;
  }
  
  // Module declarations for assets
  declare module '*.png' {
    const src: string;
    export default src;
  }
  
  declare module '*.jpg' {
    const src: string;
    export default src;
  }
  
  declare module '*.jpeg' {
    const src: string;
    export default src;
  }
  
  declare module '*.svg' {
    const src: string;
    export default src;
  }
  
  declare module '*.gif' {
    const src: string;
    export default src;
  }
  
  declare module '*.webp' {
    const src: string;
    export default src;
  }
}

/* === UTILITY TYPES === */

export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

export type EventHandler<T = any> = (event: T) => void;

export type AsyncFunction<T = void> = () => Promise<T>;

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export {};