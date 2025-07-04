const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const webSocketService = require('./services/webSocketService');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'frontend')));

// Initialize WebSocket service
webSocketService.initialize(server);
webSocketService.startHealthChecks();

// Mock session middleware (simplified)
app.use((req, res, next) => {
    req.session = {
        walletAddress: null,
        walletType: null,
        walletConnected: false
    };
    next();
});

// Basic wallet routes (simplified for testing)
app.post('/api/wallet/connect', (req, res) => {
    console.log('🔗 Wallet connection attempt:', req.body);
    res.json({
        success: false,
        error: 'Demo mode - wallet connection not implemented in test server'
    });
});

app.get('/api/wallet/status', (req, res) => {
    res.json({
        success: true,
        connected: false,
        wallet: null
    });
});

// Transaction routes (simplified for testing)
app.get('/api/transactions/history', (req, res) => {
    console.log('📊 Transaction history request:', req.query);
    
    // Generate demo transaction data
    const demoTransactions = [
        {
            id: 'tx_demo_1',
            type: 'deposit',
            amount: 1000000,
            status: 'confirmed',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            txid: 'demo_deposit_hash_123',
            confirmations: 6
        },
        {
            id: 'tx_demo_2',
            type: 'bet',
            amount: 25000,
            status: 'confirmed',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            txid: 'demo_bet_hash_456'
        },
        {
            id: 'tx_demo_3',
            type: 'win',
            amount: 75000,
            status: 'confirmed',
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
            txid: 'demo_win_hash_789'
        },
        {
            id: 'tx_demo_4',
            type: 'withdrawal',
            amount: 50000,
            status: 'pending',
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            txid: null,
            fee: 1000
        }
    ];
    
    // Apply filters if provided
    let filteredTransactions = [...demoTransactions];
    
    if (req.query.type && req.query.type !== 'all') {
        filteredTransactions = filteredTransactions.filter(tx => tx.type === req.query.type);
    }
    
    if (req.query.status && req.query.status !== 'all') {
        filteredTransactions = filteredTransactions.filter(tx => tx.status === req.query.status);
    }
    
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    filteredTransactions = filteredTransactions.slice(0, limit);
    
    res.json({
        success: true,
        history: filteredTransactions,
        count: filteredTransactions.length,
        filters: req.query
    });
});

app.get('/api/transactions/history/export', (req, res) => {
    console.log('📄 Export request:', req.query);
    
    const csvContent = `Date,Type,Amount,Status,TXID,Fee,Confirmations
2024-12-26,deposit,1000000,confirmed,demo_deposit_hash_123,,6
2024-12-27,bet,25000,confirmed,demo_bet_hash_456,,
2024-12-27,win,75000,confirmed,demo_win_hash_789,,
2024-12-27,withdrawal,50000,pending,,1000,`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="moonyetis-transactions-demo-${Date.now()}.csv"`);
    res.send(csvContent);
});

// === DEPOSIT MONITORING ENDPOINTS ===

app.post('/api/transactions/deposits/start-monitoring', (req, res) => {
    console.log('🔍 Start deposit monitoring request');
    
    res.json({
        success: true,
        message: 'Monitoreo automático de depósitos iniciado (DEMO)',
        address: 'bc1qdemotestaddress',
        monitoringActive: true
    });
});

app.post('/api/transactions/deposits/stop-monitoring', (req, res) => {
    console.log('⏹️ Stop deposit monitoring request');
    
    res.json({
        success: true,
        message: 'Monitoreo automático de depósitos detenido (DEMO)',
        address: 'bc1qdemotestaddress',
        monitoringActive: false
    });
});

app.get('/api/transactions/deposits/monitoring-status', (req, res) => {
    console.log('📊 Get monitoring status request');
    
    res.json({
        success: true,
        monitoring: {
            activeMonitors: 1,
            queueSize: 0,
            isProcessingQueue: false,
            monitors: [
                {
                    address: 'bc1qdemo...test123',
                    startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                    depositsDetected: 2,
                    uptime: 30 * 60 * 1000
                }
            ]
        },
        timestamp: new Date().toISOString()
    });
});

app.get('/api/transactions/deposits/check-balance', (req, res) => {
    console.log('💰 Check BRC-20 balance request');
    
    res.json({
        success: true,
        address: 'bc1qdemotestaddress',
        balance: {
            success: true,
            balance: 150000,
            available: 150000,
            transferable: 150000,
            ticker: 'MOONYETIS',
            note: 'Demo balance from test server'
        },
        checkedAt: new Date().toISOString()
    });
});

app.get('/api/transactions/deposits/brc20-history', (req, res) => {
    console.log('📜 Get BRC-20 history request');
    
    const demoTransfers = [
        {
            txid: 'demo_brc20_tx_1',
            inscriptionId: 'demo_inscription_1',
            from: 'bc1qsender123456789',
            to: 'bc1qdemotestaddress',
            amount: 100000,
            timestamp: Date.now() - 24 * 60 * 60 * 1000,
            blockHeight: 850100,
            confirmations: 6,
            status: 'confirmed'
        },
        {
            txid: 'demo_brc20_tx_2',
            inscriptionId: 'demo_inscription_2',
            from: 'bc1qsender987654321',
            to: 'bc1qdemotestaddress',
            amount: 50000,
            timestamp: Date.now() - 2 * 60 * 60 * 1000,
            blockHeight: 850105,
            confirmations: 2,
            status: 'pending'
        }
    ];
    
    res.json({
        success: true,
        address: 'bc1qdemotestaddress',
        transfers: {
            success: true,
            transfers: demoTransfers,
            total: demoTransfers.length
        },
        checkedAt: new Date().toISOString()
    });
});

// === PROGRESSIVE CONFIRMATIONS ENDPOINTS ===

app.get('/api/transactions/deposits/pending-confirmations', (req, res) => {
    console.log('📊 Get pending deposits with confirmations');
    
    const demoPendingDeposits = [
        {
            id: 'dep_demo_1',
            txid: 'demo_tx_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            amount: 500000,
            confirmations: {
                current: 2,
                required: 3,
                percentage: 66.7
            },
            status: 'half_confirmed',
            estimatedTimeRemaining: '~10 minutos',
            detectedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
            lastUpdated: new Date(Date.now() - 5 * 60 * 1000).toISOString()
        },
        {
            id: 'dep_demo_2', 
            txid: 'demo_tx_abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            amount: 2000000,
            confirmations: {
                current: 1,
                required: 4,
                percentage: 25.0
            },
            status: 'first_confirmation',
            estimatedTimeRemaining: '~30 minutos',
            detectedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            lastUpdated: new Date(Date.now() - 2 * 60 * 1000).toISOString()
        }
    ];
    
    res.json({
        success: true,
        address: 'bc1qdemotestaddress',
        pendingDeposits: demoPendingDeposits,
        count: demoPendingDeposits.length,
        checkedAt: new Date().toISOString()
    });
});

app.get('/api/transactions/deposits/confirmation-status/:txid', (req, res) => {
    const { txid } = req.params;
    console.log(`🔍 Get confirmation status for: ${txid}`);
    
    // Simulate confirmation status based on txid
    const mockConfirmations = Math.floor(Math.random() * 6) + 1;
    const requiredConfirmations = Math.floor(Math.random() * 3) + 3;
    
    res.json({
        success: true,
        txid,
        status: mockConfirmations >= requiredConfirmations ? 'confirmed' : 'pending',
        confirmations: {
            current: mockConfirmations,
            required: requiredConfirmations,
            percentage: Math.min((mockConfirmations / requiredConfirmations) * 100, 100)
        },
        estimatedTimeRemaining: mockConfirmations >= requiredConfirmations ? 'Confirmado' : `~${(requiredConfirmations - mockConfirmations) * 10} minutos`,
        lastUpdated: new Date().toISOString(),
        checkedAt: new Date().toISOString()
    });
});

app.post('/api/transactions/deposits/simulate-confirmation/:txid', (req, res) => {
    const { txid } = req.params;
    const { confirmations = 1 } = req.body;
    
    console.log(`🧪 Simulate confirmation for ${txid}: +${confirmations}`);
    
    const previousConfirmations = Math.floor(Math.random() * 3);
    const newConfirmations = previousConfirmations + parseInt(confirmations);
    const requiredConfirmations = 4;
    
    res.json({
        success: true,
        message: 'Confirmaciones simuladas exitosamente (DEMO)',
        txid,
        confirmations: {
            previous: previousConfirmations,
            current: newConfirmations,
            required: requiredConfirmations,
            percentage: Math.min((newConfirmations / requiredConfirmations) * 100, 100)
        },
        status: newConfirmations >= requiredConfirmations ? 'confirmed' : 
               newConfirmations >= requiredConfirmations * 0.75 ? 'nearly_confirmed' :
               newConfirmations >= requiredConfirmations * 0.5 ? 'half_confirmed' :
               newConfirmations >= 1 ? 'first_confirmation' : 'unconfirmed'
    });
});

app.post('/api/transactions/deposits/generate-address', (req, res) => {
    console.log('🏦 Generate deposit address request');
    
    const demoAddress = 'bc1qdemotestaddress' + Math.random().toString(36).substring(2, 15);
    
    res.json({
        success: true,
        depositAddress: demoAddress,
        qrData: `bitcoin:${demoAddress}?label=MOONYETIS%20Deposit`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        network: 'fractal-mainnet',
        ticker: 'MOONYETIS',
        monitoringActive: true,
        message: 'Demo deposit address with automatic monitoring (TEST)'
    });
});

app.post('/api/transactions/withdrawals/calculate-fee', (req, res) => {
    console.log('💸 Calculate withdrawal fee:', req.body);
    
    const { amount, priority = 'normal' } = req.body;
    
    if (!amount) {
        return res.status(400).json({
            success: false,
            error: 'Amount required'
        });
    }
    
    const feeRates = {
        low: 1000,
        normal: 1500,
        high: 2500
    };
    
    const recommendedFee = feeRates[priority] || feeRates.normal;
    
    res.json({
        success: true,
        amount: parseInt(amount),
        fee: {
            recommended: recommendedFee,
            priority,
            estimatedTime: priority === 'low' ? '30-60 min' : 
                          priority === 'normal' ? '10-30 min' : '1-10 min'
        },
        total: parseInt(amount) + recommendedFee,
        alternatives: {
            low: { fee: feeRates.low, time: '30-60 min' },
            normal: { fee: feeRates.normal, time: '10-30 min' },
            high: { fee: feeRates.high, time: '1-10 min' }
        }
    });
});

app.post('/api/transactions/withdrawals/submit', (req, res) => {
    console.log('💸 Submit withdrawal:', req.body);
    
    const { toAddress, amount, fee } = req.body;
    
    if (!toAddress || !amount) {
        return res.status(400).json({
            success: false,
            error: 'Address and amount required'
        });
    }
    
    const withdrawalId = `wd_demo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    res.json({
        success: true,
        withdrawal: {
            id: withdrawalId,
            status: 'pending',
            txid: null,
            fromAddress: 'demo_address',
            toAddress,
            amount: parseInt(amount),
            fee: parseInt(fee) || 1000,
            total: parseInt(amount) + (parseInt(fee) || 1000),
            createdAt: new Date().toISOString(),
            estimatedConfirmation: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        },
        message: 'Demo withdrawal submitted successfully'
    });
});

app.get('/api/transactions/withdrawals/history', (req, res) => {
    console.log('📊 Withdrawal history request');
    
    const demoWithdrawals = [
        {
            id: 'wd_demo_1',
            txid: 'demo_withdrawal_txid_1',
            status: 'confirmed',
            fromAddress: 'demo_address',
            toAddress: 'bc1qdemotestaddress123456789',
            amount: 50000,
            fee: 1500,
            total: 51500,
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            confirmedAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
            confirmations: 6
        },
        {
            id: 'wd_demo_2',
            txid: null,
            status: 'pending',
            fromAddress: 'demo_address',
            toAddress: 'bc1qdemotestaddress987654321',
            amount: 25000,
            fee: 1000,
            total: 26000,
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            estimatedConfirmation: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        }
    ];
    
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    
    res.json({
        success: true,
        withdrawals: demoWithdrawals.slice(0, limit),
        count: demoWithdrawals.length
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        server: 'moonyetis-test-server',
        version: '1.0.0-test',
        endpoints: {
            wallet: 'available',
            transactions: 'available',
            deposits: 'available',
            withdrawals: 'available',
            audit: 'available'
        },
        mode: 'test'
    });
});

// === AUDIT LOGGING ENDPOINTS ===

app.post('/api/audit/log', (req, res) => {
    console.log('📝 Audit log received:', req.body);
    
    try {
        const auditEvent = req.body;
        
        // Validate audit event structure
        if (!auditEvent.type || !auditEvent.timestamp || !auditEvent.sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid audit event structure'
            });
        }
        
        // In a real implementation, you would store this in a database
        // For demo purposes, we'll just log it and return success
        console.log(`📝 [${auditEvent.timestamp}] ${auditEvent.type}:`, auditEvent.data);
        
        res.json({
            success: true,
            message: 'Audit event logged successfully',
            eventId: auditEvent.id
        });
        
    } catch (error) {
        console.error('❌ Error processing audit log:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process audit log'
        });
    }
});

app.get('/api/audit/logs', (req, res) => {
    console.log('📊 Audit logs request:', req.query);
    
    // In a real implementation, you would fetch from database
    // For demo purposes, return sample audit logs
    const sampleLogs = [
        {
            id: Date.now() + '_1',
            type: 'wallet_panel_opened',
            timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            data: {},
            sessionId: 'demo_session_123',
            userAgent: req.get('User-Agent'),
            url: req.get('Referer') || 'http://localhost:3000'
        },
        {
            id: Date.now() + '_2',
            type: 'setting_changed',
            timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
            data: { setting: 'soundEnabled', newValue: true },
            sessionId: 'demo_session_123',
            userAgent: req.get('User-Agent'),
            url: req.get('Referer') || 'http://localhost:3000'
        },
        {
            id: Date.now() + '_3',
            type: 'websocket_connected',
            timestamp: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
            data: { address: 'bc1qdemotestaddress' },
            sessionId: 'demo_session_123',
            userAgent: req.get('User-Agent'),
            url: req.get('Referer') || 'http://localhost:3000'
        }
    ];
    
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    
    res.json({
        success: true,
        logs: sampleLogs.slice(0, limit),
        count: sampleLogs.length
    });
});

// === WEBSOCKET TEST ENDPOINTS ===

app.get('/api/websocket/stats', (req, res) => {
    console.log('📊 WebSocket stats request');
    
    const stats = webSocketService.getStats();
    
    res.json({
        success: true,
        stats,
        timestamp: new Date().toISOString()
    });
});

app.post('/api/websocket/test-notification', (req, res) => {
    const { message = 'Test notification from server' } = req.body;
    console.log('🧪 Test WebSocket notification');
    
    const testNotification = {
        type: 'test_notification',
        channel: 'general',
        data: {
            message,
            testType: 'server_test',
            timestamp: new Date().toISOString()
        }
    };
    
    // Broadcast to all connected clients
    const sentCount = webSocketService.broadcast(testNotification);
    
    res.json({
        success: true,
        message: 'Test notification sent',
        sentToClients: sentCount,
        notification: testNotification
    });
});

app.post('/api/websocket/test-deposit-progress', (req, res) => {
    const { 
        confirmations = 2, 
        required = 4, 
        amount = 500000,
        walletAddress = 'bc1qdemotestaddress'
    } = req.body;
    
    console.log('🧪 Test deposit progress notification');
    
    const progressData = {
        type: 'confirmation_progress',
        depositId: `dep_demo_${Date.now()}`,
        txid: `demo_test_${Math.random().toString(36).substring(2, 15)}`,
        address: walletAddress,
        amount: parseInt(amount),
        confirmations: {
            current: parseInt(confirmations),
            required: parseInt(required),
            percentage: Math.min((parseInt(confirmations) / parseInt(required)) * 100, 100)
        },
        status: parseInt(confirmations) >= parseInt(required) ? 'confirmed' : 'pending',
        message: `Demo: ${confirmations}/${required} confirmaciones`,
        estimatedTimeRemaining: parseInt(confirmations) >= parseInt(required) ? 'Confirmado' : `~${(parseInt(required) - parseInt(confirmations)) * 10} min`,
        timestamp: new Date().toISOString()
    };
    
    const sent = webSocketService.sendDepositProgress(walletAddress, progressData);
    
    res.json({
        success: true,
        message: 'Deposit progress notification sent (DEMO)',
        sent,
        progressData
    });
});

app.get('/api/websocket/connection-info', (req, res) => {
    res.json({
        success: true,
        websocket: {
            url: `ws://${req.get('host')}/ws`,
            path: '/ws',
            status: 'available',
            demo_mode: true
        },
        authentication: {
            required: true,
            demo_wallet: 'bc1qdemotestaddress',
            demo_message: {
                type: 'authenticate',
                walletAddress: 'bc1qdemotestaddress',
                signature: 'demo_signature',
                timestamp: Date.now()
            }
        },
        channels: ['deposits', 'withdrawals', 'balance', 'general'],
        notification_types: [
            'deposit_progress',
            'deposit_complete', 
            'balance_update',
            'test_notification'
        ]
    });
});

// Catch all route for frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message
    });
});

// Start server with WebSocket support
server.listen(PORT, () => {
    console.log('');
    console.log('🚀 MoonYetis Test Server Started!');
    console.log('');
    console.log(`✅ Server running on: http://localhost:${PORT}`);
    console.log(`📱 Frontend available at: http://localhost:${PORT}`);
    console.log(`🧪 Test suite available at: http://localhost:${PORT}/test-advanced-wallet.html`);
    console.log('');
    console.log('🎯 Available Test Endpoints:');
    console.log('   📊 Core:');
    console.log('     • GET  /api/health');
    console.log('     • POST /api/wallet/connect');
    console.log('     • GET  /api/wallet/status');
    console.log('   📜 Transactions:');
    console.log('     • GET  /api/transactions/history');
    console.log('     • GET  /api/transactions/history/export');
    console.log('   🏦 Deposit Monitoring:');
    console.log('     • POST /api/transactions/deposits/start-monitoring');
    console.log('     • POST /api/transactions/deposits/stop-monitoring');
    console.log('     • GET  /api/transactions/deposits/monitoring-status');
    console.log('     • GET  /api/transactions/deposits/check-balance');
    console.log('     • GET  /api/transactions/deposits/brc20-history');
    console.log('     • POST /api/transactions/deposits/generate-address');
    console.log('   📈 Progressive Confirmations:');
    console.log('     • GET  /api/transactions/deposits/pending-confirmations');
    console.log('     • GET  /api/transactions/deposits/confirmation-status/:txid');
    console.log('     • POST /api/transactions/deposits/simulate-confirmation/:txid');
    console.log('   🔌 WebSocket Notifications:');
    console.log('     • WebSocket: ws://localhost:' + PORT + '/ws');
    console.log('     • GET  /api/websocket/stats');
    console.log('     • GET  /api/websocket/connection-info');
    console.log('     • POST /api/websocket/test-notification');
    console.log('     • POST /api/websocket/test-deposit-progress');
    console.log('   💸 Withdrawals:');
    console.log('     • POST /api/transactions/withdrawals/calculate-fee');
    console.log('     • POST /api/transactions/withdrawals/submit');
    console.log('     • GET  /api/transactions/withdrawals/history');
    console.log('');
    console.log('🎮 Ready for Advanced Wallet Testing!');
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🔄 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🔄 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});