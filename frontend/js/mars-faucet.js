// MoonYetis Mars Faucet - Free MoonCoins with Ad Integration
console.log('🔴 MoonYetis Mars Faucet Loading...');

// Faucet state management
const marsFaucetState = {
    balance: 0,
    moonCoinBalance: 0,
    connectedWallet: false,
    
    // Claim system
    lastClaimTime: null,
    nextClaimTime: null,
    claimInterval: 8 * 60 * 60 * 1000, // 8 hours in milliseconds
    canClaim: false,
    
    // Rewards
    baseClaim: 1, // 1 MC base reward
    adBonus: 1,   // +1 MC for watching ad
    totalClaims: 0,
    totalClaimed: 0,
    claimHistory: [],
    
    // Ad system
    adReady: false,
    adViewed: false,
    adLoading: false,
    
    // Anti-bot
    captchaAnswer: null,
    captchaSolved: false,
    buttonHoldTime: 0,
    requiredHoldTime: 3000, // 3 seconds
    
    // Stats
    dailyClaims: 0,
    maxDailyClaims: 3, // Max 3 claims per day (every 8 hours)
    weeklyStats: [],
    
    // Settings
    soundEnabled: true,
    notificationsEnabled: true
};

// Number formatting utilities (consistent with other games)
const NumberFormatter = {
    _cache: new Map(),
    
    formatMoonCoin: (amount) => {
        if (NumberFormatter._cache.has(amount)) {
            return NumberFormatter._cache.get(amount);
        }
        
        let result;
        if (amount >= 1000000) {
            result = (amount / 1000000).toFixed(1) + 'M MC';
        } else if (amount >= 1000) {
            result = (amount / 1000).toFixed(0) + 'K MC';
        } else {
            result = amount.toLocaleString() + ' MC';
        }
        
        if (NumberFormatter._cache.size < 1000) {
            NumberFormatter._cache.set(amount, result);
        }
        
        return result;
    },

    // Mars Faucet uses simple MC display only (no USD conversion needed for small amounts)

    formatTime: (milliseconds) => {
        const hours = Math.floor(milliseconds / (1000 * 60 * 60));
        const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }
};

// CAPTCHA system for anti-bot protection
const CaptchaSystem = {
    
    generateCaptcha() {
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        const operators = ['+', '-', '*'];
        const operator = operators[Math.floor(Math.random() * operators.length)];
        
        let answer;
        switch(operator) {
            case '+':
                answer = num1 + num2;
                break;
            case '-':
                answer = Math.abs(num1 - num2); // Keep positive
                break;
            case '*':
                answer = num1 * num2;
                break;
        }
        
        marsFaucetState.captchaAnswer = answer;
        return {
            question: `${num1} ${operator} ${num2} = ?`,
            answer: answer
        };
    },
    
    verifyCaptcha(userAnswer) {
        return parseInt(userAnswer) === marsFaucetState.captchaAnswer;
    }
};

// Ad integration system
const AdSystem = {
    
    init() {
        console.log('📺 Initializing Ad System...');
        this.loadAdSense();
        this.setupRewardedAd();
    },
    
    loadAdSense() {
        // Load Google AdSense if not already loaded
        if (!document.querySelector('script[src*="adsbygoogle.js"]')) {
            const script = document.createElement('script');
            script.async = true;
            script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXX';
            script.crossOrigin = 'anonymous';
            document.head.appendChild(script);
            
            script.onload = () => {
                console.log('✅ AdSense loaded successfully');
                this.initializeAds();
            };
        }
    },
    
    initializeAds() {
        // Initialize display ads
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            console.log('✅ Display ads initialized');
        } catch (error) {
            console.warn('⚠️ AdSense not ready:', error);
        }
    },
    
    setupRewardedAd() {
        // Setup rewarded video ad (would integrate with Google AdMob or similar)
        marsFaucetState.adReady = true;
        console.log('✅ Rewarded ads ready');
    },
    
    showRewardedAd() {
        return new Promise((resolve, reject) => {
            if (!marsFaucetState.adReady) {
                reject('Ad not ready');
                return;
            }
            
            marsFaucetState.adLoading = true;
            
            // Simulate ad loading and viewing
            const adDuration = 15000; // 15 seconds
            
            // Show ad overlay
            this.showAdOverlay(adDuration, (completed) => {
                marsFaucetState.adLoading = false;
                if (completed) {
                    marsFaucetState.adViewed = true;
                    resolve(marsFaucetState.adBonus);
                } else {
                    reject('Ad not completed');
                }
            });
        });
    },
    
    showAdOverlay(duration, callback) {
        const overlay = document.createElement('div');
        overlay.className = 'ad-overlay';
        overlay.innerHTML = `
            <div class="ad-container">
                <div class="ad-header">
                    <h3>📺 Watching Ad for Bonus MC</h3>
                    <div class="ad-timer">
                        <span id="adTimer">${duration/1000}s</span> remaining
                    </div>
                </div>
                <div class="ad-content">
                    <div class="simulated-ad">
                        <h4>🎮 Mars Gaming Gear</h4>
                        <p>Get the best gaming equipment for your Mars missions!</p>
                        <div class="ad-progress-bar">
                            <div class="ad-progress" id="adProgress"></div>
                        </div>
                    </div>
                </div>
                <div class="ad-controls">
                    <button id="skipAdBtn" class="skip-btn" disabled>Skip Ad (Available in <span id="skipTimer">5</span>s)</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        let timeRemaining = duration / 1000;
        let skipAvailable = false;
        
        const timer = setInterval(() => {
            timeRemaining--;
            
            const timerEl = document.getElementById('adTimer');
            const progressEl = document.getElementById('adProgress');
            const skipTimerEl = document.getElementById('skipTimer');
            const skipBtn = document.getElementById('skipAdBtn');
            
            if (timerEl) timerEl.textContent = `${timeRemaining}s`;
            if (progressEl) progressEl.style.width = `${((duration/1000 - timeRemaining) / (duration/1000)) * 100}%`;
            
            // Enable skip after 5 seconds
            if (timeRemaining <= duration/1000 - 5 && !skipAvailable) {
                skipAvailable = true;
                if (skipBtn) {
                    skipBtn.disabled = false;
                    skipBtn.innerHTML = 'Skip Ad (No Bonus)';
                    skipBtn.onclick = () => {
                        clearInterval(timer);
                        overlay.remove();
                        callback(false);
                    };
                }
            }
            
            if (timeRemaining <= 0) {
                clearInterval(timer);
                overlay.remove();
                callback(true);
            }
        }, 1000);
    }
};

// Main Mars Faucet game logic
const marsFaucetGame = {
    
    init() {
        console.log('🔴 Initializing MoonYetis Mars Faucet...');
        this.createGameInterface();
        this.setupEventListeners();
        this.setupBalanceManager();
        this.loadFaucetState();
        this.startClaimTimer();
        this.updateUI();
        AdSystem.init();
        console.log('✅ Mars Faucet initialized successfully');
    },

    setupBalanceManager() {
        // Wait for BalanceManager to be available
        if (window.balanceManager) {
            // Register this game with the BalanceManager
            window.balanceManager.registerGame('mars-faucet', (balanceData) => {
                console.log('🔴 Mars Faucet: Received balance update:', balanceData.balance, 'MC');
                marsFaucetState.moonCoinBalance = balanceData.balance;
                this.updateUI();
            });

            // Get current balance
            marsFaucetState.moonCoinBalance = window.balanceManager.getBalance();
            console.log(`🔴 Mars Faucet: Synced with BalanceManager - ${marsFaucetState.moonCoinBalance} MC`);
        } else {
            console.warn('⚠️ BalanceManager not available, using local balance');
        }
    },

    createGameInterface() {
        const container = document.getElementById('mars-faucet-container');
        if (!container) {
            console.error('❌ Mars faucet container not found');
            return;
        }

        container.innerHTML = `
            <div class="mars-faucet-game">
                <!-- Header with Mars Theme -->
                <div class="mars-header">
                    <div class="mars-title-section">
                        <h2 class="game-title">🔴 Mars Faucet</h2>
                        <div class="mars-subtitle">Free MoonCoins Every 8 Hours</div>
                    </div>
                    
                    <div class="mars-info-badges">
                        <div class="info-badge">
                            <span class="badge-icon">⏰</span>
                            <span class="badge-text">8 Hour Claims</span>
                        </div>
                        <div class="info-badge">
                            <span class="badge-icon">📺</span>
                            <span class="badge-text">Ad Bonus Available</span>
                        </div>
                        <div class="info-badge">
                            <span class="badge-icon">🛡️</span>
                            <span class="badge-text">Anti-Bot Protected</span>
                        </div>
                    </div>
                </div>

                <!-- Top Banner Ad Space -->
                <div class="ad-banner-top">
                    <!-- AdSense Banner Ad -->
                    <ins class="adsbygoogle"
                         style="display:block"
                         data-ad-client="ca-pub-XXXXXXXXXXXXXXX"
                         data-ad-slot="XXXXXXXXXX"
                         data-ad-format="auto"
                         data-full-width-responsive="true"></ins>
                </div>

                <div class="mars-main-content">
                    <!-- Left Section: Faucet Interface -->
                    <div class="faucet-section">
                        <!-- Claim Status -->
                        <div class="claim-status-card">
                            <div class="status-header">
                                <h3>🎯 Claim Status</h3>
                                <div class="claim-indicator" id="claimIndicator">
                                    <span class="indicator-dot"></span>
                                    <span class="indicator-text">Checking...</span>
                                </div>
                            </div>
                            
                            <div class="countdown-display">
                                <div class="countdown-timer" id="countdownTimer">
                                    <div class="timer-section">
                                        <span class="time-value" id="hoursLeft">0</span>
                                        <span class="time-label">Hours</span>
                                    </div>
                                    <div class="timer-section">
                                        <span class="time-value" id="minutesLeft">0</span>
                                        <span class="time-label">Minutes</span>
                                    </div>
                                    <div class="timer-section">
                                        <span class="time-value" id="secondsLeft">0</span>
                                        <span class="time-label">Seconds</span>
                                    </div>
                                </div>
                                <div class="next-claim-info">
                                    Next claim available: <span id="nextClaimTime">-</span>
                                </div>
                            </div>
                        </div>

                        <!-- Claim Interface -->
                        <div class="claim-interface-card">
                            <div class="reward-display">
                                <div class="base-reward">
                                    <h4>🎁 Base Reward</h4>
                                    <div class="reward-amount">
                                        ${NumberFormatter.formatMoonCoin(marsFaucetState.baseClaim)}
                                    </div>
                                </div>
                                
                                <div class="bonus-reward">
                                    <h4>📺 Ad Bonus</h4>
                                    <div class="reward-amount bonus" id="adBonusAmount">
                                        +${NumberFormatter.formatMoonCoin(marsFaucetState.adBonus)}
                                    </div>
                                    <div class="bonus-note">Watch ad to earn extra!</div>
                                </div>
                            </div>

                            <!-- Anti-Bot Verification -->
                            <div class="verification-section" id="verificationSection" style="display: none;">
                                <h4>🛡️ Verification Required</h4>
                                
                                <!-- CAPTCHA -->
                                <div class="captcha-container">
                                    <label for="captchaInput">Solve to continue:</label>
                                    <div class="captcha-question" id="captchaQuestion">5 + 3 = ?</div>
                                    <input type="number" id="captchaInput" class="captcha-input" placeholder="Your answer...">
                                    <button class="verify-btn" id="verifyCaptchaBtn">✓ Verify</button>
                                </div>
                                
                                <div class="verification-status" id="verificationStatus"></div>
                            </div>

                            <!-- Claim Button -->
                            <div class="claim-button-section">
                                <button class="claim-btn" id="claimButton" disabled>
                                    <span class="btn-icon">🚀</span>
                                    <span class="btn-text">Connect Wallet to Claim</span>
                                    <div class="hold-progress" id="holdProgress"></div>
                                </button>
                                
                                <div class="claim-instructions">
                                    <p>Hold button for 3 seconds to claim</p>
                                </div>
                            </div>

                            <!-- Ad Bonus Section -->
                            <div class="ad-bonus-section">
                                <h4>📺 Watch Ad for Extra MC</h4>
                                <p>Watch a short video ad to earn +${NumberFormatter.formatMoonCoin(marsFaucetState.adBonus)} bonus!</p>
                                <button class="watch-ad-btn" id="watchAdBtn" disabled>
                                    📺 Watch Ad (+1 MC)
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Right Section: Sidebar with Ads -->
                    <div class="sidebar-section">
                        <!-- Sidebar Ad -->
                        <div class="ad-banner-sidebar">
                            <ins class="adsbygoogle"
                                 style="display:block"
                                 data-ad-client="ca-pub-XXXXXXXXXXXXXXX"
                                 data-ad-slot="XXXXXXXXXX"
                                 data-ad-format="rectangle"
                                 data-full-width-responsive="false"></ins>
                        </div>

                        <!-- Faucet Stats -->
                        <div class="faucet-stats-card">
                            <h4>📊 Your Mars Faucet Stats</h4>
                            <div class="stats-grid">
                                <div class="stat-item">
                                    <span class="stat-label">MC Balance:</span>
                                    <span class="stat-value" id="mcBalance">0 MC</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Total Claims:</span>
                                    <span class="stat-value" id="totalClaims">0</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Total Earned:</span>
                                    <span class="stat-value" id="totalEarned">0 MC</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Today's Claims:</span>
                                    <span class="stat-value" id="todayClaims">0/3</span>
                                </div>
                            </div>
                        </div>

                        <!-- Recent Claims History -->
                        <div class="claim-history-card">
                            <h4>📋 Recent Claims</h4>
                            <div class="history-list" id="claimHistory">
                                <p class="no-claims">No claims yet</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Bottom Banner Ad -->
                <div class="ad-banner-bottom">
                    <ins class="adsbygoogle"
                         style="display:block"
                         data-ad-client="ca-pub-XXXXXXXXXXXXXXX"
                         data-ad-slot="XXXXXXXXXX"
                         data-ad-format="auto"
                         data-full-width-responsive="true"></ins>
                </div>

                <!-- Messages -->
                <div class="message-area">
                    <div class="message" id="marsMessage"></div>
                </div>

                <!-- Mars Background Elements -->
                <div class="mars-background">
                    <div class="mars-surface"></div>
                    <div class="mars-atmosphere"></div>
                    <div class="floating-rocks">
                        <div class="rock rock-1"></div>
                        <div class="rock rock-2"></div>
                        <div class="rock rock-3"></div>
                    </div>
                </div>
            </div>
        `;
    },

    setupEventListeners() {
        // Claim button with hold-to-claim functionality
        const claimButton = document.getElementById('claimButton');
        if (claimButton) {
            claimButton.addEventListener('mousedown', () => this.startHoldTimer());
            claimButton.addEventListener('mouseup', () => this.stopHoldTimer());
            claimButton.addEventListener('mouseleave', () => this.stopHoldTimer());
            claimButton.addEventListener('touchstart', () => this.startHoldTimer());
            claimButton.addEventListener('touchend', () => this.stopHoldTimer());
        }

        // CAPTCHA verification
        const verifyCaptchaBtn = document.getElementById('verifyCaptchaBtn');
        if (verifyCaptchaBtn) {
            verifyCaptchaBtn.addEventListener('click', () => this.verifyCaptcha());
        }

        // Ad watching
        const watchAdBtn = document.getElementById('watchAdBtn');
        if (watchAdBtn) {
            watchAdBtn.addEventListener('click', () => this.watchAd());
        }

        // CAPTCHA input enter key
        const captchaInput = document.getElementById('captchaInput');
        if (captchaInput) {
            captchaInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.verifyCaptcha();
                }
            });
        }
    },

    loadFaucetState() {
        try {
            const saved = localStorage.getItem('mars-faucet-state');
            if (saved) {
                const savedState = JSON.parse(saved);
                Object.assign(marsFaucetState, savedState);
                
                // Convert timestamps back to Date objects
                if (marsFaucetState.lastClaimTime) {
                    marsFaucetState.lastClaimTime = new Date(marsFaucetState.lastClaimTime);
                }
                if (marsFaucetState.nextClaimTime) {
                    marsFaucetState.nextClaimTime = new Date(marsFaucetState.nextClaimTime);
                }
                
                console.log('✅ Faucet state loaded from storage');
            }
        } catch (error) {
            console.error('❌ Error loading faucet state:', error);
        }
        
        this.updateClaimStatus();
    },

    saveFaucetState() {
        try {
            localStorage.setItem('mars-faucet-state', JSON.stringify(marsFaucetState));
        } catch (error) {
            console.error('❌ Error saving faucet state:', error);
        }
    },

    updateClaimStatus() {
        const now = new Date();
        
        if (!marsFaucetState.lastClaimTime) {
            // First time user
            marsFaucetState.canClaim = true;
        } else {
            const timeSinceLastClaim = now - marsFaucetState.lastClaimTime;
            marsFaucetState.canClaim = timeSinceLastClaim >= marsFaucetState.claimInterval;
            
            if (!marsFaucetState.canClaim) {
                marsFaucetState.nextClaimTime = new Date(marsFaucetState.lastClaimTime.getTime() + marsFaucetState.claimInterval);
            }
        }
        
        // Check daily claim limit
        const today = now.toDateString();
        const todayClaims = marsFaucetState.claimHistory.filter(claim => 
            new Date(claim.timestamp).toDateString() === today
        ).length;
        marsFaucetState.dailyClaims = todayClaims;
        
        if (marsFaucetState.dailyClaims >= marsFaucetState.maxDailyClaims) {
            marsFaucetState.canClaim = false;
        }
    },

    startClaimTimer() {
        setInterval(() => {
            this.updateClaimStatus();
            this.updateCountdown();
            this.updateUI();
        }, 1000);
    },

    updateCountdown() {
        if (marsFaucetState.canClaim) return;
        
        const now = new Date();
        const timeRemaining = marsFaucetState.nextClaimTime - now;
        
        if (timeRemaining <= 0) {
            marsFaucetState.canClaim = true;
            return;
        }
        
        const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
        
        const elements = {
            hoursLeft: hours.toString().padStart(2, '0'),
            minutesLeft: minutes.toString().padStart(2, '0'),
            secondsLeft: seconds.toString().padStart(2, '0'),
            nextClaimTime: marsFaucetState.nextClaimTime.toLocaleTimeString()
        };
        
        for (let id in elements) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = elements[id];
            }
        }
    },

    startHoldTimer() {
        if (!marsFaucetState.canClaim || !marsFaucetState.connectedWallet) return;
        
        marsFaucetState.buttonHoldTime = 0;
        const progressBar = document.getElementById('holdProgress');
        
        marsFaucetState.holdInterval = setInterval(() => {
            marsFaucetState.buttonHoldTime += 100;
            const progress = (marsFaucetState.buttonHoldTime / marsFaucetState.requiredHoldTime) * 100;
            
            if (progressBar) {
                progressBar.style.width = `${Math.min(progress, 100)}%`;
            }
            
            if (marsFaucetState.buttonHoldTime >= marsFaucetState.requiredHoldTime) {
                this.stopHoldTimer();
                this.processClaim();
            }
        }, 100);
    },

    stopHoldTimer() {
        if (marsFaucetState.holdInterval) {
            clearInterval(marsFaucetState.holdInterval);
            marsFaucetState.holdInterval = null;
        }
        
        const progressBar = document.getElementById('holdProgress');
        if (progressBar) {
            progressBar.style.width = '0%';
        }
        
        marsFaucetState.buttonHoldTime = 0;
    },

    async processClaim() {
        if (!marsFaucetState.canClaim) {
            this.showMessage('⏰ You must wait before claiming again!', 'warning');
            return;
        }
        
        if (!marsFaucetState.connectedWallet) {
            this.showMessage('🔗 Connect your wallet first!', 'warning');
            return;
        }
        
        // Show verification section
        this.showVerification();
    },

    showVerification() {
        const verificationSection = document.getElementById('verificationSection');
        if (verificationSection) {
            verificationSection.style.display = 'block';
            
            // Generate new CAPTCHA
            const captcha = CaptchaSystem.generateCaptcha();
            const captchaQuestion = document.getElementById('captchaQuestion');
            if (captchaQuestion) {
                captchaQuestion.textContent = captcha.question;
            }
            
            // Clear previous input
            const captchaInput = document.getElementById('captchaInput');
            if (captchaInput) {
                captchaInput.value = '';
                captchaInput.focus();
            }
            
            marsFaucetState.captchaSolved = false;
        }
    },

    verifyCaptcha() {
        const captchaInput = document.getElementById('captchaInput');
        const verificationStatus = document.getElementById('verificationStatus');
        
        if (!captchaInput || !verificationStatus) return;
        
        const userAnswer = captchaInput.value;
        
        if (CaptchaSystem.verifyCaptcha(userAnswer)) {
            marsFaucetState.captchaSolved = true;
            verificationStatus.innerHTML = '<span class="success">✅ Verification successful!</span>';
            
            setTimeout(() => {
                this.completeClaim();
            }, 1000);
        } else {
            verificationStatus.innerHTML = '<span class="error">❌ Incorrect answer. Try again!</span>';
            
            // Generate new CAPTCHA
            const captcha = CaptchaSystem.generateCaptcha();
            const captchaQuestion = document.getElementById('captchaQuestion');
            if (captchaQuestion) {
                captchaQuestion.textContent = captcha.question;
            }
            captchaInput.value = '';
            captchaInput.focus();
        }
    },

    async completeClaim() {
        let totalClaimed = marsFaucetState.baseClaim;
        
        // Add ad bonus if ad was viewed
        if (marsFaucetState.adViewed) {
            totalClaimed += marsFaucetState.adBonus;
            marsFaucetState.adViewed = false; // Reset for next claim
        }
        
        // Use BalanceManager to add claimed amount
        if (window.balanceManager) {
            window.balanceManager.addBalance(totalClaimed, 'Mars Faucet Claim');
        } else {
            marsFaucetState.moonCoinBalance += totalClaimed; // Fallback to local balance
        }
        
        marsFaucetState.lastClaimTime = new Date();
        marsFaucetState.nextClaimTime = new Date(Date.now() + marsFaucetState.claimInterval);
        marsFaucetState.canClaim = false;
        marsFaucetState.totalClaims++;
        marsFaucetState.totalClaimed += totalClaimed;
        
        // Add to history
        marsFaucetState.claimHistory.unshift({
            timestamp: new Date().toISOString(),
            amount: totalClaimed,
            bonus: marsFaucetState.adViewed ? marsFaucetState.adBonus : 0
        });
        
        // Keep only last 10 claims in history
        if (marsFaucetState.claimHistory.length > 10) {
            marsFaucetState.claimHistory = marsFaucetState.claimHistory.slice(0, 10);
        }
        
        // Save state
        this.saveFaucetState();
        
        // Hide verification
        const verificationSection = document.getElementById('verificationSection');
        if (verificationSection) {
            verificationSection.style.display = 'none';
        }
        
        // Update UI
        this.updateUI();
        this.displayClaimHistory();
        
        // Show success message
        this.showMessage(`🎉 Successfully claimed ${NumberFormatter.formatMoonCoin(totalClaimed)}!`, 'success');
        
        console.log('✅ Claim completed:', {
            amount: totalClaimed,
            newBalance: marsFaucetState.moonCoinBalance
        });
    },

    async watchAd() {
        const watchAdBtn = document.getElementById('watchAdBtn');
        if (watchAdBtn) {
            watchAdBtn.disabled = true;
            watchAdBtn.textContent = '📺 Loading Ad...';
        }
        
        try {
            const bonus = await AdSystem.showRewardedAd();
            this.showMessage(`📺 Ad completed! +${NumberFormatter.formatMoonCoin(bonus)} bonus ready for next claim!`, 'success');
            
            // Enable ad bonus for next claim
            const adBonusAmount = document.getElementById('adBonusAmount');
            if (adBonusAmount) {
                adBonusAmount.classList.add('active');
            }
            
        } catch (error) {
            console.error('Ad viewing failed:', error);
            this.showMessage('📺 Ad viewing cancelled. No bonus earned.', 'warning');
        } finally {
            if (watchAdBtn) {
                watchAdBtn.disabled = false;
                watchAdBtn.textContent = marsFaucetState.adViewed ? '✅ Ad Completed' : '📺 Watch Ad (+1 MC)';
            }
        }
    },

    displayClaimHistory() {
        const historyContainer = document.getElementById('claimHistory');
        if (!historyContainer || marsFaucetState.claimHistory.length === 0) {
            if (historyContainer) {
                historyContainer.innerHTML = '<p class="no-claims">No claims yet</p>';
            }
            return;
        }
        
        historyContainer.innerHTML = marsFaucetState.claimHistory.map(claim => {
            const date = new Date(claim.timestamp);
            const timeAgo = this.getTimeAgo(date);
            
            return `
                <div class="history-item">
                    <div class="claim-amount">+${NumberFormatter.formatMoonCoin(claim.amount)}</div>
                    <div class="claim-time">${timeAgo}</div>
                    ${claim.bonus > 0 ? `<div class="bonus-indicator">📺 +${NumberFormatter.formatMoonCoin(claim.bonus)}</div>` : ''}
                </div>
            `;
        }).join('');
    },

    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    },

    showMessage(text, type = 'info') {
        const messageEl = document.getElementById('marsMessage');
        if (!messageEl) return;

        messageEl.textContent = text;
        messageEl.className = `message ${type}`;
        messageEl.style.display = 'block';

        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);
    },

    updateUI() {
        const elements = {
            'mcBalance': NumberFormatter.formatMoonCoin(marsFaucetState.moonCoinBalance),
            'totalClaims': marsFaucetState.totalClaims.toLocaleString(),
            'totalEarned': NumberFormatter.formatMoonCoin(marsFaucetState.totalClaimed),
            'todayClaims': `${marsFaucetState.dailyClaims}/${marsFaucetState.maxDailyClaims}`
        };

        for (let id in elements) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = elements[id];
            }
        }

        this.updateClaimButton();
        this.updateClaimIndicator();
        this.updateAdButton();
    },

    updateClaimButton() {
        const claimButton = document.getElementById('claimButton');
        if (!claimButton) return;

        if (!marsFaucetState.connectedWallet) {
            claimButton.disabled = true;
            claimButton.querySelector('.btn-text').textContent = 'Connect Wallet to Claim';
            claimButton.className = 'claim-btn disabled';
        } else if (!marsFaucetState.canClaim) {
            claimButton.disabled = true;
            claimButton.querySelector('.btn-text').textContent = 'Claim Not Available';
            claimButton.className = 'claim-btn disabled';
        } else {
            claimButton.disabled = false;
            claimButton.querySelector('.btn-text').textContent = `Claim ${NumberFormatter.formatMoonCoin(marsFaucetState.baseClaim)}`;
            claimButton.className = 'claim-btn active';
        }
    },

    updateClaimIndicator() {
        const indicator = document.getElementById('claimIndicator');
        if (!indicator) return;

        const dot = indicator.querySelector('.indicator-dot');
        const text = indicator.querySelector('.indicator-text');

        if (marsFaucetState.canClaim && marsFaucetState.connectedWallet) {
            dot.className = 'indicator-dot ready';
            text.textContent = 'Ready to Claim!';
        } else if (!marsFaucetState.connectedWallet) {
            dot.className = 'indicator-dot disconnected';
            text.textContent = 'Wallet Disconnected';
        } else {
            dot.className = 'indicator-dot waiting';
            text.textContent = 'Waiting for Next Claim';
        }
    },

    updateAdButton() {
        const watchAdBtn = document.getElementById('watchAdBtn');
        if (!watchAdBtn) return;

        if (!marsFaucetState.connectedWallet) {
            watchAdBtn.disabled = true;
            watchAdBtn.textContent = '🔗 Connect Wallet First';
        } else if (marsFaucetState.adViewed) {
            watchAdBtn.disabled = true;
            watchAdBtn.textContent = '✅ Ad Bonus Ready';
            watchAdBtn.classList.add('completed');
        } else {
            watchAdBtn.disabled = false;
            watchAdBtn.textContent = `📺 Watch Ad (+${NumberFormatter.formatMoonCoin(marsFaucetState.adBonus)})`;
            watchAdBtn.classList.remove('completed');
        }
    },

    // Integration with existing wallet system
    connectWallet() {
        marsFaucetState.connectedWallet = true;
        this.updateUI();
        this.showMessage('🎉 Wallet connected! Ready to claim from Mars Faucet!', 'success');
    },

    setBalance(balance, mcBalance = 0) {
        marsFaucetState.balance = balance;
        
        // Balance is now managed by BalanceManager, but keep for compatibility
        if (window.balanceManager) {
            window.balanceManager.setBalance(mcBalance);
        } else {
            marsFaucetState.moonCoinBalance = mcBalance;
            this.updateUI();
        }
    },

    disconnectWallet() {
        marsFaucetState.connectedWallet = false;
        marsFaucetState.balance = 0;
        // Don't reset MC balance - let BalanceManager handle it
        this.updateUI();
        this.showMessage('🔌 Wallet disconnected', 'info');
    }
};

// Global functions for integration
window.marsFaucetGame = marsFaucetGame;
window.marsFaucetState = marsFaucetState;
window.AdSystem = AdSystem;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, checking for Mars faucet container...');
    const container = document.getElementById('mars-faucet-container');
    if (container) {
        marsFaucetGame.init();
    }
});

console.log('✅ MoonYetis Mars Faucet Loaded');