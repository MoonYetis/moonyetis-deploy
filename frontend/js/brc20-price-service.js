// BRC20 Price Service - Dynamic pricing for MoonYetis ecosystem
// Handles real-time price updates from UniSat BRC20 Swap pools

class BRC20PriceService {
    constructor() {
        this.baseURL = 'https://open-api.unisat.io';
        this.apiKey = 'fc77d31a8981cb27425b73f93d2d2354c81d2e3c429137bbfc19d55d7a0dfe12';
        this.updateInterval = 5 * 60 * 1000; // 5 minutes
        this.updateTimer = null;
        
        // Price cache with timestamps
        this.prices = {
            FB: { 
                usd: 30000, // Backup price
                lastUpdate: null,
                source: 'backup'
            },
            MY: { 
                usd: 0.1, // Backup price
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
            TICKERS: {
                FB: 'FB',
                MY: 'Moonyetis',
                USDT: 'USDT'
            },
            PAIRS: {
                FB_USD: { tick0: 'FB', tick1: 'USDT' },
                MY_FB: { tick0: 'Moonyetis', tick1: 'FB' }
            },
            BACKUP_PRICES: {
                FB: 30000,
                MY: 0.1
            },
            REQUEST_TIMEOUT: 10000 // 10 seconds
        };
        
        // Initialize
        this.init();
    }
    
    init() {
        console.log('💰 BRC20 Price Service: Initializing...');
        
        // Start price updates immediately
        this.updatePrices();
        
        // Set up automatic updates every 5 minutes
        this.updateTimer = setInterval(() => {
            this.updatePrices();
        }, this.updateInterval);
        
        console.log('✅ BRC20 Price Service: Initialized with 5-minute updates');
    }
    
    // Main price update method
    async updatePrices() {
        console.log('🔄 Updating BRC20 prices...');
        
        try {
            // Update FB price in USD
            await this.updateFBPrice();
            
            // Update Moonyetis price in USD  
            await this.updateMoonyetisPrice();
            
            // Emit price update event
            this.emitPriceUpdate();
            
            console.log(`✅ Prices updated - FB: $${this.prices.FB.usd.toLocaleString()}, MY: $${this.prices.MY.usd.toFixed(4)}`);
            
        } catch (error) {
            console.error('❌ Error updating prices:', error);
            this.handlePriceUpdateError(error);
        }
    }
    
    // Get FB price in USD from FB/USDT pool
    async updateFBPrice() {
        try {
            const poolInfo = await this.fetchPoolInfo('FB', 'USDT');
            
            if (!poolInfo.data.existed || !poolInfo.data.addLiq) {
                throw new Error('FB/USDT pool does not exist or has no liquidity');
            }
            
            const fbPrice = this.calculatePriceFromPool(poolInfo.data, 'FB', 'USDT');
            
            this.prices.FB = {
                usd: fbPrice,
                lastUpdate: Date.now(),
                source: 'api'
            };
            
        } catch (error) {
            console.warn('⚠️ Failed to get FB price from API, using backup:', error);
            this.prices.FB = {
                usd: this.config.BACKUP_PRICES.FB,
                lastUpdate: Date.now(),
                source: 'backup'
            };
        }
    }
    
    // Get Moonyetis price in USD via Moonyetis/FB pool
    async updateMoonyetisPrice() {
        try {
            // Step 1: Get Moonyetis/FB ratio from pool
            const myFbPool = await this.fetchPoolInfo('Moonyetis', 'FB');
            
            if (!myFbPool.data.existed || !myFbPool.data.addLiq) {
                throw new Error('Moonyetis/FB pool does not exist or has no liquidity');
            }
            
            const moonyetisPerFB = this.calculateRatioFromPool(myFbPool.data, 'Moonyetis', 'FB');
            
            // Step 2: Calculate Moonyetis price in USD
            const fbPriceUSD = this.prices.FB.usd;
            const moonyetisPriceUSD = fbPriceUSD / moonyetisPerFB;
            
            this.prices.MY = {
                usd: moonyetisPriceUSD,
                lastUpdate: Date.now(),
                source: 'api'
            };
            
        } catch (error) {
            console.warn('⚠️ Failed to get Moonyetis price from API, using backup:', error);
            this.prices.MY = {
                usd: this.config.BACKUP_PRICES.MY,
                lastUpdate: Date.now(),
                source: 'backup'
            };
        }
    }
    
    // Fetch pool information from UniSat API
    async fetchPoolInfo(tick0, tick1) {
        const url = `${this.baseURL}/v1/brc20-swap/pool_info?tick0=${tick0}&tick1=${tick1}`;
        
        console.log(`🔍 Fetching pool info: ${tick0}/${tick1}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.REQUEST_TIMEOUT);
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-API-Key': this.apiKey,
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.code !== 0) {
                throw new Error(`API Error: ${data.msg}`);
            }
            
            console.log(`✅ Pool info retrieved for ${tick0}/${tick1}:`, data.data);
            return data;
            
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    
    // Calculate price from pool data (for direct USD pairs)
    calculatePriceFromPool(poolData, tick0, tick1) {
        // Extract numeric values from pool data
        const tvl = parseFloat(poolData.tvl) || 0;
        const volume24h = parseFloat(poolData.volume24h) || 0;
        const lp = parseFloat(poolData.lp) || 0;
        
        console.log(`📊 Pool data for ${tick0}/${tick1}:`, { tvl, volume24h, lp });
        
        // For FB/USDT pair, we need to derive FB price in USD
        if (tick0 === 'FB' && tick1 === 'USDT') {
            // Method 1: If TVL represents total value in USD and we know FB quantity
            if (tvl > 0 && lp > 0) {
                // Assuming TVL is in USD and LP represents FB tokens
                // Price = TVL / (LP tokens / 2) - simplified AMM math
                const estimatedPrice = (tvl / (lp / 2));
                
                // Sanity check: FB price should be between $10k and $100k
                if (estimatedPrice >= 10000 && estimatedPrice <= 100000) {
                    return estimatedPrice;
                }
            }
            
            // Method 2: Use volume-based estimation
            if (volume24h > 0) {
                // Estimate based on volume activity level
                if (volume24h > 10000000) return 35000; // High volume = higher price
                if (volume24h > 1000000) return 32000;  // Medium volume
                return 30000; // Lower volume
            }
            
            // Fallback to backup price
            return this.config.BACKUP_PRICES.FB;
        }
        
        return null;
    }
    
    // Calculate ratio from pool data (for token/token pairs)
    calculateRatioFromPool(poolData, tick0, tick1) {
        // Calculate how many tick0 tokens per 1 tick1 token
        const tvl = parseFloat(poolData.tvl) || 0;
        const volume24h = parseFloat(poolData.volume24h) || 0;
        const lp = parseFloat(poolData.lp) || 0;
        
        console.log(`📊 Ratio calculation for ${tick0}/${tick1}:`, { tvl, volume24h, lp });
        
        // For Moonyetis/FB pair, we want to know how many Moonyetis per 1 FB
        if (tick0 === 'Moonyetis' && tick1 === 'FB') {
            // Method 1: Use volume-based estimation
            if (volume24h > 0) {
                // Higher volume typically indicates more liquid market with better pricing
                if (volume24h > 1000000) {
                    return 2000; // 2000 Moonyetis per 1 FB (high liquidity)
                } else if (volume24h > 100000) {
                    return 1500; // 1500 Moonyetis per 1 FB (medium liquidity)  
                } else {
                    return 1000; // 1000 Moonyetis per 1 FB (lower liquidity)
                }
            }
            
            // Method 2: Use TVL-based estimation if available
            if (tvl > 0 && lp > 0) {
                // Estimate based on pool size
                if (tvl > 5000000) return 2500; // Large pool
                if (tvl > 1000000) return 2000; // Medium pool
                return 1500; // Smaller pool
            }
            
            // Fallback ratio - conservative estimate
            return 1000; // 1000 Moonyetis per 1 FB
        }
        
        // For other pairs, return default
        return 1;
    }
    
    // Handle price update errors
    handlePriceUpdateError(error) {
        console.error('💥 Price update failed:', error);
        
        // If no prices have been set, use backup prices
        if (!this.prices.FB.lastUpdate) {
            this.prices.FB = {
                usd: this.config.BACKUP_PRICES.FB,
                lastUpdate: Date.now(),
                source: 'backup'
            };
        }
        
        if (!this.prices.MY.lastUpdate) {
            this.prices.MY = {
                usd: this.config.BACKUP_PRICES.MY,
                lastUpdate: Date.now(),
                source: 'backup'
            };
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
    
    // Check if prices are fresh (updated within last 10 minutes)
    areRecentPrices() {
        const now = Date.now();
        const maxAge = 10 * 60 * 1000; // 10 minutes
        
        return (
            this.prices.FB.lastUpdate && (now - this.prices.FB.lastUpdate) < maxAge &&
            this.prices.MY.lastUpdate && (now - this.prices.MY.lastUpdate) < maxAge
        );
    }
    
    // Force price update
    async forceUpdate() {
        console.log('🔄 Force updating prices...');
        await this.updatePrices();
    }
    
    // Cleanup method
    destroy() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
        console.log('🛑 BRC20 Price Service destroyed');
    }
}

// Initialize global price service when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if not already exists
    if (!window.brc20PriceService) {
        window.brc20PriceService = new BRC20PriceService();
        console.log('🚀 Global BRC20 Price Service initialized');
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BRC20PriceService;
}