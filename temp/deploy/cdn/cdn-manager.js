// CDN Management Service for MoonYetis
// Manages CDN configuration, cache invalidation, and performance optimization

const { CloudflareManager } = require('./cloudflare-config');

class CDNManager {
    constructor() {
        this.cloudflare = null;
        this.enabled = process.env.NODE_ENV === 'production';
        this.cdnProvider = process.env.CDN_PROVIDER || 'cloudflare';
        
        if (this.enabled) {
            this.initializeCDN();
        } else {
            console.log('📡 CDN Manager disabled (development mode)');
        }
    }
    
    async initializeCDN() {
        try {
            if (this.cdnProvider === 'cloudflare') {
                this.cloudflare = new CloudflareManager(
                    process.env.CLOUDFLARE_API_TOKEN,
                    process.env.CLOUDFLARE_ZONE_ID
                );
                
                // Test connection
                const healthCheck = await this.cloudflare.healthCheck();
                if (!healthCheck.healthy) {
                    throw new Error(healthCheck.message);
                }
                
                console.log('✅ Cloudflare CDN initialized');
            }
        } catch (error) {
            console.error('❌ Failed to initialize CDN:', error.message);
            this.enabled = false;
        }
    }
    
    // Cache management
    async purgeCache(files = null) {
        if (!this.enabled || !this.cloudflare) return false;
        
        try {
            console.log('🗑️ Purging CDN cache...');
            
            const result = await this.cloudflare.purgeCache(files);
            
            if (result.success) {
                console.log('✅ CDN cache purged successfully');
                return true;
            } else {
                console.error('❌ Failed to purge CDN cache:', result.errors);
                return false;
            }
        } catch (error) {
            console.error('❌ CDN cache purge error:', error.message);
            return false;
        }
    }
    
    async purgeStaticAssets() {
        const staticFiles = [
            'https://moonyetis.com/assets/css/*',
            'https://moonyetis.com/assets/js/*',
            'https://moonyetis.com/assets/images/*',
            'https://moonyetis.com/favicon.ico'
        ];
        
        return await this.purgeCache(staticFiles);
    }
    
    async purgeApiCache() {
        const apiFiles = [
            'https://moonyetis.com/api/leaderboard',
            'https://moonyetis.com/api/monitoring/health'
        ];
        
        return await this.purgeCache(apiFiles);
    }
    
    async purgeEverything() {
        return await this.purgeCache(); // null = purge everything
    }
    
    // Performance optimization
    async optimizeImages(imagePaths) {
        if (!this.enabled) return false;
        
        try {
            console.log('🖼️ Optimizing images through CDN...');
            
            // Enable Polish (image optimization) for specified paths
            const results = [];
            
            for (const imagePath of imagePaths) {
                const result = await this.cloudflare.updateZoneSetting('polish', 'lossy');
                results.push(result);
            }
            
            console.log('✅ Image optimization enabled');
            return results.every(r => r.success);
        } catch (error) {
            console.error('❌ Image optimization error:', error.message);
            return false;
        }
    }
    
    async enableBrotliCompression() {
        if (!this.enabled || !this.cloudflare) return false;
        
        try {
            const result = await this.cloudflare.updateZoneSetting('brotli', 'on');
            
            if (result.success) {
                console.log('✅ Brotli compression enabled');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('❌ Brotli compression error:', error.message);
            return false;
        }
    }
    
    async enableHTTP3() {
        if (!this.enabled || !this.cloudflare) return false;
        
        try {
            const result = await this.cloudflare.updateZoneSetting('http3', 'on');
            
            if (result.success) {
                console.log('✅ HTTP/3 enabled');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('❌ HTTP/3 error:', error.message);
            return false;
        }
    }
    
    // Security features
    async updateSecurityLevel(level = 'high') {
        if (!this.enabled || !this.cloudflare) return false;
        
        try {
            const result = await this.cloudflare.updateSecurityLevel(level);
            
            if (result.success) {
                console.log(`✅ Security level set to: ${level}`);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('❌ Security level update error:', error.message);
            return false;
        }
    }
    
    async enableDDoSProtection() {
        if (!this.enabled || !this.cloudflare) return false;
        
        try {
            const result = await this.cloudflare.updateZoneSetting('ddos_protection', 'on');
            
            if (result.success) {
                console.log('✅ DDoS protection enabled');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('❌ DDoS protection error:', error.message);
            return false;
        }
    }
    
    // Analytics and monitoring
    async getCDNAnalytics(startDate, endDate) {
        if (!this.enabled || !this.cloudflare) return null;
        
        try {
            const analytics = await this.cloudflare.getAnalytics(startDate, endDate);
            
            return {
                requests: analytics.totals?.requests?.all || 0,
                bandwidth: analytics.totals?.bandwidth?.all || 0,
                cached: analytics.totals?.requests?.cached || 0,
                uncached: analytics.totals?.requests?.uncached || 0,
                cacheRatio: analytics.totals?.requests?.cached / (analytics.totals?.requests?.all || 1),
                threats: analytics.totals?.threats?.all || 0,
                uniqueVisitors: analytics.uniques?.all || 0
            };
        } catch (error) {
            console.error('❌ CDN analytics error:', error.message);
            return null;
        }
    }
    
    async getCachePerformance() {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        const analytics = await this.getCDNAnalytics(
            yesterday.toISOString(),
            now.toISOString()
        );
        
        if (!analytics) return null;
        
        return {
            cacheHitRatio: (analytics.cacheRatio * 100).toFixed(2) + '%',
            totalRequests: analytics.requests,
            cachedRequests: analytics.cached,
            uncachedRequests: analytics.uncached,
            bandwidthSaved: analytics.cached * 0.8, // Estimate
            threatsMitigated: analytics.threats
        };
    }
    
    // Geographic distribution
    async getGlobalPerformance() {
        if (!this.enabled || !this.cloudflare) return null;
        
        try {
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            
            const analytics = await this.cloudflare.getAnalytics(
                yesterday.toISOString(),
                now.toISOString()
            );
            
            // Process geographic data
            const geoData = analytics.timeseries?.reduce((acc, point) => {
                Object.keys(point.dimensions || {}).forEach(country => {
                    if (!acc[country]) {
                        acc[country] = { requests: 0, bandwidth: 0 };
                    }
                    acc[country].requests += point.dimensions[country].requests || 0;
                    acc[country].bandwidth += point.dimensions[country].bandwidth || 0;
                });
                return acc;
            }, {});
            
            return geoData;
        } catch (error) {
            console.error('❌ Global performance error:', error.message);
            return null;
        }
    }
    
    // Automated optimization
    async runOptimizationSuite() {
        if (!this.enabled) return false;
        
        console.log('🚀 Running CDN optimization suite...');
        
        const results = [];
        
        try {
            // Enable performance features
            results.push(await this.enableBrotliCompression());
            results.push(await this.enableHTTP3());
            results.push(await this.optimizeImages(['*.png', '*.jpg', '*.jpeg', '*.webp']));
            
            // Security features
            results.push(await this.updateSecurityLevel('high'));
            results.push(await this.enableDDoSProtection());
            
            const successCount = results.filter(Boolean).length;
            console.log(`✅ Optimization suite completed: ${successCount}/${results.length} features enabled`);
            
            return successCount === results.length;
        } catch (error) {
            console.error('❌ Optimization suite error:', error.message);
            return false;
        }
    }
    
    // Cache prewarming
    async prewarmCache(urls) {
        if (!this.enabled) return false;
        
        console.log('🔥 Prewarming CDN cache...');
        
        try {
            const requests = urls.map(url => 
                fetch(url, { 
                    method: 'GET',
                    headers: {
                        'User-Agent': 'MoonYetis-CDN-Prewarmer/1.0'
                    }
                }).catch(error => console.warn(`Failed to prewarm ${url}:`, error.message))
            );
            
            await Promise.allSettled(requests);
            console.log(`✅ Cache prewarming completed for ${urls.length} URLs`);
            
            return true;
        } catch (error) {
            console.error('❌ Cache prewarming error:', error.message);
            return false;
        }
    }
    
    async prewarmStaticAssets() {
        const staticUrls = [
            'https://moonyetis.com/',
            'https://moonyetis.com/assets/css/main.css',
            'https://moonyetis.com/assets/js/app.js',
            'https://moonyetis.com/assets/images/logo.png',
            'https://moonyetis.com/favicon.ico'
        ];
        
        return await this.prewarmCache(staticUrls);
    }
    
    // Health monitoring
    async healthCheck() {
        if (!this.enabled) {
            return {
                healthy: false,
                reason: 'CDN Manager disabled'
            };
        }
        
        try {
            const cloudflareHealth = await this.cloudflare.healthCheck();
            
            return {
                healthy: cloudflareHealth.healthy,
                provider: this.cdnProvider,
                features: {
                    caching: true,
                    compression: true,
                    security: true,
                    analytics: true
                },
                lastCheck: new Date().toISOString()
            };
        } catch (error) {
            return {
                healthy: false,
                reason: error.message,
                lastCheck: new Date().toISOString()
            };
        }
    }
    
    // Automated maintenance
    async scheduleMaintenanceTasks() {
        if (!this.enabled) return;
        
        // Daily cache optimization
        setInterval(async () => {
            console.log('🔄 Running daily CDN maintenance...');
            
            const performance = await this.getCachePerformance();
            if (performance && parseFloat(performance.cacheHitRatio) < 80) {
                console.log('⚠️ Low cache hit ratio detected, running optimization...');
                await this.runOptimizationSuite();
            }
        }, 24 * 60 * 60 * 1000); // Daily
        
        // Weekly cache purge of old assets
        setInterval(async () => {
            console.log('🧹 Weekly CDN cache cleanup...');
            await this.purgeStaticAssets();
            await this.prewarmStaticAssets();
        }, 7 * 24 * 60 * 60 * 1000); // Weekly
    }
}

// Export singleton instance
module.exports = new CDNManager();