// MoonYetis Slots Component - Modular slot machine for ecosystem
// Extracted from original index.html to be loaded dynamically

class SlotMachineComponent {
    constructor(container) {
        this.container = container;
        this.initialized = false;
        this.slotMachine = null;
    }
    
    async load() {
        console.log('🎰 Loading MoonYetis Slots component...');
        
        if (!this.container) {
            throw new Error('Container not provided for slot machine');
        }
        
        // Inject the slot machine HTML
        this.container.innerHTML = this.getSlotMachineHTML();
        
        // Initialize the slot machine
        await this.initializeSlotMachine();
        
        this.initialized = true;
        console.log('✅ MoonYetis Slots component loaded successfully');
    }
    
    getSlotMachineHTML() {
        return `
            <!-- Slot Machine Component -->
            <div class="slot-component-wrapper">
                <!-- Component Header -->
                <div class="slot-component-header">
                    <button class="product-back-btn" data-route="">
                        ← Back to Ecosystem
                    </button>
                    <div class="slot-component-info">
                        <h1 class="slot-component-title">🎰 MoonYetis Slots</h1>
                        <p class="slot-component-subtitle">Revolutionary crypto slot machine on Fractal Bitcoin</p>
                    </div>
                    <div class="slot-component-controls">
                        <div class="audio-controls">
                            <button class="audio-toggle-btn" id="audioToggle" title="Toggle Audio">🔊</button>
                            <input type="range" class="volume-slider" id="volumeSlider" 
                                   min="0" max="100" value="70" title="Master Volume">
                        </div>
                        <div class="status-indicator disconnected" id="connectionStatus">
                            <span>🔗</span>
                            <span id="statusText">Not Connected</span>
                        </div>
                        <div class="balance-display" id="balanceDisplay">
                            Balance: <span id="balance">0</span> MY
                        </div>
                    </div>
                </div>

                <!-- Main Slot Container -->
                <div class="slot-container">
                    <!-- Slot Machine Area -->
                    <div class="slot-machine-area">
                        <!-- Jackpot Display -->
                        <div class="jackpot-display">
                            <div class="jackpot-label">🏆 Progressive Jackpot</div>
                            <div class="jackpot-amount" id="jackpotAmount">0 MY</div>
                        </div>

                        <!-- Slot Machine -->
                        <div class="slot-machine">
                            <div class="slot-screen">
                                <div class="reels-container" id="reelsContainer">
                                    <!-- Reels will be generated dynamically -->
                                </div>
                                
                                <!-- Enhanced Graphics Container -->
                                <div class="graphics-container" id="graphicsContainer">
                                    <!-- PixiJS canvas will be inserted here -->
                                </div>
                                
                                <!-- Paylines Overlay -->
                                <div class="paylines-overlay">
                                    <svg width="100%" height="100%" id="paylinesOverlay">
                                        <!-- Paylines will be drawn here -->
                                    </svg>
                                </div>
                            </div>

                            <!-- Control Panel -->
                            <div class="control-panel">
                                <div class="control-group">
                                    <div class="control-label">Apuesta por Línea</div>
                                    <div class="control-value" id="betAmount">10,000 MY</div>
                                    <div class="control-buttons">
                                        <button class="control-btn" id="betDown">-5K</button>
                                        <button class="control-btn" id="betUp">+5K</button>
                                    </div>
                                    <div class="control-hint">Rango: 10K - 100K MY</div>
                                </div>

                                <div class="control-group">
                                    <div class="control-label">Líneas Activas</div>
                                    <div class="control-value" id="activeLines">25</div>
                                    <div class="control-buttons">
                                        <button class="control-btn" id="linesDown">-5</button>
                                        <button class="control-btn" id="linesUp">+5</button>
                                    </div>
                                    <div class="control-hint">Rango: 1-25 líneas</div>
                                </div>

                                <div class="control-group total-bet-group">
                                    <div class="control-label">Apuesta Total</div>
                                    <div class="control-value total-bet-value" id="totalBet">250,000 MY</div>
                                    <div class="control-hint">
                                        <span id="betCalculation">10,000 MY × 25 líneas = 250,000 MY total (máx: 2,500,000 MY)</span>
                                    </div>
                                </div>

                                <div class="control-group">
                                    <button class="spin-btn" id="spinBtn">
                                        <span id="spinBtnText">🎯 SPIN</span>
                                    </button>
                                    <button class="control-btn" id="autoSpinBtn">
                                        <span id="autoSpinText">🔄 AUTO</span>
                                    </button>
                                </div>

                                <div class="control-group">
                                    <div class="control-label">Last Win</div>
                                    <div class="control-value" id="lastWin">0 MY</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Sidebar -->
                    <div class="sidebar">
                        <!-- Paytable -->
                        <div class="info-panel">
                            <h3 class="panel-title">💰 Paytable</h3>
                            <div id="paytable">
                                <div class="paytable-item">
                                    <div class="paytable-symbols">
                                        <div class="paytable-symbol symbol-yeti"></div>
                                        <div class="paytable-symbol symbol-yeti"></div>
                                        <div class="paytable-symbol symbol-yeti"></div>
                                        <div class="paytable-symbol symbol-yeti"></div>
                                        <div class="paytable-symbol symbol-yeti"></div>
                                    </div>
                                    <div class="paytable-payout">100x</div>
                                </div>
                                <div class="paytable-item">
                                    <div class="paytable-symbols">
                                        <div class="paytable-symbol symbol-rocket"></div>
                                        <div class="paytable-symbol symbol-rocket"></div>
                                        <div class="paytable-symbol symbol-rocket"></div>
                                        <div class="paytable-symbol symbol-rocket"></div>
                                        <div class="paytable-symbol symbol-rocket"></div>
                                    </div>
                                    <div class="paytable-payout">50x</div>
                                </div>
                                <div class="paytable-item">
                                    <div class="paytable-symbols">
                                        <div class="paytable-symbol symbol-moon"></div>
                                        <div class="paytable-symbol symbol-moon"></div>
                                        <div class="paytable-symbol symbol-moon"></div>
                                        <div class="paytable-symbol symbol-moon"></div>
                                        <div class="paytable-symbol symbol-moon"></div>
                                    </div>
                                    <div class="paytable-payout">30x</div>
                                </div>
                                <div class="paytable-item">
                                    <div class="paytable-symbols">
                                        <div class="paytable-symbol symbol-coin"></div>
                                        <div class="paytable-symbol symbol-coin"></div>
                                        <div class="paytable-symbol symbol-coin"></div>
                                        <div class="paytable-symbol symbol-coin"></div>
                                        <div class="paytable-symbol symbol-coin"></div>
                                    </div>
                                    <div class="paytable-payout">20x</div>
                                </div>
                                <div class="paytable-item">
                                    <div class="paytable-symbols">
                                        <div class="paytable-symbol symbol-star"></div>
                                        <div class="paytable-symbol symbol-star"></div>
                                        <div class="paytable-symbol symbol-star"></div>
                                        <div class="paytable-symbol symbol-star"></div>
                                        <div class="paytable-symbol symbol-star"></div>
                                    </div>
                                    <div class="paytable-payout">15x</div>
                                </div>
                                <div class="paytable-item">
                                    <div class="paytable-symbols">
                                        <div class="paytable-symbol symbol-planet"></div>
                                        <div class="paytable-symbol symbol-planet"></div>
                                        <div class="paytable-symbol symbol-planet"></div>
                                        <div class="paytable-symbol symbol-planet"></div>
                                        <div class="paytable-symbol symbol-planet"></div>
                                    </div>
                                    <div class="paytable-payout">10x</div>
                                </div>
                            </div>
                        </div>

                        <!-- Leaderboard Panel -->
                        <div class="info-panel">
                            <h3 class="panel-title">🏆 Top Players</h3>
                            <div id="leaderboard">
                                <div class="leaderboard-item">
                                    <div class="player-info">
                                        <div class="player-rank">1</div>
                                        <div class="player-name">CryptoKing</div>
                                    </div>
                                    <div class="player-amount">+2,450,000 MY</div>
                                </div>
                                <div class="leaderboard-item">
                                    <div class="player-info">
                                        <div class="player-rank">2</div>
                                        <div class="player-name">MoonWhale</div>
                                    </div>
                                    <div class="player-amount">+1,890,000 MY</div>
                                </div>
                                <div class="leaderboard-item">
                                    <div class="player-info">
                                        <div class="player-rank">3</div>
                                        <div class="player-name">YetiHunter</div>
                                    </div>
                                    <div class="player-amount">+1,250,000 MY</div>
                                </div>
                                <div class="leaderboard-item">
                                    <div class="player-info">
                                        <div class="player-rank">4</div>
                                        <div class="player-name">SlotMaster</div>
                                    </div>
                                    <div class="player-amount">+980,000 MY</div>
                                </div>
                                <div class="leaderboard-item">
                                    <div class="player-info">
                                        <div class="player-rank">5</div>
                                        <div class="player-name">LuckyMoon</div>
                                    </div>
                                    <div class="player-amount">+750,000 MY</div>
                                </div>
                            </div>
                        </div>

                        <!-- Recent Wins Panel -->
                        <div class="info-panel">
                            <h3 class="panel-title">🎊 Recent Big Wins</h3>
                            <div id="recentWins">
                                <div class="recent-win-item">
                                    <div class="win-player">BitcoinBull</div>
                                    <div class="win-amount">+500,000 MY</div>
                                    <div class="win-time">2 min ago</div>
                                </div>
                                <div class="recent-win-item">
                                    <div class="win-player">CryptoQueen</div>
                                    <div class="win-amount">+325,000 MY</div>
                                    <div class="win-time">5 min ago</div>
                                </div>
                                <div class="recent-win-item">
                                    <div class="win-player">MoonRider</div>
                                    <div class="win-amount">+180,000 MY</div>
                                    <div class="win-time">8 min ago</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async initializeSlotMachine() {
        console.log('🎰 Initializing slot machine systems...');
        
        // Wait for DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Initialize slot machine if the class exists
        if (typeof SlotMachine !== 'undefined') {
            try {
                console.log('🎰 Creating SlotMachine instance...');
                this.slotMachine = new SlotMachine();
                console.log('✅ SlotMachine instance created');
            } catch (error) {
                console.error('❌ Error creating SlotMachine:', error);
                throw error;
            }
        } else {
            console.warn('⚠️ SlotMachine class not available');
        }
        
        // Initialize wallet connections for this component
        this.initializeWalletIntegration();
        
        console.log('✅ Slot machine initialization complete');
    }
    
    initializeWalletIntegration() {
        // Connect wallet hub and auth buttons to existing systems
        const authBtn = document.getElementById('authBtn');
        const walletBtn = document.getElementById('walletHubBtn');
        
        if (authBtn && window.authModal) {
            authBtn.addEventListener('click', () => {
                window.authModal.open('login');
            });
        }
        
        if (walletBtn && window.walletHub) {
            walletBtn.addEventListener('click', () => {
                window.walletHub.open('balance');
            });
        }
        
        // Listen for auth state changes
        window.addEventListener('authStateChanged', (event) => {
            this.updateAuthDisplay(event.detail);
        });
    }
    
    updateAuthDisplay(authData) {
        const { isAuthenticated, user } = authData;
        
        // Update balance display if user is authenticated
        if (isAuthenticated && user) {
            const balanceEl = document.getElementById('balance');
            if (balanceEl) {
                balanceEl.textContent = user.mooncoinsBalance || 0;
            }
        }
    }
    
    destroy() {
        if (this.slotMachine && typeof this.slotMachine.destroy === 'function') {
            this.slotMachine.destroy();
        }
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        this.initialized = false;
        console.log('🗑️ Slot machine component destroyed');
    }
    
    // Public API
    isInitialized() {
        return this.initialized;
    }
    
    getSlotMachine() {
        return this.slotMachine;
    }
}

// Component styles
const slotComponentStyles = `
<style>
.slot-component-wrapper {
    min-height: 100vh;
    background: var(--darker);
}

.slot-component-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: rgba(6, 10, 20, 0.95);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    position: sticky;
    top: 0;
    z-index: 100;
}

.slot-component-info {
    text-align: center;
    flex: 1;
}

.slot-component-title {
    font-size: 1.8rem;
    font-weight: 700;
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;
}

.slot-component-subtitle {
    color: var(--light);
    opacity: 0.8;
    font-size: 0.9rem;
    margin: 0;
}

.slot-component-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.audio-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.1);
    padding: 0.5rem;
    border-radius: 12px;
}

.audio-toggle-btn {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 6px;
    transition: all 0.3s ease;
}

.audio-toggle-btn:hover {
    background: rgba(255, 255, 255, 0.1);
}

.volume-slider {
    width: 80px;
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    outline: none;
    -webkit-appearance: none;
}

.volume-slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    background: var(--primary);
    border-radius: 50%;
    cursor: pointer;
}

.status-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 600;
}

.status-indicator.connected {
    background: rgba(78, 205, 196, 0.2);
    color: var(--secondary);
    border: 1px solid var(--secondary);
}

.status-indicator.disconnected {
    background: rgba(255, 107, 53, 0.2);
    color: var(--primary);
    border: 1px solid var(--primary);
}

.balance-display {
    background: rgba(255, 255, 255, 0.1);
    padding: 0.5rem 1rem;
    border-radius: 12px;
    font-weight: 600;
    color: var(--light);
}

@media (max-width: 768px) {
    .slot-component-header {
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
    }
    
    .slot-component-controls {
        flex-wrap: wrap;
        justify-content: center;
    }
}
</style>
`;

// Inject component styles
document.head.insertAdjacentHTML('beforeend', slotComponentStyles);

// Export for global use
window.SlotMachineComponent = SlotMachineComponent;