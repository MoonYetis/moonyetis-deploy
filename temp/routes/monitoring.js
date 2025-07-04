const express = require('express');
const router = express.Router();
const monitoringService = require('../services/monitoringService');
const fractalBitcoinService = require('../services/fractalBitcoinService');

// Get system metrics and status
router.get('/metrics', async (req, res) => {
    try {
        const metrics = monitoringService.getMetrics();
        
        res.json({
            success: true,
            timestamp: new Date(),
            metrics
        });
    } catch (error) {
        console.error('Error getting metrics:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get monitoring report
router.get('/report', async (req, res) => {
    try {
        const report = monitoringService.generateReport();
        
        res.json({
            success: true,
            report
        });
    } catch (error) {
        console.error('Error generating report:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get recent alerts
router.get('/alerts', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const alerts = monitoringService.getRecentAlerts(limit);
        
        res.json({
            success: true,
            alerts,
            count: alerts.length
        });
    } catch (error) {
        console.error('Error getting alerts:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get house wallet status
router.get('/wallet/status', async (req, res) => {
    try {
        const balance = await fractalBitcoinService.getHouseWalletBalance();
        const health = await fractalBitcoinService.healthCheck();
        
        res.json({
            success: true,
            wallet: {
                address: process.env.HOUSE_WALLET_ADDRESS ? 
                    `${process.env.HOUSE_WALLET_ADDRESS.slice(0, 8)}...${process.env.HOUSE_WALLET_ADDRESS.slice(-6)}` : 
                    'Not configured',
                balance: balance.success ? balance.balance : 'Unknown',
                transferable: balance.success ? balance.transferable : 'Unknown',
                lastChecked: new Date()
            },
            blockchain: {
                connected: health.success,
                network: health.services?.network?.success || false,
                fees: health.services?.fees?.success || false,
                token: health.services?.token?.success || false
            }
        });
    } catch (error) {
        console.error('Error getting wallet status:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check endpoint for monitoring systems
router.get('/health', async (req, res) => {
    try {
        const metrics = monitoringService.getMetrics();
        const health = await fractalBitcoinService.healthCheck();
        
        // Determine overall health status
        let status = 'healthy';
        let issues = [];
        
        if (metrics.alertsActive > 0) {
            status = 'warning';
            issues.push(`${metrics.alertsActive} active alerts`);
        }
        
        if (!health.success) {
            status = 'unhealthy';
            issues.push('Blockchain service unhealthy');
        }
        
        if (metrics.houseBalance < 1000) { // Low balance threshold
            status = status === 'healthy' ? 'warning' : status;
            issues.push('Low house wallet balance');
        }
        
        const response = {
            success: true,
            status,
            timestamp: new Date(),
            uptime: process.uptime(),
            issues: issues.length > 0 ? issues : undefined,
            services: {
                monitoring: 'active',
                blockchain: health.success ? 'connected' : 'disconnected',
                database: 'unknown', // Would check DB connection in real implementation
                api: 'responding'
            }
        };
        
        // Return appropriate HTTP status
        if (status === 'unhealthy') {
            res.status(503).json(response);
        } else if (status === 'warning') {
            res.status(200).json(response);
        } else {
            res.status(200).json(response);
        }
        
    } catch (error) {
        console.error('Error in health check:', error.message);
        res.status(500).json({
            success: false,
            status: 'error',
            error: error.message,
            timestamp: new Date()
        });
    }
});

// Trigger manual balance check
router.post('/wallet/check-balance', async (req, res) => {
    try {
        const balance = await fractalBitcoinService.getHouseWalletBalance();
        
        // Record this check in monitoring
        monitoringService.recordTransaction('balance_check', {
            balance: balance.balance,
            transferable: balance.transferable,
            success: balance.success
        });
        
        res.json({
            success: true,
            message: 'Balance check completed',
            balance
        });
    } catch (error) {
        console.error('Error in manual balance check:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Test alert system (for development/testing)
router.post('/test-alert', async (req, res) => {
    try {
        const { type = 'TEST_ALERT', message = 'Test alert triggered manually' } = req.body;
        
        // Only allow in development or with special authorization
        if (process.env.NODE_ENV === 'production' && !req.headers['x-admin-key']) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to trigger test alerts in production'
            });
        }
        
        monitoringService.triggerAlert(type, {
            message,
            triggeredBy: 'manual_test',
            timestamp: new Date()
        });
        
        res.json({
            success: true,
            message: 'Test alert triggered',
            type
        });
    } catch (error) {
        console.error('Error triggering test alert:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get monitoring dashboard data
router.get('/dashboard', async (req, res) => {
    try {
        const metrics = monitoringService.getMetrics();
        const walletBalance = await fractalBitcoinService.getHouseWalletBalance();
        const health = await fractalBitcoinService.healthCheck();
        const networkInfo = await fractalBitcoinService.getNetworkInfo();
        
        const dashboard = {
            timestamp: new Date(),
            summary: {
                status: metrics.alertsActive === 0 ? 'OPERATIONAL' : 'MONITORING',
                uptime: Math.floor(process.uptime()),
                alertsActive: metrics.alertsActive
            },
            wallet: {
                balance: walletBalance.success ? walletBalance.balance : 0,
                transferable: walletBalance.success ? walletBalance.transferable : 0,
                address: process.env.HOUSE_WALLET_ADDRESS ? 
                    `${process.env.HOUSE_WALLET_ADDRESS.slice(0, 12)}...${process.env.HOUSE_WALLET_ADDRESS.slice(-8)}` : 
                    'Not configured'
            },
            blockchain: {
                network: networkInfo.success ? networkInfo.network : 'Unknown',
                blockHeight: networkInfo.success ? networkInfo.blockHeight : 'Unknown',
                connected: health.success
            },
            metrics: {
                totalDeposits: metrics.totalDeposits,
                totalWithdrawals: metrics.totalWithdrawals,
                activeUsers: metrics.activeUsers,
                lastBalanceCheck: metrics.lastBalanceCheck
            },
            alerts: monitoringService.getRecentAlerts(5)
        };
        
        res.json({
            success: true,
            dashboard
        });
    } catch (error) {
        console.error('Error getting dashboard data:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;