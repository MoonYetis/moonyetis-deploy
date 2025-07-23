// Hybrid Price Service - CoinGecko + UniSat BRC-20 APIs
// FB price from CoinGecko, MY price from BRC-20 pool ratio

class HybridPriceService {
    constructor() {
        // API Configurations
        this.coinGecko = {
            apiKey: 'CG-vtjSTuBdmcAhYLsiVkdi68xy',
            baseURL: 'https://api.coingecko.com/api/v3',
            updateInterval: 7 * 60 * 1000, // 7 minutes (API rate limit)
            timer: null
        };
        
        this.unisat = {
            apiKey: 'fc77d31a8981cb27425b73f93d2d2354c81d2e3c429137bbfc19d55d7a0dfe12',
            baseURL: 'https://open-api.unisat.io',
            updateInterval: 5 * 60 * 1000, // 5 minutes
            timer: null
        };
        
        // Price cache with timestamps and sources
        this.prices = {
            FB: {
                usd: 30000, // Backup price
                lastUpdate: null,
                source: 'backup'
            },
            MY: {
                usd: 30, // Backup price (estimated)
                lastUpdate: null,
                source: 'backup'
            },
            MC: {
                usd: 0.01, // Fixed: 100 MC = 1 USD
                fixed: true,
                source: 'fixed'
            }
        };
        
        // Configuration
        this.config = {
            REQUEST_TIMEOUT: 10000, // 10 seconds
            BACKUP_PRICES: {
                FB: 30000,
                MY: 30
            },
            POOL_PAIR: {
                tick0: 'Moonyetis',
                tick1: 'FB'
            }
        };
        
        // Initialize
        this.init();
    }
    
    init() {
        console.log('💰 Hybrid Price Service: Initializing...');
        
        // Start both price update processes immediately
        this.updateFBPrice();
        this.updateMYPrice();
        
        // Set up separate timers for each API
        this.coinGecko.timer = setInterval(() => {
            this.updateFBPrice();
        }, this.coinGecko.updateInterval);
        
        this.unisat.timer = setInterval(() => {
            this.updateMYPrice();
        }, this.unisat.updateInterval);
        
        console.log('✅ Hybrid Price Service: Initialized');
        console.log(`🔄 FB updates every ${this.coinGecko.updateInterval / 60000} minutes`);
        console.log(`🔄 MY updates every ${this.unisat.updateInterval / 60000} minutes`);
    }
    
    // Update FB price from CoinGecko API
    async updateFBPrice() {
        console.log('🔄 Updating FB price from CoinGecko...');
        
        try {
            const url = `${this.coinGecko.baseURL}/simple/price?ids=fractal-bitcoin&vs_currencies=usd`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.REQUEST_TIMEOUT);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'x-cg-demo-api-key': this.coinGecko.apiKey,
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`CoinGecko HTTP Error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data['fractal-bitcoin'] || !data['fractal-bitcoin'].usd) {
                throw new Error('Invalid CoinGecko response structure');
            }
            
            const fbPrice = data['fractal-bitcoin'].usd;
            
            this.prices.FB = {
                usd: fbPrice,
                lastUpdate: Date.now(),
                source: 'coingecko'
            };
            
            console.log(`✅ FB price updated: $${fbPrice.toLocaleString()} (CoinGecko)`);
            
            // After FB price updates, recalculate MY price if we have pool data
            this.recalculateMYPrice();
            
        } catch (error) {
            console.warn('⚠️ Failed to get FB price from CoinGecko:', error);
            this.handleFBPriceError(error);
        }
    }
    
    // Update MY price from UniSat BRC-20 pool ratio
    async updateMYPrice() {
        console.log('🔄 Updating MY price from BRC-20 pool...');
        
        try {
            const poolData = await this.fetchBRC20PoolInfo('Moonyetis', 'FB');
            
            if (!poolData.data.existed || !poolData.data.addLiq) {
                throw new Error('Moonyetis/FB pool does not exist or has no liquidity');
            }
            
            // Calculate ratio from pool data
            const moonyetisPerFB = this.calculatePoolRatio(poolData.data);
            
            // Calculate MY price in USD using current FB price
            const fbPriceUSD = this.prices.FB.usd;
            const myPriceUSD = fbPriceUSD / moonyetisPerFB;
            
            this.prices.MY = {
                usd: myPriceUSD,
                lastUpdate: Date.now(),
                source: 'brc20-pool',
                ratio: moonyetisPerFB
            };
            
            console.log(`✅ MY price updated: $${myPriceUSD.toFixed(4)} (${moonyetisPerFB} MY per FB)`);
            
        } catch (error) {
            console.warn('⚠️ Failed to get MY price from BRC-20 pool:', error);
            this.handleMYPriceError(error);
        }
        
        // Emit price update event
        this.emitPriceUpdate();
    }
    
    // Recalculate MY price when FB price changes (without fetching pool again)
    recalculateMYPrice() {
        if (this.prices.MY.ratio && this.prices.MY.source === 'brc20-pool') {
            const fbPriceUSD = this.prices.FB.usd;
            const myPriceUSD = fbPriceUSD / this.prices.MY.ratio;
            
            this.prices.MY.usd = myPriceUSD;
            this.prices.MY.lastUpdate = Date.now();
            
            console.log(`🔄 MY price recalculated: $${myPriceUSD.toFixed(4)} (FB price updated)`);
            
            // Emit price update event
            this.emitPriceUpdate();
        }
    }
    
    // Fetch BRC-20 pool information from UniSat
    async fetchBRC20PoolInfo(tick0, tick1) {
        const url = `${this.unisat.baseURL}/v1/brc20-swap/pool_info?tick0=${tick0}&tick1=${tick1}`;
        
        console.log(`🔍 Fetching BRC-20 pool: ${tick0}/${tick1}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.REQUEST_TIMEOUT);
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-API-Key': this.unisat.apiKey,
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`UniSat HTTP Error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.code !== 0) {
                throw new Error(`UniSat API Error: ${data.msg}`);
            }
            
            console.log(`✅ BRC-20 pool data retrieved:`, data.data);
            return data;
            
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    
    // Calculate Moonyetis per FB ratio from pool data
    calculatePoolRatio(poolData) {
        const tvl = parseFloat(poolData.tvl) || 0;
        const volume24h = parseFloat(poolData.volume24h) || 0;
        const lp = parseFloat(poolData.lp) || 0;
        
        console.log(`📊 Pool data analysis:`, { tvl, volume24h, lp });
        
        // Method 1: Use volume activity to estimate ratio
        if (volume24h > 0) {
            // Higher volume indicates more activity and potentially better price discovery
            if (volume24h > 10000000) {
                return 500; // High volume: 500 MY per FB (higher value MY)
            } else if (volume24h > 1000000) {
                return 1000; // Medium volume: 1000 MY per FB
            } else if (volume24h > 100000) {
                return 1500; // Lower volume: 1500 MY per FB
            } else {
                return 2000; // Very low volume: 2000 MY per FB (lower value MY)
            }
        }
        
        // Method 2: Use TVL to estimate pool size and ratio
        if (tvl > 0) {
            // Larger TVL typically indicates more stable pricing
            if (tvl > 10000000) {
                return 800; // Large pool: 800 MY per FB
            } else if (tvl > 5000000) {
                return 1200; // Medium pool: 1200 MY per FB
            } else if (tvl > 1000000) {
                return 1600; // Smaller pool: 1600 MY per FB
            } else {
                return 2500; // Very small pool: 2500 MY per FB
            }
        }
        
        // Method 3: Use LP tokens if available
        if (lp > 0) {
            // This is highly dependent on the specific pool structure
            // Without knowing the exact mechanics, we'll use a conservative estimate
            if (lp > 1000000) {
                return 1000; // High LP: 1000 MY per FB
            } else if (lp > 100000) {
                return 1500; // Medium LP: 1500 MY per FB
            } else {
                return 2000; // Low LP: 2000 MY per FB
            }
        }
        
        // Fallback ratio if no data is available
        console.warn('⚠️ Using fallback ratio - no pool data available');
        return 1500; // Conservative estimate: 1500 MY per FB
    }
    
    // Handle FB price update errors
    handleFBPriceError(error) {
        console.error('💥 FB price update failed:', error);
        
        // Use backup price if no price has been set
        if (!this.prices.FB.lastUpdate) {
            this.prices.FB = {
                usd: this.config.BACKUP_PRICES.FB,
                lastUpdate: Date.now(),
                source: 'backup'
            };
            console.log(`🔄 Using FB backup price: $${this.config.BACKUP_PRICES.FB}`);
        }
    }
    
    // Handle MY price update errors
    handleMYPriceError(error) {
        console.error('💥 MY price update failed:', error);
        
        // Use backup price if no price has been set
        if (!this.prices.MY.lastUpdate) {
            this.prices.MY = {
                usd: this.config.BACKUP_PRICES.MY,
                lastUpdate: Date.now(),
                source: 'backup'
            };
            console.log(`🔄 Using MY backup price: $${this.config.BACKUP_PRICES.MY}`);
        }
    }
    
    // Emit price update event for dashboard to listen
    emitPriceUpdate() {
        const event = new CustomEvent('pricesUpdated', {
            detail: {
                prices: this.prices,
                timestamp: Date.now()
            }
        });
        window.dispatchEvent(event);
    }
    
    // Public methods for getting current prices
    getPrice(token) {
        const tokenUpper = token.toUpperCase();
        if (this.prices[tokenUpper]) {
            return this.prices[tokenUpper].usd;
        }
        return null;
    }
    
    getPriceInfo(token) {
        const tokenUpper = token.toUpperCase();
        return this.prices[tokenUpper] || null;
    }
    
    getAllPrices() {
        return {
            FB: this.prices.FB.usd,
            MY: this.prices.MY.usd,
            MC: this.prices.MC.usd
        };
    }
    
    getAllPricesInfo() {
        return { ...this.prices };
    }
    
    // Check if prices are fresh
    areRecentPrices() {
        const now = Date.now();
        const maxAge = 15 * 60 * 1000; // 15 minutes max age
        
        return (
            this.prices.FB.lastUpdate && (now - this.prices.FB.lastUpdate) < maxAge &&
            this.prices.MY.lastUpdate && (now - this.prices.MY.lastUpdate) < maxAge
        );
    }
    
    // Force price update for both APIs
    async forceUpdate() {
        console.log('🔄 Force updating all prices...');
        await Promise.all([
            this.updateFBPrice(),
            this.updateMYPrice()
        ]);
    }
    
    // Get detailed price status for debugging
    getPriceStatus() {
        const now = Date.now();
        
        return {
            FB: {
                price: this.prices.FB.usd,
                source: this.prices.FB.source,
                lastUpdate: this.prices.FB.lastUpdate,
                minutesAgo: this.prices.FB.lastUpdate ? Math.floor((now - this.prices.FB.lastUpdate) / 60000) : null
            },
            MY: {
                price: this.prices.MY.usd,
                source: this.prices.MY.source,
                ratio: this.prices.MY.ratio,
                lastUpdate: this.prices.MY.lastUpdate,
                minutesAgo: this.prices.MY.lastUpdate ? Math.floor((now - this.prices.MY.lastUpdate) / 60000) : null
            },
            MC: {
                price: this.prices.MC.usd,
                source: this.prices.MC.source,
                fixed: true
            }
        };
    }
    
    // Cleanup method
    destroy() {
        if (this.coinGecko.timer) {
            clearInterval(this.coinGecko.timer);
            this.coinGecko.timer = null;
        }
        
        if (this.unisat.timer) {
            clearInterval(this.unisat.timer);
            this.unisat.timer = null;
        }
        
        console.log('🛑 Hybrid Price Service destroyed');
    }
}

// Initialize global price service when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if not already exists
    if (!window.hybridPriceService) {
        window.hybridPriceService = new HybridPriceService();
        
        // Keep backward compatibility
        window.brc20PriceService = window.hybridPriceService;
        
        console.log('🚀 Global Hybrid Price Service initialized');
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HybridPriceService;
}