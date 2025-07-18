// Dogecoin Style Space Animation - MoonYetis Recreation
// MoonYetis: The People's Cryptocurrency

class DogecoinSpaceAnimation {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.coins = [];
        this.stars = [];
        this.connectionLines = [];
        this.initialized = false;
        this.centerX = 0;
        this.centerY = 0;
        
        this.init();
    }

    init() {
        if (this.initialized) return;
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupAnimation());
        } else {
            this.setupAnimation();
        }
    }

    setupAnimation() {
        this.canvas = document.getElementById('space-canvas');
        if (!this.canvas) {
            console.warn('Space canvas not found');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        this.updateCenter();
        
        // Event listeners
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.updateCenter();
        });
        
        this.createStars();
        this.createCoins();
        this.animate();
        
        this.initialized = true;
        console.log('🌌 Dogecoin style space animation initialized');
    }

    resizeCanvas() {
        if (!this.canvas) return;
        
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    updateCenter() {
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
    }

    createStars() {
        const starsContainer = document.getElementById('space-stars');
        if (!starsContainer) return;
        
        // Clear existing stars
        starsContainer.innerHTML = '';
        
        const starCount = window.innerWidth < 768 ? 30 : 50;
        
        for (let i = 0; i < starCount; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            
            // Random star size
            const size = Math.random();
            if (size < 0.8) {
                star.classList.add('small');
            } else {
                star.classList.add('medium');
            }
            
            // Random position
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            
            // Random animation delay
            star.style.animationDelay = Math.random() * 3 + 's';
            
            starsContainer.appendChild(star);
        }
    }

    createCoins() {
        const coinsContainer = document.getElementById('coins-orbit');
        if (!coinsContainer) return;
        
        // Clear existing coins
        coinsContainer.innerHTML = '';
        
        // Create 18 coins in 6 orbits (3 coins per orbit)
        const orbits = 6;
        const coinsPerOrbit = 3;
        
        for (let orbit = 1; orbit <= orbits; orbit++) {
            for (let coinIndex = 0; coinIndex < coinsPerOrbit; coinIndex++) {
                const coin = document.createElement('div');
                coin.className = `coin orbit-${orbit}`;
                
                // Distribute coins evenly around the orbit
                const angleOffset = (360 / coinsPerOrbit) * coinIndex;
                coin.style.animationDelay = `-${(angleOffset / 360) * this.getOrbitDuration(orbit)}s`;
                
                coinsContainer.appendChild(coin);
            }
        }
    }

    getOrbitDuration(orbit) {
        // Different speeds for different orbits
        const baseDuration = 40;
        return baseDuration + (orbit * 5);
    }

    animate() {
        if (!this.ctx) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw connection lines
        this.drawConnectionLines();
        
        // Continue animation
        requestAnimationFrame(() => this.animate());
    }

    drawConnectionLines() {
        const coins = document.querySelectorAll('.coin');
        
        coins.forEach((coin, index) => {
            // Draw line for every other coin to avoid clutter
            if (index % 2 === 0) {
                const rect = coin.getBoundingClientRect();
                const canvasRect = this.canvas.getBoundingClientRect();
                
                const coinX = rect.left + rect.width / 2 - canvasRect.left;
                const coinY = rect.top + rect.height / 2 - canvasRect.top;
                
                // Draw line from center to coin
                this.ctx.beginPath();
                this.ctx.moveTo(this.centerX, this.centerY);
                this.ctx.lineTo(coinX, coinY);
                
                // Golden gradient line
                const gradient = this.ctx.createLinearGradient(
                    this.centerX, this.centerY, coinX, coinY
                );
                gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
                gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.4)');
                gradient.addColorStop(1, 'rgba(255, 215, 0, 0.1)');
                
                this.ctx.strokeStyle = gradient;
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
        });
    }

    // Add subtle parallax effect
    addParallaxEffect(mouseX, mouseY) {
        const coins = document.querySelectorAll('.coin');
        const stars = document.querySelectorAll('.star');
        
        const mouseInfluence = 0.01;
        
        coins.forEach((coin, index) => {
            const speed = (index % 3 + 1) * mouseInfluence;
            const x = (mouseX - window.innerWidth / 2) * speed;
            const y = (mouseY - window.innerHeight / 2) * speed;
            
            coin.style.transform += ` translate(${x}px, ${y}px)`;
        });
        
        stars.forEach((star, index) => {
            if (index % 4 === 0) {
                const speed = mouseInfluence * 0.3;
                const x = (mouseX - window.innerWidth / 2) * speed;
                const y = (mouseY - window.innerHeight / 2) * speed;
                
                star.style.transform = `translate(${x}px, ${y}px)`;
            }
        });
    }

    // Performance optimization for different devices
    optimizeForDevice() {
        const isMobile = window.innerWidth < 768;
        const isLowPower = navigator.hardwareConcurrency < 4;
        
        if (isMobile || isLowPower) {
            // Reduce coin count for mobile
            const coins = document.querySelectorAll('.coin');
            coins.forEach((coin, index) => {
                if (index > 12) { // Keep only 12 coins on mobile
                    coin.remove();
                }
            });
            
            // Reduce star count
            const stars = document.querySelectorAll('.star');
            stars.forEach((star, index) => {
                if (index > 30) {
                    star.remove();
                }
            });
        }
    }

    // Create Earth-like planet texture effect
    enhancePlanetTexture() {
        const earthSurface = document.querySelector('.earth-surface');
        if (!earthSurface) return;
        
        // Add subtle rotation variation
        earthSurface.addEventListener('animationiteration', () => {
            const randomDelay = Math.random() * 0.5;
            earthSurface.style.animationDelay = randomDelay + 's';
        });
    }

    // Recreate Dogecoin's exact visual style
    recreateDogecoinStyle() {
        // Ensure coins are properly sized and positioned
        const coins = document.querySelectorAll('.coin');
        coins.forEach((coin, index) => {
            // Add subtle glow effect
            coin.style.filter = 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.5))';
            
            // Add hover effect
            coin.addEventListener('mouseenter', () => {
                coin.style.transform += ' scale(1.1)';
                coin.style.filter = 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))';
            });
            
            coin.addEventListener('mouseleave', () => {
                coin.style.transform = coin.style.transform.replace(' scale(1.1)', '');
                coin.style.filter = 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.5))';
            });
        });
    }
}

// Initialize the animation when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the space-themed hero page
    if (document.querySelector('.ecosystem-hero.space-theme')) {
        const spaceAnimation = new DogecoinSpaceAnimation();
        
        // Add subtle parallax effect on mouse move
        let parallaxTimeout;
        document.addEventListener('mousemove', (e) => {
            clearTimeout(parallaxTimeout);
            parallaxTimeout = setTimeout(() => {
                spaceAnimation.addParallaxEffect(e.clientX, e.clientY);
            }, 16); // ~60fps
        });
        
        // Optimize for device capabilities
        spaceAnimation.optimizeForDevice();
        
        // Enhance planet texture
        spaceAnimation.enhancePlanetTexture();
        
        // Apply Dogecoin style enhancements
        spaceAnimation.recreateDogecoinStyle();
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DogecoinSpaceAnimation;
}