// App Core - Main application initialization and coordination
// Orchestrates all systems and provides unified application lifecycle

import { initializeComponents, ComponentFactory } from '../components/index.js';
import { ecosystemState } from '../state/state-manager.js';
import WalletManager from '../wallets.js';
import EcosystemRouter from '../ecosystem-router.js';

interface AppCoreOptions {
  autoInit?: boolean;
  enableDevMode?: boolean;
  enableAnalytics?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

interface SystemStatus {
  name: string;
  status: 'initializing' | 'ready' | 'error';
  error?: string;
  initTime?: number;
}

class AppCore {
  private static instance: AppCore;
  private options: Required<AppCoreOptions>;
  private systems: Map<string, SystemStatus> = new Map();
  private initStartTime: number = 0;
  private isInitialized: boolean = false;

  // System references
  private walletManager?: WalletManager;
  private router?: EcosystemRouter;
  private componentFactory?: ComponentFactory;

  constructor(options: AppCoreOptions = {}) {
    if (AppCore.instance) {
      return AppCore.instance;
    }

    this.options = {
      autoInit: true,
      enableDevMode: window.location.hostname === 'localhost',
      enableAnalytics: false,
      logLevel: 'info',
      ...options
    };

    AppCore.instance = this;

    if (this.options.autoInit) {
      this.init();
    }
  }

  async init(): Promise<void> {
    if (this.isInitialized) {
      this.log('warn', 'App already initialized');
      return;
    }

    this.initStartTime = performance.now();
    this.log('info', '🚀 Initializing MoonYetis Ecosystem...');

    try {
      // Initialize core systems in order
      await this.initializeState();
      await this.initializeComponents();
      await this.initializeWalletSystem();
      await this.initializeRouter();
      await this.initializeEventSystem();
      
      // Final setup
      this.setupGlobalErrorHandling();
      this.setupPerformanceMonitoring();
      this.markAsReady();

      const totalTime = performance.now() - this.initStartTime;
      this.log('info', `✅ Ecosystem initialized in ${totalTime.toFixed(2)}ms`);
      
      this.isInitialized = true;
      this.dispatchAppEvent('appReady');

    } catch (error) {
      this.log('error', '❌ Failed to initialize ecosystem:', error);
      this.dispatchAppEvent('appError', { error });
      throw error;
    }
  }

  private async initializeState(): Promise<void> {
    const startTime = performance.now();
    this.setSystemStatus('state', 'initializing');

    try {
      // Update app state
      ecosystemState.merge({
        app: {
          initialized: true,
          version: '2.0.0',
          environment: this.options.enableDevMode ? 'development' : 'production',
          lastActivity: Date.now()
        }
      });

      // Subscribe to state changes for debugging
      if (this.options.enableDevMode) {
        ecosystemState.subscribe((newState, oldState, path) => {
          this.log('debug', `State changed: ${path}`, { newState, oldState });
        });
      }

      const initTime = performance.now() - startTime;
      this.setSystemStatus('state', 'ready', undefined, initTime);
      this.log('info', '✅ State management initialized');

    } catch (error) {
      this.setSystemStatus('state', 'error', String(error));
      throw error;
    }
  }

  private async initializeComponents(): Promise<void> {
    const startTime = performance.now();
    this.setSystemStatus('components', 'initializing');

    try {
      // Initialize component system
      initializeComponents();
      this.componentFactory = ComponentFactory.getInstance();

      // Register custom components if needed
      this.registerCustomComponents();

      const initTime = performance.now() - startTime;
      this.setSystemStatus('components', 'ready', undefined, initTime);
      this.log('info', '✅ Component system initialized');

    } catch (error) {
      this.setSystemStatus('components', 'error', String(error));
      throw error;
    }
  }

  private async initializeWalletSystem(): Promise<void> {
    const startTime = performance.now();
    this.setSystemStatus('wallet', 'initializing');

    try {
      this.walletManager = new WalletManager();

      // Subscribe to wallet events
      window.addEventListener('walletConnected', (e: any) => {
        const { wallet, address, balance, network } = e.detail;
        ecosystemState.merge({
          wallet: {
            isConnected: true,
            address,
            balance,
            network,
            provider: wallet.id
          }
        });
        this.log('info', '🔗 Wallet connected:', wallet.name);
      });

      window.addEventListener('walletDisconnected', () => {
        ecosystemState.merge({
          wallet: {
            isConnected: false,
            address: null,
            balance: 0,
            provider: null
          }
        });
        this.log('info', '🔌 Wallet disconnected');
      });

      // Make globally available
      window.walletManager = this.walletManager;

      const initTime = performance.now() - startTime;
      this.setSystemStatus('wallet', 'ready', undefined, initTime);
      this.log('info', '✅ Wallet system initialized');

    } catch (error) {
      this.setSystemStatus('wallet', 'error', String(error));
      throw error;
    }
  }

  private async initializeRouter(): Promise<void> {
    const startTime = performance.now();
    this.setSystemStatus('router', 'initializing');

    try {
      this.router = new EcosystemRouter();

      // Subscribe to route changes
      window.addEventListener('routeChanged', (e: any) => {
        const { route, product } = e.detail;
        ecosystemState.set('ui.currentRoute', route);
        ecosystemState.set('game.currentProduct', product?.id || null);
        this.log('info', '🧭 Route changed:', route);
      });

      // Make globally available
      window.ecosystemRouter = this.router;

      const initTime = performance.now() - startTime;
      this.setSystemStatus('router', 'ready', undefined, initTime);
      this.log('info', '✅ Router system initialized');

    } catch (error) {
      this.setSystemStatus('router', 'error', String(error));
      throw error;
    }
  }

  private async initializeEventSystem(): Promise<void> {
    const startTime = performance.now();
    this.setSystemStatus('events', 'initializing');

    try {
      // Setup global event handling
      this.setupGlobalEventListeners();

      // Setup activity tracking
      this.setupActivityTracking();

      const initTime = performance.now() - startTime;
      this.setSystemStatus('events', 'ready', undefined, initTime);
      this.log('info', '✅ Event system initialized');

    } catch (error) {
      this.setSystemStatus('events', 'error', String(error));
      throw error;
    }
  }

  private registerCustomComponents(): void {
    // Register any custom components here
    // Example: this.componentFactory?.register('custom', CustomComponent);
  }

  private setupGlobalEventListeners(): void {
    // Handle authentication events
    window.addEventListener('authStateChanged', (e: any) => {
      const { isAuthenticated, user } = e.detail;
      ecosystemState.merge({
        user: {
          isAuthenticated,
          profile: user
        }
      });
    });

    // Handle visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.log('debug', '👁️ App hidden');
      } else {
        this.log('debug', '👁️ App visible');
        ecosystemState.set('app.lastActivity', Date.now());
      }
    });

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.log('debug', '👋 App unloading');
      this.cleanup();
    });
  }

  private setupActivityTracking(): void {
    const updateActivity = this.throttle(() => {
      ecosystemState.set('app.lastActivity', Date.now());
    }, 30000); // Update every 30 seconds

    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });
  }

  private setupGlobalErrorHandling(): void {
    window.addEventListener('error', (event) => {
      this.log('error', '💥 Global error:', event.error);
      this.dispatchAppEvent('globalError', { error: event.error });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.log('error', '💥 Unhandled promise rejection:', event.reason);
      this.dispatchAppEvent('globalError', { error: event.reason });
    });
  }

  private setupPerformanceMonitoring(): void {
    if (this.options.enableDevMode && 'performance' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            this.log('debug', '⚡ Page load time:', entry.duration);
          }
        });
      });

      observer.observe({ entryTypes: ['navigation'] });
    }
  }

  private markAsReady(): void {
    // Add ready class to body
    document.body.classList.add('app-ready');

    // Update state
    ecosystemState.set('app.initialized', true);

    // Make app core globally available
    window.appCore = this;
  }

  private setSystemStatus(name: string, status: SystemStatus['status'], error?: string, initTime?: number): void {
    this.systems.set(name, { name, status, error, initTime });
  }

  private dispatchAppEvent(eventType: string, data?: any): void {
    const event = new CustomEvent(eventType, {
      detail: data,
      bubbles: true
    });
    window.dispatchEvent(event);
  }

  private log(level: AppCoreOptions['logLevel'], message: string, ...args: any[]): void {
    if (this.shouldLog(level!)) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [AppCore]`;
      
      switch (level) {
        case 'error':
          console.error(prefix, message, ...args);
          break;
        case 'warn':
          console.warn(prefix, message, ...args);
          break;
        case 'info':
          console.info(prefix, message, ...args);
          break;
        case 'debug':
          console.debug(prefix, message, ...args);
          break;
      }
    }
  }

  private shouldLog(level: NonNullable<AppCoreOptions['logLevel']>): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevel = levels.indexOf(this.options.logLevel);
    const messageLevel = levels.indexOf(level);
    return messageLevel >= currentLevel;
  }

  private throttle(func: Function, limit: number): Function {
    let inThrottle: boolean;
    return (...args: any[]) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Public API
  getSystemStatus(): SystemStatus[] {
    return Array.from(this.systems.values());
  }

  getSystemHealth(): { healthy: boolean; issues: string[] } {
    const systems = this.getSystemStatus();
    const issues = systems.filter(s => s.status === 'error').map(s => s.name);
    return {
      healthy: issues.length === 0,
      issues
    };
  }

  restart(): Promise<void> {
    this.log('info', '🔄 Restarting application...');
    this.cleanup();
    this.isInitialized = false;
    return this.init();
  }

  cleanup(): void {
    this.log('info', '🧹 Cleaning up application...');
    
    // Cleanup component factory
    this.componentFactory?.destroyAll();
    
    // Dispatch cleanup event
    this.dispatchAppEvent('appCleanup');
  }

  // Getters
  get initialized(): boolean {
    return this.isInitialized;
  }

  get devMode(): boolean {
    return this.options.enableDevMode;
  }

  get state() {
    return ecosystemState;
  }

  get wallet() {
    return this.walletManager;
  }

  getRouter() {
    return this.router;
  }

  get components() {
    return this.componentFactory;
  }

  // Static methods
  static getInstance(options?: AppCoreOptions): AppCore {
    if (!AppCore.instance) {
      AppCore.instance = new AppCore(options);
    }
    return AppCore.instance;
  }
}

// Global type declarations
declare global {
  interface Window {
    appCore: AppCore;
    walletManager: WalletManager;
    ecosystemRouter: EcosystemRouter;
  }
}

export default AppCore;
export type { AppCoreOptions, SystemStatus };