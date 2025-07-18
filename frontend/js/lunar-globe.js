// Lunar Globe Implementation - Advanced 3D with Globe.gl
// MoonYetis: The People's Cryptocurrency

class LunarGlobe {
    constructor() {
        this.globe = null;
        this.container = null;
        this.coinPositions = [];
        this.animationId = null;
        this.isAnimating = true;
        this.currentTime = 0;
        
        this.init();
    }

    init() {
        // Wait for DOM and Globe.gl to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupGlobe());
        } else {
            this.setupGlobe();
        }
    }

    setupGlobe() {
        this.container = document.getElementById('lunar-globe');
        if (!this.container) {
            console.error('Lunar globe container not found');
            return;
        }

        // Check for WebGL support
        if (!this.isWebGLSupported()) {
            this.showWebGLFallback();
            return;
        }

        this.createGlobe();
        this.setupEventListeners();
        this.startAnimation();
        
        console.log('🌙 Lunar globe initialized successfully');
    }

    isWebGLSupported() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (
                canvas.getContext('webgl') || 
                canvas.getContext('experimental-webgl')
            ));
        } catch (e) {
            return false;
        }
    }

    showWebGLFallback() {
        this.container.innerHTML = `
            <div class="webgl-not-supported">
                <h3>🌙 WebGL Not Supported</h3>
                <p>Your browser doesn't support WebGL, which is required for the 3D lunar globe.</p>
                <p>Please update your browser or enable WebGL to experience the full MoonYetis lunar globe.</p>
                <a href="https://get.webgl.org/" target="_blank">Learn more about WebGL</a>
            </div>
        `;
    }

    createGlobe() {
        // Initialize Globe.gl with lunar textures
        this.globe = Globe()
            .globeImageUrl('https://s3-us-west-2.amazonaws.com/s.cdpn.io/17271/lroc_color_poles_1k.jpg') // High-res lunar surface
            .bumpImageUrl('https://s3-us-west-2.amazonaws.com/s.cdpn.io/17271/ldem_3_8bit.jpg') // Lunar elevation map
            .backgroundImageUrl('https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/night-sky.png')
            .width(this.container.offsetWidth)
            .height(this.container.offsetHeight)
            .showGlobe(true)
            .showGraticules(false)
            .showAtmosphere(false)
            .globeMaterial(new THREE.MeshPhongMaterial({ 
                shininess: 0.1,
                transparent: false
            }))
            .enablePointerInteraction(true);

        // Generate coin positions
        this.generateCoinPositions();

        // Add coins to globe
        this.globe
            .objectsData(this.coinPositions)
            .objectThreeObject(this.createCoin.bind(this))
            .objectAltitude(0.01)
            .objectLabel(d => `MoonYetis Coin #${d.id}`);

        // Add center logo
        this.addCenterLogo();

        // Add paths (connections)
        this.addConnectionPaths();

        // Mount to container
        this.container.appendChild(this.globe.renderer().domElement);
        
        // Hide loading screen
        this.hideLoading();
    }

    generateCoinPositions() {
        this.coinPositions = [];
        const orbits = 6;
        const coinsPerOrbit = 3;
        
        for (let orbit = 0; orbit < orbits; orbit++) {
            for (let coinIndex = 0; coinIndex < coinsPerOrbit; coinIndex++) {
                const angle = (360 / coinsPerOrbit) * coinIndex;
                const orbitRadius = 15 + (orbit * 8); // Degrees from center
                
                // Convert to lat/lng
                const lat = Math.sin(angle * Math.PI / 180) * orbitRadius;
                const lng = Math.cos(angle * Math.PI / 180) * orbitRadius;
                
                this.coinPositions.push({
                    id: orbit * coinsPerOrbit + coinIndex + 1,
                    lat: lat,
                    lng: lng,
                    orbit: orbit,
                    angle: angle,
                    orbitRadius: orbitRadius,
                    speed: 0.5 + (orbit * 0.2) // Different speeds for different orbits
                });
            }
        }
    }

    createCoin(coinData) {
        // Create coin geometry
        const geometry = new THREE.PlaneGeometry(0.8, 0.8);
        
        // Load coin texture
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('./assets/symbols/coin-medium.png');
        
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.1,
            side: THREE.DoubleSide
        });
        
        const coin = new THREE.Mesh(geometry, material);
        
        // Add glow effect
        coin.userData = {
            id: coinData.id,
            type: 'moonyetis-coin',
            originalScale: 1
        };
        
        // Add subtle rotation
        coin.rotation.x = Math.random() * Math.PI;
        coin.rotation.z = Math.random() * Math.PI;
        
        return coin;
    }

    addCenterLogo() {
        const logoData = [{
            lat: 0,
            lng: 0,
            id: 'center-logo'
        }];

        this.globe
            .pointsData(logoData)
            .pointThreeObject(() => {
                const geometry = new THREE.PlaneGeometry(2, 2);
                const textureLoader = new THREE.TextureLoader();
                const texture = textureLoader.load('./images/LogoMoonYetis.jpg');
                
                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    alphaTest: 0.1,
                    side: THREE.DoubleSide
                });
                
                const logo = new THREE.Mesh(geometry, material);
                logo.userData = { type: 'center-logo' };
                
                return logo;
            })
            .pointAltitude(0.005)
            .pointLabel('MoonYetis Central Logo');
    }

    addConnectionPaths() {
        // Create paths from center to each coin
        const pathsData = this.coinPositions.map(coin => ({
            startLat: 0,
            startLng: 0,
            endLat: coin.lat,
            endLng: coin.lng,
            color: 'rgba(255, 215, 0, 0.6)',
            id: `path-${coin.id}`
        }));

        this.globe
            .pathsData(pathsData)
            .pathColor('color')
            .pathStroke(2)
            .pathDashLength(0.1)
            .pathDashGap(0.05)
            .pathDashAnimateTime(3000);
    }

    startAnimation() {
        if (this.animationId) return;
        
        const animate = () => {
            if (!this.isAnimating) return;
            
            this.currentTime += 0.005;
            
            // Update coin positions
            this.coinPositions.forEach(coin => {
                const newAngle = coin.angle + (coin.speed * this.currentTime);
                coin.lat = Math.sin(newAngle * Math.PI / 180) * coin.orbitRadius;
                coin.lng = Math.cos(newAngle * Math.PI / 180) * coin.orbitRadius;
            });
            
            // Update globe data
            this.globe.objectsData([...this.coinPositions]);
            
            // Update paths
            const updatedPaths = this.coinPositions.map(coin => ({
                startLat: 0,
                startLng: 0,
                endLat: coin.lat,
                endLng: coin.lng,
                color: 'rgba(255, 215, 0, 0.6)',
                id: `path-${coin.id}`
            }));
            
            this.globe.pathsData(updatedPaths);
            
            this.animationId = requestAnimationFrame(animate);
        };
        
        animate();
    }

    stopAnimation() {
        this.isAnimating = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Globe controls
        const resetBtn = document.getElementById('reset-view');
        const toggleBtn = document.getElementById('toggle-animation');
        
        if (resetBtn) {
            resetBtn.addEventListener('click', this.resetView.bind(this));
        }
        
        if (toggleBtn) {
            toggleBtn.addEventListener('click', this.toggleAnimation.bind(this));
        }
        
        // Globe interactions
        this.globe.onObjectHover((obj, prevObj) => {
            if (obj && obj.userData && obj.userData.type === 'moonyetis-coin') {
                this.showTooltip(obj);
            } else {
                this.hideTooltip();
            }
        });
        
        this.globe.onObjectClick((obj) => {
            if (obj && obj.userData && obj.userData.type === 'moonyetis-coin') {
                this.handleCoinClick(obj);
            }
        });
    }

    handleResize() {
        if (this.globe && this.container) {
            this.globe
                .width(this.container.offsetWidth)
                .height(this.container.offsetHeight);
        }
    }

    resetView() {
        if (this.globe) {
            this.globe.pointOfView({ lat: 0, lng: 0, altitude: 2 }, 1000);
        }
    }

    toggleAnimation() {
        const toggleBtn = document.getElementById('toggle-animation');
        
        if (this.isAnimating) {
            this.stopAnimation();
            if (toggleBtn) toggleBtn.textContent = '▶️ Play';
        } else {
            this.isAnimating = true;
            this.startAnimation();
            if (toggleBtn) toggleBtn.textContent = '⏸️ Pause';
        }
    }

    showTooltip(coinObj) {
        const tooltip = document.createElement('div');
        tooltip.className = 'globe-tooltip';
        tooltip.id = 'globe-tooltip';
        tooltip.textContent = `MoonYetis Coin #${coinObj.userData.id}`;
        
        document.body.appendChild(tooltip);
        
        // Position tooltip near mouse
        document.addEventListener('mousemove', this.updateTooltipPosition);
    }

    updateTooltipPosition(e) {
        const tooltip = document.getElementById('globe-tooltip');
        if (tooltip) {
            tooltip.style.left = e.clientX + 10 + 'px';
            tooltip.style.top = e.clientY - 30 + 'px';
        }
    }

    hideTooltip() {
        const tooltip = document.getElementById('globe-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
        document.removeEventListener('mousemove', this.updateTooltipPosition);
    }

    handleCoinClick(coinObj) {
        console.log(`Clicked MoonYetis Coin #${coinObj.userData.id}`);
        
        // Add click effect
        if (coinObj.userData.originalScale) {
            coinObj.scale.set(1.5, 1.5, 1.5);
            setTimeout(() => {
                coinObj.scale.set(1, 1, 1);
            }, 300);
        }
    }

    hideLoading() {
        const loading = document.getElementById('globe-loading');
        if (loading) {
            loading.style.opacity = '0';
            setTimeout(() => {
                loading.style.display = 'none';
            }, 500);
        }
    }

    destroy() {
        this.stopAnimation();
        this.hideTooltip();
        
        if (this.globe) {
            this.globe = null;
        }
        
        window.removeEventListener('resize', this.handleResize);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the lunar theme page
    if (document.querySelector('.ecosystem-hero.lunar-theme')) {
        window.lunarGlobe = new LunarGlobe();
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LunarGlobe;
}