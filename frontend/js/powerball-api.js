// Powerball API Integration for Jupiter Lottery
// Uses NY State official government database for complete transparency
console.log('🔌 Powerball API Integration Loading...');

// API Configuration
const POWERBALL_CONFIG = {
    // Official NY State government database
    baseUrl: 'https://data.ny.gov/resource/d6yy-54nr.json',
    
    // Backup APIs (in case primary fails)
    backupUrls: [
        'https://data.ny.gov/api/views/d6yy-54nr/rows.json?accessType=DOWNLOAD'
    ],
    
    // Cache settings
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    
    // Verification URLs for transparency
    verificationUrls: {
        official: 'https://powerball.com/numbers/',
        home: 'https://powerball.com',
        nyGov: 'https://data.ny.gov/Government-Finance/Lottery-Powerball-Winning-Numbers-Beginning-2010/d6yy-54nr'
    }
};

// Cache management
const powerballCache = {
    lastUpdate: null,
    latestResult: null,
    resultHistory: [],
    
    isValid() {
        return this.lastUpdate && (Date.now() - this.lastUpdate) < POWERBALL_CONFIG.cacheTimeout;
    },
    
    set(data) {
        this.lastUpdate = Date.now();
        this.latestResult = data;
        console.log('✅ Powerball cache updated:', data);
    },
    
    get() {
        if (this.isValid()) {
            console.log('📦 Using cached Powerball data');
            return this.latestResult;
        }
        return null;
    }
};

// Main Powerball API class
class PowerballAPI {
    
    /**
     * Get the latest Powerball result
     * @returns {Promise<Object>} Latest draw result with transparency info
     */
    static async getLatestResult() {
        try {
            // Check cache first
            const cached = powerballCache.get();
            if (cached) {
                return cached;
            }
            
            console.log('🔍 Fetching latest Powerball results from NY State...');
            
            // Fetch from official NY State API
            const response = await fetch(`${POWERBALL_CONFIG.baseUrl}?$limit=1&$order=draw_date DESC`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data || data.length === 0) {
                throw new Error('No data received from API');
            }
            
            const result = this.parseResult(data[0]);
            
            // Cache the result
            powerballCache.set(result);
            
            return result;
            
        } catch (error) {
            console.error('❌ Error fetching latest Powerball result:', error);
            
            // Try backup source or return cached data if available
            return await this.handleError(error);
        }
    }
    
    /**
     * Get Powerball results for a specific date range
     * @param {number} limit - Number of results to fetch
     * @returns {Promise<Array>} Array of draw results
     */
    static async getRecentResults(limit = 10) {
        try {
            console.log(`🔍 Fetching last ${limit} Powerball results...`);
            
            const response = await fetch(`${POWERBALL_CONFIG.baseUrl}?$limit=${limit}&$order=draw_date DESC`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            return data.map(draw => this.parseResult(draw));
            
        } catch (error) {
            console.error('❌ Error fetching recent results:', error);
            return [];
        }
    }
    
    /**
     * Get result for specific date
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<Object|null>} Draw result or null if not found
     */
    static async getResultByDate(date) {
        try {
            console.log(`🔍 Fetching Powerball result for ${date}...`);
            
            // Format date for API query
            const searchDate = `${date}T00:00:00.000`;
            const response = await fetch(`${POWERBALL_CONFIG.baseUrl}?draw_date=${searchDate}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data || data.length === 0) {
                return null;
            }
            
            return this.parseResult(data[0]);
            
        } catch (error) {
            console.error(`❌ Error fetching result for ${date}:`, error);
            return null;
        }
    }
    
    /**
     * Parse raw API result into standardized format
     * @param {Object} rawResult - Raw result from NY State API
     * @returns {Object} Parsed result with verification info
     */
    static parseResult(rawResult) {
        if (!rawResult || !rawResult.winning_numbers) {
            throw new Error('Invalid result data');
        }
        
        // Parse "28 48 51 61 69 20" format
        const numbers = rawResult.winning_numbers.split(' ').map(n => parseInt(n.trim()));
        
        if (numbers.length !== 6) {
            throw new Error('Invalid number format in result');
        }
        
        const drawDate = new Date(rawResult.draw_date);
        const dateString = drawDate.toISOString().split('T')[0];
        
        return {
            // Core data
            drawDate: rawResult.draw_date,
            dateString: dateString,
            numbers: numbers.slice(0, 5), // First 5 are white balls
            powerball: numbers[5], // Last number is Powerball
            multiplier: rawResult.multiplier || '1',
            
            // Raw data for verification
            rawNumbers: rawResult.winning_numbers,
            
            // Verification URLs for transparency
            verification: {
                official: `${POWERBALL_CONFIG.verificationUrls.official}${dateString.replace(/-/g, '-')}`,
                powerballHome: POWERBALL_CONFIG.verificationUrls.home,
                nyGovSource: POWERBALL_CONFIG.verificationUrls.nyGov,
                rawDataLink: `${POWERBALL_CONFIG.baseUrl}?draw_date=${rawResult.draw_date}`
            },
            
            // Formatted display
            formatted: {
                date: drawDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                }),
                numbers: numbers.slice(0, 5).map(n => n.toString().padStart(2, '0')),
                powerball: numbers[5].toString().padStart(2, '0')
            }
        };
    }
    
    /**
     * Handle API errors with fallbacks
     * @param {Error} error - The error that occurred
     * @returns {Object|null} Cached data or null
     */
    static async handleError(error) {
        console.warn('⚠️ Primary API failed, trying fallback strategies...');
        
        // Return cached data if available
        if (powerballCache.latestResult) {
            console.log('📦 Using last cached result due to API error');
            return {
                ...powerballCache.latestResult,
                isStale: true,
                error: 'Using cached data - API temporarily unavailable'
            };
        }
        
        // Try backup URLs
        for (const backupUrl of POWERBALL_CONFIG.backupUrls) {
            try {
                console.log(`🔄 Trying backup URL: ${backupUrl}`);
                const response = await fetch(backupUrl);
                if (response.ok) {
                    const data = await response.json();
                    // Handle different format from backup API
                    return this.parseBackupResult(data);
                }
            } catch (backupError) {
                console.warn('⚠️ Backup URL also failed:', backupError.message);
            }
        }
        
        // All sources failed
        throw new Error(`All Powerball API sources failed: ${error.message}`);
    }
    
    /**
     * Parse backup API result
     * @param {Object} data - Data from backup API
     * @returns {Object} Parsed result
     */
    static parseBackupResult(data) {
        // This would handle different backup API formats
        // For now, return a fallback message
        return {
            error: 'Backup parsing not implemented',
            message: 'Please check official Powerball.com for latest results'
        };
    }
    
    /**
     * Check if ticket wins against a draw result
     * @param {Array} ticketNumbers - Player's 5 numbers
     * @param {number} ticketPowerball - Player's Powerball
     * @param {Object} drawResult - Draw result from API
     * @returns {Object} Win details
     */
    static checkTicket(ticketNumbers, ticketPowerball, drawResult) {
        if (!drawResult || !drawResult.numbers) {
            return { error: 'Invalid draw result' };
        }
        
        // Count matching white balls
        const matches = ticketNumbers.filter(num => drawResult.numbers.includes(num)).length;
        const powerballMatch = ticketPowerball === drawResult.powerball;
        
        // Determine prize level
        let prizeLevel = null;
        let prize = 0;
        
        if (matches === 5 && powerballMatch) {
            prizeLevel = '5+PB';
            prize = 50000; // 50K MC
        } else if (matches === 5) {
            prizeLevel = '5+0';
            prize = 10000; // 10K MC
        } else if (matches === 4 && powerballMatch) {
            prizeLevel = '4+PB';
            prize = 2000; // 2K MC
        } else if (matches === 4) {
            prizeLevel = '4+0';
            prize = 500; // 500 MC
        } else if (matches === 3 && powerballMatch) {
            prizeLevel = '3+PB';
            prize = 500; // 500 MC
        } else if (matches === 3) {
            prizeLevel = '3+0';
            prize = 200; // 200 MC
        } else if (matches === 2 && powerballMatch) {
            prizeLevel = '2+PB';
            prize = 200; // 200 MC
        } else if (matches === 1 && powerballMatch) {
            prizeLevel = '1+PB';
            prize = 100; // 100 MC - break even
        } else if (matches === 0 && powerballMatch) {
            prizeLevel = '0+PB';
            prize = 100; // 100 MC - break even
        }
        
        return {
            matches,
            powerballMatch,
            prizeLevel,
            prize,
            isWinner: prize > 0,
            
            // Verification info
            verification: {
                drawDate: drawResult.dateString,
                winningNumbers: drawResult.numbers,
                winningPowerball: drawResult.powerball,
                ticketNumbers,
                ticketPowerball,
                verifyUrl: drawResult.verification.official
            }
        };
    }
    
    /**
     * Get next draw date
     * @returns {Date} Next Powerball draw date
     */
    static getNextDrawDate() {
        const now = new Date();
        const drawDays = [1, 3, 6]; // Monday, Wednesday, Saturday
        
        let nextDraw = new Date(now);
        nextDraw.setHours(22, 59, 0, 0); // 10:59 PM ET
        
        // Find next draw day
        while (!drawDays.includes(nextDraw.getDay()) || nextDraw <= now) {
            nextDraw.setDate(nextDraw.getDate() + 1);
        }
        
        return nextDraw;
    }
    
    /**
     * Test API connectivity
     * @returns {Promise<boolean>} True if API is accessible
     */
    static async testConnectivity() {
        try {
            console.log('🔍 Testing Powerball API connectivity...');
            
            const response = await fetch(`${POWERBALL_CONFIG.baseUrl}?$limit=1`);
            const isConnected = response.ok;
            
            console.log(isConnected ? '✅ API connectivity OK' : '❌ API connectivity failed');
            return isConnected;
            
        } catch (error) {
            console.error('❌ API connectivity test failed:', error);
            return false;
        }
    }
}

// Auto-update functionality
class PowerballAutoUpdater {
    constructor() {
        this.updateInterval = null;
        this.isRunning = false;
    }
    
    start(intervalMinutes = 30) {
        if (this.isRunning) return;
        
        console.log(`🔄 Starting Powerball auto-updater (${intervalMinutes}min intervals)`);
        
        this.updateInterval = setInterval(async () => {
            try {
                await PowerballAPI.getLatestResult();
                
                // Notify UI if there's a new result
                const event = new CustomEvent('powerballUpdated', {
                    detail: { timestamp: Date.now() }
                });
                window.dispatchEvent(event);
                
            } catch (error) {
                console.error('❌ Auto-update failed:', error);
            }
        }, intervalMinutes * 60 * 1000);
        
        this.isRunning = true;
    }
    
    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            this.isRunning = false;
            console.log('⏹️ Powerball auto-updater stopped');
        }
    }
}

// Global exports
window.PowerballAPI = PowerballAPI;
window.powerballCache = powerballCache;
window.powerballAutoUpdater = new PowerballAutoUpdater();

// Initialize auto-updater on load
document.addEventListener('DOMContentLoaded', () => {
    // Test connectivity and start auto-updater
    PowerballAPI.testConnectivity().then(connected => {
        if (connected) {
            window.powerballAutoUpdater.start(30); // Update every 30 minutes
        } else {
            console.warn('⚠️ Powerball API not accessible - auto-updater disabled');
        }
    });
});

console.log('✅ Powerball API Integration Loaded');