const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

class SentryIntegration {
    constructor() {
        this.enabled = process.env.SENTRY_DSN && process.env.NODE_ENV === 'production';
        
        if (this.enabled) {
            this.initializeSentry();
        } else {
            console.log('🐛 Sentry integration disabled (development mode or missing DSN)');
        }
    }

    initializeSentry() {
        try {
            Sentry.init({
                dsn: process.env.SENTRY_DSN,
                environment: process.env.NODE_ENV,
                release: process.env.APP_VERSION || '1.0.0',
                
                // Performance monitoring
                tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
                profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
                
                // Integrations
                integrations: [
                    new ProfilingIntegration(),
                    new Sentry.Integrations.Http({ tracing: true }),
                    new Sentry.Integrations.Express({ app: require('../server') }),
                    new Sentry.Integrations.OnUncaughtException(),
                    new Sentry.Integrations.OnUnhandledRejection(),
                ],
                
                // Configure what gets sent to Sentry
                beforeSend(event, hint) {
                    // Filter out sensitive information
                    if (event.extra) {
                        delete event.extra.privateKey;
                        delete event.extra.password;
                        delete event.extra.secret;
                        delete event.extra.apiKey;
                    }
                    
                    // Filter out non-critical errors in production
                    if (process.env.NODE_ENV === 'production') {
                        const error = hint.originalException;
                        
                        // Don't send rate limiting errors
                        if (error && error.message && error.message.includes('rate limit')) {
                            return null;
                        }
                        
                        // Don't send validation errors (user input errors)
                        if (error && error.name === 'ValidationError') {
                            return null;
                        }
                    }
                    
                    return event;
                },
                
                // Tag all events
                initialScope: {
                    tags: {
                        service: 'moonyetis-backend',
                        component: 'api'
                    },
                    user: {
                        id: process.env.SERVER_ID || 'unknown'
                    }
                }
            });

            console.log('✅ Sentry integration initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Sentry:', error.message);
            this.enabled = false;
        }
    }

    // Custom error tracking for MoonYetis
    captureGameError(error, gameData, userId) {
        if (!this.enabled) return;

        Sentry.withScope((scope) => {
            scope.setTag('error_type', 'game_error');
            scope.setContext('game', {
                user_id: userId,
                bet_amount: gameData.betAmount,
                game_type: gameData.gameType,
                timestamp: new Date().toISOString()
            });
            scope.setLevel('error');
            
            Sentry.captureException(error);
        });
    }

    captureTransactionError(error, transactionData) {
        if (!this.enabled) return;

        Sentry.withScope((scope) => {
            scope.setTag('error_type', 'transaction_error');
            scope.setContext('transaction', {
                type: transactionData.type,
                amount: transactionData.amount,
                user_id: transactionData.userId,
                tx_id: transactionData.txId,
                status: transactionData.status
            });
            scope.setLevel('error');
            
            Sentry.captureException(error);
        });
    }

    captureWalletError(error, walletAddress, operation) {
        if (!this.enabled) return;

        Sentry.withScope((scope) => {
            scope.setTag('error_type', 'wallet_error');
            scope.setContext('wallet', {
                address: walletAddress,
                operation: operation,
                timestamp: new Date().toISOString()
            });
            scope.setLevel('error');
            
            Sentry.captureException(error);
        });
    }

    captureSecurityEvent(eventType, severity, details) {
        if (!this.enabled) return;

        Sentry.withScope((scope) => {
            scope.setTag('event_type', 'security');
            scope.setTag('security_severity', severity);
            scope.setContext('security_event', {
                type: eventType,
                severity: severity,
                details: details,
                timestamp: new Date().toISOString()
            });
            
            if (severity === 'CRITICAL') {
                scope.setLevel('fatal');
            } else if (severity === 'HIGH') {
                scope.setLevel('error');
            } else {
                scope.setLevel('warning');
            }
            
            Sentry.captureMessage(`Security event: ${eventType}`, scope.level);
        });
    }

    capturePerformanceIssue(operation, duration, threshold) {
        if (!this.enabled) return;

        if (duration > threshold) {
            Sentry.withScope((scope) => {
                scope.setTag('issue_type', 'performance');
                scope.setContext('performance', {
                    operation: operation,
                    duration: duration,
                    threshold: threshold,
                    exceeded_by: duration - threshold
                });
                scope.setLevel('warning');
                
                Sentry.captureMessage(`Slow operation: ${operation} took ${duration}ms`);
            });
        }
    }

    captureBusinessEvent(eventType, data) {
        if (!this.enabled) return;

        Sentry.withScope((scope) => {
            scope.setTag('event_type', 'business');
            scope.setContext('business_event', {
                type: eventType,
                data: data,
                timestamp: new Date().toISOString()
            });
            scope.setLevel('info');
            
            Sentry.captureMessage(`Business event: ${eventType}`);
        });
    }

    // Database error tracking
    captureDatabaseError(error, query, params) {
        if (!this.enabled) return;

        Sentry.withScope((scope) => {
            scope.setTag('error_type', 'database_error');
            scope.setContext('database', {
                query: query.substring(0, 200), // Limit query length
                params: params ? JSON.stringify(params).substring(0, 200) : null,
                error_code: error.code,
                error_detail: error.detail
            });
            scope.setLevel('error');
            
            Sentry.captureException(error);
        });
    }

    // API error tracking
    captureApiError(error, req, res) {
        if (!this.enabled) return;

        Sentry.withScope((scope) => {
            scope.setTag('error_type', 'api_error');
            scope.setContext('request', {
                method: req.method,
                url: req.url,
                user_agent: req.get('User-Agent'),
                ip: req.ip,
                status_code: res.statusCode
            });
            
            if (req.user) {
                scope.setUser({
                    id: req.user.id,
                    wallet_address: req.user.walletAddress
                });
            }
            
            scope.setLevel('error');
            Sentry.captureException(error);
        });
    }

    // External service error tracking
    captureExternalServiceError(error, serviceName, operation, response) {
        if (!this.enabled) return;

        Sentry.withScope((scope) => {
            scope.setTag('error_type', 'external_service_error');
            scope.setTag('service', serviceName);
            scope.setContext('external_service', {
                service: serviceName,
                operation: operation,
                status_code: response?.status,
                response_time: response?.responseTime,
                error_message: error.message
            });
            scope.setLevel('error');
            
            Sentry.captureException(error);
        });
    }

    // Circuit breaker events
    captureCircuitBreakerEvent(name, state, failureCount) {
        if (!this.enabled) return;

        Sentry.withScope((scope) => {
            scope.setTag('event_type', 'circuit_breaker');
            scope.setTag('breaker_name', name);
            scope.setContext('circuit_breaker', {
                name: name,
                state: state,
                failure_count: failureCount,
                timestamp: new Date().toISOString()
            });
            
            if (state === 'OPEN') {
                scope.setLevel('warning');
                Sentry.captureMessage(`Circuit breaker opened: ${name}`);
            } else if (state === 'CLOSED') {
                scope.setLevel('info');
                Sentry.captureMessage(`Circuit breaker closed: ${name}`);
            }
        });
    }

    // Custom performance monitoring
    startTransaction(name, operation) {
        if (!this.enabled) return null;

        return Sentry.startTransaction({
            name: name,
            op: operation,
            tags: {
                service: 'moonyetis-backend'
            }
        });
    }

    // User context setting
    setUserContext(userId, walletAddress, metadata = {}) {
        if (!this.enabled) return;

        Sentry.setUser({
            id: userId,
            wallet_address: walletAddress,
            ...metadata
        });
    }

    // Add breadcrumb for debugging
    addBreadcrumb(message, category, level = 'info', data = {}) {
        if (!this.enabled) return;

        Sentry.addBreadcrumb({
            message: message,
            category: category,
            level: level,
            data: data,
            timestamp: Date.now() / 1000
        });
    }

    // Express middleware integration
    getRequestHandler() {
        return this.enabled ? Sentry.Handlers.requestHandler() : (req, res, next) => next();
    }

    getTracingHandler() {
        return this.enabled ? Sentry.Handlers.tracingHandler() : (req, res, next) => next();
    }

    getErrorHandler() {
        return this.enabled ? Sentry.Handlers.errorHandler() : (error, req, res, next) => next(error);
    }

    // Health check
    healthCheck() {
        if (!this.enabled) {
            return {
                healthy: false,
                reason: 'Sentry integration disabled'
            };
        }

        try {
            // Test Sentry connection by sending a test message
            Sentry.withScope((scope) => {
                scope.setLevel('info');
                scope.setTag('type', 'health_check');
                Sentry.captureMessage('Sentry health check');
            });
            
            return {
                healthy: true,
                dsn: process.env.SENTRY_DSN ? 'configured' : 'missing',
                environment: process.env.NODE_ENV,
                release: process.env.APP_VERSION || '1.0.0',
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

    // Get Sentry instance for direct access
    getSentry() {
        return this.enabled ? Sentry : null;
    }

    // Flush events and close
    async close() {
        if (this.enabled) {
            await Sentry.close(2000); // Wait 2 seconds for events to be sent
            console.log('🐛 Sentry integration closed');
        }
    }
}

// Export singleton instance
module.exports = new SentryIntegration();