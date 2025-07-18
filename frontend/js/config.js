// Frontend configuration manager
class FrontendConfig {
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
    getApiUrl(endpoint) {
        return `${this.storeApiUrl}${endpoint}`;
    }
    
    // Get store API endpoints
    getStoreEndpoints() {
        return {
            health: this.getApiUrl('/api/store/health'),
            prices: this.getApiUrl('/api/store/prices'),
            products: this.getApiUrl('/api/store/products'),
            purchase: this.getApiUrl('/api/store/purchase'),
            order: (orderId) => this.getApiUrl(`/api/store/order/${orderId}`),
            transactions: (address) => this.getApiUrl(`/api/store/transactions/${address}`),
            balance: (address) => this.getApiUrl(`/api/store/balance/${address}`),
            monitorStatus: this.getApiUrl('/api/store/monitor-status')
        };
    }
    
    // Get authentication API endpoints
    getAuthEndpoints() {
        return {
            register: this.getApiUrl('/api/auth/register'),
            login: this.getApiUrl('/api/auth/login'),
            profile: this.getApiUrl('/api/auth/profile'),
            validateReferral: this.getApiUrl('/api/auth/validate-referral'),
            referrals: this.getApiUrl('/api/auth/referrals'),
            dailyLogin: this.getApiUrl('/api/auth/daily-login')
        };
    }
    
    // Log configuration
    logConfig() {
        if (this.isDevelopment) {
            console.log('🌐 Frontend Configuration:');
            console.log(`   Environment: ${this.isDevelopment ? 'Development' : 'Production'}`);
            console.log(`   Store API: ${this.storeApiUrl}`);
            console.log(`   Base URL: ${window.location.origin}`);
        }
    }
}

// Create global config instance
window.frontendConfig = new FrontendConfig();
window.frontendConfig.logConfig();