const StatsD = require('node-statsd');
const { createLogger, transports, format } = require('winston');

class DatadogIntegration {
    constructor() {
        this.enabled = process.env.DATADOG_API_KEY && process.env.NODE_ENV === 'production';
        this.statsd = null;
        this.logger = null;
        
        if (this.enabled) {
            this.initializeDatadog();
        } else {
            console.log('📊 Datadog integration disabled (development mode or missing API key)');
        }
    }

    initializeDatadog() {
        try {
            // Initialize StatsD client for metrics
            this.statsd = new StatsD({
                host: process.env.DATADOG_AGENT_HOST || 'localhost',
                port: process.env.DATADOG_AGENT_PORT || 8125,
                prefix: 'moonyetis.',
                suffix: '',
                globalize: false,
                cacheDns: true,
                mock: false,
                global_tags: [
                    'env:production',
                    'service:moonyetis-backend',
                    'version:' + (process.env.APP_VERSION || '1.0.0')
                ]
            });

            // Initialize Winston logger for Datadog logs
            this.logger = createLogger({
                level: 'info',
                format: format.combine(
                    format.timestamp(),
                    format.errors({ stack: true }),
                    format.json()
                ),
                defaultMeta: {
                    service: 'moonyetis-backend',
                    environment: process.env.NODE_ENV,
                    version: process.env.APP_VERSION || '1.0.0'
                },
                transports: [
                    new transports.Console(),
                    new transports.File({ 
                        filename: '/var/log/moonyetis/datadog.log',
                        maxsize: 5242880, // 5MB
                        maxFiles: 5
                    })
                ]
            });

            console.log('✅ Datadog integration initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Datadog:', error.message);
            this.enabled = false;
        }
    }

    // Custom metrics for MoonYetis
    recordGameSpin(userId, betAmount, winAmount, gameData) {
        if (!this.enabled) return;

        try {
            // Game metrics
            this.statsd.increment('game.spins.total', 1, ['user_id:' + userId]);
            this.statsd.histogram('game.bet.amount', betAmount, ['user_id:' + userId]);
            
            if (winAmount > 0) {
                this.statsd.increment('game.spins.wins', 1, ['user_id:' + userId]);
                this.statsd.histogram('game.win.amount', winAmount, ['user_id:' + userId]);
                
                // Track big wins
                if (winAmount > betAmount * 10) {
                    this.statsd.increment('game.big_wins', 1, ['user_id:' + userId]);
                }
            }

            // House edge tracking
            const houseProfit = betAmount - winAmount;
            this.statsd.histogram('game.house_profit', houseProfit);

            // Log significant events
            if (winAmount > betAmount * 20) {
                this.logger.info('Big win recorded', {
                    userId,
                    betAmount,
                    winAmount,
                    multiplier: winAmount / betAmount,
                    gameData
                });
            }

        } catch (error) {
            console.error('Failed to record game spin metrics:', error.message);
        }
    }

    recordTransaction(type, amount, userId, status, txId) {
        if (!this.enabled) return;

        try {
            const tags = [
                'type:' + type,
                'status:' + status,
                'user_id:' + userId
            ];

            this.statsd.increment('transactions.total', 1, tags);
            this.statsd.histogram('transactions.amount', amount, tags);

            if (status === 'completed') {
                this.statsd.increment('transactions.completed', 1, tags);
            } else if (status === 'failed') {
                this.statsd.increment('transactions.failed', 1, tags);
            }

            // Log transactions
            this.logger.info('Transaction recorded', {
                type,
                amount,
                userId,
                status,
                txId
            });

        } catch (error) {
            console.error('Failed to record transaction metrics:', error.message);
        }
    }

    recordWalletBalance(address, balance, type = 'user') {
        if (!this.enabled) return;

        try {
            const tags = ['type:' + type];
            
            if (type === 'house') {
                tags.push('critical:true');
            }

            this.statsd.gauge('wallet.balance', balance, tags);

            // Alert on low house balance
            if (type === 'house' && balance < 10000) {
                this.logger.warn('Low house wallet balance', {
                    address,
                    balance,
                    threshold: 10000
                });
            }

        } catch (error) {
            console.error('Failed to record wallet balance:', error.message);
        }
    }

    recordSystemMetrics(metrics) {
        if (!this.enabled) return;

        try {
            // System metrics
            if (metrics.system) {
                this.statsd.gauge('system.cpu.usage', metrics.system.cpu);
                this.statsd.gauge('system.memory.usage', metrics.system.memory.percentage);
                this.statsd.gauge('system.disk.usage', metrics.system.disk.percentage);
                this.statsd.gauge('system.uptime', metrics.system.uptime);
            }

            // Application metrics
            if (metrics.application) {
                this.statsd.gauge('app.memory.rss', metrics.application.memory.rss);
                this.statsd.gauge('app.memory.heap_used', metrics.application.memory.heapUsed);
                this.statsd.gauge('app.memory.heap_total', metrics.application.memory.heapTotal);
                this.statsd.gauge('app.uptime', metrics.application.uptime);
            }

            // Database metrics
            if (metrics.database) {
                this.statsd.gauge('database.connections', metrics.database.activeConnections);
            }

        } catch (error) {
            console.error('Failed to record system metrics:', error.message);
        }
    }

    recordApiRequest(endpoint, method, statusCode, responseTime, userId = null) {
        if (!this.enabled) return;

        try {
            const tags = [
                'endpoint:' + endpoint,
                'method:' + method,
                'status:' + statusCode
            ];

            if (userId) {
                tags.push('user_id:' + userId);
            }

            this.statsd.increment('api.requests.total', 1, tags);
            this.statsd.histogram('api.response_time', responseTime, tags);

            // Track errors
            if (statusCode >= 400) {
                this.statsd.increment('api.errors', 1, tags);
                
                if (statusCode >= 500) {
                    this.logger.error('API server error', {
                        endpoint,
                        method,
                        statusCode,
                        responseTime,
                        userId
                    });
                }
            }

            // Track slow requests
            if (responseTime > 2000) {
                this.statsd.increment('api.slow_requests', 1, tags);
                this.logger.warn('Slow API request', {
                    endpoint,
                    method,
                    responseTime,
                    userId
                });
            }

        } catch (error) {
            console.error('Failed to record API request metrics:', error.message);
        }
    }

    recordCacheMetrics(operation, hit, responseTime, key) {
        if (!this.enabled) return;

        try {
            const tags = ['operation:' + operation];

            this.statsd.increment('cache.operations.total', 1, tags);
            this.statsd.timing('cache.response_time', responseTime, tags);

            if (hit) {
                this.statsd.increment('cache.hits', 1, tags);
            } else {
                this.statsd.increment('cache.misses', 1, tags);
            }

        } catch (error) {
            console.error('Failed to record cache metrics:', error.message);
        }
    }

    recordCircuitBreakerEvent(name, state, failureCount) {
        if (!this.enabled) return;

        try {
            const tags = ['breaker:' + name, 'state:' + state];

            this.statsd.gauge('circuit_breaker.state', state === 'OPEN' ? 1 : 0, tags);
            this.statsd.gauge('circuit_breaker.failures', failureCount, tags);

            if (state === 'OPEN') {
                this.logger.warn('Circuit breaker opened', {
                    name,
                    failureCount
                });
            } else if (state === 'CLOSED') {
                this.logger.info('Circuit breaker closed', {
                    name
                });
            }

        } catch (error) {
            console.error('Failed to record circuit breaker event:', error.message);
        }
    }

    recordSecurityEvent(eventType, severity, details) {
        if (!this.enabled) return;

        try {
            const tags = ['event:' + eventType, 'severity:' + severity];

            this.statsd.increment('security.events', 1, tags);

            this.logger.warn('Security event detected', {
                eventType,
                severity,
                details,
                timestamp: new Date().toISOString()
            });

            // Critical security events
            if (severity === 'CRITICAL') {
                this.statsd.increment('security.critical_events', 1, tags);
            }

        } catch (error) {
            console.error('Failed to record security event:', error.message);
        }
    }

    recordBusinessMetrics(metrics) {
        if (!this.enabled) return;

        try {
            // Revenue metrics
            if (metrics.revenue) {
                this.statsd.gauge('business.revenue.daily', metrics.revenue.daily);
                this.statsd.gauge('business.revenue.total', metrics.revenue.total);
            }

            // User metrics
            if (metrics.users) {
                this.statsd.gauge('business.users.active_daily', metrics.users.activeDaily);
                this.statsd.gauge('business.users.total', metrics.users.total);
                this.statsd.gauge('business.users.new_signups', metrics.users.newSignups);
            }

            // Game metrics
            if (metrics.games) {
                this.statsd.gauge('business.games.total_spins', metrics.games.totalSpins);
                this.statsd.gauge('business.games.total_volume', metrics.games.totalVolume);
                this.statsd.gauge('business.games.house_edge_actual', metrics.games.actualHouseEdge);
            }

        } catch (error) {
            console.error('Failed to record business metrics:', error.message);
        }
    }

    createDashboard() {
        if (!this.enabled) return null;

        return {
            title: 'MoonYetis Production Dashboard',
            widgets: [
                {
                    title: 'API Requests',
                    type: 'timeseries',
                    query: 'sum:moonyetis.api.requests.total{*}.as_count()'
                },
                {
                    title: 'Response Time',
                    type: 'timeseries',
                    query: 'avg:moonyetis.api.response_time{*}'
                },
                {
                    title: 'Error Rate',
                    type: 'timeseries',
                    query: 'sum:moonyetis.api.errors{*}.as_count()'
                },
                {
                    title: 'Game Spins',
                    type: 'timeseries',
                    query: 'sum:moonyetis.game.spins.total{*}.as_count()'
                },
                {
                    title: 'House Profit',
                    type: 'timeseries',
                    query: 'sum:moonyetis.game.house_profit{*}'
                },
                {
                    title: 'System CPU',
                    type: 'timeseries',
                    query: 'avg:moonyetis.system.cpu.usage{*}'
                },
                {
                    title: 'System Memory',
                    type: 'timeseries',
                    query: 'avg:moonyetis.system.memory.usage{*}'
                },
                {
                    title: 'Active Users',
                    type: 'timeseries',
                    query: 'avg:moonyetis.business.users.active_daily{*}'
                }
            ]
        };
    }

    // Health check for Datadog integration
    healthCheck() {
        if (!this.enabled) {
            return {
                healthy: false,
                reason: 'Datadog integration disabled'
            };
        }

        try {
            // Test StatsD connection
            this.statsd.increment('health_check.datadog', 1);
            
            return {
                healthy: true,
                lastCheck: new Date().toISOString(),
                metrics: {
                    statsd: 'connected',
                    logger: 'active'
                }
            };
        } catch (error) {
            return {
                healthy: false,
                reason: error.message,
                lastCheck: new Date().toISOString()
            };
        }
    }

    // Graceful shutdown
    close() {
        if (this.statsd) {
            this.statsd.close();
        }
        
        if (this.logger) {
            this.logger.end();
        }
        
        console.log('📊 Datadog integration closed');
    }
}

// Export singleton instance
module.exports = new DatadogIntegration();