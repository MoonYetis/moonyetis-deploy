const EventEmitter = require('events');

class CircuitBreaker extends EventEmitter {
    constructor(name, options = {}) {
        super();
        
        this.name = name;
        this.failureThreshold = options.failureThreshold || 5;
        this.resetTimeout = options.resetTimeout || 60000; // 1 minute
        this.monitoringPeriod = options.monitoringPeriod || 120000; // 2 minutes
        this.expectedErrors = options.expectedErrors || [];
        
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.successCount = 0;
        this.requests = [];
        
        console.log(`🔌 Circuit breaker "${name}" initialized`);
    }

    async execute(operation, fallback = null) {
        if (this.state === 'OPEN') {
            if (this.shouldAttemptReset()) {
                this.state = 'HALF_OPEN';
                console.log(`🔄 Circuit breaker "${this.name}" attempting reset (HALF_OPEN)`);
            } else {
                console.warn(`⚡ Circuit breaker "${this.name}" is OPEN, executing fallback`);
                return this.executeFallback(fallback, new Error('Circuit breaker is OPEN'));
            }
        }

        const startTime = Date.now();
        
        try {
            const result = await operation();
            this.onSuccess(Date.now() - startTime);
            return result;
        } catch (error) {
            this.onFailure(error, Date.now() - startTime);
            
            if (this.state === 'OPEN') {
                return this.executeFallback(fallback, error);
            }
            
            throw error;
        }
    }

    onSuccess(duration) {
        this.requests.push({
            timestamp: Date.now(),
            success: true,
            duration
        });
        
        if (this.state === 'HALF_OPEN') {
            this.successCount++;
            
            // If we have enough successful requests, close the circuit
            if (this.successCount >= 3) {
                this.reset();
            }
        } else {
            this.failureCount = Math.max(0, this.failureCount - 1);
        }
        
        this.cleanOldRequests();
        this.emit('success', { name: this.name, duration });
    }

    onFailure(error, duration) {
        this.requests.push({
            timestamp: Date.now(),
            success: false,
            duration,
            error: error.message
        });
        
        // Check if this is an expected error (shouldn't trigger circuit breaker)
        if (this.isExpectedError(error)) {
            console.log(`⚠️ Expected error in "${this.name}": ${error.message}`);
            this.emit('expectedError', { name: this.name, error });
            return;
        }
        
        this.failureCount++;
        this.lastFailureTime = Date.now();
        
        console.error(`❌ Circuit breaker "${this.name}" failure ${this.failureCount}/${this.failureThreshold}: ${error.message}`);
        
        if (this.state === 'HALF_OPEN') {
            // If we fail in half-open state, go back to open
            this.trip();
        } else if (this.failureCount >= this.failureThreshold) {
            this.trip();
        }
        
        this.cleanOldRequests();
        this.emit('failure', { name: this.name, error, failureCount: this.failureCount });
    }

    trip() {
        this.state = 'OPEN';
        this.successCount = 0;
        const resetTime = new Date(Date.now() + this.resetTimeout);
        
        console.error(`🚨 Circuit breaker "${this.name}" TRIPPED! Will attempt reset at ${resetTime.toISOString()}`);
        this.emit('open', { name: this.name, resetTime });
    }

    reset() {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = null;
        
        console.log(`✅ Circuit breaker "${this.name}" RESET (CLOSED)`);
        this.emit('closed', { name: this.name });
    }

    shouldAttemptReset() {
        return this.lastFailureTime && 
               (Date.now() - this.lastFailureTime) >= this.resetTimeout;
    }

    isExpectedError(error) {
        return this.expectedErrors.some(expectedError => {
            if (typeof expectedError === 'string') {
                return error.message.includes(expectedError);
            }
            if (expectedError instanceof RegExp) {
                return expectedError.test(error.message);
            }
            if (typeof expectedError === 'function') {
                return expectedError(error);
            }
            return false;
        });
    }

    async executeFallback(fallback, originalError) {
        if (typeof fallback === 'function') {
            try {
                const result = await fallback(originalError);
                this.emit('fallback', { name: this.name, originalError });
                return result;
            } catch (fallbackError) {
                console.error(`❌ Fallback failed for "${this.name}":`, fallbackError.message);
                throw new Error(`Circuit breaker open and fallback failed: ${fallbackError.message}`);
            }
        } else if (fallback !== null) {
            this.emit('fallback', { name: this.name, originalError });
            return fallback;
        } else {
            throw new Error(`Circuit breaker "${this.name}" is open and no fallback provided`);
        }
    }

    cleanOldRequests() {
        const cutoff = Date.now() - this.monitoringPeriod;
        this.requests = this.requests.filter(req => req.timestamp > cutoff);
    }

    getStats() {
        this.cleanOldRequests();
        
        const totalRequests = this.requests.length;
        const successfulRequests = this.requests.filter(req => req.success).length;
        const failedRequests = totalRequests - successfulRequests;
        const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
        
        const durations = this.requests
            .filter(req => req.success)
            .map(req => req.duration);
        
        const avgDuration = durations.length > 0 
            ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length 
            : 0;

        return {
            name: this.name,
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            totalRequests,
            successfulRequests,
            failedRequests,
            successRate: Math.round(successRate * 100) / 100,
            avgDuration: Math.round(avgDuration),
            lastFailureTime: this.lastFailureTime,
            nextResetAttempt: this.lastFailureTime ? new Date(this.lastFailureTime + this.resetTimeout) : null
        };
    }
}

class CircuitBreakerService {
    constructor() {
        this.breakers = new Map();
        this.globalStats = {
            totalBreakers: 0,
            openBreakers: 0,
            totalRequests: 0,
            totalFailures: 0
        };
        
        console.log('🔌 Circuit Breaker Service initialized');
    }

    createBreaker(name, options = {}) {
        if (this.breakers.has(name)) {
            return this.breakers.get(name);
        }

        const breaker = new CircuitBreaker(name, options);
        
        // Listen to breaker events for global stats
        breaker.on('success', () => {
            this.globalStats.totalRequests++;
        });
        
        breaker.on('failure', () => {
            this.globalStats.totalRequests++;
            this.globalStats.totalFailures++;
        });
        
        breaker.on('open', () => {
            this.globalStats.openBreakers++;
        });
        
        breaker.on('closed', () => {
            this.globalStats.openBreakers = Math.max(0, this.globalStats.openBreakers - 1);
        });

        this.breakers.set(name, breaker);
        this.globalStats.totalBreakers++;
        
        return breaker;
    }

    getBreaker(name) {
        return this.breakers.get(name);
    }

    // Predefined breakers for common services
    getFractalApiBreaker() {
        return this.createBreaker('fractal-api', {
            failureThreshold: 3,
            resetTimeout: 30000, // 30 seconds
            expectedErrors: [
                'rate limit exceeded',
                'temporarily unavailable',
                /timeout/i
            ]
        });
    }

    getDatabaseBreaker() {
        return this.createBreaker('database', {
            failureThreshold: 5,
            resetTimeout: 60000, // 1 minute
            expectedErrors: [
                'connection reset',
                'query timeout'
            ]
        });
    }

    getWalletServiceBreaker() {
        return this.createBreaker('wallet-service', {
            failureThreshold: 3,
            resetTimeout: 45000, // 45 seconds
            expectedErrors: [
                'insufficient funds',
                'invalid address'
            ]
        });
    }

    getExternalApiBreaker(serviceName) {
        return this.createBreaker(`external-api-${serviceName}`, {
            failureThreshold: 4,
            resetTimeout: 120000, // 2 minutes
            expectedErrors: [
                'rate limit',
                'service unavailable',
                /5\d\d/i // 5xx HTTP errors
            ]
        });
    }

    // Execute with automatic fallback to cache or default values
    async executeWithFallback(breakerName, operation, fallbackValue = null) {
        const breaker = this.breakers.get(breakerName);
        if (!breaker) {
            throw new Error(`Circuit breaker "${breakerName}" not found`);
        }

        return await breaker.execute(operation, fallbackValue);
    }

    getAllStats() {
        const breakerStats = Array.from(this.breakers.values()).map(breaker => breaker.getStats());
        
        return {
            global: {
                ...this.globalStats,
                timestamp: new Date()
            },
            breakers: breakerStats,
            health: {
                overall: this.globalStats.openBreakers === 0 ? 'healthy' : 'degraded',
                openBreakers: this.globalStats.openBreakers,
                totalBreakers: this.globalStats.totalBreakers
            }
        };
    }

    getHealthStatus() {
        const openBreakers = Array.from(this.breakers.values())
            .filter(breaker => breaker.state === 'OPEN');
        
        return {
            healthy: openBreakers.length === 0,
            openBreakers: openBreakers.map(breaker => ({
                name: breaker.name,
                state: breaker.state,
                failureCount: breaker.failureCount,
                lastFailureTime: breaker.lastFailureTime
            })),
            totalBreakers: this.breakers.size
        };
    }

    resetBreaker(name) {
        const breaker = this.breakers.get(name);
        if (breaker) {
            breaker.reset();
            return true;
        }
        return false;
    }

    resetAllBreakers() {
        let resetCount = 0;
        for (const breaker of this.breakers.values()) {
            if (breaker.state !== 'CLOSED') {
                breaker.reset();
                resetCount++;
            }
        }
        return resetCount;
    }
}

module.exports = new CircuitBreakerService();