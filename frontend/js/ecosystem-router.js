// MoonYetis Ecosystem Router
// Handles navigation between landing page and products

class EcosystemRouter {
    constructor() {
        this.currentProduct = null;
        this.products = {
            'slots': {
                id: 'slots',
                name: 'MoonYetis Slots',
                path: '#/slots',
                status: 'live',
                icon: '🎰',
                description: 'Classic slot machine with MoonYetis and Fractal Bitcoin rewards',
                loader: () => this.loadSlotsProduct()
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
    
    async loadSlotsProduct() {
        console.log('🎰 Loading MoonYetis Slots...');
        
        const container = document.getElementById('product-container');
        if (!container) {
            console.error('❌ Product container not found');
            return;
        }
        
        // Set loading state
        container.innerHTML = `
            <div class="product-loading">
                <div class="loading-spinner"></div>
                <p>Loading MoonYetis Slots...</p>
            </div>
        `;
        
        // Wait a moment for visual feedback
        await new Promise(resolve => setTimeout(resolve, 500));
        
        try {
            // Ensure SlotMachineComponent is available
            if (typeof SlotMachineComponent === 'undefined') {
                throw new Error('SlotMachineComponent not available');
            }
            
            // Create and load the slot machine component
            this.slotMachineComponent = new SlotMachineComponent(container);
            await this.slotMachineComponent.load();
            
            console.log('✅ MoonYetis Slots loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading MoonYetis Slots:', error);
            container.innerHTML = `
                <div class="product-error">
                    <h2>⚠️ Error Loading Slots</h2>
                    <p>There was an error loading MoonYetis Slots. Please try again.</p>
                    <button class="product-back-btn" data-route="">← Back to Ecosystem</button>
                </div>
            `;
        }
    }
    
    getSlotsHTML() {
        return `
            <div class="product-header">
                <div class="product-nav">
                    <button class="product-back-btn" data-route="">
                        ← Back to Ecosystem
                    </button>
                    <h1 class="product-title">🎰 MoonYetis Slots</h1>
                </div>
            </div>
            
            <div class="slot-game-container">
                <!-- Slot machine content will be moved here -->
                <div id="slot-machine-wrapper">
                    <!-- This will contain the existing slot machine -->
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
        if (this.slotMachineComponent && typeof this.slotMachineComponent.destroy === 'function') {
            console.log('🗑️ Destroying current product component');
            this.slotMachineComponent.destroy();
            this.slotMachineComponent = null;
        }
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