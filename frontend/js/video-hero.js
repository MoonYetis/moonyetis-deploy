// Video Hero Enhancement - Dogecoin Style
// MoonYetis: The People's Cryptocurrency

class VideoHero {
    constructor() {
        this.video = null;
        this.isPlaying = true;
        this.loadingTimeout = null;
        
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupVideo());
        } else {
            this.setupVideo();
        }
    }

    setupVideo() {
        this.video = document.getElementById('hero-video');
        if (!this.video) {
            console.warn('Hero video element not found');
            return;
        }

        this.setupEventListeners();
        this.handleVideoLoading();
        this.optimizeForDevice();
        
        console.log('🎬 Video hero initialized');
    }

    setupEventListeners() {
        // Video loading events
        this.video.addEventListener('loadstart', () => {
            this.showLoadingState();
        });

        this.video.addEventListener('canplay', () => {
            this.hideLoadingState();
        });

        this.video.addEventListener('loadeddata', () => {
            this.hideLoadingState();
        });

        // Video error handling
        this.video.addEventListener('error', (e) => {
            console.error('Video loading error:', e);
            this.showFallback();
        });

        // Intersection Observer for performance
        this.setupIntersectionObserver();

        // Optional: Click to pause/play
        this.video.addEventListener('click', (e) => {
            e.preventDefault();
            this.togglePlayPause();
        });

        // Prevent right-click context menu on video
        this.video.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    showLoadingState() {
        if (document.querySelector('.video-loading')) return;
        
        const loading = document.createElement('div');
        loading.className = 'video-loading';
        loading.innerHTML = '<p>Loading video...</p>';
        
        const videoContainer = document.querySelector('.video-background');
        if (videoContainer) {
            videoContainer.appendChild(loading);
        }

        // Remove loading after 10 seconds if still there
        this.loadingTimeout = setTimeout(() => {
            this.hideLoadingState();
        }, 10000);
    }

    hideLoadingState() {
        const loading = document.querySelector('.video-loading');
        if (loading) {
            loading.style.opacity = '0';
            setTimeout(() => {
                loading.remove();
            }, 300);
        }

        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
            this.loadingTimeout = null;
        }
    }

    showFallback() {
        const fallback = document.querySelector('.video-fallback');
        if (fallback) {
            fallback.style.display = 'flex';
        }
        
        // Hide video element
        this.video.style.display = 'none';
        
        console.log('🖼️ Video fallback activated');
    }

    setupIntersectionObserver() {
        // Pause video when not visible for performance
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        if (this.isPlaying && this.video.paused) {
                            this.video.play().catch(e => {
                                console.warn('Autoplay prevented:', e);
                            });
                        }
                    } else {
                        // Pause when not visible to save resources
                        if (!this.video.paused) {
                            this.video.pause();
                        }
                    }
                });
            }, {
                threshold: 0.1
            });

            observer.observe(this.video);
        }
    }

    togglePlayPause() {
        if (this.video.paused) {
            this.video.play().then(() => {
                this.isPlaying = true;
                console.log('🎬 Video resumed');
            }).catch(e => {
                console.warn('Play failed:', e);
            });
        } else {
            this.video.pause();
            this.isPlaying = false;
            console.log('⏸️ Video paused');
        }
    }

    optimizeForDevice() {
        // Detect connection quality
        if (navigator.connection) {
            const connection = navigator.connection;
            
            // Pause on slow connections
            if (connection.effectiveType === 'slow-2g' || 
                connection.effectiveType === '2g') {
                this.video.pause();
                this.isPlaying = false;
                console.log('📶 Video paused due to slow connection');
                
                // Show message to user
                this.showConnectionMessage();
            }

            // Monitor connection changes
            connection.addEventListener('change', () => {
                if (connection.effectiveType === 'slow-2g' || 
                    connection.effectiveType === '2g') {
                    this.video.pause();
                    this.isPlaying = false;
                } else if (connection.effectiveType === '4g' && !this.isPlaying) {
                    this.video.play().catch(e => console.warn('Autoplay failed:', e));
                    this.isPlaying = true;
                }
            });
        }

        // Optimize for battery
        if (navigator.getBattery) {
            navigator.getBattery().then(battery => {
                if (battery.level < 0.2) {
                    this.video.pause();
                    this.isPlaying = false;
                    console.log('🔋 Video paused due to low battery');
                }
            });
        }

        // Reduce quality on mobile
        if (window.innerWidth < 768) {
            // Mobile optimization already handled by CSS
            console.log('📱 Mobile optimizations applied');
        }
    }

    showConnectionMessage() {
        const message = document.createElement('div');
        message.className = 'connection-message';
        message.innerHTML = `
            <p>📶 Slow connection detected</p>
            <p>Video paused to save data</p>
            <button onclick="window.videoHero.togglePlayPause()">▶️ Play anyway</button>
        `;
        message.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: #ffd700;
            padding: 1rem;
            border-radius: 8px;
            font-size: 0.9rem;
            z-index: 20;
            border: 1px solid rgba(255, 215, 0, 0.3);
        `;

        const heroSection = document.querySelector('.ecosystem-hero');
        if (heroSection) {
            heroSection.appendChild(message);
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                message.style.opacity = '0';
                setTimeout(() => message.remove(), 300);
            }, 5000);
        }
    }

    // Public methods
    play() {
        return this.video.play();
    }

    pause() {
        this.video.pause();
    }

    getCurrentTime() {
        return this.video.currentTime;
    }

    getDuration() {
        return this.video.duration;
    }

    setVolume(volume) {
        this.video.volume = Math.max(0, Math.min(1, volume));
    }

    destroy() {
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
        }
        
        if (this.video) {
            this.video.pause();
            this.video = null;
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the video hero page
    if (document.querySelector('.ecosystem-hero.video-theme')) {
        window.videoHero = new VideoHero();
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VideoHero;
}