// Slot Machine - Game logic and visual effects
console.log('🎰 Slot Machine Loading...');

// Prevent redeclaration errors
if (typeof window.SYMBOLS !== 'undefined') {
    console.warn('SYMBOLS already exists, skipping redeclaration');
} else {

// Ultra-Accessible Number Formatting Utilities with Performance Cache
const NumberFormatter = {
    // Cache for performance optimization
    _tokenFormatCache: new Map(),
    _usdFormatCache: new Map(),
    
    // Format token amount for display (with cache)
    formatTokenAmount: (amount) => {
        // Check cache first
        if (NumberFormatter._tokenFormatCache.has(amount)) {
            return NumberFormatter._tokenFormatCache.get(amount);
        }
        
        let result;
        if (amount >= 1000000000) {
            result = (amount / 1000000000).toFixed(1) + 'B MY';
        } else if (amount >= 1000000) {
            // Handle edge case: 999,500,000 should be "999.5M MY" not "1000M MY"
            const millions = amount / 1000000;
            if (millions >= 999.5) {
                result = (amount / 1000000000).toFixed(2) + 'B MY';
            } else {
                result = millions.toFixed(1) + 'M MY';
            }
        } else if (amount >= 1000) {
            // Handle edge case: 999,500 should be "999K MY" not "1000K MY"
            const thousands = amount / 1000;
            if (thousands >= 999.5) {
                result = (amount / 1000000).toFixed(2) + 'M MY';
            } else {
                result = thousands.toFixed(0) + 'K MY';
            }
        } else {
            result = amount.toLocaleString() + ' MY';
        }
        
        // Cache result (limit cache size to prevent memory issues)
        if (NumberFormatter._tokenFormatCache.size < 1000) {
            NumberFormatter._tokenFormatCache.set(amount, result);
        }
        
        return result;
    },

    // Format USD equivalent (optimized for ultra-micro amounts with cache)
    formatUSDEquivalent: (tokenAmount, rate = 0.0000001037) => {
        // Create cache key
        const cacheKey = `${tokenAmount}_${rate}`;
        
        // Check cache first
        if (NumberFormatter._usdFormatCache.has(cacheKey)) {
            return NumberFormatter._usdFormatCache.get(cacheKey);
        }
        
        const usdValue = tokenAmount * rate;
        let result;
        
        if (usdValue < 0.0001) {
            // Ultra-micro amounts: show as fractions of cents (‰ = per-mille = 1/1000)
            result = ` (~${(usdValue * 10000).toFixed(1)}‰)`;
        } else if (usdValue < 0.001) {
            // Very small amounts: show as 10ths of cents
            result = ` (~${(usdValue * 1000).toFixed(1)}₁₀¢)`;
        } else if (usdValue < 0.01) {
            // Small amounts: show as cents with 1 decimal
            result = ` (~${(usdValue * 100).toFixed(1)}¢)`;
        } else if (usdValue < 1) {
            // Sub-dollar amounts: show as cents
            result = ` (~${(usdValue * 100).toFixed(0)}¢)`;
        } else {
            result = ` (~$${usdValue.toFixed(2)})`;
        }
        
        // Cache result (limit cache size to prevent memory issues)
        if (NumberFormatter._usdFormatCache.size < 1000) {
            NumberFormatter._usdFormatCache.set(cacheKey, result);
        }
        
        return result;
    },

    // Clear cache periodically for memory management
    clearCache: () => {
        NumberFormatter._tokenFormatCache.clear();
        NumberFormatter._usdFormatCache.clear();
    },

    // Cache statistics for debugging
    getCacheStats: () => {
        return {
            tokenCacheSize: NumberFormatter._tokenFormatCache.size,
            usdCacheSize: NumberFormatter._usdFormatCache.size
        };
    },

    // Format combined display (token + USD)
    formatCombined: (tokenAmount, rate = 0.0000001037) => {
        return NumberFormatter.formatTokenAmount(tokenAmount) + NumberFormatter.formatUSDEquivalent(tokenAmount, rate);
    }
};

// Configuración del juego - usando imágenes reales
window.SYMBOLS = [
    { id: 'yeti', name: 'Yeti Wild', image: 'assets/symbols/yeti-wild.png', emoji: '🏔️' },
    { id: 'rocket', name: 'Rocket High', image: 'assets/symbols/rocket-high.png', emoji: '🚀' },
    { id: 'moon', name: 'Moon Scatter', image: 'assets/symbols/moon-scatter.png', emoji: '🌙' },
    { id: 'coin', name: 'Coin Medium', image: 'assets/symbols/coin-medium.png', emoji: '🪙' },
    { id: 'star', name: 'Star Medium', image: 'assets/symbols/star-medium.png', emoji: '⭐' },
    { id: 'planet', name: 'Planet Low', image: 'assets/symbols/planet-low.png', emoji: '🪐' },
    { id: 'alien', name: 'Alien Bonus', image: 'assets/symbols/alien-bonus.png', emoji: '👽' },
    { id: 'ufo', name: 'UFO Special', image: 'assets/symbols/ufo-special.png', emoji: '🛸' }
];

// Array de IDs para compatibilidad con código existente
window.SYMBOL_IDS = window.SYMBOLS.map(s => s.id);

// Estado del juego - Ultra-Accessible Limits
let gameState = {
    balance: 0,
    currentBet: 100000, // Default bet 100K MOONYETIS (~$0.01 current, $1 if 100x)
    activeLines: 25,
    isSpinning: false,
    connectedWallet: false,
    totalSpins: 0,
    totalWagered: 0,
    totalWon: 0,
    biggestWin: 0,
    // Ultra-accessible betting limits
    minBet: 10000,        // 10K MOONYETIS (~$0.001 current)
    maxBet: 50000000,     // 50M MOONYETIS (~$5.18 current)
    maxTotalBet: 250000000, // 250M MOONYETIS total (~$25.9 current)
    popularBets: [10000, 50000, 100000, 500000, 1000000, 5000000], // Ultra-scalable range
    usdRate: 0.0000001037 // Current USD rate per MOONYETIS
};

// Slot Machine Manager
const slotMachine = {
    // Initialize game
    init() {
        console.log('🎰 Inicializando MoonYetis Slots...');
        this.createReels();
        this.updateUI();
        this.setupKeyboardControls();
        console.log('✅ Juego inicializado correctamente');
    },

    // Crear rodillos
    createReels() {
        const container = document.getElementById('reelsContainer');
        if (!container) {
            console.error('❌ No se encontró el contenedor de rodillos');
            return;
        }
        
        container.innerHTML = '';

        for (let i = 0; i < 5; i++) {
            const reel = document.createElement('div');
            reel.className = 'reel';
            reel.id = `reel-${i}`;

            for (let j = 0; j < 3; j++) {
                const symbol = document.createElement('div');
                symbol.className = 'symbol';
                
                // Seleccionar símbolo aleatorio
                const randomSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
                
                // Crear imagen
                const img = document.createElement('img');
                img.src = randomSymbol.image;
                img.alt = randomSymbol.name;
                img.className = 'symbol-image';
                img.setAttribute('data-symbol-id', randomSymbol.id);
                
                // Fallback a emoji si la imagen no carga
                img.onerror = function() {
                    symbol.innerHTML = randomSymbol.emoji;
                    symbol.classList.add('symbol-emoji');
                };
                
                symbol.appendChild(img);
                reel.appendChild(symbol);
            }

            container.appendChild(reel);
        }
        console.log('🎲 Rodillos creados correctamente');
    },

    // Función principal de giro
    spin() {
        // Allow demo mode or wallet mode
        if (!gameState.connectedWallet && gameState.balance === 0) {
            this.showMessage('⚠️ ¡Conecta tu wallet o usa modo demo!', 'lose');
            return;
        }

        if (gameState.isSpinning) {
            console.log('⚠️ Ya hay un giro en progreso');
            return;
        }

        const totalBet = gameState.currentBet * gameState.activeLines;
        
        if (gameState.balance < totalBet) {
            this.showMessage('💸 ¡Saldo insuficiente!', 'lose');
            return;
        }

        console.log('🎰 Iniciando giro...');
        gameState.isSpinning = true;
        gameState.balance -= totalBet;
        gameState.totalSpins++;
        gameState.totalWagered += totalBet;
        
        this.updateUI();

        // Animar rodillos
        const reels = document.querySelectorAll('.reel');
        reels.forEach(function(reel) {
            reel.classList.add('spinning');
        });

        // Simular tiempo de giro
        setTimeout(() => {
            reels.forEach(function(reel) {
                reel.classList.remove('spinning');
            });

            const results = this.generateResults();
            this.displayResults(results);
            
            const winAmount = this.calculateWin(results);
            
            if (winAmount > 0) {
                gameState.balance += winAmount;
                gameState.totalWon += winAmount;
                
                if (winAmount > gameState.biggestWin) {
                    gameState.biggestWin = winAmount;
                }
                
                // Efectos especiales para micro-wins
                const winUsdValue = winAmount * gameState.usdRate;
                if (winUsdValue < 0.01) {
                    this.showMicroWin(winAmount);
                    this.triggerSpecialMicroWinEffects(winAmount);
                } else {
                    this.showMessage('🎉 ¡GANASTE ' + NumberFormatter.formatCombined(winAmount, gameState.usdRate) + '!', 'win');
                }
                
                this.highlightWinningSymbols();
                
                console.log('🏆 Ganancia: ' + NumberFormatter.formatCombined(winAmount, gameState.usdRate));
            } else {
                // Mensaje especial para apuestas ultra-accesibles sin win
                const betUsdValue = totalBet * gameState.usdRate;
                if (betUsdValue < 0.01) {
                    const microMessages = [
                        '😊 ¡Solo era menos de un centavo!',
                        '💫 ¡Próximo giro por centavos!',
                        '🪙 ¡Ultra-accessible try again!',
                        '⚡ ¡Casi gratis, inténtalo otra vez!'
                    ];
                    const randomMessage = microMessages[Math.floor(Math.random() * microMessages.length)];
                    this.showMessage(randomMessage, 'neutral');
                } else {
                    this.showMessage('😔 Sin suerte esta vez...', 'lose');
                }
                console.log('😔 Sin ganancia');
            }

            gameState.isSpinning = false;
            this.updateUI();
            
        }, 2000);
    },

    // Generar resultados aleatorios
    generateResults() {
        const results = [];
        for (let i = 0; i < 5; i++) {
            const reel = [];
            for (let j = 0; j < 3; j++) {
                reel.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
            }
            results.push(reel);
        }
        console.log('🎲 Resultados generados:', results);
        return results;
    },

    // Mostrar resultados
    displayResults(results) {
        for (let i = 0; i < 5; i++) {
            const reel = document.getElementById('reel-' + i);
            if (!reel) continue;
            
            const symbols = reel.querySelectorAll('.symbol');
            
            for (let j = 0; j < 3; j++) {
                if (symbols[j] && results[i][j]) {
                    const symbolData = results[i][j];
                    
                    // Limpiar contenido anterior
                    symbols[j].innerHTML = '';
                    symbols[j].classList.remove('winning');
                    
                    // Crear nueva imagen
                    const img = document.createElement('img');
                    img.src = symbolData.image;
                    img.alt = symbolData.name;
                    img.className = 'symbol-image';
                    img.setAttribute('data-symbol-id', symbolData.id);
                    
                    // Fallback a emoji si la imagen no carga
                    img.onerror = function() {
                        symbols[j].innerHTML = symbolData.emoji;
                        symbols[j].classList.add('symbol-emoji');
                    };
                    
                    symbols[j].appendChild(img);
                }
            }
        }
    },

    // Calcular ganancia simple
    calculateWin(results) {
        const centerLine = [results[0][1], results[1][1], results[2][1], results[3][1], results[4][1]];
        
        let consecutiveCount = 1;
        let symbol = centerLine[0];
        
        for (let i = 1; i < centerLine.length; i++) {
            if (centerLine[i].id === symbol.id || symbol.id === 'yeti') {
                consecutiveCount++;
            } else {
                break;
            }
        }

        let multiplier = 0;
        if (consecutiveCount >= 5) multiplier = 50;
        else if (consecutiveCount >= 4) multiplier = 20;
        else if (consecutiveCount >= 3) multiplier = 5;

        // Multiplicadores especiales por tipo de símbolo
        if (symbol.id === 'yeti') multiplier *= 2;        // Wild
        if (symbol.id === 'rocket') multiplier *= 1.5;    // High value
        if (symbol.id === 'alien') multiplier *= 3;       // Bonus
        if (symbol.id === 'ufo') multiplier *= 2.5;       // Special

        return Math.floor(gameState.currentBet * multiplier);
    },

    // Resaltar símbolos ganadores
    highlightWinningSymbols() {
        const reels = document.querySelectorAll('.reel');
        reels.forEach(function(reel, index) {
            const centerSymbol = reel.children[1];
            if (centerSymbol) {
                centerSymbol.classList.add('winning');
            }
        });

        setTimeout(function() {
            document.querySelectorAll('.symbol.winning').forEach(function(symbol) {
                symbol.classList.remove('winning');
            });
        }, 3000);
    },

    // Enhanced showMessage for micro-interactions
    showMicroWin(amount) {
        const usdValue = amount * gameState.usdRate;
        
        if (usdValue < 0.01) {
            // Special celebration for micro-wins
            const messageEl = document.getElementById('message');
            if (messageEl) {
                messageEl.classList.add('micro-win-celebration', 'active');
                setTimeout(() => {
                    messageEl.classList.remove('active');
                }, 600);
            }
            
            // Show special micro-win message
            const messages = [
                '🎉 ¡Micro-win! ¡Cada centavo cuenta!',
                '💫 ¡Ganaste casi gratis!',
                '⚡ ¡Ultra-accessible win!',
                '🪙 ¡Penny power activated!'
            ];
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            this.showMessage(randomMessage + ' ' + NumberFormatter.formatCombined(amount, gameState.usdRate), 'win');
        }
    },

    // Trigger special effects for ultra-small wins
    triggerSpecialMicroWinEffects(winAmount) {
        const usdValue = winAmount * gameState.usdRate;
        
        if (usdValue < 0.01) {
            // Create floating penny animations
            this.createFloatingPennies();
            
            // Highlight the spin button with special effect
            const spinBtn = document.getElementById('spinBtn');
            if (spinBtn) {
                spinBtn.classList.add('almost-free-pulse');
                setTimeout(() => {
                    spinBtn.classList.remove('almost-free-pulse');
                }, 3000);
            }
            
            // Add special glow to reels container
            const reelsContainer = document.getElementById('reelsContainer');
            if (reelsContainer) {
                reelsContainer.style.boxShadow = '0 0 30px rgba(255, 230, 109, 0.8)';
                setTimeout(() => {
                    reelsContainer.style.boxShadow = '';
                }, 2000);
            }
            
            // Trigger confetti effect for really small wins
            if (usdValue < 0.001) {
                this.createMicroConfetti();
            }
        }
    },

    // Create floating penny animations
    createFloatingPennies() {
        const container = document.querySelector('.game-container') || document.body;
        
        for (let i = 0; i < 5; i++) {
            const penny = document.createElement('div');
            penny.textContent = '¢';
            penny.style.cssText = `
                position: absolute;
                font-size: 2rem;
                color: var(--accent);
                pointer-events: none;
                z-index: 1000;
                left: ${Math.random() * 100}%;
                top: 100%;
                animation: floatUp 3s ease-out forwards;
            `;
            
            // Add floating animation
            const floatKeyframes = `
                @keyframes floatUp {
                    0% {
                        transform: translateY(0) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(-200px) rotate(360deg);
                        opacity: 0;
                    }
                }
            `;
            
            // Add keyframes to head if not already added
            if (!document.getElementById('floatUpKeyframes')) {
                const style = document.createElement('style');
                style.id = 'floatUpKeyframes';
                style.textContent = floatKeyframes;
                document.head.appendChild(style);
            }
            
            container.appendChild(penny);
            
            // Remove after animation
            setTimeout(() => {
                if (penny.parentNode) {
                    penny.parentNode.removeChild(penny);
                }
            }, 3000);
        }
    },

    // Create micro confetti for ultra-small wins
    createMicroConfetti() {
        const container = document.querySelector('.game-container') || document.body;
        const colors = ['#FF6B35', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38BA8'];
        
        for (let i = 0; i < 15; i++) {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: absolute;
                width: 8px;
                height: 8px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                pointer-events: none;
                z-index: 1000;
                left: ${50 + (Math.random() - 0.5) * 50}%;
                top: 50%;
                border-radius: 50%;
                animation: confettiFall ${1 + Math.random() * 2}s ease-out forwards;
            `;
            
            // Add confetti animation
            const confettiKeyframes = `
                @keyframes confettiFall {
                    0% {
                        transform: translateY(0) rotate(0deg) scale(1);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(200px) rotate(720deg) scale(0);
                        opacity: 0;
                    }
                }
            `;
            
            // Add keyframes to head if not already added
            if (!document.getElementById('confettiFallKeyframes')) {
                const style = document.createElement('style');
                style.id = 'confettiFallKeyframes';
                style.textContent = confettiKeyframes;
                document.head.appendChild(style);
            }
            
            container.appendChild(confetti);
            
            // Remove after animation
            setTimeout(() => {
                if (confetti.parentNode) {
                    confetti.parentNode.removeChild(confetti);
                }
            }, 3000);
        }
    },

    // Trigger special animation for micro-bets
    triggerMicroBetAnimation(amount) {
        const usdValue = amount * gameState.usdRate;
        
        // Add penny drop effect for sub-cent bets
        if (usdValue < 0.01) {
            const betAmountElement = document.getElementById('betAmount');
            if (betAmountElement) {
                betAmountElement.parentElement.classList.add('penny-drop', 'active');
                setTimeout(() => {
                    betAmountElement.parentElement.classList.remove('active');
                }, 1000);
            }
        }
        
        // Add glow effect to the selected button
        const buttons = document.querySelectorAll('.quick-bet-btn');
        buttons.forEach(btn => {
            btn.classList.remove('micro-bet-glow');
            const btnAmount = parseInt(btn.onclick.toString().match(/\d+/)[0]);
            if (btnAmount === amount && usdValue < 0.01) {
                btn.classList.add('micro-bet-glow');
                setTimeout(() => btn.classList.remove('micro-bet-glow'), 2000);
            }
        });
    },

    // Mostrar mensaje
    showMessage(text, type) {
        const messageEl = document.getElementById('message');
        if (!messageEl) return;
        
        messageEl.textContent = text;
        messageEl.className = 'message ' + type;
        messageEl.style.display = 'block';
        
        setTimeout(function() {
            messageEl.style.display = 'none';
        }, 4000);
    },

    // Actualizar interfaz - Ultra-Accessible Display
    updateUI() {
        const totalBet = gameState.currentBet * gameState.activeLines;
        
        const elements = {
            'betAmount': NumberFormatter.formatCombined(gameState.currentBet, gameState.usdRate),
            'activeLines': gameState.activeLines,
            'totalBet': NumberFormatter.formatCombined(totalBet, gameState.usdRate),
            'balanceAmount': NumberFormatter.formatCombined(gameState.balance, gameState.usdRate),
            'totalSpins': gameState.totalSpins.toLocaleString(),
            'totalWagered': NumberFormatter.formatCombined(gameState.totalWagered, gameState.usdRate),
            'totalWon': NumberFormatter.formatCombined(gameState.totalWon, gameState.usdRate),
            'biggestWin': NumberFormatter.formatCombined(gameState.biggestWin, gameState.usdRate),
            'lastWin': NumberFormatter.formatCombined(gameState.biggestWin, gameState.usdRate)
        };

        for (let id in elements) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = elements[id];
            }
        }

        // Update popular bet buttons if they exist
        this.updatePopularBetButtons();

        const spinBtn = document.getElementById('spinBtn');
        if (spinBtn) {
            spinBtn.disabled = gameState.isSpinning || !gameState.connectedWallet || gameState.balance < totalBet;
            if (gameState.isSpinning) {
                spinBtn.textContent = '🔄 GIRANDO...';
            } else if (!gameState.connectedWallet) {
                spinBtn.textContent = '🔗 CONECTA WALLET';
            } else if (gameState.balance < totalBet) {
                spinBtn.textContent = '💸 SALDO INSUFICIENTE';
            } else {
                spinBtn.textContent = '🎰 GIRAR';
            }
        }
    },

    // Update popular bet buttons display
    updatePopularBetButtons() {
        gameState.popularBets.forEach((betAmount, index) => {
            const btn = document.getElementById(`betBtn${index + 1}`);
            if (btn) {
                btn.textContent = NumberFormatter.formatTokenAmount(betAmount);
                btn.title = NumberFormatter.formatCombined(betAmount, gameState.usdRate);
                
                // Highlight current bet
                if (betAmount === gameState.currentBet) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
        });
    },

    // Ajustar apuesta - Ultra-Accessible Limits
    adjustBet(change) {
        let newBet;
        
        if (change === 'min') {
            newBet = gameState.minBet;
        } else if (change === 'max') {
            newBet = gameState.maxBet;
        } else if (change === 'next') {
            // Find next higher popular bet
            const currentIndex = gameState.popularBets.indexOf(gameState.currentBet);
            if (currentIndex !== -1 && currentIndex < gameState.popularBets.length - 1) {
                newBet = gameState.popularBets[currentIndex + 1];
            } else {
                newBet = gameState.popularBets[gameState.popularBets.length - 1];
            }
        } else if (change === 'prev') {
            // Find next lower popular bet
            const currentIndex = gameState.popularBets.indexOf(gameState.currentBet);
            if (currentIndex > 0) {
                newBet = gameState.popularBets[currentIndex - 1];
            } else {
                newBet = gameState.popularBets[0];
            }
        } else {
            // Traditional numeric change
            newBet = gameState.currentBet + change;
        }
        
        // Validate against ultra-accessible limits
        if (newBet >= gameState.minBet && newBet <= gameState.maxBet) {
            const totalBet = newBet * gameState.activeLines;
            if (totalBet <= gameState.maxTotalBet) {
                gameState.currentBet = newBet;
                this.updateUI();
                console.log('💰 Apuesta ajustada a: ' + NumberFormatter.formatCombined(gameState.currentBet, gameState.usdRate));
            } else {
                this.showMessage(`⚠️ Apuesta total máxima: ${NumberFormatter.formatCombined(gameState.maxTotalBet, gameState.usdRate)}`, 'lose');
            }
        } else {
            this.showMessage(`⚠️ Límites: ${NumberFormatter.formatCombined(gameState.minBet, gameState.usdRate)} - ${NumberFormatter.formatCombined(gameState.maxBet, gameState.usdRate)}`, 'lose');
        }
    },

    // Set specific bet amount from popular bets (with micro-interactions)
    setBet(amount) {
        if (amount >= gameState.minBet && amount <= gameState.maxBet) {
            const totalBet = amount * gameState.activeLines;
            if (totalBet <= gameState.maxTotalBet) {
                gameState.currentBet = amount;
                
                // Trigger micro-interactions for ultra-accessible amounts
                const usdValue = amount * gameState.usdRate;
                if (usdValue < 0.01) {
                    this.triggerMicroBetAnimation(amount);
                    this.showMessage(`🎉 ¡Apuesta ultra-accesible! ${NumberFormatter.formatCombined(amount, gameState.usdRate)}`, 'win');
                } else {
                    this.showMessage(`💰 Apuesta establecida: ${NumberFormatter.formatCombined(amount, gameState.usdRate)}`, 'neutral');
                }
                
                this.updateUI();
                console.log('💰 Apuesta establecida a: ' + NumberFormatter.formatCombined(gameState.currentBet, gameState.usdRate));
            } else {
                this.showMessage(`⚠️ Apuesta total máxima: ${NumberFormatter.formatCombined(gameState.maxTotalBet, gameState.usdRate)}`, 'lose');
            }
        }
    },

    // Ajustar líneas
    adjustLines(change) {
        const newLines = gameState.activeLines + change;
        if (newLines >= 1 && newLines <= 25) {
            gameState.activeLines = newLines;
            this.updateUI();
            console.log('📊 Líneas ajustadas a: ' + gameState.activeLines);
        }
    },

    // Setup keyboard controls
    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !gameState.isSpinning) {
                e.preventDefault();
                this.spin();
            }
        });
    }
};

// Expose functions globally for compatibility
window.adjustBet = (change) => slotMachine.adjustBet(change);
window.setBet = (amount) => slotMachine.setBet(amount);
window.adjustLines = (change) => slotMachine.adjustLines(change);
window.spin = () => slotMachine.spin();
window.NumberFormatter = NumberFormatter;
window.gameState = gameState;
window.slotMachine = slotMachine;

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM cargado, inicializando slot machine...');
    slotMachine.init();
});

// Limpieza de cache periódica para optimización de memoria
setInterval(() => {
    const stats = NumberFormatter.getCacheStats();
    if (stats.tokenCacheSize > 800 || stats.usdCacheSize > 800) {
        console.log('🧹 Limpiando cache de formateo para optimización de memoria');
        NumberFormatter.clearCache();
    }
}, 300000); // Cada 5 minutos

console.log('✅ Slot Machine Loaded');

} // End of redeclaration protection