// State Manager - Centralized state management for MoonYetis Ecosystem
// Provides reactive state management with TypeScript support

interface StateSubscriber<T = any> {
  (newState: T, oldState: T, path: string): void;
}

interface StateOptions {
  persistent?: boolean;
  storageKey?: string;
  deepWatch?: boolean;
}

class StateManager<T extends Record<string, any> = Record<string, any>> {
  private state: T;
  private subscribers: Map<string, Set<StateSubscriber<any>>> = new Map();
  private globalSubscribers: Set<StateSubscriber<T>> = new Set();
  private options: StateOptions;
  private isUpdating: boolean = false;

  constructor(initialState: T, options: StateOptions = {}) {
    this.options = {
      persistent: false,
      deepWatch: true,
      ...options
    };

    // Load from storage if persistent
    if (this.options.persistent && this.options.storageKey) {
      this.state = this.loadFromStorage() || initialState;
    } else {
      this.state = initialState;
    }

    // Create reactive proxy
    this.state = this.createReactiveProxy(this.state);
  }

  private createReactiveProxy(obj: any, path: string = ''): any {
    const self = this;

    return new Proxy(obj, {
      set(target: any, property: string | symbol, value: any): boolean {
        const stringProp = String(property);
        const fullPath = path ? `${path}.${stringProp}` : stringProp;
        const oldValue = target[property];

        // Deep proxy for objects
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          value = self.createReactiveProxy(value, fullPath);
        }

        // Set the value
        target[property] = value;

        // Trigger updates
        if (!self.isUpdating) {
          self.notifySubscribers(fullPath, value, oldValue);
          self.notifyGlobalSubscribers();
          
          // Save to storage if persistent
          if (self.options.persistent) {
            self.saveToStorage();
          }
        }

        return true;
      },

      get(target: any, property: string | symbol): any {
        const value = target[property];
        
        // Return reactive proxy for nested objects
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          const stringProp = String(property);
          const fullPath = path ? `${path}.${stringProp}` : stringProp;
          return self.createReactiveProxy(value, fullPath);
        }

        return value;
      }
    });
  }

  private notifySubscribers(path: string, newValue: any, oldValue: any): void {
    // Notify specific path subscribers
    const pathSubscribers = this.subscribers.get(path);
    if (pathSubscribers) {
      pathSubscribers.forEach(subscriber => {
        try {
          subscriber(newValue, oldValue, path);
        } catch (error) {
          console.error(`❌ Error in state subscriber for path ${path}:`, error);
        }
      });
    }

    // Notify wildcard subscribers (for nested paths)
    if (this.options.deepWatch) {
      this.subscribers.forEach((subscribers, subscriberPath) => {
        if (subscriberPath.includes('*') || path.startsWith(subscriberPath + '.')) {
          subscribers.forEach(subscriber => {
            try {
              subscriber(newValue, oldValue, path);
            } catch (error) {
              console.error(`❌ Error in wildcard subscriber for path ${subscriberPath}:`, error);
            }
          });
        }
      });
    }
  }

  private notifyGlobalSubscribers(): void {
    this.globalSubscribers.forEach(subscriber => {
      try {
        subscriber(this.state, this.state, '');
      } catch (error) {
        console.error('❌ Error in global state subscriber:', error);
      }
    });
  }

  private saveToStorage(): void {
    if (this.options.storageKey) {
      try {
        localStorage.setItem(this.options.storageKey, JSON.stringify(this.state));
      } catch (error) {
        console.error('❌ Failed to save state to storage:', error);
      }
    }
  }

  private loadFromStorage(): T | null {
    if (this.options.storageKey) {
      try {
        const stored = localStorage.getItem(this.options.storageKey);
        return stored ? JSON.parse(stored) : null;
      } catch (error) {
        console.error('❌ Failed to load state from storage:', error);
        return null;
      }
    }
    return null;
  }

  // Public API
  get<K extends keyof T>(path: K): T[K];
  get(path: string): any;
  get(path: string | keyof T): any {
    return this.getByPath(String(path));
  }

  set<K extends keyof T>(path: K, value: T[K]): void;
  set(path: string, value: any): void;
  set(path: string | keyof T, value: any): void {
    this.setByPath(String(path), value);
  }

  update<K extends keyof T>(path: K, updater: (current: T[K]) => T[K]): void;
  update(path: string, updater: (current: any) => any): void;
  update(path: string | keyof T, updater: (current: any) => any): void {
    const current = this.get(path);
    const newValue = updater(current);
    this.set(path, newValue);
  }

  merge(updates: Partial<T>): void {
    this.isUpdating = true;
    
    Object.keys(updates).forEach(key => {
      this.state[key as keyof T] = updates[key as keyof T]!;
    });
    
    this.isUpdating = false;
    this.notifyGlobalSubscribers();
    
    if (this.options.persistent) {
      this.saveToStorage();
    }
  }

  subscribe(subscriber: StateSubscriber<T>): () => void;
  subscribe<K extends keyof T>(path: K, subscriber: StateSubscriber<T[K]>): () => void;
  subscribe(path: string, subscriber: StateSubscriber<any>): () => void;
  subscribe(
    pathOrSubscriber: string | keyof T | StateSubscriber<T>,
    subscriber?: StateSubscriber<any>
  ): () => void {
    if (typeof pathOrSubscriber === 'function') {
      // Global subscription
      this.globalSubscribers.add(pathOrSubscriber);
      return () => this.globalSubscribers.delete(pathOrSubscriber);
    } else {
      // Path-specific subscription
      const path = String(pathOrSubscriber);
      const sub = subscriber!;
      
      if (!this.subscribers.has(path)) {
        this.subscribers.set(path, new Set());
      }
      
      this.subscribers.get(path)!.add(sub);
      
      return () => {
        const subs = this.subscribers.get(path);
        if (subs) {
          subs.delete(sub);
          if (subs.size === 0) {
            this.subscribers.delete(path);
          }
        }
      };
    }
  }

  private getByPath(path: string): any {
    return path.split('.').reduce((obj, key) => obj && obj[key], this.state);
  }

  private setByPath(path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((obj, key) => {
      if (!obj[key] || typeof obj[key] !== 'object') {
        obj[key] = {};
      }
      return obj[key];
    }, this.state as any);

    target[lastKey] = value;
  }

  // Utility methods
  reset(newState?: T): void {
    this.isUpdating = true;
    
    if (newState) {
      Object.keys(this.state).forEach(key => {
        delete this.state[key as keyof T];
      });
      Object.assign(this.state, newState);
    } else {
      // Clear all properties
      Object.keys(this.state).forEach(key => {
        delete this.state[key as keyof T];
      });
    }
    
    this.isUpdating = false;
    this.notifyGlobalSubscribers();
    
    if (this.options.persistent) {
      this.saveToStorage();
    }
  }

  getSnapshot(): T {
    return JSON.parse(JSON.stringify(this.state));
  }

  clearStorage(): void {
    if (this.options.storageKey) {
      localStorage.removeItem(this.options.storageKey);
    }
  }

  // Getters
  get currentState(): T {
    return this.state;
  }

  get subscriberCount(): number {
    let count = this.globalSubscribers.size;
    this.subscribers.forEach(subs => count += subs.size);
    return count;
  }
}

// Global ecosystem state interface
interface EcosystemState {
  // User state
  user: {
    isAuthenticated: boolean;
    profile: User | null;
    preferences: {
      theme: 'light' | 'dark' | 'auto';
      soundEnabled: boolean;
      animationsEnabled: boolean;
    };
  };

  // Wallet state
  wallet: {
    isConnected: boolean;
    address: string | null;
    balance: number;
    network: string;
    provider: string | null;
  };

  // Game state
  game: {
    currentProduct: string | null;
    isPlaying: boolean;
    balance: number;
    lastWin: number;
    totalWagered: number;
  };

  // UI state
  ui: {
    currentRoute: string;
    activeModals: string[];
    isLoading: boolean;
    notifications: Array<{
      id: string;
      type: 'success' | 'error' | 'warning' | 'info';
      message: string;
      timestamp: number;
    }>;
  };

  // App state
  app: {
    initialized: boolean;
    version: string;
    environment: 'development' | 'production' | 'staging';
    lastActivity: number;
  };
}

// Create global state manager
const createEcosystemState = (): EcosystemState => ({
  user: {
    isAuthenticated: false,
    profile: null,
    preferences: {
      theme: 'auto',
      soundEnabled: true,
      animationsEnabled: true
    }
  },
  wallet: {
    isConnected: false,
    address: null,
    balance: 0,
    network: 'fractal-mainnet',
    provider: null
  },
  game: {
    currentProduct: null,
    isPlaying: false,
    balance: 0,
    lastWin: 0,
    totalWagered: 0
  },
  ui: {
    currentRoute: '',
    activeModals: [],
    isLoading: false,
    notifications: []
  },
  app: {
    initialized: false,
    version: '2.0.0',
    environment: 'development',
    lastActivity: Date.now()
  }
});

// Global state instance
const ecosystemState = new StateManager<EcosystemState>(
  createEcosystemState(),
  {
    persistent: true,
    storageKey: 'moonyetis-ecosystem-state',
    deepWatch: true
  }
);

export default StateManager;
export { ecosystemState, createEcosystemState };
export type { StateSubscriber, StateOptions, EcosystemState };