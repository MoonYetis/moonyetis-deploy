// MoonYetis Dice Roll - Simple HIGH/LOW Game Implementation
console.log('🎲 MoonYetis Dice Roll Loading...');

// Game state management
const diceRollState = {
    balance: 0,
    currentBet: 10, // 10 MC ($0.10)
    isRolling: false,
    connectedWallet: false,
    totalRolls: 0,
    totalWagered: 0,
    totalWon: 0,
    biggestWin: 0,
    
    // Betting limits (MC - MoonCoins)
    minBet: 1,            // 1 MC ($0.01)
    maxBet: 3000,         // 3,000 MC ($30.00)
    popularBets: [1, 5, 10, 25, 50, 100],
    
    // Dice specific
    selectedChoice: null, // 'high' or 'low'
    lastResult: null,
    
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

// Main dice roll game logic
const diceRollGame = {
    
    init() {
        console.log('🎲 Initializing MoonYetis Dice Roll...');
        this.createGameInterface();
        this.setupEventListeners();
        this.setupBalanceManager();
        this.updateUI();
        console.log('✅ Dice Roll initialized successfully');
    },

    setupBalanceManager() {
        // Wait for BalanceManager to be available
        if (window.balanceManager) {
            // Register this game with the BalanceManager
            window.balanceManager.registerGame('dice-roll', (balanceData) => {
                console.log('🎲 Dice Roll: Received balance update:', balanceData.balance, 'MC');
                diceRollState.balance = balanceData.balance;
                this.updateUI();
            });

            // Get current balance
            diceRollState.balance = window.balanceManager.getBalance();
            console.log(`🎲 Dice Roll: Synced with BalanceManager - ${diceRollState.balance} MC`);
        } else {
            console.warn('⚠️ BalanceManager not available, using local balance');
        }
    },

    createGameInterface() {
        const container = document.getElementById('dice-roll-container');
        if (!container) {
            console.error('❌ Dice roll container not found');
            return;
        }

        container.innerHTML = `
            <div class="dice-roll-game">
                <div class="dice-roll-header">
                    <h2 class="game-title">🎲 MoonYetis Dice Roll</h2>
                    <p class="game-subtitle">Predict HIGH (4-6) or LOW (1-3) and roll for instant rewards!</p>
                </div>

                <div class="dice-roll-main">
                    <div class="dice-container">
                        <div class="dice" id="dice">
                            <div class="dice-face dice-1">⚫</div>
                            <div class="dice-face dice-2">⚫⚫</div>
                            <div class="dice-face dice-3">⚫⚫⚫</div>
                            <div class="dice-face dice-4">⚫⚫<br>⚫⚫</div>
                            <div class="dice-face dice-5">⚫⚫<br>⚫<br>⚫⚫</div>
                            <div class="dice-face dice-6">⚫⚫⚫<br>⚫⚫⚫</div>
                        </div>
                        <div class="result-display" id="resultDisplay">
                            <span class="result-number" id="resultNumber">?</span>
                        </div>
                    </div>

                    <div class="prediction-section">
                        <div class="prediction-info">
                            <div class="prediction-option">
                                <strong>LOW:</strong> 1, 2, 3 <span class="odds">(48% chance)</span>
                            </div>
                            <div class="prediction-option">
                                <strong>HIGH:</strong> 4, 5, 6 <span class="odds">(48% chance)</span>
                            </div>
                        </div>
                        
                        <div class="choice-buttons">
                            <button class="choice-btn low-btn" id="chooseLow" data-choice="low">
                                🔻 LOW (1-3)
                            </button>
                            <button class="choice-btn high-btn" id="chooseHigh" data-choice="high">
                                🔺 HIGH (4-6)
                            </button>
                        </div>
                    </div>

                    <div class="bet-controls">
                        <div class="bet-input-group">
                            <label>Bet Amount:</label>
                            <div class="bet-amount-display" id="betAmountDisplay">
                                ${NumberFormatter.formatCombined(diceRollState.currentBet)}
                            </div>
                            <div class="bet-buttons">
                                <button class="bet-btn" onclick="diceRollGame.adjustBet(-10)">-10</button>
                                <button class="bet-btn" onclick="diceRollGame.adjustBet(-1)">-1</button>
                                <button class="bet-btn" onclick="diceRollGame.adjustBet(1)">+1</button>
                                <button class="bet-btn" onclick="diceRollGame.adjustBet(10)">+10</button>
                            </div>
                        </div>
                    </div>

                    <button class="roll-btn" id="rollBtn" disabled>
                        🔗 Connect Wallet to Play
                    </button>
                </div>

                <div class="game-stats">
                    <div class="stat-item">
                        <span class="stat-label">Balance:</span>
                        <span class="stat-value" id="balanceAmount">${NumberFormatter.formatCombined(diceRollState.balance)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Rolls:</span>
                        <span class="stat-value" id="totalRolls">${diceRollState.totalRolls}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Won:</span>
                        <span class="stat-value" id="totalWon">${NumberFormatter.formatCombined(diceRollState.totalWon)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Biggest Win:</span>
                        <span class="stat-value" id="biggestWin">${NumberFormatter.formatCombined(diceRollState.biggestWin)}</span>
                    </div>
                </div>

                <div class="message-area">
                    <div class="message" id="diceRollMessage"></div>
                </div>
            </div>
        `;
    },

    setupEventListeners() {
        // Choice buttons
        const chooseLow = document.getElementById('chooseLow');
        const chooseHigh = document.getElementById('chooseHigh');
        const rollBtn = document.getElementById('rollBtn');

        if (chooseLow) {
            chooseLow.addEventListener('click', () => this.selectChoice('low'));
        }
        if (chooseHigh) {
            chooseHigh.addEventListener('click', () => this.selectChoice('high'));
        }
        if (rollBtn) {
            rollBtn.addEventListener('click', () => this.roll());
        }

        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (!diceRollState.isRolling) {
                if (e.key === '1' || e.key.toLowerCase() === 'l') {
                    this.selectChoice('low');
                } else if (e.key === '2' || e.key.toLowerCase() === 'h') {
                    this.selectChoice('high');
                } else if (e.code === 'Space') {
                    e.preventDefault();
                    this.roll();
                }
            }
        });
    },

    selectChoice(choice) {
        if (diceRollState.isRolling) return;

        // Update button states
        const buttons = document.querySelectorAll('.choice-btn');
        buttons.forEach(btn => btn.classList.remove('selected'));
        
        const selectedBtn = document.querySelector(`[data-choice="${choice}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('selected');
        }

        diceRollState.selectedChoice = choice;
        this.updateRollButton();
        
        this.showMessage(`🎯 You chose ${choice.toUpperCase()}!`, 'info');
    },

    adjustBet(change) {
        const newBet = diceRollState.currentBet + change;
        
        // Check basic limits first
        if (newBet < diceRollState.minBet || newBet > diceRollState.maxBet) {
            this.showMessage(`⚠️ Bet limits: ${NumberFormatter.formatCombined(diceRollState.minBet)} - ${NumberFormatter.formatCombined(diceRollState.maxBet)}`, 'warning');
            return;
        }
        
        // Check for Martingale pattern and enforce limits
        if (!this.validateBetForMartingale(newBet)) {
            return; // Validation failed, message already shown
        }
        
        diceRollState.currentBet = newBet;
        this.updateUI();
        console.log('💰 Bet adjusted to:', NumberFormatter.formatCombined(diceRollState.currentBet));
    },

    roll() {
        if (!diceRollState.connectedWallet) {
            this.showMessage('⚠️ Connect your wallet first!', 'warning');
            return;
        }

        if (!diceRollState.selectedChoice) {
            this.showMessage('⚠️ Choose HIGH or LOW first!', 'warning');
            return;
        }

        if (diceRollState.isRolling) return;

        if (diceRollState.balance < diceRollState.currentBet) {
            this.showMessage('💸 Insufficient balance!', 'error');
            return;
        }

        // Use BalanceManager to subtract bet amount
        if (window.balanceManager && !window.balanceManager.subtractBalance(diceRollState.currentBet, 'Dice Roll Bet')) {
            this.showMessage('💸 Insufficient balance!', 'error');
            return;
        }

        console.log('🎲 Starting dice roll...');
        diceRollState.isRolling = true;
        diceRollState.totalRolls++;
        diceRollState.totalWagered += diceRollState.currentBet;

        this.updateUI();
        this.animateDice();

        // Generate result (1-6)
        const result = Math.floor(Math.random() * 6) + 1;
        
        // Check if prediction was correct
        const isHigh = result >= 4;
        const playerPredictionCorrect = (diceRollState.selectedChoice === 'high' && isHigh) || 
                                      (diceRollState.selectedChoice === 'low' && !isHigh);
        
        // Apply 4.6% house edge: 4.6% of correct predictions become losses
        const houseEdgeRoll = Math.random();
        const won = playerPredictionCorrect && (houseEdgeRoll > 0.046);

        // Show result after animation
        setTimeout(() => {
            this.showResult(result, won);
            diceRollState.lastResult = result;
            diceRollState.isRolling = false;
            this.updateUI();
        }, 3000);
    },

    animateDice() {
        const dice = document.getElementById('dice');
        const resultDisplay = document.getElementById('resultDisplay');
        
        if (dice) {
            dice.classList.add('rolling');
            // Hide result during roll
            if (resultDisplay) {
                resultDisplay.style.opacity = '0';
            }
            
            setTimeout(() => {
                dice.classList.remove('rolling');
                // Show result after roll
                if (resultDisplay) {
                    resultDisplay.style.opacity = '1';
                }
            }, 3000);
        }
    },

    showResult(result, won) {
        const resultNumber = document.getElementById('resultNumber');
        const dice = document.getElementById('dice');
        
        // Update result display
        if (resultNumber) {
            resultNumber.textContent = result;
        }

        // Show the appropriate dice face
        if (dice) {
            // Remove all face classes
            dice.classList.remove('show-1', 'show-2', 'show-3', 'show-4', 'show-5', 'show-6');
            // Add the result face class
            dice.classList.add(`show-${result}`);
            
            if (won) {
                dice.classList.add('winner');
            } else {
                dice.classList.add('loser');
            }
            
            setTimeout(() => {
                dice.classList.remove('winner', 'loser');
            }, 3000);
        }

        // Update Martingale state for pattern detection
        this.updateMartingaleState(won ? 'win' : 'loss');

        if (won) {
            const winAmount = diceRollState.currentBet * 2;
            
            // Use BalanceManager to add win amount
            if (window.balanceManager) {
                window.balanceManager.addBalance(winAmount, 'Dice Roll Win');
            } else {
                diceRollState.balance += winAmount; // Fallback to local balance
            }
            
            diceRollState.totalWon += winAmount;
            
            if (winAmount > diceRollState.biggestWin) {
                diceRollState.biggestWin = winAmount;
            }

            const prediction = diceRollState.selectedChoice.toUpperCase();
            const actualCategory = result >= 4 ? 'HIGH' : 'LOW';
            
            this.showMessage(`🎉 Winner! You predicted ${prediction}, rolled ${result} (${actualCategory})! +${NumberFormatter.formatCombined(winAmount)}`, 'success');
            this.createWinEffects();
        } else {
            const prediction = diceRollState.selectedChoice.toUpperCase();
            const actualCategory = result >= 4 ? 'HIGH' : 'LOW';
            
            this.showMessage(`😔 You predicted ${prediction} but rolled ${result} (${actualCategory}). Better luck next time!`, 'error');
        }
    },

    createWinEffects() {
        // Dice celebration effect
        this.createFloatingDice();
        
        // Simple confetti effect
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                this.createConfetti();
            }, i * 100);
        }
    },

    createFloatingDice() {
        const container = document.querySelector('.dice-roll-game') || document.body;
        
        for (let i = 0; i < 5; i++) {
            const floatingDice = document.createElement('div');
            floatingDice.textContent = '🎲';
            floatingDice.style.cssText = `
                position: absolute;
                font-size: 2rem;
                pointer-events: none;
                z-index: 1000;
                left: ${Math.random() * 100}%;
                top: 70%;
                animation: diceFloat 3s ease-out forwards;
            `;

            container.appendChild(floatingDice);
            setTimeout(() => {
                if (floatingDice.parentNode) {
                    floatingDice.parentNode.removeChild(floatingDice);
                }
            }, 3000);
        }
    },

    createConfetti() {
        const container = document.querySelector('.dice-roll-game') || document.body;
        const colors = ['#FF6B35', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38BA8'];
        
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: absolute;
            width: 10px;
            height: 10px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            pointer-events: none;
            z-index: 1000;
            left: ${50 + (Math.random() - 0.5) * 60}%;
            top: 40%;
            border-radius: 50%;
            animation: confettiFall 3s ease-out forwards;
        `;

        container.appendChild(confetti);
        setTimeout(() => {
            if (confetti.parentNode) {
                confetti.parentNode.removeChild(confetti);
            }
        }, 3000);
    },

    showMessage(text, type = 'info') {
        const messageEl = document.getElementById('diceRollMessage');
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
            'betAmountDisplay': NumberFormatter.formatCombined(diceRollState.currentBet),
            'balanceAmount': NumberFormatter.formatCombined(diceRollState.balance),
            'totalRolls': diceRollState.totalRolls.toLocaleString(),
            'totalWon': NumberFormatter.formatCombined(diceRollState.totalWon),
            'biggestWin': NumberFormatter.formatCombined(diceRollState.biggestWin)
        };

        for (let id in elements) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = elements[id];
            }
        }

        this.updateRollButton();
    },

    updateRollButton() {
        const rollBtn = document.getElementById('rollBtn');
        if (!rollBtn) return;

        if (diceRollState.isRolling) {
            rollBtn.textContent = '🎲 ROLLING...';
            rollBtn.disabled = true;
        } else if (!diceRollState.connectedWallet) {
            rollBtn.textContent = '🔗 Connect Wallet to Play';
            rollBtn.disabled = true;
        } else if (!diceRollState.selectedChoice) {
            rollBtn.textContent = '⚠️ Choose HIGH or LOW';
            rollBtn.disabled = true;
        } else if (diceRollState.balance < diceRollState.currentBet) {
            rollBtn.textContent = '💸 Insufficient Balance';
            rollBtn.disabled = true;
        } else {
            rollBtn.textContent = `🎲 ROLL (${NumberFormatter.formatMoonCoin(diceRollState.currentBet)})`;
            rollBtn.disabled = false;
        }
    },

    // Anti-Martingale System
    validateBetForMartingale(newBet) {
        const martingale = diceRollState.martingaleState;
        
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
                this.showMessage('🚨 High risk! You\\'ve doubled 5 times. Consider the mathematics of this strategy.', 'warning');
                this.activateMartingaleCooldown(30); // 30 second cooldown
                break;
            case 7:
                this.showMessage('🛑 Extreme risk! Approaching maximum progression limit.', 'error');
                this.activateMartingaleCooldown(60); // 60 second cooldown
                break;
        }
    },
    
    activateMartingaleCooldown(seconds) {
        diceRollState.martingaleState.cooldownUntil = Date.now() + (seconds * 1000);
        
        // Update UI to show cooldown
        const rollBtn = document.getElementById('rollBtn');
        if (rollBtn) {
            const countdown = setInterval(() => {
                const remaining = Math.ceil((diceRollState.martingaleState.cooldownUntil - Date.now()) / 1000);
                if (remaining <= 0) {
                    clearInterval(countdown);
                    this.updateUI();
                } else {
                    rollBtn.textContent = `⏳ Cooldown: ${remaining}s`;
                    rollBtn.disabled = true;
                }
            }, 1000);
        }
    },
    
    resetMartingaleProgression() {
        diceRollState.martingaleState.consecutiveDoublings = 0;
        diceRollState.martingaleState.isInProgression = false;
        diceRollState.martingaleState.cooldownUntil = null;
    },
    
    updateMartingaleState(result) {
        const martingale = diceRollState.martingaleState;
        martingale.lastBet = diceRollState.currentBet;
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
                    <p>• Each roll has a 47.7% chance to win (4.6% house edge)</p>
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
        diceRollState.connectedWallet = true;
        this.updateUI();
        this.showMessage('🎉 Wallet connected! Ready to roll!', 'success');
    },

    setBalance(balance) {
        // Balance is now managed by BalanceManager, but keep for compatibility
        if (window.balanceManager) {
            window.balanceManager.setBalance(balance);
        } else {
            diceRollState.balance = balance;
            this.updateUI();
        }
    },

    disconnectWallet() {
        diceRollState.connectedWallet = false;
        // Don't reset balance - let BalanceManager handle it
        this.updateUI();
        this.showMessage('🔌 Wallet disconnected', 'info');
    }
};

// Global functions for integration
window.diceRollGame = diceRollGame;
window.diceRollState = diceRollState;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, checking for dice roll container...');
    const container = document.getElementById('dice-roll-container');
    if (container) {
        diceRollGame.init();
    }
});

console.log('✅ MoonYetis Dice Roll Loaded');