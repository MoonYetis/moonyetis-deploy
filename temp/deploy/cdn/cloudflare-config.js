// Cloudflare CDN Configuration for MoonYetis
// This configuration optimizes global content delivery

const CLOUDFLARE_CONFIG = {
    // Zone configuration
    zone: {
        name: 'moonyetis.com',
        plan: 'pro', // Recommended for production gambling sites
        type: 'full'
    },
    
    // DNS Records
    dns: [
        {
            type: 'A',
            name: '@',
            content: 'YOUR_SERVER_IP', // Replace with actual server IP
            ttl: 300,
            proxied: true
        },
        {
            type: 'A',
            name: 'www',
            content: 'YOUR_SERVER_IP',
            ttl: 300,
            proxied: true
        },
        {
            type: 'CNAME',
            name: 'api',
            content: 'moonyetis.com',
            ttl: 300,
            proxied: true
        }
    ],
    
    // SSL/TLS Settings
    ssl: {
        mode: 'full_strict', // Full SSL with strict certificate validation
        universal_ssl: true,
        min_tls_version: '1.2',
        tls_1_3: 'on',
        automatic_https_rewrites: true,
        always_use_https: true,
        hsts: {
            enabled: true,
            max_age: 31536000, // 1 year
            include_subdomains: true,
            preload: true
        }
    },
    
    // Security Settings
    security: {
        // DDoS Protection
        ddos_protection: true,
        
        // WAF (Web Application Firewall)
        waf: {
            enabled: true,
            mode: 'on', // 'on', 'off', 'simulate'
            rules: [
                {
                    id: 'rate_limiting_api',
                    enabled: true,
                    expression: '(http.request.uri.path contains "/api/")',
                    action: 'challenge',
                    threshold: 100, // requests per minute
                    period: 60
                },
                {
                    id: 'block_malicious_bots',
                    enabled: true,
                    expression: '(cf.client.bot)',
                    action: 'block'
                },
                {
                    id: 'protect_admin_paths',
                    enabled: true,
                    expression: '(http.request.uri.path contains "/admin")',
                    action: 'challenge'
                }
            ]
        },
        
        // Bot Management
        bot_management: {
            enabled: true,
            fight_mode: true,
            verified_bots: true, // Allow search engines
            static_resource_protection: false
        },
        
        // Security Level
        security_level: 'high', // 'off', 'essentially_off', 'low', 'medium', 'high', 'under_attack'
        
        // Browser Integrity Check
        browser_check: true,
        
        // Challenge Passage
        challenge_ttl: 1800 // 30 minutes
    },
    
    // Performance Settings
    performance: {
        // Caching
        cache: {
            // Cache levels
            level: 'aggressive',
            browser_ttl: 14400, // 4 hours
            
            // Cache rules
            rules: [
                {
                    name: 'cache_static_assets',
                    expression: '(http.request.uri.path matches ".*\\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$")',
                    action: 'cache',
                    cache_ttl: 86400, // 24 hours
                    browser_ttl: 86400
                },
                {
                    name: 'cache_api_responses',
                    expression: '(http.request.uri.path contains "/api/leaderboard" or http.request.uri.path contains "/api/monitoring/health")',
                    action: 'cache',
                    cache_ttl: 300, // 5 minutes
                    browser_ttl: 60 // 1 minute
                },
                {
                    name: 'bypass_cache_transactions',
                    expression: '(http.request.uri.path contains "/api/blockchain/" or http.request.uri.path contains "/api/game/")',
                    action: 'bypass'
                }
            ]
        },
        
        // Compression
        compression: {
            brotli: true,
            gzip: true
        },
        
        // Minification
        minify: {
            css: true,
            js: true,
            html: true
        },
        
        // Image Optimization
        polish: 'lossy', // 'off', 'lossless', 'lossy'
        webp: true,
        
        // HTTP/2 Server Push
        http2_server_push: true,
        
        // Early Hints
        early_hints: true,
        
        // Rocket Loader
        rocket_loader: false // Disable for gambling sites to avoid JS issues
    },
    
    // Network Settings
    network: {
        // IPv6
        ipv6: true,
        
        // Pseudo IPv4
        pseudo_ipv4: 'add_header',
        
        // IP Geolocation
        ip_geolocation: true,
        
        // HTTP/3
        http3: true,
        
        // 0-RTT Connection Resumption
        zero_rtt: true
    },
    
    // Speed Settings
    speed: {
        // Mirage (Mobile optimization)
        mirage: true,
        
        // Auto Minify
        auto_minify: {
            css: true,
            js: true,
            html: true
        }
    },
    
    // Page Rules (Legacy - use Rules for new setups)
    page_rules: [
        {
            target: 'moonyetis.com/api/*',
            actions: {
                cache_level: 'bypass',
                disable_performance: true
            },
            priority: 1,
            status: 'active'
        },
        {
            target: 'moonyetis.com/assets/*',
            actions: {
                cache_level: 'cache_everything',
                edge_cache_ttl: 86400,
                browser_cache_ttl: 86400
            },
            priority: 2,
            status: 'active'
        }
    ],
    
    // Custom Rules (New Rules Engine)
    rules: [
        {
            description: 'Rate limit API endpoints',
            expression: '(http.request.uri.path contains "/api/")',
            action: 'rate_limit',
            action_parameters: {
                rate_limit: {
                    requests_per_period: 100,
                    period: 60,
                    mitigation_timeout: 600
                }
            }
        },
        {
            description: 'Block specific countries (if needed)',
            expression: '(ip.geoip.country in {"CN" "RU"})', // Example - adjust as needed
            action: 'block'
        },
        {
            description: 'Cache static assets',
            expression: '(http.request.uri.path matches ".*\\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$")',
            action: 'set_cache_settings',
            action_parameters: {
                cache: true,
                cache_ttl: 86400,
                browser_ttl: 86400
            }
        }
    ],
    
    // Analytics & Monitoring
    analytics: {
        web_analytics: true,
        
        // Real User Monitoring
        rum: {
            enabled: true
        }
    },
    
    // Workers (if needed for custom logic)
    workers: {
        routes: [
            {
                pattern: 'moonyetis.com/api/geo-check',
                script: 'geo-compliance-worker'
            }
        ]
    }
};

// Cloudflare API integration
class CloudflareManager {
    constructor(apiToken, zoneId) {
        this.apiToken = apiToken;
        this.zoneId = zoneId;
        this.baseUrl = 'https://api.cloudflare.com/client/v4';
    }

    async makeRequest(endpoint, method = 'GET', data = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
        };

        const options = {
            method,
            headers
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        return response.json();
    }

    // DNS Management
    async createDNSRecord(record) {
        return this.makeRequest(`/zones/${this.zoneId}/dns_records`, 'POST', record);
    }

    async updateDNSRecord(recordId, record) {
        return this.makeRequest(`/zones/${this.zoneId}/dns_records/${recordId}`, 'PUT', record);
    }

    async listDNSRecords() {
        return this.makeRequest(`/zones/${this.zoneId}/dns_records`);
    }

    // SSL/TLS Management
    async updateSSLSettings(settings) {
        return this.makeRequest(`/zones/${this.zoneId}/settings/ssl`, 'PATCH', { value: settings.mode });
    }

    async updateHSTSSettings(settings) {
        return this.makeRequest(`/zones/${this.zoneId}/settings/security_header`, 'PATCH', {
            value: {
                strict_transport_security: settings
            }
        });
    }

    // Security Settings
    async updateSecurityLevel(level) {
        return this.makeRequest(`/zones/${this.zoneId}/settings/security_level`, 'PATCH', { value: level });
    }

    async updateWAFSettings(enabled) {
        return this.makeRequest(`/zones/${this.zoneId}/settings/waf`, 'PATCH', { value: enabled ? 'on' : 'off' });
    }

    // Performance Settings
    async updateCacheLevel(level) {
        return this.makeRequest(`/zones/${this.zoneId}/settings/cache_level`, 'PATCH', { value: level });
    }

    async updateMinificationSettings(settings) {
        return this.makeRequest(`/zones/${this.zoneId}/settings/minify`, 'PATCH', { value: settings });
    }

    // Page Rules
    async createPageRule(rule) {
        return this.makeRequest(`/zones/${this.zoneId}/pagerules`, 'POST', rule);
    }

    async listPageRules() {
        return this.makeRequest(`/zones/${this.zoneId}/pagerules`);
    }

    // Rate Limiting Rules
    async createRateLimitRule(rule) {
        return this.makeRequest(`/zones/${this.zoneId}/rate_limits`, 'POST', rule);
    }

    // Analytics
    async getAnalytics(since, until) {
        return this.makeRequest(`/zones/${this.zoneId}/analytics/dashboard?since=${since}&until=${until}`);
    }

    // Purge Cache
    async purgeCache(files = null) {
        const data = files ? { files } : { purge_everything: true };
        return this.makeRequest(`/zones/${this.zoneId}/purge_cache`, 'POST', data);
    }

    // Zone Settings
    async updateZoneSetting(setting, value) {
        return this.makeRequest(`/zones/${this.zoneId}/settings/${setting}`, 'PATCH', { value });
    }

    // Bulk configuration
    async applyConfiguration(config = CLOUDFLARE_CONFIG) {
        const results = [];

        try {
            // Apply SSL settings
            if (config.ssl) {
                results.push(await this.updateSSLSettings(config.ssl));
                if (config.ssl.hsts) {
                    results.push(await this.updateHSTSSettings(config.ssl.hsts));
                }
            }

            // Apply security settings
            if (config.security) {
                results.push(await this.updateSecurityLevel(config.security.security_level));
                results.push(await this.updateWAFSettings(config.security.waf.enabled));
            }

            // Apply performance settings
            if (config.performance) {
                results.push(await this.updateCacheLevel(config.performance.cache.level));
                results.push(await this.updateMinificationSettings(config.performance.minify));
            }

            // Create DNS records
            if (config.dns) {
                for (const record of config.dns) {
                    results.push(await this.createDNSRecord(record));
                }
            }

            // Create page rules
            if (config.page_rules) {
                for (const rule of config.page_rules) {
                    results.push(await this.createPageRule(rule));
                }
            }

            console.log('✅ Cloudflare configuration applied successfully');
            return results;

        } catch (error) {
            console.error('❌ Failed to apply Cloudflare configuration:', error);
            throw error;
        }
    }

    // Health check
    async healthCheck() {
        try {
            const response = await this.makeRequest('/user/tokens/verify');
            return {
                healthy: response.success,
                message: response.success ? 'Cloudflare API accessible' : 'API verification failed'
            };
        } catch (error) {
            return {
                healthy: false,
                message: error.message
            };
        }
    }
}

// Configuration validation
function validateCloudflareConfig(config) {
    const errors = [];

    if (!config.zone || !config.zone.name) {
        errors.push('Zone name is required');
    }

    if (!config.dns || config.dns.length === 0) {
        errors.push('At least one DNS record is required');
    }

    if (!config.ssl || !config.ssl.mode) {
        errors.push('SSL mode configuration is required');
    }

    // Validate DNS records
    if (config.dns) {
        config.dns.forEach((record, index) => {
            if (!record.type || !record.name || !record.content) {
                errors.push(`DNS record ${index} is missing required fields`);
            }
        });
    }

    if (errors.length > 0) {
        throw new Error(`Cloudflare configuration validation failed: ${errors.join(', ')}`);
    }

    return true;
}

module.exports = {
    CLOUDFLARE_CONFIG,
    CloudflareManager,
    validateCloudflareConfig
};