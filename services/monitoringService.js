const EventEmitter = require('events');
const fractalBitcoinService = require('./fractalBitcoinService');

class MonitoringService extends EventEmitter {
    constructor() {
        super();
        this.alerts = new Set();
        this.metrics = {
            totalDeposits: 0,
            totalWithdrawals: 0,
            activeUsers: 0,
            houseBalance: 0,
            lastBalanceCheck: null,
            alertsTriggered: 0
        };
        
        this.thresholds = {
            lowBalance: parseFloat(process.env.HOUSE_WALLET_LOW_BALANCE_ALERT || '1000'),
            highWithdrawalRate: parseFloat(process.env.HIGH_WITHDRAWAL_RATE_ALERT || '10000'),
            suspiciousActivity: parseInt(process.env.SUSPICIOUS_ACTIVITY_THRESHOLD || '5'),
            balanceCheckInterval: parseInt(process.env.BALANCE_CHECK_INTERVAL || '300000') // 5 minutes
        };
        
        console.log('🔍 MonitoringService initialized');
        this.startMonitoring();
    }

    // Start all monitoring services
    startMonitoring() {
        console.log('📊 Starting monitoring services...');
        
        // Monitor house wallet balance
        this.startBalanceMonitoring();
        
        // Monitor for suspicious patterns
        this.startSuspiciousActivityMonitoring();
        
        // Health checks
        this.startHealthMonitoring();
        
        console.log('✅ All monitoring services started');
    }

    // Monitor house wallet balance
    startBalanceMonitoring() {
        const checkBalance = async () => {
            try {
                const balance = await fractalBitcoinService.getHouseWalletBalance();
                
                if (balance.success) {
                    const currentBalance = parseFloat(balance.transferable || 0);
                    this.metrics.houseBalance = currentBalance;
                    this.metrics.lastBalanceCheck = new Date();
                    
                    // Check for low balance alert
                    if (currentBalance < this.thresholds.lowBalance) {
                        this.triggerAlert('LOW_BALANCE', {
                            currentBalance,
                            threshold: this.thresholds.lowBalance,
                            message: `House wallet balance is low: ${currentBalance} MOONYETIS`
                        });
                    }
                    
                    // Check for zero balance (critical)
                    if (currentBalance === 0) {
                        this.triggerAlert('ZERO_BALANCE', {
                            message: 'CRITICAL: House wallet has zero transferable balance!',
                            currentBalance
                        });
                    }
                    
                    console.log(`💰 House wallet balance: ${currentBalance} MOONYETIS`);
                } else {
                    this.triggerAlert('BALANCE_CHECK_FAILED', {
                        error: balance.error,
                        message: 'Failed to check house wallet balance'
                    });
                }
            } catch (error) {
                console.error('Error checking house wallet balance:', error.message);
                this.triggerAlert('BALANCE_CHECK_ERROR', {
                    error: error.message,
                    message: 'Error occurred while checking balance'
                });
            }
        };
        
        // Initial check
        checkBalance();
        
        // Set up periodic checking
        setInterval(checkBalance, this.thresholds.balanceCheckInterval);
        
        console.log(`🔄 Balance monitoring started (${this.thresholds.balanceCheckInterval/1000}s interval)`);
    }

    // Monitor for suspicious activity patterns
    startSuspiciousActivityMonitoring() {
        const suspiciousPatterns = new Map();
        
        // Monitor withdrawal patterns
        this.on('withdrawal_request', (data) => {
            const { walletAddress, amount } = data;
            const now = Date.now();
            const hourWindow = 60 * 60 * 1000; // 1 hour
            
            if (!suspiciousPatterns.has(walletAddress)) {
                suspiciousPatterns.set(walletAddress, []);
            }
            
            const userActivity = suspiciousPatterns.get(walletAddress);
            
            // Remove old activities outside the time window
            const recentActivity = userActivity.filter(activity => 
                now - activity.timestamp < hourWindow
            );
            
            // Add current activity
            recentActivity.push({ amount, timestamp: now, type: 'withdrawal' });
            suspiciousPatterns.set(walletAddress, recentActivity);
            
            // Check for suspicious patterns
            const totalWithdrawals = recentActivity
                .filter(a => a.type === 'withdrawal')
                .reduce((sum, a) => sum + a.amount, 0);
            
            if (totalWithdrawals > this.thresholds.highWithdrawalRate) {
                this.triggerAlert('HIGH_WITHDRAWAL_RATE', {
                    walletAddress,
                    totalWithdrawals,
                    timeWindow: '1 hour',
                    threshold: this.thresholds.highWithdrawalRate,
                    message: `High withdrawal rate detected for wallet ${walletAddress}`
                });
            }
            
            if (recentActivity.length > this.thresholds.suspiciousActivity) {
                this.triggerAlert('SUSPICIOUS_ACTIVITY', {
                    walletAddress,
                    activityCount: recentActivity.length,
                    timeWindow: '1 hour',
                    message: `Suspicious activity pattern detected for wallet ${walletAddress}`
                });
            }
        });
        
        console.log('🕵️ Suspicious activity monitoring started');
    }

    // Monitor system health
    startHealthMonitoring() {
        const checkHealth = async () => {
            try {
                const health = await fractalBitcoinService.healthCheck();
                
                if (!health.success) {
                    this.triggerAlert('HEALTH_CHECK_FAILED', {
                        error: health.error,
                        message: 'Fractal Bitcoin service health check failed'
                    });
                }
                
                // Check individual service health
                if (health.services) {
                    if (!health.services.network.success) {
                        this.triggerAlert('NETWORK_CONNECTION_FAILED', {
                            error: health.services.network.error,
                            message: 'Network connection to Fractal Bitcoin failed'
                        });
                    }
                    
                    if (!health.services.fees.success) {
                        this.triggerAlert('FEE_SERVICE_FAILED', {
                            error: health.services.fees.error,
                            message: 'Fee estimation service failed'
                        });
                    }
                    
                    if (!health.services.token.success) {
                        this.triggerAlert('TOKEN_VALIDATION_FAILED', {
                            error: health.services.token.error,
                            message: 'MOONYETIS token validation failed'
                        });
                    }
                }
                
                console.log('💚 Health check completed');
            } catch (error) {
                this.triggerAlert('HEALTH_CHECK_ERROR', {
                    error: error.message,
                    message: 'Error during health check'
                });
            }
        };
        
        // Initial health check
        checkHealth();
        
        // Set up periodic health checks (every 10 minutes)
        setInterval(checkHealth, 10 * 60 * 1000);
        
        console.log('🏥 Health monitoring started');
    }

    // Trigger an alert
    triggerAlert(type, data) {
        const alertId = `${type}_${Date.now()}`;
        const alert = {
            id: alertId,
            type,
            timestamp: new Date(),
            data,
            severity: this.getAlertSeverity(type)
        };
        
        // Avoid duplicate alerts for the same issue
        const alertKey = `${type}_${JSON.stringify(data)}`;
        if (this.alerts.has(alertKey)) {
            return; // Skip duplicate alert
        }
        
        this.alerts.add(alertKey);
        this.metrics.alertsTriggered++;
        
        // Emit alert event
        this.emit('alert', alert);
        
        // Log alert
        console.error(`🚨 ALERT [${alert.severity}] ${type}: ${data.message || 'No message'}`);
        
        // Handle critical alerts
        if (alert.severity === 'CRITICAL') {
            this.handleCriticalAlert(alert);
        }
        
        // Clean up old alerts after 1 hour
        setTimeout(() => {
            this.alerts.delete(alertKey);
        }, 60 * 60 * 1000);
    }

    // Get alert severity level
    getAlertSeverity(type) {
        const criticalAlerts = ['ZERO_BALANCE', 'HEALTH_CHECK_ERROR'];
        const highAlerts = ['LOW_BALANCE', 'HIGH_WITHDRAWAL_RATE', 'NETWORK_CONNECTION_FAILED'];
        const mediumAlerts = ['SUSPICIOUS_ACTIVITY', 'FEE_SERVICE_FAILED', 'TOKEN_VALIDATION_FAILED'];
        
        if (criticalAlerts.includes(type)) return 'CRITICAL';
        if (highAlerts.includes(type)) return 'HIGH';
        if (mediumAlerts.includes(type)) return 'MEDIUM';
        return 'LOW';
    }

    // Handle critical alerts
    handleCriticalAlert(alert) {
        // In production, this could:
        // - Send notifications to admin
        // - Temporarily disable withdrawals
        // - Create incident tickets
        // - Send webhook notifications
        
        console.error(`🚨🚨🚨 CRITICAL ALERT: ${alert.type}`);
        console.error('Data:', JSON.stringify(alert.data, null, 2));
        
        // For now, just emit a critical event
        this.emit('critical_alert', alert);
    }

    // Record a transaction for monitoring
    recordTransaction(type, data) {
        const transaction = {
            type, // 'deposit', 'withdrawal', 'bet', 'win'
            timestamp: new Date(),
            ...data
        };
        
        // Update metrics
        if (type === 'deposit') {
            this.metrics.totalDeposits += data.amount || 0;
        } else if (type === 'withdrawal') {
            this.metrics.totalWithdrawals += data.amount || 0;
            // Emit withdrawal event for suspicious activity monitoring
            this.emit('withdrawal_request', data);
        }
        
        // Emit transaction event
        this.emit('transaction', transaction);
        
        console.log(`📝 Recorded ${type} transaction:`, data);
    }

    // Get current metrics
    getMetrics() {
        return {
            ...this.metrics,
            timestamp: new Date(),
            alertsActive: this.alerts.size,
            uptime: process.uptime()
        };
    }

    // Get recent alerts
    getRecentAlerts(limit = 10) {
        // In a real implementation, you'd store alerts in a database
        // For now, return empty array since we're not persisting alerts
        return [];
    }

    // Send notification (placeholder for future implementation)
    async sendNotification(alert) {
        // In production, implement:
        // - Email notifications
        // - Slack/Discord webhooks
        // - SMS alerts for critical issues
        // - Push notifications
        
        console.log('📧 Notification would be sent:', alert.type);
    }

    // Generate monitoring report
    generateReport() {
        const metrics = this.getMetrics();
        
        return {
            timestamp: new Date(),
            summary: {
                status: metrics.alertsActive === 0 ? 'HEALTHY' : 'NEEDS_ATTENTION',
                houseBalance: `${metrics.houseBalance} MOONYETIS`,
                totalDeposits: metrics.totalDeposits,
                totalWithdrawals: metrics.totalWithdrawals,
                alertsTriggered: metrics.alertsTriggered,
                uptime: `${Math.floor(metrics.uptime / 3600)}h ${Math.floor((metrics.uptime % 3600) / 60)}m`
            },
            details: metrics,
            alerts: this.getRecentAlerts()
        };
    }
}

// Export singleton instance
module.exports = new MonitoringService();