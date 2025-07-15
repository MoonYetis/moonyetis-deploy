const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

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
            address: 'bc1pnhnqmuhx9xtqd8naa9wa60ur2n5fv9emjpcethzdwn8kzkx4gv4sf7xkr5'
        },
        my: {
            name: 'MoonYetis BRC-20',
            bonus: 3, // 3% bonus
            address: 'bc1pnhnqmuhx9xtqd8naa9wa60ur2n5fv9emjpcethzdwn8kzkx4gv4sf7xkr5'
        }
    }
};

// In-memory storage for orders and balances
const orders = new Map();
const userBalances = new Map();

// Simulated price feed - In production, this would fetch from an API
let currentPrices = {
    fb: 50000, // 1 FB = $50,000 USD (example)
    my: 0.10   // 1 MY = $0.10 USD (example)
};

// Update prices periodically (simulate price feed)
function updatePrices() {
    // Simulate price fluctuation (±5%)
    currentPrices.fb = currentPrices.fb * (0.95 + Math.random() * 0.1);
    currentPrices.my = currentPrices.my * (0.95 + Math.random() * 0.1);
    console.log('💱 Updated prices:', currentPrices);
}

// Update prices every minute
setInterval(updatePrices, 60000);

// Get current prices
app.get('/api/store/prices', (req, res) => {
    res.json({
        success: true,
        prices: {
            fb: currentPrices.fb,
            my: currentPrices.my
        },
        timestamp: new Date().toISOString()
    });
});

// Get store products
app.get('/api/store/products', (req, res) => {
    const products = STORE_CONFIG.packs.map(pack => {
        return {
            ...pack,
            prices: {
                fb: (pack.usdPrice / currentPrices.fb).toFixed(8),
                my: (pack.usdPrice / currentPrices.my).toFixed(2),
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

        // Calculate payment amount
        const method = STORE_CONFIG.paymentMethods[paymentMethod];
        const price = paymentMethod === 'fb' 
            ? (pack.usdPrice / currentPrices.fb).toFixed(8)
            : (pack.usdPrice / currentPrices.my).toFixed(2);

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

// Simulate payment confirmation (webhook endpoint)
app.post('/api/store/confirm-payment', (req, res) => {
    try {
        const { orderId, txHash } = req.body;
        const order = orders.get(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        if (order.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: 'Order already processed'
            });
        }

        // Update order status
        order.status = 'completed';
        order.transactionId = txHash;
        order.completedAt = new Date().toISOString();

        // Update user balance
        const currentBalance = userBalances.get(order.userWallet) || 0;
        const newBalance = currentBalance + order.mooncoins;
        userBalances.set(order.userWallet, newBalance);

        console.log('✅ Payment confirmed for order:', orderId);
        console.log(`💰 User ${order.userWallet} balance: ${currentBalance} -> ${newBalance}`);

        res.json({
            success: true,
            orderId,
            mooncoins: order.mooncoins,
            newBalance
        });

    } catch (error) {
        console.error('❌ Error confirming payment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to confirm payment'
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

// Admin endpoint to manually credit MoonCoins (for testing)
app.post('/api/store/admin/credit', (req, res) => {
    const { userWallet, amount, reason } = req.body;
    const adminKey = req.headers['x-admin-key'];

    // Simple admin authentication
    if (adminKey !== 'moonyetis-admin-key-2024') {
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
    res.json({
        success: true,
        status: 'Store API is running',
        activeOrders: orders.size,
        registeredUsers: userBalances.size,
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.STORE_PORT || 3002;
app.listen(PORT, () => {
    console.log(`🏪 MoonYetis Store Server running on port ${PORT}`);
    console.log('💱 Initial prices:', currentPrices);
});