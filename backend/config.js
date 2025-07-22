// Configuration manager for environment detection
const path = require('path');
const dotenv = require('dotenv');

class Config {
    constructor() {
        this.isDevelopment = process.env.NODE_ENV === 'development';
        this.isProduction = process.env.NODE_ENV === 'production';
        
        // Load appropriate .env file
        if (this.isDevelopment) {
            dotenv.config({ path: path.join(__dirname, '.env.local') });
        } else {
            dotenv.config();
        }
        
        // Environment info
        this.environment = process.env.NODE_ENV || 'development';
        this.port = process.env.STORE_PORT || 3002;
        
        // API Configuration
        this.unisatApiKey = process.env.UNISAT_API_KEY;
        this.unisatApiUrl = process.env.UNISAT_API_URL || 'https://open-api.unisat.io';
        
        // Payment Configuration
        this.paymentAddress = process.env.PAYMENT_ADDRESS;
        this.minConfirmations = parseInt(process.env.MIN_CONFIRMATIONS) || 1;
        
        // Security
        this.webhookSecret = process.env.WEBHOOK_SECRET;
        this.adminKey = process.env.ADMIN_KEY;
        
        // Logging
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.logFile = process.env.LOG_FILE || 'store.log';
        
        // Intervals
        this.priceUpdateInterval = parseInt(process.env.PRICE_UPDATE_INTERVAL) || 60000;
        this.transactionCheckInterval = parseInt(process.env.TRANSACTION_CHECK_INTERVAL) || 30000;
        
        // Development flags
        this.debugMode = process.env.DEBUG_MODE === 'true';
        this.enableMockTransactions = process.env.ENABLE_MOCK_TRANSACTIONS === 'true';
        
        // CORS configuration
        this.corsOrigins = this.isDevelopment ? 
            ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:3000'] : 
            ['https://moonyetis.io'];
    }
    
    // Get base URL for API
    getBaseUrl() {
        if (this.isDevelopment) {
            return `http://localhost:${this.port}`;
        }
        return `http://moonyetis.io:${this.port}`;
    }
    
    // Log configuration on startup
    logConfig() {
        console.log(`🔧 Configuration loaded:`);
        console.log(`   Environment: ${this.environment}`);
        console.log(`   Port: ${this.port}`);
        console.log(`   Base URL: ${this.getBaseUrl()}`);
        console.log(`   Debug Mode: ${this.debugMode}`);
        console.log(`   Price Update Interval: ${this.priceUpdateInterval}ms`);
        console.log(`   Transaction Check Interval: ${this.transactionCheckInterval}ms`);
        console.log(`   CORS Origins: ${this.corsOrigins.join(', ')}`);
        
        if (this.isDevelopment) {
            console.log(`   Mock Transactions: ${this.enableMockTransactions}`);
        }
    }
}

module.exports = new Config();