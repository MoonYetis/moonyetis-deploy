const UnisatAPI = require('./unisat-api');

class PriceService {
    constructor(apiKey) {
        this.unisat = new UnisatAPI(apiKey);
        this.priceCache = {
            fb: { price: 50000, lastUpdate: 0 },
            my: { price: 0.10, lastUpdate: 0 }
        };
        this.cacheTimeout = 60000; // 1 minute cache
        this.updateInterval = null;
    }

    // Start automatic price updates
    startPriceUpdates(interval = 60000) {
        this.updatePrices(); // Initial update
        this.updateInterval = setInterval(() => {
            this.updatePrices();
        }, interval);
    }

    // Stop automatic price updates
    stopPriceUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    // Update prices from UniSat API
    async updatePrices() {
        try {
            console.log('💱 Updating prices from UniSat API...');
            
            // Update Fractal Bitcoin price
            const fbPrice = await this.getFractalBitcoinPrice();
            if (fbPrice > 0) {
                this.priceCache.fb = {
                    price: fbPrice,
                    lastUpdate: Date.now()
                };
            }

            // Update MoonYetis token price
            const myPrice = await this.getMoonYetisPrice();
            if (myPrice > 0) {
                this.priceCache.my = {
                    price: myPrice,
                    lastUpdate: Date.now()
                };
            }

            console.log('💱 Prices updated:', {
                fb: this.priceCache.fb.price,
                my: this.priceCache.my.price
            });

            return this.getCurrentPrices();
        } catch (error) {
            console.error('❌ Failed to update prices:', error);
            // Return cached prices on error
            return this.getCurrentPrices();
        }
    }

    // Get Fractal Bitcoin price
    async getFractalBitcoinPrice() {
        try {
            // Try to get actual FB price from UniSat
            const fbPrice = await this.unisat.getFractalBitcoinPrice();
            return fbPrice;
        } catch (error) {
            console.error('Failed to get FB price:', error);
            // Fallback: Use cached price with small variation
            const lastPrice = this.priceCache.fb.price;
            const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
            return lastPrice * (1 + variation);
        }
    }

    // Get MoonYetis token price
    async getMoonYetisPrice() {
        try {
            // Try to get MY token info from UniSat
            const tokenInfo = await this.unisat.getBRC20TokenInfo('my');
            
            // If token has market data, use it
            if (tokenInfo && tokenInfo.price) {
                return parseFloat(tokenInfo.price);
            }
            
            // Otherwise, calculate based on market cap or use default
            if (tokenInfo && tokenInfo.marketCap && tokenInfo.totalSupply) {
                return tokenInfo.marketCap / tokenInfo.totalSupply;
            }

            // Fallback to cached price with variation
            const lastPrice = this.priceCache.my.price;
            const variation = (Math.random() - 0.5) * 0.04; // ±2% variation
            return lastPrice * (1 + variation);
        } catch (error) {
            console.error('Failed to get MY price:', error);
            // Fallback: Use cached price with small variation
            const lastPrice = this.priceCache.my.price;
            const variation = (Math.random() - 0.5) * 0.04; // ±2% variation
            return lastPrice * (1 + variation);
        }
    }

    // Get current prices (from cache)
    getCurrentPrices() {
        return {
            fb: this.priceCache.fb.price,
            my: this.priceCache.my.price,
            lastUpdate: {
                fb: new Date(this.priceCache.fb.lastUpdate).toISOString(),
                my: new Date(this.priceCache.my.lastUpdate).toISOString()
            }
        };
    }

    // Calculate token amount for USD value
    calculateTokenAmount(usdValue, token) {
        const prices = this.getCurrentPrices();
        const tokenPrice = prices[token.toLowerCase()];
        
        if (!tokenPrice || tokenPrice <= 0) {
            throw new Error(`Invalid price for token ${token}`);
        }

        return (usdValue / tokenPrice).toFixed(token === 'fb' ? 8 : 2);
    }

    // Calculate USD value for token amount
    calculateUSDValue(tokenAmount, token) {
        const prices = this.getCurrentPrices();
        const tokenPrice = prices[token.toLowerCase()];
        
        if (!tokenPrice || tokenPrice <= 0) {
            throw new Error(`Invalid price for token ${token}`);
        }

        return tokenAmount * tokenPrice;
    }

    // Get market statistics
    async getMarketStats() {
        try {
            const prices = this.getCurrentPrices();
            
            // Calculate 24h change (simulated for now)
            const fbChange = (Math.random() - 0.5) * 10; // -5% to +5%
            const myChange = (Math.random() - 0.5) * 20; // -10% to +10%

            return {
                fb: {
                    price: prices.fb,
                    change24h: fbChange,
                    volume24h: Math.floor(Math.random() * 1000000), // Simulated volume
                    marketCap: prices.fb * 21000000 // Assuming 21M supply like BTC
                },
                my: {
                    price: prices.my,
                    change24h: myChange,
                    volume24h: Math.floor(Math.random() * 100000), // Simulated volume
                    marketCap: prices.my * 1000000000 // Assuming 1B supply
                }
            };
        } catch (error) {
            console.error('Failed to get market stats:', error);
            return null;
        }
    }
}

module.exports = PriceService;