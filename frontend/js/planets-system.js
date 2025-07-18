// MoonYetis Planets System - Interactive Solar System
// Enhanced interactivity for planet hover effects and navigation

class PlanetsSystem {
    constructor() {
        this.planets = [];
        this.isInitialized = false;
        
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupPlanets());
        } else {
            this.setupPlanets();
        }
    }

    setupPlanets() {
        // Find all planet hover areas for video-based system
        this.planets = document.querySelectorAll('.planet-hover-area');
        
        if (this.planets.length === 0) {
            console.warn('No planet hover areas found');
            return;
        }

        this.setupEventListeners();
        this.setupVideoObserver();
        
        this.isInitialized = true;
        console.log('🪐 Planets system initialized with', this.planets.length, 'planets');
    }

    setupEventListeners() {
        this.planets.forEach((planet, index) => {
            const planetType = planet.dataset.product;
            const yetiElement = planet.querySelector('.planet-yeti');

            // Enhanced hover effects (only for yeti)
            planet.addEventListener('mouseenter', (e) => {
                this.onPlanetHover(planet, planetType, true);
            });

            planet.addEventListener('mouseleave', (e) => {
                this.onPlanetHover(planet, planetType, false);
            });

            // Click handlers for hover areas
            planet.addEventListener('click', (e) => {
                e.preventDefault();
                this.onPlanetClick(planetType);
            });

            // Touch support for mobile
            planet.addEventListener('touchstart', (e) => {
                this.onPlanetTouch(planet, planetType);
            });

            // Accessibility
            planet.setAttribute('tabindex', '0');
            planet.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.onPlanetClick(planetType);
                }
            });
        });

        // Setup click handlers for info cards
        this.setupInfoCardListeners();
    }

    setupInfoCardListeners() {
        const infoCards = document.querySelectorAll('.planet-info-card');
        infoCards.forEach(card => {
            const planetType = card.dataset.planet;
            const actionButton = card.querySelector('.planet-action');
            
            // Add hover effects that show yetis in corresponding planets
            card.addEventListener('mouseenter', (e) => {
                this.showYetiForPlanet(planetType);
            });

            card.addEventListener('mouseleave', (e) => {
                this.hideYetiForPlanet(planetType);
            });
            
            if (actionButton) {
                actionButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.onPlanetClick(planetType);
                });
            }
        });
    }

    showYetiForPlanet(planetType) {
        const hoverArea = this.getHoverAreaByPlanet(planetType);
        if (hoverArea) {
            const yeti = hoverArea.querySelector('.planet-yeti');
            if (yeti) {
                yeti.style.transform = 'translate(-50%, -50%) scale(1.1) rotate(5deg)';
                yeti.style.opacity = '1';
            }
        }
    }

    hideYetiForPlanet(planetType) {
        const hoverArea = this.getHoverAreaByPlanet(planetType);
        if (hoverArea) {
            const yeti = hoverArea.querySelector('.planet-yeti');
            if (yeti) {
                yeti.style.transform = 'translate(-50%, -50%) scale(0.8) rotate(-10deg)';
                yeti.style.opacity = '0';
            }
        }
    }

    getHoverAreaByPlanet(planetType) {
        const mapping = {
            'venus': '.venus-area',
            'earth': '.earth-area', 
            'mars': '.mars-area',
            'jupiter': '.jupiter-area'
        };
        
        const selector = mapping[planetType];
        return selector ? document.querySelector(selector) : null;
    }

    onPlanetHover(planetElement, planetType, isHovering) {
        const yeti = planetElement.querySelector('.planet-yeti');
        
        if (isHovering) {
            // Add hover effects to hover area
            planetElement.classList.add('planet-hovered');
            
            // Show and animate yeti
            if (yeti) {
                yeti.style.transform = 'translate(-50%, -50%) scale(1.1) rotate(5deg)';
                yeti.style.opacity = '1';
            }
            
            // Trigger custom event
            planetElement.dispatchEvent(new CustomEvent('planetHover', {
                detail: { planetType, isHovering }
            }));
            
        } else {
            // Remove hover effects
            planetElement.classList.remove('planet-hovered');
            
            // Hide yeti
            if (yeti) {
                yeti.style.transform = 'translate(-50%, -50%) scale(0.8) rotate(-10deg)';
                yeti.style.opacity = '0';
            }
        }
    }

    onPlanetClick(planetType) {
        switch (planetType) {
            case 'slots':
            case 'venus':
                this.navigateToSlots();
                break;
            case 'lottery':
            case 'jupiter':
                this.showComingSoonNotification('Jupiter Lottery');
                break;
            case 'faucet':
            case 'mars':
                this.showComingSoonNotification('Mars Faucet');
                break;
            case 'charity':
            case 'earth':
                this.showComingSoonNotification('Earth Charity');
                break;
            default:
                console.warn('Unknown planet type:', planetType);
        }
    }

    onPlanetTouch(planetElement, planetType) {
        // Mobile touch feedback
        planetElement.style.transform = 'scale(0.95)';
        setTimeout(() => {
            planetElement.style.transform = '';
        }, 150);
    }

    navigateToSlots() {
        // Instead of navigating directly, show slot selection modal
        this.showSlotSelectionModal();
    }

    showSlotSelectionModal() {
        // Create modal if it doesn't exist
        if (!document.getElementById('slot-selection-modal')) {
            this.createSlotSelectionModal();
        }
        
        // Show modal
        const modal = document.getElementById('slot-selection-modal');
        modal.classList.add('slot-selection-visible');
        document.body.style.overflow = 'hidden';
    }

    createSlotSelectionModal() {
        const modal = document.createElement('div');
        modal.id = 'slot-selection-modal';
        modal.className = 'slot-selection-overlay';
        modal.innerHTML = `
            <div class="slot-selection-modal">
                <div class="slot-selection-header">
                    <div class="selection-title">
                        <h2>🎰 Select Your Slot Adventure</h2>
                        <span class="selection-subtitle">Choose your preferred slot machine experience</span>
                    </div>
                    <button class="selection-close" id="selection-close">×</button>
                </div>
                
                <div class="slot-selection-content">
                    <div class="slots-grid">
                        <!-- Slot 1: MoonYetis Slots (Available) -->
                        <div class="slot-card available" data-slot="moonyetis">
                            <div class="slot-card-header">
                                <div class="slot-icon">🏔️</div>
                                <div class="slot-status available">Available</div>
                            </div>
                            <div class="slot-card-content">
                                <h3>MoonYetis Slots</h3>
                                <p class="slot-subtitle">El guardián salvaje</p>
                                <p class="slot-description">Revolutionary crypto slot machine on Fractal Bitcoin. The wild guardian protects your winnings.</p>
                                <div class="slot-features">
                                    <span class="feature">🎰 5 Reels × 3 Rows</span>
                                    <span class="feature">💰 25 Paylines</span>
                                    <span class="feature">🏔️ Yeti Wild x2</span>
                                    <span class="feature">🚀 Bonus Features</span>
                                </div>
                            </div>
                            <div class="slot-card-footer">
                                <button class="slot-play-btn primary">Play Now</button>
                            </div>
                        </div>
                        
                        <!-- Slot 2: Moon Miners (Coming Soon) -->
                        <div class="slot-card coming-soon" data-slot="moon-miners">
                            <div class="slot-card-header">
                                <div class="slot-icon">⛏️</div>
                                <div class="slot-status coming-soon">Coming Soon</div>
                            </div>
                            <div class="slot-card-content">
                                <h3>Moon Miners</h3>
                                <p class="slot-subtitle">Los exploradores codiciosos</p>
                                <p class="slot-description">Dig deep into the lunar surface to uncover hidden treasures and precious moon crystals.</p>
                                <div class="slot-features">
                                    <span class="feature">🎰 5 Reels × 4 Rows</span>
                                    <span class="feature">💎 40 Paylines</span>
                                    <span class="feature">⛏️ Mining Bonus</span>
                                    <span class="feature">🌙 Crystal Multipliers</span>
                                </div>
                            </div>
                            <div class="slot-card-footer">
                                <button class="slot-play-btn disabled">Coming Soon</button>
                            </div>
                        </div>
                        
                        <!-- Slot 3: Celestial Guardians (Coming Soon) -->
                        <div class="slot-card coming-soon" data-slot="celestial-guardians">
                            <div class="slot-card-header">
                                <div class="slot-icon">🌟</div>
                                <div class="slot-status coming-soon">Coming Soon</div>
                            </div>
                            <div class="slot-card-content">
                                <h3>Celestial Guardians</h3>
                                <p class="slot-subtitle">Los protectores místicos</p>
                                <p class="slot-description">Ancient guardians of the cosmos protect sacred treasures in this mystical slot experience.</p>
                                <div class="slot-features">
                                    <span class="feature">🎰 6 Reels × 5 Rows</span>
                                    <span class="feature">✨ 50 Paylines</span>
                                    <span class="feature">🌟 Guardian Wilds</span>
                                    <span class="feature">🔮 Mystical Free Spins</span>
                                </div>
                            </div>
                            <div class="slot-card-footer">
                                <button class="slot-play-btn disabled">Coming Soon</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.setupSlotSelectionEvents();
    }

    setupSlotSelectionEvents() {
        const modal = document.getElementById('slot-selection-modal');
        
        // Close modal events
        modal.querySelector('#selection-close').addEventListener('click', () => this.closeSlotSelectionModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeSlotSelectionModal();
        });
        
        // Play button events
        modal.querySelectorAll('.slot-play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const slotCard = e.target.closest('.slot-card');
                const slotType = slotCard.dataset.slot;
                
                if (slotCard.classList.contains('available')) {
                    this.playSlot(slotType);
                } else {
                    this.showComingSoonNotification(slotType);
                }
            });
        });
    }

    closeSlotSelectionModal() {
        const modal = document.getElementById('slot-selection-modal');
        modal.classList.remove('slot-selection-visible');
        document.body.style.overflow = '';
    }

    playSlot(slotType) {
        console.log('🎰 Playing slot:', slotType);
        
        if (slotType === 'moonyetis') {
            // Close modal first
            this.closeSlotSelectionModal();
            
            // Wait a moment for modal to close then navigate
            setTimeout(() => {
                // Navigate to the existing slot machine
                if (window.ecosystemRouter && typeof window.ecosystemRouter.navigateTo === 'function') {
                    console.log('🎰 Router found, navigating to slots...');
                    window.ecosystemRouter.navigateTo('slots');
                } else {
                    console.warn('🎰 Router not available, trying alternative navigation...');
                    // Alternative: try to find and click the existing slot navigation
                    this.fallbackSlotNavigation();
                }
            }, 300);
        }
    }
    
    fallbackSlotNavigation() {
        // Try to find existing slot navigation elements
        const slotElements = document.querySelectorAll('[data-route="slots"], [onclick*="slots"]');
        if (slotElements.length > 0) {
            console.log('🎰 Found existing slot navigation element, clicking...');
            slotElements[0].click();
        } else {
            console.error('🎰 No navigation method available for slots');
            // Show error message to user
            this.showSlotNavigationError();
        }
    }
    
    showSlotNavigationError() {
        const errorNotification = document.createElement('div');
        errorNotification.className = 'slot-error-notification';
        errorNotification.innerHTML = `
            <div class="error-content">
                <span class="error-icon">❌</span>
                <span class="error-text">Unable to navigate to MoonYetis Slots. Please try again.</span>
            </div>
        `;
        
        errorNotification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(239, 68, 68, 0.95);
            color: white;
            padding: 20px;
            border-radius: 10px;
            z-index: 10001;
            font-size: 1rem;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        `;
        
        document.body.appendChild(errorNotification);
        
        setTimeout(() => {
            if (errorNotification.parentNode) {
                errorNotification.parentNode.removeChild(errorNotification);
            }
        }, 3000);
    }

    showComingSoonNotification(slotType) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'planet-notification';
        
        // Map slot types to display names
        const slotNames = {
            'moon-miners': 'Moon Miners',
            'celestial-guardians': 'Celestial Guardians',
            'moonyetis': 'MoonYetis Slots'
        };
        
        const slotName = slotNames[slotType] || slotType;
        
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">🚀</span>
                <span class="notification-text">${slotName} is coming soon!</span>
            </div>
        `;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: linear-gradient(135deg, #FF6B35, #F7931E);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            font-weight: 600;
            font-size: 0.9rem;
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    setupVideoObserver() {
        // Pause video when not visible for performance
        const videoElement = document.querySelector('.planets-video-fullscreen');
        if (!videoElement) return;
        
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        videoElement.play();
                    } else {
                        videoElement.pause();
                    }
                });
            }, {
                threshold: 0.1
            });

            observer.observe(videoElement);
        }
    }

    // Public methods
    pauseVideo() {
        const videoElement = document.querySelector('.planets-video-fullscreen');
        if (videoElement) {
            videoElement.pause();
        }
    }

    resumeVideo() {
        const videoElement = document.querySelector('.planets-video-fullscreen');
        if (videoElement) {
            videoElement.play();
        }
    }

    getPlanetByType(planetType) {
        return Array.from(this.planets).find(planet => 
            planet.dataset.product === planetType
        );
    }

    highlightPlanet(planetType, duration = 3000) {
        const planet = this.getPlanetByType(planetType);
        if (!planet) return;

        planet.style.transform = 'scale(1.1)';
        planet.style.transition = 'transform 0.3s ease';
        
        setTimeout(() => {
            planet.style.transform = '';
        }, duration);
    }

    destroy() {
        // Cleanup event listeners
        this.planets.forEach(planetItem => {
            planetItem.removeEventListener('mouseenter', this.onPlanetHover);
            planetItem.removeEventListener('mouseleave', this.onPlanetHover);
            planetItem.removeEventListener('click', this.onPlanetClick);
            planetItem.removeEventListener('touchstart', this.onPlanetTouch);
            planetItem.removeEventListener('keydown', this.onPlanetClick);
        });
        
        // Pause video
        this.pauseVideo();
        
        this.planets = [];
        this.isInitialized = false;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if planets section exists
    if (document.querySelector('.ecosystem-planets')) {
        window.planetsSystem = new PlanetsSystem();
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlanetsSystem;
}

// Global utility functions
window.PlanetsUtils = {
    highlightPlanet: (planetType) => {
        if (window.planetsSystem) {
            window.planetsSystem.highlightPlanet(planetType);
        }
    },
    
    pauseVideo: () => {
        if (window.planetsSystem) {
            window.planetsSystem.pauseVideo();
        }
    },
    
    resumeVideo: () => {
        if (window.planetsSystem) {
            window.planetsSystem.resumeVideo();
        }
    }
};