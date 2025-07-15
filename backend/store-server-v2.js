const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

// Import services
const PriceService = require('./services/price-service');
const TransactionMonitor = require('./services/transaction-monitor');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize services
const priceService = new PriceService(process.env.UNISAT_API_KEY || 'fc77d31a8981cb27425b73f93d2d2354c81d2e3c429137bbfc19d55d7a0dfe12');
const paymentAddress = process.env.PAYMENT_ADDRESS || 'bc1pnhnqmuhx9xtqd8naa9wa60ur2n5fv9emjpcethzdwn8kzkx4gv4sf7xkr5';
const transactionMonitor = new TransactionMonitor(process.env.UNISAT_API_KEY || 'fc77d31a8981cb27425b73f93d2d2354c81d2e3c429137bbfc19d55d7a0dfe12', paymentAddress);

// Store configuration
const STORE_CONFIG = {
    packs: [
        {
            id: 'pack1',
            name: 'Starter Pack',
            mooncoins: 300,
            usdPrice: 3.00
        },
        {
            id: 'pack2',
            name: 'Player Pack',
            mooncoins: 600,
            usdPrice: 6.00
        },
        {
            id: 'pack3',
            name: 'Pro Pack',
            mooncoins: 1200,
            usdPrice: 12.00
        }
    ],
    paymentMethods: {
        fb: {
            name: 'Fractal Bitcoin',
            bonus: 0,
            address: paymentAddress
        },
        my: {
            name: 'MoonYetis BRC-20',
            bonus: 3, // 3% bonus
            address: paymentAddress
        }
    }
};

// In-memory storage for orders and balances
const orders = new Map();
const userBalances = new Map();
const processedTransactions = new Set(); // Prevent duplicate processing

// Webhook authentication middleware
function authenticateWebhook(req, res, next) {
    const signature = req.headers['x-webhook-signature'];
    const secret = process.env.WEBHOOK_SECRET || 'default-webhook-secret';
    
    if (!signature) {
        return res.status(401).json({ error: 'Missing webhook signature' });
    }
    
    // Create HMAC signature
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');
    
    if (signature !== expectedSignature) {
        console.warn('⚠️ Invalid webhook signature attempt');
        return res.status(401).json({ error: 'Invalid signature' });
    }
    
    next();
}

// Start services
priceService.startPriceUpdates(parseInt(process.env.PRICE_UPDATE_INTERVAL) || 60000);
transactionMonitor.startMonitoring(parseInt(process.env.TRANSACTION_CHECK_INTERVAL) || 30000);

// Listen for confirmed transactions
transactionMonitor.on('transaction-confirmed', async (txData) => {
    console.log('💰 Transaction confirmed:', txData);
    
    // Find matching order
    for (const [orderId, order] of orders.entries()) {
        if (order.status === 'pending' && 
            Math.abs(parseFloat(order.amount) - txData.amount) < 0.00001) {
            // Process the order
            await processOrderPayment(orderId, txData.txid);
            break;
        }
    }
});

// Process order payment
async function processOrderPayment(orderId, txHash) {
    const order = orders.get(orderId);
    
    if (!order || order.status !== 'pending') {
        return false;
    }
    
    // Prevent duplicate processing
    if (processedTransactions.has(txHash)) {
        console.warn(`⚠️ Transaction ${txHash} already processed`);
        return false;
    }
    
    // Mark transaction as processed
    processedTransactions.add(txHash);
    
    // Update order status
    order.status = 'completed';
    order.transactionId = txHash;
    order.completedAt = new Date().toISOString();
    
    // Update user balance
    const currentBalance = userBalances.get(order.userWallet) || 0;
    const newBalance = currentBalance + order.mooncoins;
    userBalances.set(order.userWallet, newBalance);
    
    console.log(`✅ Order ${orderId} completed`);
    console.log(`💰 User ${order.userWallet} balance: ${currentBalance} -> ${newBalance}`);
    
    return true;
}

// API Endpoints

// Get current prices
app.get('/api/store/prices', (req, res) => {
    const prices = priceService.getCurrentPrices();
    res.json({
        success: true,
        prices: {
            fb: prices.fb,
            my: prices.my
        },
        timestamp: new Date().toISOString()
    });
});

// Get store products
app.get('/api/store/products', (req, res) => {
    const prices = priceService.getCurrentPrices();
    
    const products = STORE_CONFIG.packs.map(pack => {
        return {
            ...pack,
            prices: {
                fb: priceService.calculateTokenAmount(pack.usdPrice, 'fb'),
                my: priceService.calculateTokenAmount(pack.usdPrice, 'my'),
                myBonus: Math.floor(pack.mooncoins * 0.03)
            }
        };
    });

    res.json({
        success: true,
        products,
        paymentMethods: Object.entries(STORE_CONFIG.paymentMethods).map(([id, method]) => ({
            id,
            ...method
        }))
    });
});

// Create purchase order
app.post('/api/store/purchase', (req, res) => {
    try {
        const { packId, paymentMethod, userWallet, expectedCoins } = req.body;
        const walletHeader = req.headers['x-wallet-address'];

        console.log('🛒 Purchase request:', { packId, paymentMethod, userWallet });

        // Validate wallet
        if (!userWallet || userWallet !== walletHeader) {
            return res.status(400).json({
                success: false,
                error: 'Invalid wallet address'
            });
        }

        // Validate pack
        const pack = STORE_CONFIG.packs.find(p => p.id === packId);
        if (!pack) {
            return res.status(400).json({
                success: false,
                error: 'Invalid pack selected'
            });
        }

        // Validate payment method
        if (!STORE_CONFIG.paymentMethods[paymentMethod]) {
            return res.status(400).json({
                success: false,
                error: 'Invalid payment method'
            });
        }

        // Calculate payment amount using real prices
        const method = STORE_CONFIG.paymentMethods[paymentMethod];
        const price = priceService.calculateTokenAmount(pack.usdPrice, paymentMethod);

        // Create order
        const orderId = crypto.randomBytes(16).toString('hex');
        const order = {
            orderId,
            userWallet,
            packId,
            packName: pack.name,
            paymentMethod,
            amount: price,
            currency: paymentMethod.toUpperCase(),
            mooncoins: pack.mooncoins + Math.floor(pack.mooncoins * method.bonus / 100),
            status: 'pending',
            paymentAddress: method.address,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
        };

        orders.set(orderId, order);

        console.log('📋 Order created:', orderId);

        res.json({
            success: true,
            orderId,
            amount: price,
            currency: paymentMethod.toUpperCase(),
            address: method.address,
            expectedCoins: order.mooncoins,
            expiresAt: order.expiresAt
        });

    } catch (error) {
        console.error('❌ Error creating order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create order'
        });
    }
});

// Get order status
app.get('/api/store/order/:orderId', (req, res) => {
    const { orderId } = req.params;
    const order = orders.get(orderId);

    if (!order) {
        return res.status(404).json({
            success: false,
            error: 'Order not found'
        });
    }

    // Check if order is expired
    if (new Date(order.expiresAt) < new Date() && order.status === 'pending') {
        order.status = 'expired';
    }

    res.json({
        success: true,
        ...order
    });
});

// Manual payment confirmation webhook (with authentication)
app.post('/api/store/confirm-payment', authenticateWebhook, async (req, res) => {
    try {
        const { orderId, txHash } = req.body;
        
        if (!orderId || !txHash) {
            return res.status(400).json({
                success: false,
                error: 'Missing orderId or txHash'
            });
        }

        const success = await processOrderPayment(orderId, txHash);
        
        if (success) {
            const order = orders.get(orderId);
            res.json({
                success: true,
                orderId,
                mooncoins: order.mooncoins,
                newBalance: userBalances.get(order.userWallet)
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Failed to process payment'
            });
        }

    } catch (error) {
        console.error('❌ Error confirming payment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to confirm payment'
        });
    }
});

// Verify transaction for order
app.post('/api/store/verify-transaction', async (req, res) => {
    try {
        const { orderId, txHash } = req.body;
        const order = orders.get(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        const verification = await transactionMonitor.verifyOrderTransaction(
            orderId,
            txHash,
            order.amount
        );

        if (verification.valid && verification.confirmed) {
            // Process the payment
            await processOrderPayment(orderId, txHash);
        }

        res.json({
            success: true,
            ...verification
        });

    } catch (error) {
        console.error('❌ Error verifying transaction:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify transaction'
        });
    }
});

// Get user balance
app.get('/api/store/balance/:userWallet', (req, res) => {
    const { userWallet } = req.params;
    const balance = userBalances.get(userWallet) || 0;

    res.json({
        success: true,
        userWallet,
        balance,
        currency: 'MoonCoins'
    });
});

// Get user transaction history
app.get('/api/store/transactions/:userWallet', (req, res) => {
    const { userWallet } = req.params;
    const userOrders = Array.from(orders.values())
        .filter(order => order.userWallet === userWallet)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
        success: true,
        transactions: userOrders
    });
});

// Get market statistics
app.get('/api/store/market-stats', async (req, res) => {
    try {
        const stats = await priceService.getMarketStats();
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get market stats'
        });
    }
});

// Transaction monitor status
app.get('/api/store/monitor-status', (req, res) => {
    const status = transactionMonitor.getStatus();
    res.json({
        success: true,
        ...status
    });
});

// Admin endpoint to manually credit MoonCoins (for testing)
app.post('/api/store/admin/credit', (req, res) => {
    const { userWallet, amount, reason } = req.body;
    const adminKey = req.headers['x-admin-key'];

    // Simple admin authentication
    if (adminKey !== process.env.ADMIN_KEY && adminKey !== 'moonyetis-admin-key-2024') {
        return res.status(403).json({
            success: false,
            error: 'Unauthorized'
        });
    }

    const currentBalance = userBalances.get(userWallet) || 0;
    const newBalance = currentBalance + amount;
    userBalances.set(userWallet, newBalance);

    console.log(`🎁 Admin credit: ${amount} MoonCoins to ${userWallet} (${reason})`);

    res.json({
        success: true,
        userWallet,
        creditedAmount: amount,
        newBalance,
        reason
    });
});

// Health check endpoint
app.get('/api/store/health', (req, res) => {
    const prices = priceService.getCurrentPrices();
    const monitorStatus = transactionMonitor.getStatus();
    
    res.json({
        success: true,
        status: 'Store API is running',
        activeOrders: orders.size,
        registeredUsers: userBalances.size,
        currentPrices: prices,
        transactionMonitor: monitorStatus.monitoring ? 'active' : 'inactive',
        timestamp: new Date().toISOString()
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📛 SIGTERM received, shutting down gracefully...');
    priceService.stopPriceUpdates();
    transactionMonitor.stopMonitoring();
    process.exit(0);
});

const PORT = process.env.STORE_PORT || 3002;
app.listen(PORT, () => {
    console.log(`🏪 MoonYetis Store Server V2 running on port ${PORT}`);
    console.log('🔐 Payment address:', paymentAddress);
    console.log('💱 Price service: Active');
    console.log('🔍 Transaction monitor: Active');
});