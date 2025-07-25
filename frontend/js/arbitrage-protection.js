// Arbitrage Protection System for MoonYetis Swap
// Protects the ecosystem from users exploiting price differences for profit

class ArbitrageProtection {
    constructor() {
        // User tracking data
        this.userActivity = new Map(); // wallet -> activity data
        
        // Configuration
        this.config = {
            // Base fees
            BASE_FEE: 0.015, // 1.5% base fee (from inspiration image)
            MC_CONVERSION_FEE: 0.03, // 3% fee for MC to FB/MY conversions
            
            // Anti-arbitrage fees
            RAPID_SWAP_FEE: 0.005, // +0.5% for rapid consecutive swaps
            PATTERN_DETECTION_FEE: 0.01, // +1% for detected arbitrage patterns
            
            // Time limits
            SWAP_COOLDOWN: 30000, // 30 seconds between swaps
            RAPID_SWAP_THRESHOLD: 60000, // 1 minute = rapid swap
            
            // Amount limits (in USD equivalent)
            MAX_SWAP_USD: 100, // $100 max per swap
            MAX_DAILY_USD: 500, // $500 max per day
            
            // Pattern detection
            PATTERN_WINDOW: 300000, // 5 minutes window to detect patterns
            BLACKLIST_DURATION: 3600000, // 1 hour blacklist for obvious arbitrage
            
            // Progressive fees based on amount
            LARGE_AMOUNT_THRESHOLD: 50, // $50 USD
            LARGE_AMOUNT_FEE: 0.005 // +0.5% for large amounts
        };
        
        // Detected patterns
        this.suspiciousPatterns = [
            ['FB', 'MC', 'MY'], // FB → MC → MY
            ['MY', 'MC', 'FB'], // MY → MC → FB
            ['FB', 'MC', 'MY', 'MC'], // FB → MC → MY → MC
            ['MY', 'MC', 'FB', 'MC'] // MY → MC → FB → MC
        ];
        
        console.log('🛡️ ArbitrageProtection initialized');
        this.startCleanupTimer();
    }
    
    // Check if swap is allowed and calculate fees
    checkSwapAllowed(walletAddress, fromToken, toToken, amountUSD) {
        const now = Date.now();
        const userActivity = this.getUserActivity(walletAddress);
        
        // Check if user is blacklisted
        if (userActivity.blacklistedUntil && now < userActivity.blacklistedUntil) {
            const remainingMinutes = Math.ceil((userActivity.blacklistedUntil - now) / 60000);
            return {
                allowed: false,
                reason: 'Temporary restriction due to suspicious activity',
                remainingTime: remainingMinutes
            };
        }
        
        // Check daily limits
        const dailyUsage = this.getDailyUsage(userActivity, now);
        if (dailyUsage + amountUSD > this.config.MAX_DAILY_USD) {
            return {
                allowed: false,
                reason: `Daily limit exceeded. Max: $${this.config.MAX_DAILY_USD}, Used: $${dailyUsage.toFixed(2)}`
            };
        }
        
        // Check per-swap limits
        if (amountUSD > this.config.MAX_SWAP_USD) {
            return {
                allowed: false,
                reason: `Amount too large. Max per swap: $${this.config.MAX_SWAP_USD}`
            };
        }
        
        // Check cooldown
        const lastSwap = userActivity.lastSwapTime;
        if (lastSwap && (now - lastSwap) < this.config.SWAP_COOLDOWN) {
            const remainingSeconds = Math.ceil((this.config.SWAP_COOLDOWN - (now - lastSwap)) / 1000);
            return {
                allowed: false,
                reason: 'Swap cooldown active',
                remainingTime: remainingSeconds
            };
        }
        
        // Calculate fees
        const feeCalculation = this.calculateFees(userActivity, fromToken, toToken, amountUSD, now);
        
        return {
            allowed: true,
            fees: feeCalculation
        };
    }
    
    // Calculate total fees for the swap
    calculateFees(userActivity, fromToken, toToken, amountUSD, now) {
        // Check if this is an MC to FB/MY conversion that needs 3% fee
        let totalFee;
        const feeBreakdown = [];
        
        if (fromToken === 'MC' && (toToken === 'FB' || toToken === 'MY')) {
            // Use 3% fee for MC conversions instead of base fee
            totalFee = this.config.MC_CONVERSION_FEE;
            feeBreakdown.push({
                type: 'Anti-Arbitrage Fee',
                percentage: this.config.MC_CONVERSION_FEE,
                reason: 'Protection fee for MC to FB/MY conversion'
            });
        } else {
            // Use standard base fee for other conversions
            totalFee = this.config.BASE_FEE;
            feeBreakdown.push({
                type: 'Base Fee',
                percentage: this.config.BASE_FEE,
                reason: 'Standard platform fee'
            });
        }
        
        // Check for rapid swaps
        if (userActivity.lastSwapTime && (now - userActivity.lastSwapTime) < this.config.RAPID_SWAP_THRESHOLD) {
            totalFee += this.config.RAPID_SWAP_FEE;
            feeBreakdown.push({
                type: 'Rapid Swap Fee',
                percentage: this.config.RAPID_SWAP_FEE,
                reason: 'Additional fee for quick consecutive swaps'
            });
        }
        
        // Check for large amounts
        if (amountUSD > this.config.LARGE_AMOUNT_THRESHOLD) {
            totalFee += this.config.LARGE_AMOUNT_FEE;
            feeBreakdown.push({
                type: 'Large Amount Fee',
                percentage: this.config.LARGE_AMOUNT_FEE,
                reason: `Additional fee for amounts over $${this.config.LARGE_AMOUNT_THRESHOLD}`
            });
        }
        
        // Check for arbitrage patterns
        const swapPath = `${fromToken}-${toToken}`;
        userActivity.recentSwaps = userActivity.recentSwaps || [];
        
        // Add current swap to recent history for pattern detection
        const recentSwaps = [...userActivity.recentSwaps, { path: swapPath, time: now }];
        
        // Check for suspicious patterns
        const patternDetected = this.detectArbitragePattern(recentSwaps, now);
        if (patternDetected.detected) {
            totalFee += this.config.PATTERN_DETECTION_FEE;
            feeBreakdown.push({
                type: 'Pattern Detection Fee',
                percentage: this.config.PATTERN_DETECTION_FEE,
                reason: `Suspicious trading pattern detected: ${patternDetected.pattern}`
            });
        }
        
        // Cap total fee at reasonable maximum
        const maxFee = 0.05; // 5% maximum
        totalFee = Math.min(totalFee, maxFee);
        
        return {
            totalPercentage: totalFee,
            breakdown: feeBreakdown,
            patternDetected: patternDetected.detected,
            patternType: patternDetected.pattern
        };
    }
    
    // Detect arbitrage patterns
    detectArbitragePattern(recentSwaps, now) {
        // Only look at swaps within the pattern window
        const relevantSwaps = recentSwaps.filter(swap => 
            (now - swap.time) < this.config.PATTERN_WINDOW
        );
        
        if (relevantSwaps.length < 3) {
            return { detected: false };
        }
        
        // Extract token sequence
        const tokenSequence = relevantSwaps.map(swap => {
            const [from, to] = swap.path.split('-');
            return [from, to];
        }).flat();
        
        // Remove duplicates while preserving order
        const uniqueSequence = [];
        tokenSequence.forEach(token => {
            if (uniqueSequence[uniqueSequence.length - 1] !== token) {
                uniqueSequence.push(token);
            }
        });
        
        // Check against known suspicious patterns
        for (const pattern of this.suspiciousPatterns) {
            if (this.sequenceMatchesPattern(uniqueSequence, pattern)) {
                return {
                    detected: true,
                    pattern: pattern.join(' → '),
                    sequence: uniqueSequence.join(' → ')
                };
            }
        }
        
        // Check for circular patterns (ending where it started)
        if (uniqueSequence.length >= 4 && uniqueSequence[0] === uniqueSequence[uniqueSequence.length - 1]) {
            return {
                detected: true,
                pattern: 'Circular arbitrage',
                sequence: uniqueSequence.join(' → ')
            };
        }
        
        return { detected: false };
    }
    
    // Check if sequence matches a suspicious pattern
    sequenceMatchesPattern(sequence, pattern) {
        if (sequence.length < pattern.length) return false;
        
        for (let i = 0; i <= sequence.length - pattern.length; i++) {
            let matches = true;
            for (let j = 0; j < pattern.length; j++) {
                if (sequence[i + j] !== pattern[j]) {
                    matches = false;
                    break;
                }
            }
            if (matches) return true;
        }
        
        return false;
    }
    
    // Record a completed swap
    recordSwap(walletAddress, fromToken, toToken, amountUSD) {
        const now = Date.now();
        const userActivity = this.getUserActivity(walletAddress);
        
        // Record swap
        userActivity.swaps = userActivity.swaps || [];
        userActivity.swaps.push({
            from: fromToken,
            to: toToken,
            amount: amountUSD,
            timestamp: now
        });
        
        // Update recent swaps for pattern detection
        userActivity.recentSwaps = userActivity.recentSwaps || [];
        userActivity.recentSwaps.push({
            path: `${fromToken}-${toToken}`,
            time: now
        });
        
        // Clean old recent swaps
        userActivity.recentSwaps = userActivity.recentSwaps.filter(swap =>
            (now - swap.time) < this.config.PATTERN_WINDOW
        );
        
        // Update last swap time
        userActivity.lastSwapTime = now;
        
        // Check if user should be blacklisted
        this.checkForBlacklist(walletAddress, userActivity, now);
    }
    
    // Check if user should be temporarily blacklisted
    checkForBlacklist(walletAddress, userActivity, now) {
        const recentSwaps = userActivity.swaps?.filter(swap =>
            (now - swap.timestamp) < this.config.PATTERN_WINDOW
        ) || [];
        
        // Blacklist if too many swaps in short time with obvious arbitrage pattern
        if (recentSwaps.length >= 4) {
            const pattern = this.detectArbitragePattern(userActivity.recentSwaps || [], now);
            if (pattern.detected && pattern.pattern.includes('→')) {
                userActivity.blacklistedUntil = now + this.config.BLACKLIST_DURATION;
                console.warn(`🚫 User ${walletAddress.substring(0, 8)}... temporarily blacklisted for arbitrage pattern: ${pattern.pattern}`);
            }
        }
    }
    
    // Get user activity data
    getUserActivity(walletAddress) {
        if (!this.userActivity.has(walletAddress)) {
            this.userActivity.set(walletAddress, {
                swaps: [],
                recentSwaps: [],
                lastSwapTime: null,
                blacklistedUntil: null
            });
        }
        return this.userActivity.get(walletAddress);
    }
    
    // Calculate daily usage in USD
    getDailyUsage(userActivity, now) {
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        const recentSwaps = userActivity.swaps?.filter(swap =>
            swap.timestamp > oneDayAgo
        ) || [];
        
        return recentSwaps.reduce((total, swap) => total + swap.amount, 0);
    }
    
    // Get user's current status
    getUserStatus(walletAddress) {
        const userActivity = this.getUserActivity(walletAddress);
        const now = Date.now();
        
        return {
            dailyUsage: this.getDailyUsage(userActivity, now),
            dailyLimit: this.config.MAX_DAILY_USD,
            recentSwaps: userActivity.recentSwaps?.length || 0,
            isBlacklisted: userActivity.blacklistedUntil && now < userActivity.blacklistedUntil,
            blacklistRemaining: userActivity.blacklistedUntil ? 
                Math.max(0, Math.ceil((userActivity.blacklistedUntil - now) / 60000)) : 0,
            lastSwapTime: userActivity.lastSwapTime,
            cooldownRemaining: userActivity.lastSwapTime ?
                Math.max(0, Math.ceil((this.config.SWAP_COOLDOWN - (now - userActivity.lastSwapTime)) / 1000)) : 0
        };
    }
    
    // Clean up old data periodically
    startCleanupTimer() {
        setInterval(() => {
            this.cleanupOldData();
        }, 60000); // Clean every minute
    }
    
    cleanupOldData() {
        const now = Date.now();
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        
        for (const [walletAddress, activity] of this.userActivity.entries()) {
            // Clean old swaps
            if (activity.swaps) {
                activity.swaps = activity.swaps.filter(swap => swap.timestamp > oneDayAgo);
            }
            
            // Clean old recent swaps
            if (activity.recentSwaps) {
                activity.recentSwaps = activity.recentSwaps.filter(swap =>
                    (now - swap.time) < this.config.PATTERN_WINDOW
                );
            }
            
            // Remove blacklist if expired
            if (activity.blacklistedUntil && now > activity.blacklistedUntil) {
                activity.blacklistedUntil = null;
            }
            
            // Remove empty user data
            if (!activity.swaps?.length && !activity.recentSwaps?.length && 
                !activity.blacklistedUntil && !activity.lastSwapTime) {
                this.userActivity.delete(walletAddress);
            }
        }
    }
}

// Initialize global arbitrage protection
document.addEventListener('DOMContentLoaded', () => {
    if (!window.arbitrageProtection) {
        window.arbitrageProtection = new ArbitrageProtection();
        console.log('🛡️ Global ArbitrageProtection initialized');
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ArbitrageProtection;
}