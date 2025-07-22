// MoonYetis Coin Flip - Simple and Clean Game Implementation
console.log('🪙 MoonYetis Coin Flip Loading...');

// Game state management
const coinFlipState = {
    balance: 0,
    currentBet: 10, // 10 MC ($0.10)
    isFlipping: false,
    connectedWallet: false,
    totalFlips: 0,
    totalWagered: 0,
    totalWon: 0,
    biggestWin: 0,
    
    // Betting limits (MC - MoonCoins)
    minBet: 1,            // 1 MC ($0.01)
    maxBet: 3000,         // 3,000 MC ($30.00)
    popularBets: [1, 5, 10, 25, 50, 100],
    
    // Anti-Martingale system
    martingaleState: {
        consecutiveDoublings: 0,
        lastBet: 0,
        lastResult: null,
        isInProgression: false,
        maxProgressionBet: 256, // 256 MC ($2.56) - Maximum allowed in Martingale
        cooldownUntil: null
    }
};

// Number formatting utilities for MC (MoonCoins)
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

    formatUSD: (mcAmount) => {
        const usdValue = mcAmount / 100; // 100 MC = $1 USD
        return `$${usdValue.toFixed(2)}`;
    },

    formatCombined: (mcAmount) => {
        return `${NumberFormatter.formatMoonCoin(mcAmount)} (${NumberFormatter.formatUSD(mcAmount)})`;
    }
};

// Main coin flip game logic
const coinFlipGame = {
    
    init() {
        console.log('🪙 Initializing MoonYetis Coin Flip...');
        this.createGameInterface();
        this.setupEventListeners();
        this.setupBalanceManager();
        this.updateUI();
        console.log('✅ Coin Flip initialized successfully');
    },

    setupBalanceManager() {
        // Wait for BalanceManager to be available
        if (window.balanceManager) {
            // Register this game with the BalanceManager
            window.balanceManager.registerGame('coin-flip', (balanceData) => {
                console.log('🪙 Coin Flip: Received balance update:', balanceData.balance, 'MC');
                coinFlipState.balance = balanceData.balance;
                this.updateUI();
            });

            // Get current balance
            coinFlipState.balance = window.balanceManager.getBalance();
            console.log(`🪙 Coin Flip: Synced with BalanceManager - ${coinFlipState.balance} MC`);
        } else {
            console.warn('⚠️ BalanceManager not available, using local balance');
        }
    },

    createGameInterface() {
        const container = document.getElementById('coin-flip-container');
        if (!container) {
            console.error('❌ Coin flip container not found');
            return;
        }

        container.innerHTML = `
            <div class="coin-flip-game">
                <div class="coin-flip-header">
                    <h2 class="game-title">🪙 MoonYetis Coin Flip</h2>
                    <p class="game-subtitle">Choose HEADS or TAILS and flip for instant rewards!</p>
                </div>

                <div class="coin-flip-main">
                    <div class="coin-container">
                        <div class="coin" id="coin">
                            <div class="coin-side heads">🏔️</div>
                            <div class="coin-side tails">🌙</div>
                        </div>
                    </div>

                    <div class="prediction-section">
                        <div class="prediction-info" style="display: flex; justify-content: space-around; margin-bottom: 1rem; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 12px;">
                            <div style="text-align: center; color: var(--ecosystem-light);">
                                <strong>HEADS:</strong> 🏔️ <span class="odds" style="color: rgba(255,255,255,0.6); font-size: 0.9rem;">(48% chance)</span>
                            </div>
                            <div style="text-align: center; color: var(--ecosystem-light);">
                                <strong>TAILS:</strong> 🌙 <span class="odds" style="color: rgba(255,255,255,0.6); font-size: 0.9rem;">(48% chance)</span>
                            </div>
                        </div>
                        
                        <div class="choice-buttons">
                            <button class="choice-btn" id="chooseHeads" data-choice="heads">
                                🏔️ HEADS
                            </button>
                            <button class="choice-btn" id="chooseTails" data-choice="tails">
                                🌙 TAILS
                            </button>
                        </div>
                    </div>

                    <div class="bet-controls">
                        <div class="bet-input-group">
                            <label>Bet Amount:</label>
                            <div class="bet-amount-display" id="betAmountDisplay">
                                ${NumberFormatter.formatCombined(coinFlipState.currentBet)}
                            </div>
                            <div class="bet-buttons">
                                <button class="bet-btn" onclick="coinFlipGame.adjustBet(-10)">-10</button>
                                <button class="bet-btn" onclick="coinFlipGame.adjustBet(-1)">-1</button>
                                <button class="bet-btn" onclick="coinFlipGame.adjustBet(1)">+1</button>
                                <button class="bet-btn" onclick="coinFlipGame.adjustBet(10)">+10</button>
                            </div>
                        </div>
                    </div>

                    <button class="flip-btn" id="flipBtn" disabled>
                        🔗 Connect Wallet to Play
                    </button>
                </div>

                <div class="game-stats">
                    <div class="stat-item">
                        <span class="stat-label">Balance:</span>
                        <span class="stat-value" id="balanceAmount">${NumberFormatter.formatCombined(coinFlipState.balance)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Flips:</span>
                        <span class="stat-value" id="totalFlips">${coinFlipState.totalFlips}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Won:</span>
                        <span class="stat-value" id="totalWon">${NumberFormatter.formatCombined(coinFlipState.totalWon)}</span>
                    </div>
                </div>

                <div class="message-area">
                    <div class="message" id="coinFlipMessage"></div>
                </div>
            </div>
        `;
    },

    setupEventListeners() {
        // Choice buttons
        const chooseHeads = document.getElementById('chooseHeads');
        const chooseTails = document.getElementById('chooseTails');
        const flipBtn = document.getElementById('flipBtn');

        if (chooseHeads) {
            chooseHeads.addEventListener('click', () => this.selectChoice('heads'));
        }
        if (chooseTails) {
            chooseTails.addEventListener('click', () => this.selectChoice('tails'));
        }
        if (flipBtn) {
            flipBtn.addEventListener('click', () => this.flip());
        }

        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !coinFlipState.isFlipping) {
                e.preventDefault();
                this.flip();
            }
        });
    },

    selectChoice(choice) {
        if (coinFlipState.isFlipping) return;

        // Update button states
        const buttons = document.querySelectorAll('.choice-btn');
        buttons.forEach(btn => btn.classList.remove('selected'));
        
        const selectedBtn = document.querySelector(`[data-choice="${choice}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('selected');
        }

        coinFlipState.selectedChoice = choice;
        this.updateFlipButton();
    },

    adjustBet(change) {
        const newBet = coinFlipState.currentBet + change;
        
        // Check basic limits first
        if (newBet < coinFlipState.minBet || newBet > coinFlipState.maxBet) {
            this.showMessage(`⚠️ Bet limits: ${NumberFormatter.formatCombined(coinFlipState.minBet)} - ${NumberFormatter.formatCombined(coinFlipState.maxBet)}`, 'warning');
            return;
        }
        
        // Check for Martingale pattern and enforce limits
        if (!this.validateBetForMartingale(newBet)) {
            return; // Validation failed, message already shown
        }
        
        coinFlipState.currentBet = newBet;
        this.updateUI();
        console.log('💰 Bet adjusted to:', NumberFormatter.formatCombined(coinFlipState.currentBet));
    },

    flip() {
        if (!coinFlipState.connectedWallet) {
            this.showMessage('⚠️ Connect your wallet first!', 'warning');
            return;
        }

        if (!coinFlipState.selectedChoice) {
            this.showMessage('⚠️ Choose HEADS or TAILS first!', 'warning');
            return;
        }

        if (coinFlipState.isFlipping) return;

        if (coinFlipState.balance < coinFlipState.currentBet) {
            this.showMessage('💸 Insufficient balance!', 'error');
            return;
        }

        // Use BalanceManager to subtract bet amount
        if (window.balanceManager && !window.balanceManager.subtractBalance(coinFlipState.currentBet, 'Coin Flip Bet')) {
            this.showMessage('💸 Insufficient balance!', 'error');
            return;
        }

        console.log('🪙 Starting coin flip...');
        coinFlipState.isFlipping = true;
        coinFlipState.totalFlips++;
        coinFlipState.totalWagered += coinFlipState.currentBet;

        this.updateUI();
        this.animateCoin();

        // Generate result (50/50 chance)
        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const playerPredictionCorrect = result === coinFlipState.selectedChoice;
        
        // Apply 4.6% house edge: 4.6% of correct predictions become losses
        const houseEdgeRoll = Math.random();
        const won = playerPredictionCorrect && (houseEdgeRoll > 0.046);

        // Show result after animation
        setTimeout(() => {
            this.showResult(result, won);
            coinFlipState.isFlipping = false;
            this.updateUI();
        }, 2000);
    },

    animateCoin() {
        const coin = document.getElementById('coin');
        if (coin) {
            coin.classList.add('flipping');
            setTimeout(() => {
                coin.classList.remove('flipping');
            }, 2000);
        }
    },

    showResult(result, won) {
        const coin = document.getElementById('coin');
        if (coin) {
            coin.classList.add(`result-${result}`);
            setTimeout(() => {
                coin.classList.remove(`result-${result}`);
            }, 3000);
        }

        // Update Martingale state for pattern detection
        this.updateMartingaleState(won ? 'win' : 'loss');

        if (won) {
            const winAmount = coinFlipState.currentBet * 2;
            
            // Use BalanceManager to add win amount
            if (window.balanceManager) {
                window.balanceManager.addBalance(winAmount, 'Coin Flip Win');
            } else {
                coinFlipState.balance += winAmount; // Fallback to local balance
            }
            
            coinFlipState.totalWon += winAmount;
            
            if (winAmount > coinFlipState.biggestWin) {
                coinFlipState.biggestWin = winAmount;
            }

            this.showMessage(`🎉 You won! ${result.toUpperCase()} it was! +${NumberFormatter.formatCombined(winAmount)}`, 'success');
            this.createWinEffects();
        } else {
            this.showMessage(`😔 You lost! It was ${result.toUpperCase()}. Better luck next time!`, 'error');
        }
    },

    createWinEffects() {
        // Simple confetti effect
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                this.createConfetti();
            }, i * 100);
        }
    },

    createConfetti() {
        const container = document.querySelector('.coin-flip-game') || document.body;
        const confetti = document.createElement('div');
        confetti.textContent = '🎉';
        confetti.style.cssText = `
            position: absolute;
            font-size: 1.5rem;
            pointer-events: none;
            z-index: 1000;
            left: ${Math.random() * 100}%;
            top: 50%;
            animation: confettiFall 2s ease-out forwards;
        `;

        container.appendChild(confetti);
        setTimeout(() => {
            if (confetti.parentNode) {
                confetti.parentNode.removeChild(confetti);
            }
        }, 2000);
    },

    showMessage(text, type = 'info') {
        const messageEl = document.getElementById('coinFlipMessage');
        if (!messageEl) return;

        messageEl.textContent = text;
        messageEl.className = `message ${type}`;
        messageEl.style.display = 'block';

        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 4000);
    },

    updateUI() {
        const elements = {
            'betAmountDisplay': NumberFormatter.formatCombined(coinFlipState.currentBet),
            'balanceAmount': NumberFormatter.formatCombined(coinFlipState.balance),
            'totalFlips': coinFlipState.totalFlips.toLocaleString(),
            'totalWon': NumberFormatter.formatCombined(coinFlipState.totalWon)
        };

        for (let id in elements) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = elements[id];
            }
        }

        this.updateFlipButton();
    },

    updateFlipButton() {
        const flipBtn = document.getElementById('flipBtn');
        if (!flipBtn) return;

        if (coinFlipState.isFlipping) {
            flipBtn.textContent = '🔄 FLIPPING...';
            flipBtn.disabled = true;
        } else if (!coinFlipState.connectedWallet) {
            flipBtn.textContent = '🔗 Connect Wallet to Play';
            flipBtn.disabled = true;
        } else if (!coinFlipState.selectedChoice) {
            flipBtn.textContent = '⚠️ Choose HEADS or TAILS';
            flipBtn.disabled = true;
        } else if (coinFlipState.balance < coinFlipState.currentBet) {
            flipBtn.textContent = '💸 Insufficient Balance';
            flipBtn.disabled = true;
        } else {
            flipBtn.textContent = `🪙 FLIP (${NumberFormatter.formatMoonCoin(coinFlipState.currentBet)})`;
            flipBtn.disabled = false;
        }
    },

    // Anti-Martingale System
    validateBetForMartingale(newBet) {
        const martingale = coinFlipState.martingaleState;
        
        // Check for cooldown
        if (martingale.cooldownUntil && Date.now() < martingale.cooldownUntil) {
            const remainingTime = Math.ceil((martingale.cooldownUntil - Date.now()) / 1000);
            this.showMessage(`🚨 Martingale cooldown active. Wait ${remainingTime} seconds.`, 'warning');
            return false;
        }
        
        // Check if this is a doubling after a loss (Martingale pattern)
        const isDoubling = (newBet === martingale.lastBet * 2);
        const hadLoss = (martingale.lastResult === 'loss');
        
        if (isDoubling && hadLoss) {
            martingale.consecutiveDoublings++;
            martingale.isInProgression = true;
            
            // Check if bet exceeds Martingale limit
            if (newBet > martingale.maxProgressionBet) {
                this.showMessage(`🛑 Martingale limit reached! Maximum bet in progression: ${NumberFormatter.formatCombined(martingale.maxProgressionBet)}`, 'error');
                this.showMartingaleEducation();
                return false;
            }
            
            // Show warnings based on consecutive doublings
            this.showMartingaleWarnings(martingale.consecutiveDoublings);
            
        } else if (!isDoubling || martingale.lastResult === 'win') {
            // Reset progression if not doubling or if had a win
            this.resetMartingaleProgression();
        }
        
        return true;
    },
    
    showMartingaleWarnings(consecutiveDoublings) {
        switch (consecutiveDoublings) {
            case 3:
                this.showMessage('⚠️ Martingale pattern detected. This strategy has high risk of large losses.', 'warning');
                break;
            case 5:
                this.showMessage('🚨 High risk! You\'ve doubled 5 times. Consider the mathematics of this strategy.', 'warning');
                this.activateMartingaleCooldown(30); // 30 second cooldown
                break;
            case 7:
                this.showMessage('🛑 Extreme risk! Approaching maximum progression limit.', 'error');
                this.activateMartingaleCooldown(60); // 60 second cooldown
                break;
        }
    },
    
    activateMartingaleCooldown(seconds) {
        coinFlipState.martingaleState.cooldownUntil = Date.now() + (seconds * 1000);
        
        // Update UI to show cooldown
        const flipBtn = document.getElementById('flipBtn');
        if (flipBtn) {
            const countdown = setInterval(() => {
                const remaining = Math.ceil((coinFlipState.martingaleState.cooldownUntil - Date.now()) / 1000);
                if (remaining <= 0) {
                    clearInterval(countdown);
                    this.updateUI();
                } else {
                    flipBtn.textContent = `⏳ Cooldown: ${remaining}s`;
                    flipBtn.disabled = true;
                }
            }, 1000);
        }
    },
    
    resetMartingaleProgression() {
        coinFlipState.martingaleState.consecutiveDoublings = 0;
        coinFlipState.martingaleState.isInProgression = false;
        coinFlipState.martingaleState.cooldownUntil = null;
    },
    
    updateMartingaleState(result) {
        const martingale = coinFlipState.martingaleState;
        martingale.lastBet = coinFlipState.currentBet;
        martingale.lastResult = result;
        
        // Reset progression if won
        if (result === 'win') {
            this.resetMartingaleProgression();
        }
    },
    
    showMartingaleEducation() {
        // Create educational modal
        const modal = document.createElement('div');
        modal.className = 'martingale-education-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>💡 Why Martingale Doesn't Work</h3>
                    <button class="close-btn" onclick="this.closest('.martingale-education-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <h4>The Mathematics:</h4>
                    <p>• Each flip has a 47.7% chance to win (4.6% house edge)</p>
                    <p>• 13 consecutive losses probability: ~0.006% (1 in 15,625)</p>
                    <p>• Total loss after 13 attempts: 4,095 MC ($40.95)</p>
                    
                    <h4>The Problem:</h4>
                    <p>• Table limits prevent infinite doubling</p>
                    <p>• House edge ensures long-term losses</p>
                    <p>• Risk of total bankroll loss is significant</p>
                    
                    <h4>Responsible Gaming:</h4>
                    <p>• Set loss limits before playing</p>
                    <p>• Don't chase losses with bigger bets</p>
                    <p>• Remember: gambling should be entertainment</p>
                </div>
                <div class="modal-footer">
                    <button class="understand-btn" onclick="this.closest('.martingale-education-modal').remove()">
                        I Understand the Risks
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 30000);
    },

    // Integration with existing wallet system
    connectWallet() {
        // This will be called by the existing wallet integration
        coinFlipState.connectedWallet = true;
        this.updateUI();
        this.showMessage('🎉 Wallet connected! Ready to flip!', 'success');
    },

    setBalance(balance) {
        // Balance is now managed by BalanceManager, but keep for compatibility
        if (window.balanceManager) {
            window.balanceManager.setBalance(balance);
        } else {
            coinFlipState.balance = balance;
            this.updateUI();
        }
    },

    disconnectWallet() {
        coinFlipState.connectedWallet = false;
        // Don't reset balance - let BalanceManager handle it
        this.updateUI();
        this.showMessage('🔌 Wallet disconnected', 'info');
    }
};

// Global functions for integration
window.coinFlipGame = coinFlipGame;
window.coinFlipState = coinFlipState;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, initializing coin flip...');
    const container = document.getElementById('coin-flip-container');
    if (container) {
        coinFlipGame.init();
    }
});

console.log('✅ MoonYetis Coin Flip Loaded');