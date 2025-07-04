const Redis = require('redis');
const crypto = require('crypto');

class CacheService {
    constructor() {
        this.redis = null;
        this.memoryCache = new Map();
        this.cacheStats = {
            hits: 0,
            misses: 0,
            errors: 0
        };
        
        this.defaultTTL = 300; // 5 minutes
        this.maxMemoryCacheSize = 1000; // Max items in memory cache
        
        this.initRedis();
    }

    async initRedis() {
        try {
            this.redis = Redis.createClient({
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD || undefined,
                retryDelayOnFailover: 100,
                maxRetriesPerRequest: 3
            });
            
            this.redis.on('error', (err) => {
                console.error('Redis connection error:', err);
                this.cacheStats.errors++;
            });
            
            this.redis.on('connect', () => {
                console.log('✅ Redis cache connected');
            });
            
            await this.redis.connect();
            
            // Test Redis connection
            await this.redis.ping();
            
        } catch (error) {
            console.warn('⚠️ Redis not available, using memory cache only');
            this.redis = null;
        }
    }

    // Generate cache key
    generateKey(prefix, identifier, params = {}) {
        const paramString = Object.keys(params).length > 0 
            ? JSON.stringify(params) 
            : '';
        
        const keyData = `${prefix}:${identifier}:${paramString}`;
        return crypto.createHash('md5').update(keyData).digest('hex');
    }

    // Get from cache (Redis first, then memory)
    async get(key) {
        try {
            // Try Redis first
            if (this.redis) {
                const redisValue = await this.redis.get(key);
                if (redisValue !== null) {
                    this.cacheStats.hits++;
                    return JSON.parse(redisValue);
                }
            }
            
            // Fallback to memory cache
            if (this.memoryCache.has(key)) {
                const cached = this.memoryCache.get(key);
                
                // Check if expired
                if (cached.expiry > Date.now()) {
                    this.cacheStats.hits++;
                    return cached.data;
                } else {
                    this.memoryCache.delete(key);
                }
            }
            
            this.cacheStats.misses++;
            return null;
            
        } catch (error) {
            console.error('Cache get error:', error);
            this.cacheStats.errors++;
            return null;
        }
    }

    // Set in cache (Redis and memory)
    async set(key, value, ttl = this.defaultTTL) {
        try {
            const serializedValue = JSON.stringify(value);
            
            // Store in Redis
            if (this.redis) {
                await this.redis.setEx(key, ttl, serializedValue);
            }
            
            // Store in memory cache
            this.setMemoryCache(key, value, ttl);
            
            return true;
            
        } catch (error) {
            console.error('Cache set error:', error);
            this.cacheStats.errors++;
            return false;
        }
    }

    // Set in memory cache with size management
    setMemoryCache(key, value, ttl) {
        // Remove oldest entries if cache is full
        if (this.memoryCache.size >= this.maxMemoryCacheSize) {
            const oldestKey = this.memoryCache.keys().next().value;
            this.memoryCache.delete(oldestKey);
        }
        
        this.memoryCache.set(key, {
            data: value,
            expiry: Date.now() + (ttl * 1000)
        });
    }

    // Delete from cache
    async delete(key) {
        try {
            let deleted = false;
            
            // Delete from Redis
            if (this.redis) {
                const redisDeleted = await this.redis.del(key);
                deleted = redisDeleted > 0;
            }
            
            // Delete from memory cache
            if (this.memoryCache.has(key)) {
                this.memoryCache.delete(key);
                deleted = true;
            }
            
            return deleted;
            
        } catch (error) {
            console.error('Cache delete error:', error);
            this.cacheStats.errors++;
            return false;
        }
    }

    // Clear all cache
    async clear() {
        try {
            if (this.redis) {
                await this.redis.flushAll();
            }
            
            this.memoryCache.clear();
            
            console.log('✅ Cache cleared');
            return true;
            
        } catch (error) {
            console.error('Cache clear error:', error);
            return false;
        }
    }

    // Cache with function execution
    async wrap(key, fn, ttl = this.defaultTTL) {
        // Try to get from cache first
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }
        
        // Execute function and cache result
        try {
            const result = await fn();
            await this.set(key, result, ttl);
            return result;
        } catch (error) {
            console.error('Cache wrap error:', error);
            throw error;
        }
    }

    // Specialized caching methods for MoonYetis

    // Cache wallet balance
    async cacheWalletBalance(address, balance, ttl = 60) {
        const key = this.generateKey('wallet_balance', address);
        return await this.set(key, balance, ttl);
    }

    async getWalletBalance(address) {
        const key = this.generateKey('wallet_balance', address);
        return await this.get(key);
    }

    // Cache transaction data
    async cacheTransaction(txid, transaction, ttl = 3600) {
        const key = this.generateKey('transaction', txid);
        return await this.set(key, transaction, ttl);
    }

    async getTransaction(txid) {
        const key = this.generateKey('transaction', txid);
        return await this.get(key);
    }

    // Cache leaderboard data
    async cacheLeaderboard(leaderboard, ttl = 300) {
        const key = this.generateKey('leaderboard', 'global');
        return await this.set(key, leaderboard, ttl);
    }

    async getLeaderboard() {
        const key = this.generateKey('leaderboard', 'global');
        return await this.get(key);
    }

    // Cache game results
    async cacheGameResult(gameId, result, ttl = 1800) {
        const key = this.generateKey('game_result', gameId);
        return await this.set(key, result, ttl);
    }

    async getGameResult(gameId) {
        const key = this.generateKey('game_result', gameId);
        return await this.get(key);
    }

    // Cache API responses
    async cacheApiResponse(endpoint, params, response, ttl = 120) {
        const key = this.generateKey('api_response', endpoint, params);
        return await this.set(key, response, ttl);
    }

    async getApiResponse(endpoint, params) {
        const key = this.generateKey('api_response', endpoint, params);
        return await this.get(key);
    }

    // Cache database query results
    async cacheQuery(sql, params, result, ttl = 300) {
        const queryHash = crypto.createHash('md5')
            .update(sql + JSON.stringify(params))
            .digest('hex');
        const key = this.generateKey('db_query', queryHash);
        return await this.set(key, result, ttl);
    }

    async getQueryResult(sql, params) {
        const queryHash = crypto.createHash('md5')
            .update(sql + JSON.stringify(params))
            .digest('hex');
        const key = this.generateKey('db_query', queryHash);
        return await this.get(key);
    }

    // Invalidate related cache entries
    async invalidatePattern(pattern) {
        try {
            if (this.redis) {
                const keys = await this.redis.keys(`*${pattern}*`);
                if (keys.length > 0) {
                    await this.redis.del(keys);
                }
            }
            
            // Invalidate memory cache
            for (const key of this.memoryCache.keys()) {
                if (key.includes(pattern)) {
                    this.memoryCache.delete(key);
                }
            }
            
            return true;
            
        } catch (error) {
            console.error('Cache invalidation error:', error);
            return false;
        }
    }

    // Clean expired entries from memory cache
    cleanMemoryCache() {
        const now = Date.now();
        
        for (const [key, cached] of this.memoryCache.entries()) {
            if (cached.expiry <= now) {
                this.memoryCache.delete(key);
            }
        }
    }

    // Get cache statistics
    getStats() {
        const hitRate = this.cacheStats.hits + this.cacheStats.misses > 0 
            ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)) * 100 
            : 0;

        return {
            ...this.cacheStats,
            hitRate: Math.round(hitRate * 100) / 100,
            memoryCacheSize: this.memoryCache.size,
            redisConnected: this.redis !== null,
            timestamp: new Date()
        };
    }

    // Health check
    async healthCheck() {
        try {
            const testKey = 'health_check_' + Date.now();
            const testValue = { test: true, timestamp: Date.now() };
            
            // Test set
            const setResult = await this.set(testKey, testValue, 10);
            
            // Test get
            const getValue = await this.get(testKey);
            
            // Test delete
            await this.delete(testKey);
            
            const healthy = setResult && getValue !== null && getValue.test === true;
            
            return {
                healthy,
                redis: this.redis !== null,
                memoryCache: this.memoryCache.size < this.maxMemoryCacheSize,
                stats: this.getStats()
            };
            
        } catch (error) {
            console.error('Cache health check failed:', error);
            return {
                healthy: false,
                error: error.message,
                stats: this.getStats()
            };
        }
    }

    // Cleanup method
    async cleanup() {
        try {
            this.cleanMemoryCache();
            
            if (this.redis) {
                await this.redis.disconnect();
            }
            
            console.log('✅ Cache service cleanup completed');
        } catch (error) {
            console.error('Cache cleanup error:', error);
        }
    }
}

// Export singleton instance
module.exports = new CacheService();