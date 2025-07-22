// MoonYetis Ecosystem Router
// Handles navigation between landing page and products

class EcosystemRouter {
    constructor() {
        this.currentProduct = null;
        this.products = {
            'coin-flip': {
                id: 'coin-flip',
                name: 'MoonYetis Coin Flip',
                path: '#/coin-flip',
                status: 'live',
                icon: '🪙',
                description: 'Simple coin flip game with instant results and MoonYetis rewards',
                loader: () => this.loadCoinFlipProduct()
            },
            'dice-roll': {
                id: 'dice-roll',
                name: 'MoonYetis Dice Roll',
                path: '#/dice-roll',
                status: 'live',
                icon: '🎲',
                description: 'Roll the dice and predict HIGH (4-6) or LOW (1-3) for instant rewards',
                loader: () => this.loadDiceRollProduct()
            },
            'jupiter-lottery': {
                id: 'jupiter-lottery',
                name: 'Jupiter Lottery',
                path: '#/jupiter-lottery',
                status: 'live',
                icon: '🎫',
                description: 'Win big with Powerball-based lottery draws every Monday, Wednesday & Saturday',
                loader: () => this.loadJupiterLotteryProduct()
            },
            'mars-faucet': {
                id: 'mars-faucet',
                name: 'Mars Faucet',
                path: '#/mars-faucet',
                status: 'live',
                icon: '🔴',
                description: 'Free MoonCoins every 8 hours with anti-bot verification and ad rewards',
                loader: () => this.loadMarsFaucetProduct()
            }
            // Future products will be added here
        };
        this.init();
    }
    
    init() {
        console.log('🧭 EcosystemRouter: Initializing...');
        this.setupEventListeners();
        this.setupFAQAccordion();
        this.handleInitialRoute();
        console.log('✅ EcosystemRouter: Initialization complete');
    }
    
    setupEventListeners() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', () => this.handleRoute());
        
        // Handle hash changes
        window.addEventListener('hashchange', () => this.handleRoute());
        
        // Intercept navigation clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('[data-route]');
            if (link) {
                e.preventDefault();
                const route = link.getAttribute('data-route');
                this.navigateTo(route);
            }
            
            // Handle smooth scrolling for anchor links
            const anchorLink = e.target.closest('[data-scroll-to]');
            if (anchorLink) {
                e.preventDefault();
                const targetId = anchorLink.getAttribute('data-scroll-to');
                this.smoothScrollTo(targetId);
            }
        });
    }
    
    setupFAQAccordion() {
        // Setup FAQ accordion functionality
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('faq-question') || 
                e.target.closest('.faq-question')) {
                
                const faqQuestion = e.target.classList.contains('faq-question') ? 
                                   e.target : e.target.closest('.faq-question');
                const faqItem = faqQuestion.closest('.faq-item');
                
                if (faqItem) {
                    // Toggle active state
                    faqItem.classList.toggle('active');
                    
                    // Close other FAQ items (optional - for accordion behavior)
                    document.querySelectorAll('.faq-item').forEach(item => {
                        if (item !== faqItem) {
                            item.classList.remove('active');
                        }
                    });
                }
            }
        });
    }
    
    handleInitialRoute() {
        const hash = window.location.hash;
        if (hash) {
            this.handleRoute();
        } else {
            this.showLandingPage();
        }
    }
    
    handleRoute() {
        const hash = window.location.hash;
        const route = hash.replace('#/', '');
        
        console.log(`🧭 Routing to: ${route || 'landing'}`);
        
        if (!route || route === '') {
            this.showLandingPage();
        } else if (this.products[route]) {
            this.loadProduct(route);
        } else {
            console.warn(`⚠️ Unknown route: ${route}`);
            this.showLandingPage();
        }
    }
    
    navigateTo(route) {
        if (route === '' || route === '/') {
            window.location.hash = '';
        } else {
            window.location.hash = `#/${route}`;
        }
    }
    
    showLandingPage() {
        console.log('🏠 Showing landing page');
        
        // Destroy current product component if exists
        this.destroyCurrentProduct();
        
        this.currentProduct = null;
        
        // Show landing page sections
        this.showElement('.ecosystem-hero');
        this.showElement('.ecosystem-products');
        this.showElement('.ecosystem-stats');
        this.showElement('.ecosystem-about');
        
        // Hide product container
        this.hideElement('#product-container');
        
        // Update navigation
        this.updateNavigation();
        
        // Update page title
        document.title = 'MoonYetis Ecosystem | Revolutionary Crypto Gaming on Fractal Bitcoin';
        
        // Trigger custom event
        window.dispatchEvent(new CustomEvent('routeChanged', {
            detail: { route: 'landing', product: null }
        }));
    }
    
    async loadProduct(productId) {
        const product = this.products[productId];
        if (!product) {
            console.error(`❌ Product not found: ${productId}`);
            return;
        }
        
        console.log(`🎮 Loading product: ${product.name}`);
        this.currentProduct = productId;
        
        // Hide landing page sections
        this.hideElement('.ecosystem-hero');
        this.hideElement('.ecosystem-products');
        this.hideElement('.ecosystem-stats');
        this.hideElement('.ecosystem-about');
        
        // Show product container
        this.showElement('#product-container');
        
        // Update navigation
        this.updateNavigation();
        
        // Update page title
        document.title = `${product.name} | MoonYetis Ecosystem`;
        
        // Load product
        try {
            await product.loader();
            
            // Trigger custom event
            window.dispatchEvent(new CustomEvent('routeChanged', {
                detail: { route: productId, product: product }
            }));
        } catch (error) {
            console.error(`❌ Error loading product ${productId}:`, error);
            this.showLandingPage();
        }
    }
    
    async loadCoinFlipProduct() {
        console.log('🪙 Loading MoonYetis Coin Flip...');
        
        const container = document.getElementById('product-container');
        if (!container) {
            console.error('❌ Product container not found');
            return;
        }
        
        // Set loading state
        container.innerHTML = `
            <div class="product-loading">
                <div class="loading-spinner"></div>
                <p>Loading MoonYetis Coin Flip...</p>
            </div>
        `;
        
        // Wait a moment for visual feedback
        await new Promise(resolve => setTimeout(resolve, 500));
        
        try {
            // Load the coin flip game HTML
            container.innerHTML = this.getCoinFlipHTML();
            
            // Show the coin flip container and hide others
            const coinFlipContainer = document.getElementById('coin-flip-container');
            const diceRollContainer = document.getElementById('dice-roll-container');
            
            if (coinFlipContainer) {
                coinFlipContainer.style.display = 'block';
                
                // Initialize the game if not already done
                if (typeof window.coinFlipGame !== 'undefined') {
                    window.coinFlipGame.init();
                }
            }
            
            // Hide other game containers
            if (diceRollContainer) {
                diceRollContainer.style.display = 'none';
            }
            
            console.log('✅ MoonYetis Coin Flip loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading MoonYetis Coin Flip:', error);
            container.innerHTML = `
                <div class="product-error">
                    <h2>⚠️ Error Loading Coin Flip</h2>
                    <p>There was an error loading MoonYetis Coin Flip. Please try again.</p>
                    <button class="product-back-btn" data-route="">← Back to Ecosystem</button>
                </div>
            `;
        }
    }

    async loadDiceRollProduct() {
        console.log('🎲 Loading MoonYetis Dice Roll...');
        
        const container = document.getElementById('product-container');
        if (!container) {
            console.error('❌ Product container not found');
            return;
        }
        
        // Set loading state
        container.innerHTML = `
            <div class="product-loading">
                <div class="loading-spinner"></div>
                <p>Loading MoonYetis Dice Roll...</p>
            </div>
        `;
        
        // Wait a moment for visual feedback
        await new Promise(resolve => setTimeout(resolve, 500));
        
        try {
            // Load the dice roll game HTML
            container.innerHTML = this.getDiceRollHTML();
            
            // Show the dice roll container and hide others
            const diceRollContainer = document.getElementById('dice-roll-container');
            const coinFlipContainer = document.getElementById('coin-flip-container');
            
            if (diceRollContainer) {
                diceRollContainer.style.display = 'block';
                
                // Initialize the game if not already done
                if (typeof window.diceRollGame !== 'undefined') {
                    window.diceRollGame.init();
                }
            }
            
            // Hide other game containers
            if (coinFlipContainer) {
                coinFlipContainer.style.display = 'none';
            }
            
            console.log('✅ MoonYetis Dice Roll loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading MoonYetis Dice Roll:', error);
            container.innerHTML = `
                <div class="product-error">
                    <h2>⚠️ Error Loading Dice Roll</h2>
                    <p>There was an error loading MoonYetis Dice Roll. Please try again.</p>
                    <button class="product-back-btn" data-route="">← Back to Ecosystem</button>
                </div>
            `;
        }
    }

    async loadJupiterLotteryProduct() {
        console.log('🎫 Loading Jupiter Lottery...');
        
        const container = document.getElementById('product-container');
        if (!container) {
            console.error('❌ Product container not found');
            return;
        }
        
        // Set loading state
        container.innerHTML = `
            <div class="product-loading">
                <div class="loading-spinner"></div>
                <p>Loading Jupiter Lottery...</p>
            </div>
        `;
        
        // Wait a moment for visual feedback
        await new Promise(resolve => setTimeout(resolve, 500));
        
        try {
            // Load the Jupiter Lottery game HTML
            container.innerHTML = this.getJupiterLotteryHTML();
            
            // Show the Jupiter Lottery container and hide others
            const jupiterContainer = document.getElementById('jupiter-lottery-container');
            const diceRollContainer = document.getElementById('dice-roll-container');
            const coinFlipContainer = document.getElementById('coin-flip-container');
            
            if (jupiterContainer) {
                jupiterContainer.style.display = 'block';
                
                // Initialize the game if not already done
                if (typeof window.jupiterLotteryGame !== 'undefined') {
                    window.jupiterLotteryGame.init();
                }
            }
            
            // Hide other game containers
            if (diceRollContainer) {
                diceRollContainer.style.display = 'none';
            }
            if (coinFlipContainer) {
                coinFlipContainer.style.display = 'none';
            }
            
            console.log('✅ Jupiter Lottery loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading Jupiter Lottery:', error);
            container.innerHTML = `
                <div class="product-error">
                    <h2>⚠️ Error Loading Jupiter Lottery</h2>
                    <p>There was an error loading Jupiter Lottery. Please try again.</p>
                    <button class="product-back-btn" data-route="">← Back to Ecosystem</button>
                </div>
            `;
        }
    }

    async loadMarsFaucetProduct() {
        console.log('🔴 Loading Mars Faucet...');
        
        const container = document.getElementById('product-container');
        if (!container) {
            console.error('❌ Product container not found');
            return;
        }
        
        // Set loading state
        container.innerHTML = `
            <div class="product-loading">
                <div class="loading-spinner"></div>
                <p>Loading Mars Faucet...</p>
            </div>
        `;
        
        // Wait a moment for visual feedback
        await new Promise(resolve => setTimeout(resolve, 500));
        
        try {
            // Load the Mars Faucet game HTML
            container.innerHTML = this.getMarsFaucetHTML();
            
            // Show the Mars Faucet container and hide others
            const marsFaucetContainer = document.getElementById('mars-faucet-container');
            const diceRollContainer = document.getElementById('dice-roll-container');
            const coinFlipContainer = document.getElementById('coin-flip-container');
            const jupiterContainer = document.getElementById('jupiter-lottery-container');
            
            if (marsFaucetContainer) {
                marsFaucetContainer.style.display = 'block';
                
                // Initialize the game if not already done
                if (typeof window.marsFaucetGame !== 'undefined') {
                    window.marsFaucetGame.init();
                }
            }
            
            // Hide other game containers
            if (diceRollContainer) {
                diceRollContainer.style.display = 'none';
            }
            if (coinFlipContainer) {
                coinFlipContainer.style.display = 'none';
            }
            if (jupiterContainer) {
                jupiterContainer.style.display = 'none';
            }
            
            console.log('✅ Mars Faucet loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading Mars Faucet:', error);
            container.innerHTML = `
                <div class="product-error">
                    <h2>⚠️ Error Loading Mars Faucet</h2>
                    <p>There was an error loading Mars Faucet. Please try again.</p>
                    <button class="product-back-btn" data-route="">← Back to Ecosystem</button>
                </div>
            `;
        }
    }
    
    getCoinFlipHTML() {
        return `
            <div class="product-header">
                <div class="product-nav">
                    <button class="product-back-btn" data-route="">
                        ← Back to Ecosystem
                    </button>
                    <h1 class="product-title">🪙 MoonYetis Coin Flip</h1>
                </div>
            </div>
            
            <div class="coin-flip-game-container">
                <div id="coin-flip-container">
                    <!-- Coin flip game will be initialized here -->
                </div>
            </div>
        `;
    }

    getDiceRollHTML() {
        return `
            <div class="product-header">
                <div class="product-nav">
                    <button class="product-back-btn" data-route="">
                        ← Back to Ecosystem
                    </button>
                    <h1 class="product-title">🎲 MoonYetis Dice Roll</h1>
                </div>
            </div>
            
            <div class="dice-roll-game-container">
                <div id="dice-roll-container">
                    <!-- Dice roll game will be initialized here -->
                </div>
            </div>
        `;
    }

    getJupiterLotteryHTML() {
        return `
            <div class="product-header">
                <div class="product-nav">
                    <button class="product-back-btn" data-route="">
                        ← Back to Ecosystem
                    </button>
                    <h1 class="product-title">🎫 Jupiter Lottery</h1>
                </div>
            </div>
            
            <div class="jupiter-lottery-game-container">
                <div id="jupiter-lottery-container">
                    <!-- Jupiter Lottery game will be initialized here -->
                </div>
            </div>
        `;
    }

    getMarsFaucetHTML() {
        return `
            <div class="product-header">
                <div class="product-nav">
                    <button class="product-back-btn" data-route="">
                        ← Back to Ecosystem
                    </button>
                    <h1 class="product-title">🔴 Mars Faucet</h1>
                </div>
            </div>
            
            <div class="mars-faucet-game-container">
                <div id="mars-faucet-container">
                    <!-- Mars Faucet game will be initialized here -->
                </div>
            </div>
        `;
    }
    
    updateNavigation() {
        // Update active states in navigation
        document.querySelectorAll('[data-route]').forEach(link => {
            const route = link.getAttribute('data-route');
            const isActive = (route === '' && !this.currentProduct) || 
                           (route === this.currentProduct);
            
            link.classList.toggle('active', isActive);
        });
        
        // Update ecosystem nav visibility
        const ecosystemNav = document.querySelector('.ecosystem-nav');
        if (ecosystemNav) {
            ecosystemNav.style.display = this.currentProduct ? 'none' : 'block';
        }
    }
    
    showElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.classList.remove('ecosystem-hidden');
            element.classList.add('ecosystem-visible');
        }
    }
    
    hideElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.classList.remove('ecosystem-visible');
            element.classList.add('ecosystem-hidden');
        }
    }
    
    // Smooth scrolling functionality
    smoothScrollTo(targetId) {
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            const headerOffset = 80; // Account for fixed navigation
            const elementPosition = targetElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    }
    
    // Public API
    getCurrentProduct() {
        return this.currentProduct;
    }
    
    getAvailableProducts() {
        return Object.values(this.products);
    }
    
    isOnLandingPage() {
        return !this.currentProduct;
    }
    
    // Add new product (for future use)
    addProduct(productConfig) {
        this.products[productConfig.id] = productConfig;
        console.log(`✅ Product added: ${productConfig.name}`);
    }
    
    // Remove product
    removeProduct(productId) {
        if (this.products[productId]) {
            delete this.products[productId];
            console.log(`🗑️ Product removed: ${productId}`);
        }
    }
    
    // Destroy current product component
    destroyCurrentProduct() {
        // Hide all game containers when navigating away
        const containers = [
            'coin-flip-container',
            'dice-roll-container', 
            'jupiter-lottery-container',
            'mars-faucet-container'
        ];
        
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.style.display = 'none';
            }
        });
        
        console.log('🗑️ Current product component cleaned up');
    }
}

// Product loading styles
const productStyles = `
<style>
.product-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    color: var(--ecosystem-light);
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top: 3px solid var(--ecosystem-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
}

.product-header {
    padding: 2rem;
    background: var(--ecosystem-gradient-card);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.product-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1200px;
    margin: 0 auto;
}

.product-back-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: var(--ecosystem-light);
    padding: 0.5rem 1rem;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
}

.product-back-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateX(-2px);
}

.product-title {
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--ecosystem-light);
    margin: 0;
}

.slot-game-container {
    flex: 1;
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

#product-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: var(--ecosystem-dark);
}

@media (max-width: 768px) {
    .product-nav {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
    }
    
    .product-header {
        padding: 1rem;
    }
    
    .slot-game-container {
        padding: 1rem;
    }
}
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', productStyles);

// Export for global use
window.EcosystemRouter = EcosystemRouter;