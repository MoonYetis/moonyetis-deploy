// Mainnet Configuration for MoonYetis
// CRITICAL: This configuration is for REAL money transactions
// DO NOT use testnet values or development keys in production

const MAINNET_CONFIG = {
    // Fractal Bitcoin Mainnet Configuration
    FRACTAL_MAINNET: {
        networkType: 'mainnet',
        apiUrl: 'https://fractal-api.unisat.io',
        indexerUrl: 'https://fractal-indexer.unisat.io',
        explorerUrl: 'https://fractal.unisat.io',
        
        // Mainnet-specific parameters
        network: {
            messagePrefix: 'Fractal Bitcoin Signed Message:\n',
            bech32: 'bc',
            bip32: {
                public: 0x0488b21e,
                private: 0x0488ade4,
            },
            pubKeyHash: 0x00,
            scriptHash: 0x05,
            wif: 0x80,
        },
        
        // Transaction fees (in satoshis)
        fees: {
            fast: 50,      // ~10 minutes
            medium: 25,    // ~30 minutes
            slow: 10,      // ~1 hour
            minimum: 1,    // Minimum fee
        },
        
        // API rate limits (mainnet has stricter limits)
        rateLimits: {
            requests: 100,        // requests per minute
            burstLimit: 20,       // burst requests
            dailyLimit: 10000,    // daily limit
        },
        
        // Security settings
        security: {
            requireConfirmations: 3,     // Required confirmations for deposits
            maxTransactionAmount: 1000000, // Max transaction in satoshis
            withdrawalDelay: 300,        // 5 minutes delay for withdrawals
            hotWalletLimit: 100000,      // Max amount in hot wallet
        }
    },
    
    // BRC-20 Token Configuration (MOONYETIS)
    TOKEN_CONFIG: {
        ticker: 'MOONYETIS',
        decimals: 8,
        totalSupply: 100000000, // 100 million tokens
        
        // Contract verification
        contractAddress: null, // Will be set after deployment
        deploymentTxId: null,  // Will be set after deployment
        
        // Token economics
        gameReserve: 50000000,    // 50% for game rewards
        liquidityPool: 20000000,  // 20% for liquidity
        teamAllocation: 10000000, // 10% for team
        marketing: 10000000,      // 10% for marketing
        development: 10000000,    // 10% for development
    },
    
    // House Wallet Configuration
    HOUSE_WALLET: {
        // CRITICAL: These must be set securely in production
        minBalance: 10000,        // Minimum balance to maintain
        maxBalance: 1000000,      // Maximum balance before moving to cold storage
        rebalanceThreshold: 0.1,  // Rebalance when 10% of max
        
        // Operational limits
        maxWithdrawal: 50000,     // Maximum single withdrawal
        dailyWithdrawalLimit: 500000, // Daily withdrawal limit
        
        // Security settings
        multiSigRequired: true,   // Require multi-sig for large amounts
        multiSigThreshold: 100000, // Amount requiring multi-sig
        backupWallets: 3,         // Number of backup wallets
    },
    
    // Game Configuration for Mainnet
    GAME_CONFIG: {
        // Bet limits (in MOONYETIS tokens)
        minBet: 1,
        maxBet: 1000,
        
        // House edge
        houseEdge: 0.02, // 2% house edge
        
        // Jackpot configuration
        jackpot: {
            enabled: true,
            seedAmount: 10000,    // Initial jackpot amount
            contributionRate: 0.01, // 1% of bets go to jackpot
            maxPayout: 1000000,   // Maximum jackpot payout
        },
        
        // RTP (Return to Player)
        rtp: 0.96, // 96% RTP
        
        // Progressive features
        progressive: {
            enabled: true,
            tiers: ['bronze', 'silver', 'gold', 'platinum'],
            multipliers: [1.0, 1.1, 1.2, 1.5],
        }
    },
    
    // Database Configuration for Production
    DATABASE_PRODUCTION: {
        // Connection settings
        maxConnections: 100,
        idleTimeout: 30000,
        connectionTimeout: 10000,
        queryTimeout: 30000,
        
        // SSL settings (required for production)
        ssl: {
            require: true,
            rejectUnauthorized: true,
        },
        
        // Backup settings
        backup: {
            enabled: true,
            interval: '0 2 * * *', // Daily at 2 AM
            retention: 30, // Keep 30 days
            s3Bucket: process.env.BACKUP_S3_BUCKET,
        },
        
        // Read replicas
        readReplicas: {
            enabled: true,
            maxConnections: 50,
            preferRead: ['leaderboard', 'history', 'stats'],
        }
    },
    
    // Monitoring Configuration
    MONITORING_PRODUCTION: {
        // External monitoring services
        datadog: {
            enabled: true,
            apiKey: process.env.DATADOG_API_KEY,
            tags: ['env:production', 'service:moonyetis'],
        },
        
        sentry: {
            enabled: true,
            dsn: process.env.SENTRY_DSN,
            environment: 'production',
        },
        
        // Health check intervals
        healthChecks: {
            application: 30000,  // 30 seconds
            database: 60000,    // 1 minute
            blockchain: 120000,  // 2 minutes
            external: 300000,   // 5 minutes
        },
        
        // Alert thresholds
        alerts: {
            responseTime: 2000,   // 2 seconds
            errorRate: 1,         // 1%
            memoryUsage: 80,      // 80%
            cpuUsage: 75,         // 75%
            diskUsage: 85,        // 85%
        }
    },
    
    // Security Configuration
    SECURITY_PRODUCTION: {
        // Rate limiting
        rateLimiting: {
            general: 1000,      // General requests per 15 minutes
            api: 300,           // API requests per 15 minutes
            transactions: 50,   // Transaction requests per 15 minutes
            auth: 20,           // Auth requests per 15 minutes
        },
        
        // Session configuration
        session: {
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            secure: true,       // HTTPS only
            httpOnly: true,     // No client-side access
            sameSite: 'strict', // CSRF protection
        },
        
        // CORS configuration
        cors: {
            origin: [
                'https://moonyetis.com',
                'https://www.moonyetis.com',
                // Add any other allowed origins
            ],
            credentials: true,
            optionsSuccessStatus: 200,
        },
        
        // Content Security Policy
        csp: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'wss:', 'https:'],
        }
    },
    
    // Performance Configuration
    PERFORMANCE: {
        // Caching
        cache: {
            redis: {
                enabled: true,
                maxMemory: '512mb',
                policy: 'allkeys-lru',
                keyExpiration: 3600, // 1 hour default
            },
            
            application: {
                maxSize: 1000,      // Max items in memory cache
                defaultTTL: 300,    // 5 minutes default
            }
        },
        
        // Database optimization
        database: {
            connectionPooling: true,
            readReplicas: true,
            queryCache: true,
            indexOptimization: true,
        },
        
        // CDN configuration
        cdn: {
            enabled: true,
            provider: 'cloudflare', // or 'aws', 'gcp'
            cacheHeaders: {
                static: 'public, max-age=31536000', // 1 year for static assets
                api: 'no-cache',                    // No cache for API
                dynamic: 'public, max-age=300',     // 5 minutes for dynamic content
            }
        }
    }
};

// Validation function for mainnet configuration
function validateMainnetConfig() {
    const requiredEnvVars = [
        'FRACTAL_API_KEY',
        'HOUSE_WALLET_ADDRESS',
        'HOUSE_WALLET_PRIVATE_KEY',
        'DB_PASSWORD',
        'REDIS_PASSWORD',
        'JWT_SECRET',
        'SESSION_SECRET',
        'DATADOG_API_KEY',
        'SENTRY_DSN',
        'BACKUP_S3_BUCKET',
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY'
    ];
    
    const missing = requiredEnvVars.filter(env => !process.env[env]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables for mainnet: ${missing.join(', ')}`);
    }
    
    // Validate wallet configuration
    if (!process.env.HOUSE_WALLET_ADDRESS || !process.env.HOUSE_WALLET_ADDRESS.startsWith('bc1')) {
        throw new Error('Invalid house wallet address for mainnet');
    }
    
    // Validate API key format
    if (!process.env.FRACTAL_API_KEY || process.env.FRACTAL_API_KEY.length < 32) {
        throw new Error('Invalid Fractal API key for mainnet');
    }
    
    console.log('✅ Mainnet configuration validation passed');
}

// Export configuration based on environment
module.exports = {
    MAINNET_CONFIG,
    validateMainnetConfig,
    
    // Helper function to get current configuration
    getCurrentConfig: () => {
        if (process.env.NODE_ENV === 'production') {
            validateMainnetConfig();
            return MAINNET_CONFIG;
        } else {
            // Return testnet config for non-production environments
            const testnetConfig = require('./blockchain');
            return testnetConfig.BLOCKCHAIN_CONFIG;
        }
    },
    
    // Helper function to check if running on mainnet
    isMainnet: () => {
        return process.env.NODE_ENV === 'production' && 
               process.env.FRACTAL_NETWORK === 'mainnet';
    },
    
    // Helper function to get network-specific parameters
    getNetworkParams: () => {
        if (module.exports.isMainnet()) {
            return MAINNET_CONFIG.FRACTAL_MAINNET;
        } else {
            const testnetConfig = require('./blockchain');
            return testnetConfig.BLOCKCHAIN_CONFIG.FRACTAL_NETWORK;
        }
    }
};