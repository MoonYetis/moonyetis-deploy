// MoonYetis Ecosystem Router - TypeScript Implementation
// Handles navigation between landing page and products

interface Product {
  id: string;
  name: string;
  path: string;
  status: 'live' | 'coming-soon' | 'beta';
  icon: string;
  description: string;
  loader: () => Promise<void>;
}

interface ProductRegistry {
  [key: string]: Product;
}

interface RouterState {
  currentProduct: Product | null;
  currentRoute: string;
  previousRoute: string;
}

class EcosystemRouter implements RouterState {
  currentProduct: Product | null = null;
  currentRoute: string = '';
  previousRoute: string = '';
  private products: ProductRegistry;

  constructor() {
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
  
  init(): void {
    console.log('🧭 EcosystemRouter: Initializing...');
    this.setupEventListeners();
    this.handleInitialRoute();
    console.log('✅ EcosystemRouter: Initialization complete');
  }
  
  setupEventListeners(): void {
    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => this.handleRoute());
    
    // Handle hash changes
    window.addEventListener('hashchange', () => this.handleRoute());
    
    // Intercept navigation clicks
    document.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      const link = target.closest('[data-route]') as HTMLElement;
      
      if (link) {
        e.preventDefault();
        const route = link.getAttribute('data-route');
        if (route !== null) {
          this.navigateTo(route);
        }
      }
      
      // Handle smooth scrolling for anchor links
      const anchorLink = target.closest('[data-scroll-to]') as HTMLElement;
      if (anchorLink) {
        e.preventDefault();
        const targetId = anchorLink.getAttribute('data-scroll-to');
        if (targetId) {
          this.smoothScrollTo(targetId);
        }
      }
    });
  }
  
  
  handleInitialRoute(): void {
    const hash = window.location.hash;
    if (hash) {
      this.handleRoute(hash);
    } else {
      this.showLandingPage();
    }
  }
  
  handleRoute(hash?: string): void {
    const currentHash = hash || window.location.hash;
    this.previousRoute = this.currentRoute;
    this.currentRoute = currentHash;
    
    console.log('🧭 Route change:', { from: this.previousRoute, to: this.currentRoute });
    
    if (!currentHash || currentHash === '#' || currentHash === '#/') {
      this.showLandingPage();
    } else {
      const route = currentHash.replace('#/', '');
      const product = this.products[route];
      
      if (product && product.status === 'live') {
        this.loadProduct(product);
      } else {
        console.warn('🧭 Route not found or not available:', route);
        this.showLandingPage();
      }
    }
    
    // Dispatch route change event
    this.dispatchRouteEvent('routeChanged', {
      route: this.currentRoute,
      previousRoute: this.previousRoute,
      product: this.currentProduct
    });
  }
  
  navigateTo(route: string): void {
    if (route === '' || route === '/') {
      window.location.hash = '';
    } else {
      window.location.hash = `#/${route}`;
    }
  }
  
  async loadProduct(product: Product): Promise<void> {
    try {
      console.log(`🎮 Loading product: ${product.name}`);
      
      this.currentProduct = product;
      this.hideLandingPage();
      this.showProductContainer();
      
      // Load the product
      await product.loader();
      
      console.log(`✅ Product loaded: ${product.name}`);
      
    } catch (error) {
      console.error(`❌ Failed to load product ${product.name}:`, error);
      this.showError(`Failed to load ${product.name}. Please try again.`);
    }
  }
  
  async loadSlotsProduct(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Initialize slot machine if available
        if (typeof window.SlotMachine !== 'undefined') {
          console.log('🎰 Initializing MoonYetis Slots...');
          
          // Create slot machine container if it doesn't exist
          let slotsContainer = document.getElementById('slots-container');
          if (!slotsContainer) {
            slotsContainer = document.createElement('div');
            slotsContainer.id = 'slots-container';
            slotsContainer.innerHTML = `
              <div class="slots-game-wrapper">
                <h1>🎰 MoonYetis Slots</h1>
                <div id="slot-machine-container"></div>
                <div class="slots-controls">
                  <button id="back-to-ecosystem" class="slots-btn secondary">
                    🏠 Back to Ecosystem
                  </button>
                </div>
              </div>
            `;
            
            const productContainer = document.getElementById('product-container');
            if (productContainer) {
              productContainer.appendChild(slotsContainer);
            }
          }
          
          // Set up back button
          const backButton = document.getElementById('back-to-ecosystem');
          if (backButton) {
            backButton.addEventListener('click', () => this.navigateTo(''));
          }
          
          // Initialize the slot machine
          const slotContainer = document.getElementById('slot-machine-container');
          if (slotContainer && window.SlotMachine) {
            new window.SlotMachine(slotContainer);
          }
          
          resolve();
        } else {
          console.warn('⚠️ SlotMachine not available, loading basic slots interface');
          this.loadBasicSlotsInterface();
          resolve();
        }
      } catch (error) {
        reject(error);
      }
    });
  }
  
  loadBasicSlotsInterface(): void {
    const productContainer = document.getElementById('product-container');
    if (productContainer) {
      productContainer.innerHTML = `
        <div class="basic-slots-container">
          <h1>🎰 MoonYetis Slots</h1>
          <p>Loading slot machine...</p>
          <div class="loading-spinner">⏳</div>
          <button onclick="window.ecosystemRouter?.navigateTo('')" class="back-btn">
            🏠 Back to Ecosystem
          </button>
        </div>
      `;
    }
  }
  
  showLandingPage(): void {
    this.currentProduct = null;
    
    // Hide product container
    const productContainer = document.getElementById('product-container');
    if (productContainer) {
      productContainer.classList.remove('ecosystem-visible');
      productContainer.classList.add('ecosystem-hidden');
    }
    
    // Show landing sections
    const landingSections = document.querySelectorAll('section, nav');
    landingSections.forEach(section => {
      section.classList.remove('ecosystem-hidden');
    });
    
    console.log('🏠 Showing landing page');
  }
  
  hideLandingPage(): void {
    // Hide landing sections
    const landingSections = document.querySelectorAll('section, nav');
    landingSections.forEach(section => {
      section.classList.add('ecosystem-hidden');
    });
  }
  
  showProductContainer(): void {
    const productContainer = document.getElementById('product-container');
    if (productContainer) {
      productContainer.classList.remove('ecosystem-hidden');
      productContainer.classList.add('ecosystem-visible');
    }
  }
  
  showError(message: string): void {
    const productContainer = document.getElementById('product-container');
    if (productContainer) {
      productContainer.innerHTML = `
        <div class="error-container">
          <h2>❌ Error</h2>
          <p>${message}</p>
          <button onclick="window.ecosystemRouter?.navigateTo('')" class="error-back-btn">
            🏠 Back to Ecosystem
          </button>
        </div>
      `;
      this.showProductContainer();
    }
  }
  
  smoothScrollTo(targetId: string): void {
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      const headerOffset = 80; // Account for fixed header
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }
  
  getProducts(): ProductRegistry {
    return this.products;
  }
  
  getCurrentProduct(): Product | null {
    return this.currentProduct;
  }
  
  getCurrentRoute(): string {
    return this.currentRoute;
  }
  
  isProductRoute(): boolean {
    return this.currentProduct !== null;
  }
  
  private dispatchRouteEvent(eventType: string, data: any): void {
    const event = new CustomEvent(eventType, {
      detail: data,
      bubbles: true
    });
    
    window.dispatchEvent(event);
  }
}

// Set up global access
declare global {
  interface Window {
    EcosystemRouter: typeof EcosystemRouter;
    ecosystemRouter?: EcosystemRouter;
    SlotMachine?: any;
  }
}

window.EcosystemRouter = EcosystemRouter;

// For ES6 module compatibility
export default EcosystemRouter;
export type { Product, ProductRegistry, RouterState };