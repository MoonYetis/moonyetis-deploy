const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const Redis = require('redis');

class RateLimiterService {
    constructor() {
        this.redis = null;
        this.initRedis();
    }

    async initRedis() {
        try {
            this.redis = Redis.createClient({
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD || undefined
            });
            
            this.redis.on('error', (err) => {
                console.error('Redis connection error:', err);
            });
            
            await this.redis.connect();
            console.log('✅ Redis connected for rate limiting');
        } catch (error) {
            console.warn('⚠️ Redis not available, using memory store for rate limiting');
            this.redis = null;
        }
    }

    // General API rate limiter
    generalLimiter() {
        return rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 1000, // Limit each IP to 1000 requests per windowMs
            message: {
                error: 'Too many requests, please try again later',
                retryAfter: 15 * 60 // seconds
            },
            standardHeaders: true,
            legacyHeaders: false,
            store: this.redis ? new RedisStore({
                sendCommand: (...args) => this.redis.sendCommand(args),
            }) : undefined
        });
    }

    // Strict limiter for sensitive endpoints
    strictLimiter() {
        return rateLimit({
            windowMs: 60 * 1000, // 1 minute
            max: 10, // Limit each IP to 10 requests per minute
            message: {
                error: 'Rate limit exceeded for sensitive operation',
                retryAfter: 60
            },
            standardHeaders: true,
            legacyHeaders: false,
            store: this.redis ? new RedisStore({
                sendCommand: (...args) => this.redis.sendCommand(args),
            }) : undefined
        });
    }

    // Wallet operations limiter
    walletLimiter() {
        return rateLimit({
            windowMs: 5 * 60 * 1000, // 5 minutes
            max: 50, // 50 wallet operations per 5 minutes
            message: {
                error: 'Too many wallet operations, please wait',
                retryAfter: 5 * 60
            },
            standardHeaders: true,
            legacyHeaders: false,
            store: this.redis ? new RedisStore({
                sendCommand: (...args) => this.redis.sendCommand(args),
            }) : undefined
        });
    }

    // Transaction limiter (deposits/withdrawals)
    transactionLimiter() {
        return rateLimit({
            windowMs: 10 * 60 * 1000, // 10 minutes
            max: 20, // 20 transactions per 10 minutes
            message: {
                error: 'Transaction rate limit exceeded',
                retryAfter: 10 * 60
            },
            standardHeaders: true,
            legacyHeaders: false,
            store: this.redis ? new RedisStore({
                sendCommand: (...args) => this.redis.sendCommand(args),
            }) : undefined,
            skip: (req) => {
                // Skip rate limiting for house wallet operations
                return req.body && req.body.isHouseWallet === true;
            }
        });
    }

    // Game operations limiter
    gameLimiter() {
        return rateLimit({
            windowMs: 60 * 1000, // 1 minute
            max: 100, // 100 game operations per minute
            message: {
                error: 'Game rate limit exceeded, slow down',
                retryAfter: 60
            },
            standardHeaders: true,
            legacyHeaders: false,
            store: this.redis ? new RedisStore({
                sendCommand: (...args) => this.redis.sendCommand(args),
            }) : undefined
        });
    }

    // Progressive limiter for suspicious behavior
    progressiveLimiter() {
        const suspiciousIPs = new Map();
        
        return rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: (req) => {
                const ip = req.ip;
                const suspiciousCount = suspiciousIPs.get(ip) || 0;
                
                // Reduce limit for suspicious IPs
                if (suspiciousCount > 10) return 10;
                if (suspiciousCount > 5) return 50;
                return 200;
            },
            message: (req) => {
                const ip = req.ip;
                const count = suspiciousIPs.get(ip) || 0;
                suspiciousIPs.set(ip, count + 1);
                
                return {
                    error: 'Suspicious activity detected, rate limited',
                    level: count > 10 ? 'severe' : count > 5 ? 'moderate' : 'mild'
                };
            },
            standardHeaders: true,
            legacyHeaders: false,
            store: this.redis ? new RedisStore({
                sendCommand: (...args) => this.redis.sendCommand(args),
            }) : undefined
        });
    }

    // DDoS protection middleware
    ddosProtection() {
        const connectionCounts = new Map();
        const blockedIPs = new Set();
        
        return (req, res, next) => {
            const ip = req.ip;
            const now = Date.now();
            
            // Check if IP is blocked
            if (blockedIPs.has(ip)) {
                return res.status(429).json({
                    error: 'IP temporarily blocked due to suspicious activity',
                    blocked: true
                });
            }
            
            // Track connection counts
            if (!connectionCounts.has(ip)) {
                connectionCounts.set(ip, []);
            }
            
            const connections = connectionCounts.get(ip);
            
            // Remove old connections (older than 1 minute)
            const recentConnections = connections.filter(time => now - time < 60000);
            connectionCounts.set(ip, recentConnections);
            
            // Add current connection
            recentConnections.push(now);
            
            // Check for DDoS pattern
            if (recentConnections.length > 100) { // 100 requests per minute
                blockedIPs.add(ip);
                console.warn(`🚫 IP ${ip} blocked for potential DDoS (${recentConnections.length} requests/min)`);
                
                // Unblock after 15 minutes
                setTimeout(() => {
                    blockedIPs.delete(ip);
                    console.log(`✅ IP ${ip} unblocked`);
                }, 15 * 60 * 1000);
                
                return res.status(429).json({
                    error: 'DDoS protection activated',
                    blocked: true,
                    unblockTime: new Date(now + 15 * 60 * 1000)
                });
            }
            
            next();
        };
    }

    // Custom middleware for specific endpoints
    customLimiter(windowMs, max, message) {
        return rateLimit({
            windowMs,
            max,
            message: message || 'Rate limit exceeded',
            standardHeaders: true,
            legacyHeaders: false,
            store: this.redis ? new RedisStore({
                sendCommand: (...args) => this.redis.sendCommand(args),
            }) : undefined
        });
    }

    // Cleanup method
    async cleanup() {
        if (this.redis) {
            await this.redis.disconnect();
        }
    }
}

module.exports = new RateLimiterService();