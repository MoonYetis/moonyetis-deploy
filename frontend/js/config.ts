// Frontend configuration manager with TypeScript
interface ApiEndpoints {
  health: string;
  prices: string;
  products: string;
  purchase: string;
  order: (orderId: string) => string;
  transactions: (address: string) => string;
  balance: (address: string) => string;
  monitorStatus: string;
}

interface ConfigOptions {
  hostname: string;
  protocol: string;
  port: string;
  isDevelopment: boolean;
  isProduction: boolean;
  storeApiUrl: string;
}

class FrontendConfig implements ConfigOptions {
  readonly hostname: string;
  readonly protocol: string;
  readonly port: string;
  readonly isDevelopment: boolean;
  readonly isProduction: boolean;
  readonly storeApiUrl: string;

  constructor() {
    this.hostname = window.location.hostname;
    this.protocol = window.location.protocol;
    this.port = window.location.port;
    
    // Detect environment
    this.isDevelopment = this.hostname === 'localhost' || 
                        this.hostname === '127.0.0.1' || 
                        this.hostname.includes('local') ||
                        this.protocol === 'file:';
    
    this.isProduction = !this.isDevelopment;
    
    // Configure API URLs
    this.storeApiUrl = this.isDevelopment ? 
        'http://localhost:3002' : 
        'http://moonyetis.io:3002';
    
    // Debug info
    if (this.isDevelopment) {
      console.log('🔧 Frontend Config:', {
        hostname: this.hostname,
        protocol: this.protocol,
        port: this.port,
        isDevelopment: this.isDevelopment,
        storeApiUrl: this.storeApiUrl
      });
    }
  }
  
  // Get API endpoint URL
  getApiUrl(endpoint: string): string {
    return `${this.storeApiUrl}${endpoint}`;
  }
  
  // Get store API endpoints
  getStoreEndpoints(): ApiEndpoints {
    return {
      health: this.getApiUrl('/api/store/health'),
      prices: this.getApiUrl('/api/store/prices'),
      products: this.getApiUrl('/api/store/products'),
      purchase: this.getApiUrl('/api/store/purchase'),
      order: (orderId: string) => this.getApiUrl(`/api/store/order/${orderId}`),
      transactions: (address: string) => this.getApiUrl(`/api/store/transactions/${address}`),
      balance: (address: string) => this.getApiUrl(`/api/store/balance/${address}`),
      monitorStatus: this.getApiUrl('/api/store/monitor-status')
    };
  }
  
  // Log configuration
  logConfig(): void {
    if (this.isDevelopment) {
      console.log('🌐 Frontend Configuration:');
      console.log(`   Environment: ${this.isDevelopment ? 'Development' : 'Production'}`);
      console.log(`   Store API: ${this.storeApiUrl}`);
      console.log(`   Base URL: ${window.location.origin}`);
    }
  }
}

// Create global config instance
declare global {
  interface Window {
    frontendConfig: FrontendConfig;
  }
}

window.frontendConfig = new FrontendConfig();
window.frontendConfig.logConfig();

export default FrontendConfig;
export type { ApiEndpoints, ConfigOptions };