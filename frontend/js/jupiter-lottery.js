// MoonYetis Jupiter Lottery - Power Match with Complete Transparency
console.log('🎫 MoonYetis Jupiter Lottery Loading...');

// Game state management
const jupiterLotteryState = {
    balance: 0,
    moonCoinBalance: 0, // MC balance for tickets
    connectedWallet: false,
    
    // Tickets
    activeTickets: [],
    ticketHistory: [],
    totalTicketsPurchased: 0,
    totalAmountWagered: 0,
    totalAmountWon: 0,
    biggestWin: 0,
    
    // Game settings
    ticketCost: 100, // 100 MC = $1 USD
    maxTicketsPerDraw: 10, // Limit per draw
    
    // Current selection
    selectedNumbers: [], // 5 numbers from 1-69
    selectedPowerball: null, // 1 number from 1-26
    
    // Latest draw info
    latestDraw: null,
    nextDrawDate: null,
    
    // Transparency
    verificationUrls: {
        official: 'https://powerball.com/numbers/',
        rawData: 'https://data.ny.gov/resource/d6yy-54nr.json',
        powerballHome: 'https://powerball.com'
    }
};

// Prize structure for Power Match
const PRIZE_STRUCTURE = {
    '5+PB': { matches: 5, powerball: true, prize: 50000, odds: '1 in 292,201,338' },
    '5+0': { matches: 5, powerball: false, prize: 10000, odds: '1 in 11,688,054' },
    '4+PB': { matches: 4, powerball: true, prize: 2000, odds: '1 in 913,129' },
    '4+0': { matches: 4, powerball: false, prize: 500, odds: '1 in 36,525' },
    '3+PB': { matches: 3, powerball: true, prize: 500, odds: '1 in 14,494' },
    '3+0': { matches: 3, powerball: false, prize: 200, odds: '1 in 580' },
    '2+PB': { matches: 2, powerball: true, prize: 200, odds: '1 in 701' },
    '1+PB': { matches: 1, powerball: true, prize: 100, odds: '1 in 92' },
    '0+PB': { matches: 0, powerball: true, prize: 100, odds: '1 in 38' }
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

    formatUSD: (mcAmount) => {
        const usdValue = mcAmount / 100; // 100 MC = $1 USD
        return `$${usdValue.toFixed(2)}`;
    },

    formatCombined: (mcAmount) => {
        return `${NumberFormatter.formatMoonCoin(mcAmount)} (${NumberFormatter.formatUSD(mcAmount)})`;
    }
};

// Main Jupiter Lottery game logic
const jupiterLotteryGame = {
    
    init() {
        console.log('🎫 Initializing MoonYetis Jupiter Lottery...');
        this.createGameInterface();
        this.setupEventListeners();
        this.setupBalanceManager();
        this.loadLatestDraw();
        this.updateUI();
        console.log('✅ Jupiter Lottery initialized successfully');
    },

    setupBalanceManager() {
        // Wait for BalanceManager to be available
        if (window.balanceManager) {
            // Register this game with the BalanceManager
            window.balanceManager.registerGame('jupiter-lottery', (balanceData) => {
                console.log('🎫 Jupiter Lottery: Received balance update:', balanceData.balance, 'MC');
                jupiterLotteryState.moonCoinBalance = balanceData.balance;
                this.updateUI();
            });

            // Get current balance
            jupiterLotteryState.moonCoinBalance = window.balanceManager.getBalance();
            console.log(`🎫 Jupiter Lottery: Synced with BalanceManager - ${jupiterLotteryState.moonCoinBalance} MC`);
        } else {
            console.warn('⚠️ BalanceManager not available, using local balance');
        }
    },

    createGameInterface() {
        const container = document.getElementById('jupiter-lottery-container');
        if (!container) {
            console.error('❌ Jupiter lottery container not found');
            return;
        }

        container.innerHTML = `
            <div class="jupiter-lottery-game">
                <!-- Transparency Header -->
                <div class="transparency-header">
                    <div class="lottery-title">
                        <h2 class="game-title">🎫 Jupiter Lottery</h2>
                        <div class="transparency-badge">
                            <span class="badge-icon">🔍</span>
                            <span class="badge-text">100% Verifiable</span>
                            <span class="badge-subtitle">Uses Official Powerball Results</span>
                        </div>
                    </div>
                    
                    <div class="transparency-notice">
                        <p><strong>Complete Transparency:</strong> Jupiter Lottery uses the exact same winning numbers as the official Powerball USA lottery. Every draw is completely transparent and verifiable.</p>
                        <div class="verification-links">
                            <a href="https://powerball.com" target="_blank" class="verify-btn" rel="noopener">
                                🔗 Verify on Powerball.com
                            </a>
                            <a href="https://data.ny.gov/resource/d6yy-54nr.json" target="_blank" class="api-btn" rel="noopener">
                                📊 View Official Data
                            </a>
                        </div>
                    </div>
                </div>

                <!-- Latest Results Display -->
                <div class="latest-results" id="latestResults">
                    <h3>Latest Powerball Results</h3>
                    <div class="loading-results">Loading latest draw...</div>
                </div>

                <!-- Game Interface -->
                <div class="game-main">
                    <!-- Power Match Info -->
                    <div class="game-info">
                        <h3>🎯 Power Match - $1 per ticket</h3>
                        <p>Pick 5 numbers (1-69) + 1 Powerball (1-26). Win up to 50,000 MC ($500)!</p>
                        <button class="info-btn" id="showPrizeTable">📊 View Prize Table</button>
                    </div>

                    <!-- Number Selection -->
                    <div class="number-selection">
                        <div class="white-balls-section">
                            <h4>Pick 5 White Balls (1-69)</h4>
                            <div class="selected-display">
                                Selected: <span id="selectedWhiteBalls">None</span>
                            </div>
                            <div class="numbers-grid white-balls" id="whiteBallsGrid">
                                <!-- Numbers 1-69 will be generated here -->
                            </div>
                        </div>

                        <div class="powerball-section">
                            <h4>Pick 1 Powerball (1-26)</h4>
                            <div class="selected-display">
                                Selected: <span id="selectedPowerball">None</span>
                            </div>
                            <div class="numbers-grid powerball-grid" id="powerballGrid">
                                <!-- Numbers 1-26 will be generated here -->
                            </div>
                        </div>
                    </div>

                    <!-- Quick Actions -->
                    <div class="quick-actions">
                        <button class="action-btn" id="quickPickBtn">🎲 Quick Pick</button>
                        <button class="action-btn" id="clearSelectionBtn">🗑️ Clear</button>
                    </div>

                    <!-- Purchase Section -->
                    <div class="purchase-section">
                        <div class="ticket-summary">
                            <div class="cost-display">
                                Ticket Cost: <span class="cost-amount">100 MC ($1)</span>
                            </div>
                        </div>
                        
                        <button class="purchase-btn" id="purchaseTicketBtn" disabled>
                            🔗 Connect Wallet to Purchase
                        </button>
                    </div>
                </div>

                <!-- Your Tickets -->
                <div class="your-tickets">
                    <h3>🎫 Your Tickets</h3>
                    <div class="tickets-container" id="ticketsContainer">
                        <p class="no-tickets">No tickets purchased yet.</p>
                    </div>
                </div>

                <!-- Game Stats -->
                <div class="game-stats">
                    <div class="stat-item">
                        <span class="stat-label">MC Balance:</span>
                        <span class="stat-value" id="mcBalance">0 MC</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Tickets:</span>
                        <span class="stat-value" id="totalTickets">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Won:</span>
                        <span class="stat-value" id="totalWon">0 MC</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Biggest Win:</span>
                        <span class="stat-value" id="biggestWin">0 MC</span>
                    </div>
                </div>

                <!-- Messages -->
                <div class="message-area">
                    <div class="message" id="jupiterMessage"></div>
                </div>

                <!-- Transparency Footer -->
                <div class="transparency-footer">
                    <div class="disclaimer">
                        <p><strong>🔍 Transparency Promise:</strong> Every Jupiter Lottery result uses the exact same numbers from official Powerball USA draws.</p>
                        <p class="small-disclaimer"><em>Jupiter Lottery is an independent gaming platform. Not affiliated with Powerball USA.</em></p>
                    </div>
                </div>
            </div>
        `;

        // Generate number grids
        this.generateNumberGrids();
    },

    generateNumberGrids() {
        // Generate white balls grid (1-69)
        const whiteBallsGrid = document.getElementById('whiteBallsGrid');
        if (whiteBallsGrid) {
            for (let i = 1; i <= 69; i++) {
                const numberBtn = document.createElement('button');
                numberBtn.className = 'number-btn white-ball';
                numberBtn.textContent = i.toString().padStart(2, '0');
                numberBtn.dataset.number = i;
                numberBtn.addEventListener('click', () => this.selectWhiteBall(i));
                whiteBallsGrid.appendChild(numberBtn);
            }
        }

        // Generate powerball grid (1-26)
        const powerballGrid = document.getElementById('powerballGrid');
        if (powerballGrid) {
            for (let i = 1; i <= 26; i++) {
                const numberBtn = document.createElement('button');
                numberBtn.className = 'number-btn powerball';
                numberBtn.textContent = i.toString().padStart(2, '0');
                numberBtn.dataset.number = i;
                numberBtn.addEventListener('click', () => this.selectPowerball(i));
                powerballGrid.appendChild(numberBtn);
            }
        }
    },

    setupEventListeners() {
        // Quick pick button
        const quickPickBtn = document.getElementById('quickPickBtn');
        if (quickPickBtn) {
            quickPickBtn.addEventListener('click', () => this.quickPick());
        }

        // Clear selection button
        const clearSelectionBtn = document.getElementById('clearSelectionBtn');
        if (clearSelectionBtn) {
            clearSelectionBtn.addEventListener('click', () => this.clearSelection());
        }

        // Purchase button
        const purchaseTicketBtn = document.getElementById('purchaseTicketBtn');
        if (purchaseTicketBtn) {
            purchaseTicketBtn.addEventListener('click', () => this.purchaseTicket());
        }

        // Prize table button
        const showPrizeTable = document.getElementById('showPrizeTable');
        if (showPrizeTable) {
            showPrizeTable.addEventListener('click', () => this.showPrizeTable());
        }
    },

    selectWhiteBall(number) {
        if (jupiterLotteryState.selectedNumbers.includes(number)) {
            // Remove if already selected
            jupiterLotteryState.selectedNumbers = jupiterLotteryState.selectedNumbers.filter(n => n !== number);
        } else if (jupiterLotteryState.selectedNumbers.length < 5) {
            // Add if less than 5 selected
            jupiterLotteryState.selectedNumbers.push(number);
            jupiterLotteryState.selectedNumbers.sort((a, b) => a - b);
        } else {
            this.showMessage('⚠️ You can only select 5 white balls', 'warning');
            return;
        }

        this.updateNumberSelection();
        this.updatePurchaseButton();
    },

    selectPowerball(number) {
        jupiterLotteryState.selectedPowerball = jupiterLotteryState.selectedPowerball === number ? null : number;
        this.updateNumberSelection();
        this.updatePurchaseButton();
    },

    updateNumberSelection() {
        // Update white balls display
        const whiteBallButtons = document.querySelectorAll('.white-ball');
        whiteBallButtons.forEach(btn => {
            const number = parseInt(btn.dataset.number);
            btn.classList.toggle('selected', jupiterLotteryState.selectedNumbers.includes(number));
        });

        const selectedWhiteBalls = document.getElementById('selectedWhiteBalls');
        if (selectedWhiteBalls) {
            selectedWhiteBalls.textContent = jupiterLotteryState.selectedNumbers.length > 0 
                ? jupiterLotteryState.selectedNumbers.map(n => n.toString().padStart(2, '0')).join(' ')
                : 'None';
        }

        // Update powerball display
        const powerballButtons = document.querySelectorAll('.powerball');
        powerballButtons.forEach(btn => {
            const number = parseInt(btn.dataset.number);
            btn.classList.toggle('selected', number === jupiterLotteryState.selectedPowerball);
        });

        const selectedPowerball = document.getElementById('selectedPowerball');
        if (selectedPowerball) {
            selectedPowerball.textContent = jupiterLotteryState.selectedPowerball 
                ? jupiterLotteryState.selectedPowerball.toString().padStart(2, '0')
                : 'None';
        }
    },

    quickPick() {
        // Generate 5 random numbers for white balls
        const whiteBalls = [];
        while (whiteBalls.length < 5) {
            const num = Math.floor(Math.random() * 69) + 1;
            if (!whiteBalls.includes(num)) {
                whiteBalls.push(num);
            }
        }
        whiteBalls.sort((a, b) => a - b);

        // Generate 1 random powerball
        const powerball = Math.floor(Math.random() * 26) + 1;

        jupiterLotteryState.selectedNumbers = whiteBalls;
        jupiterLotteryState.selectedPowerball = powerball;

        this.updateNumberSelection();
        this.updatePurchaseButton();
        this.showMessage('🎲 Numbers selected randomly!', 'info');
    },

    clearSelection() {
        jupiterLotteryState.selectedNumbers = [];
        jupiterLotteryState.selectedPowerball = null;
        this.updateNumberSelection();
        this.updatePurchaseButton();
        this.showMessage('🗑️ Selection cleared', 'info');
    },

    updatePurchaseButton() {
        const purchaseBtn = document.getElementById('purchaseTicketBtn');
        if (!purchaseBtn) return;

        const hasCompleteSelection = jupiterLotteryState.selectedNumbers.length === 5 && jupiterLotteryState.selectedPowerball !== null;

        if (!jupiterLotteryState.connectedWallet) {
            purchaseBtn.textContent = '🔗 Connect Wallet to Purchase';
            purchaseBtn.disabled = true;
        } else if (!hasCompleteSelection) {
            purchaseBtn.textContent = '⚠️ Select 5 + Powerball';
            purchaseBtn.disabled = true;
        } else if (jupiterLotteryState.moonCoinBalance < jupiterLotteryState.ticketCost) {
            purchaseBtn.textContent = '💸 Insufficient MC Balance';
            purchaseBtn.disabled = true;
        } else {
            purchaseBtn.textContent = `🎫 Buy Ticket (${NumberFormatter.formatCombined(jupiterLotteryState.ticketCost)})`;
            purchaseBtn.disabled = false;
        }
    },

    async purchaseTicket() {
        if (!jupiterLotteryState.connectedWallet) {
            this.showMessage('⚠️ Connect your wallet first!', 'warning');
            return;
        }

        if (jupiterLotteryState.selectedNumbers.length !== 5 || jupiterLotteryState.selectedPowerball === null) {
            this.showMessage('⚠️ Please select 5 white balls and 1 Powerball!', 'warning');
            return;
        }

        if (jupiterLotteryState.moonCoinBalance < jupiterLotteryState.ticketCost) {
            this.showMessage('💸 Insufficient MC balance!', 'error');
            return;
        }

        // Create ticket
        const ticket = {
            id: `JUP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            numbers: [...jupiterLotteryState.selectedNumbers],
            powerball: jupiterLotteryState.selectedPowerball,
            purchaseDate: new Date().toISOString(),
            cost: jupiterLotteryState.ticketCost,
            status: 'pending',
            drawDate: this.getNextDrawDate(),
            result: null,
            payout: 0
        };

        // Use BalanceManager to subtract ticket cost
        if (window.balanceManager && !window.balanceManager.subtractBalance(jupiterLotteryState.ticketCost, 'Jupiter Lottery Ticket')) {
            this.showMessage('💸 Insufficient MC balance!', 'error');
            return;
        }

        jupiterLotteryState.totalTicketsPurchased++;
        jupiterLotteryState.totalAmountWagered += jupiterLotteryState.ticketCost;

        // Add to active tickets
        jupiterLotteryState.activeTickets.push(ticket);

        // Clear selection for next ticket
        this.clearSelection();

        // Update UI
        this.updateUI();
        this.displayTickets();

        this.showMessage(`🎉 Ticket purchased! ID: ${ticket.id.substr(-9)}`, 'success');
        console.log('✅ Ticket purchased:', ticket);
    },

    getNextDrawDate() {
        // Powerball draws: Monday, Wednesday, Saturday at 10:59 PM ET
        const now = new Date();
        const drawDays = [1, 3, 6]; // Monday, Wednesday, Saturday
        
        let nextDraw = new Date(now);
        nextDraw.setHours(22, 59, 0, 0); // 10:59 PM

        // Find next draw day
        while (!drawDays.includes(nextDraw.getDay()) || nextDraw <= now) {
            nextDraw.setDate(nextDraw.getDate() + 1);
        }

        return nextDraw.toISOString();
    },

    async loadLatestDraw() {
        try {
            // This would integrate with powerball-api.js when created
            const latestResults = document.getElementById('latestResults');
            if (latestResults) {
                latestResults.innerHTML = `
                    <h3>Latest Powerball Results</h3>
                    <div class="results-placeholder">
                        <p>🔄 Loading latest Powerball results...</p>
                        <p class="api-info">Fetching from official NY State database</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading latest draw:', error);
            this.showMessage('⚠️ Could not load latest results. Check your connection.', 'warning');
        }
    },

    showPrizeTable() {
        const modal = document.createElement('div');
        modal.className = 'prize-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🏆 Jupiter Lottery Prize Table</h3>
                    <button class="close-btn" onclick="this.closest('.prize-modal').remove()">×</button>
                </div>
                <div class="prize-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Match</th>
                                <th>Prize</th>
                                <th>Odds</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(PRIZE_STRUCTURE).map(([key, prize]) => `
                                <tr>
                                    <td>${key}</td>
                                    <td>${NumberFormatter.formatCombined(prize.prize)}</td>
                                    <td>${prize.odds}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="transparency-note">
                    <p><strong>🔍 Verification:</strong> All prizes based on official Powerball USA results.</p>
                    <a href="https://powerball.com/games/powerball" target="_blank" rel="noopener">
                        View official Powerball prize structure
                    </a>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    displayTickets() {
        const container = document.getElementById('ticketsContainer');
        if (!container) return;

        if (jupiterLotteryState.activeTickets.length === 0) {
            container.innerHTML = '<p class="no-tickets">No tickets purchased yet.</p>';
            return;
        }

        container.innerHTML = jupiterLotteryState.activeTickets.map(ticket => `
            <div class="ticket-card">
                <div class="ticket-header">
                    <span class="ticket-id">Ticket #${ticket.id.substr(-9)}</span>
                    <span class="ticket-status status-${ticket.status}">${ticket.status.toUpperCase()}</span>
                </div>
                <div class="ticket-numbers">
                    <div class="white-balls">
                        ${ticket.numbers.map(n => `<span class="number-display white">${n.toString().padStart(2, '0')}</span>`).join('')}
                    </div>
                    <div class="powerball-display">
                        <span class="number-display red">${ticket.powerball.toString().padStart(2, '0')}</span>
                    </div>
                </div>
                <div class="ticket-info">
                    <p>Draw Date: ${new Date(ticket.drawDate).toLocaleDateString()}</p>
                    <p>Cost: ${NumberFormatter.formatCombined(ticket.cost)}</p>
                    ${ticket.payout > 0 ? `<p class="win-amount">Won: ${NumberFormatter.formatCombined(ticket.payout)}</p>` : ''}
                </div>
            </div>
        `).join('');
    },

    showMessage(text, type = 'info') {
        const messageEl = document.getElementById('jupiterMessage');
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
            'mcBalance': NumberFormatter.formatMoonCoin(jupiterLotteryState.moonCoinBalance),
            'totalTickets': jupiterLotteryState.totalTicketsPurchased.toLocaleString(),
            'totalWon': NumberFormatter.formatMoonCoin(jupiterLotteryState.totalAmountWon),
            'biggestWin': NumberFormatter.formatMoonCoin(jupiterLotteryState.biggestWin)
        };

        for (let id in elements) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = elements[id];
            }
        }

        this.updatePurchaseButton();
    },

    // Integration with existing wallet system
    connectWallet() {
        jupiterLotteryState.connectedWallet = true;
        this.updateUI();
        this.showMessage('🎉 Wallet connected! Ready to play Jupiter Lottery!', 'success');
    },

    setBalance(balance, mcBalance = 0) {
        jupiterLotteryState.balance = balance;
        
        // Balance is now managed by BalanceManager, but keep for compatibility
        if (window.balanceManager) {
            window.balanceManager.setBalance(mcBalance);
        } else {
            jupiterLotteryState.moonCoinBalance = mcBalance;
            this.updateUI();
        }
    },

    disconnectWallet() {
        jupiterLotteryState.connectedWallet = false;
        jupiterLotteryState.balance = 0;
        // Don't reset MC balance - let BalanceManager handle it
        this.updateUI();
        this.showMessage('🔌 Wallet disconnected', 'info');
    }
};

// Global functions for integration
window.jupiterLotteryGame = jupiterLotteryGame;
window.jupiterLotteryState = jupiterLotteryState;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, checking for Jupiter lottery container...');
    const container = document.getElementById('jupiter-lottery-container');
    if (container) {
        jupiterLotteryGame.init();
    }
});

console.log('✅ MoonYetis Jupiter Lottery Loaded');