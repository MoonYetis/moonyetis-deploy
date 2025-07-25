const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const config = require('./config');

// Import services
const PriceService = require('./services/price-service');
const TransactionMonitor = require('./services/transaction-monitor');
const HDWalletService = require('./services/hd-wallet-service');

// Import authentication and database
const MoonYetisDatabase = require('./database');
const AuthManager = require('./auth');
const ReferralManager = require('./referrals');

const app = express();

// Configure CORS for development
const corsOptions = {
    origin: config.corsOrigins,
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Initialize services using config
const priceService = new PriceService(config.unisatApiKey);

// Initialize authentication system
const database = new MoonYetisDatabase();
const authManager = new AuthManager(database);
const referralManager = new ReferralManager(database, authManager);

// Initialize HD Wallet Service
let hdWalletService = null;
if (config.hdWalletSeed) {
    hdWalletService = new HDWalletService(database, config.hdWalletSeed);
    console.log('✅ HD Wallet Service initialized');
} else {
    console.error('❌ HD Wallet Service not initialized - missing seed phrase');
}

// Initialize transaction monitor with HD wallet service
const transactionMonitor = new TransactionMonitor(
    config.unisatApiKey, 
    config.paymentAddress,
    hdWalletService,
    database
);

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
            address: config.paymentAddress
        },
        my: {
            name: 'MoonYetis BRC-20',
            bonus: 3, // 3% bonus
            address: config.paymentAddress
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
    
    // If user is authenticated, update database balance and process referral
    if (order.userId) {
        try {
            // Add MoonCoins to authenticated user's database balance
            authManager.addMoonCoins(order.userId, order.mooncoins, `Pack purchase: ${order.packName}`);
            
            // Process referral reward if this is user's first purchase
            const referralResult = await referralManager.processReferralPurchase(order.userId, order.amount);
            if (referralResult.rewardGranted) {
                console.log(`🎁 Referral reward granted: ${referralResult.rewardAmount} MC to user ${referralResult.referrerId}`);
            }
            
            console.log(`💰 Authenticated user ${order.userId} received ${order.mooncoins} MC`);
        } catch (error) {
            console.error('❌ Error updating authenticated user balance:', error);
        }
    }
    
    console.log(`✅ Order ${orderId} completed`);
    console.log(`💰 User ${order.userWallet} balance: ${currentBalance} -> ${newBalance}`);
    
    return true;
}

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({ success: false, error: 'Access token required' });
    }
    
    const verification = authManager.verifyToken(token);
    if (!verification.success) {
        return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
    
    req.user = verification;
    next();
}

// Optional authentication middleware (allows both authenticated and guest users)
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        const verification = authManager.verifyToken(token);
        if (verification.success) {
            req.user = verification;
        }
    }
    
    next();
}

// Authentication API Endpoints

// Register new user
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password, referralCode } = req.body;
        
        const result = await authManager.register(username, email, password, referralCode);
        
        if (result.success) {
            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                userId: result.userId,
                username: result.username,
                referralCode: result.referralCode
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Registration endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
    try {
        const { usernameOrEmail, password } = req.body;
        
        const result = await authManager.login(usernameOrEmail, password);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Login successful',
                token: result.token,
                user: result.user,
                dailyReward: result.dailyReward
            });
        } else {
            res.status(401).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Login endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Get user profile
app.get('/api/auth/profile', authenticateToken, (req, res) => {
    try {
        const user = authManager.getUserById(req.user.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                mooncoinsBalance: user.mooncoins_balance,
                referralCode: user.referral_code,
                associatedWallet: user.associated_wallet,
                totalPurchased: user.total_purchased,
                createdAt: user.created_at,
                lastLogin: user.last_login
            }
        });
    } catch (error) {
        console.error('Profile endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Validate referral code
app.get('/api/auth/validate-referral/:code', (req, res) => {
    try {
        const { code } = req.params;
        const validation = referralManager.validateReferralCode(code);
        
        res.json({
            success: true,
            valid: validation.valid,
            error: validation.error || null
        });
    } catch (error) {
        console.error('Referral validation error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Get referral information
app.get('/api/auth/referrals', authenticateToken, (req, res) => {
    try {
        const referralInfo = referralManager.getUserReferralInfo(req.user.userId);
        
        if (referralInfo.success) {
            res.json({
                success: true,
                referralCode: referralInfo.referralCode,
                stats: referralInfo.stats,
                recentReferrals: referralInfo.recentReferrals
            });
        } else {
            res.status(404).json({
                success: false,
                error: referralInfo.error
            });
        }
    } catch (error) {
        console.error('Referrals endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Process daily login (can be called manually)
app.post('/api/auth/daily-login', authenticateToken, (req, res) => {
    try {
        const dailyReward = authManager.processDailyLogin(req.user.userId);
        
        res.json({
            success: true,
            dailyReward: dailyReward
        });
    } catch (error) {
        console.error('Daily login endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Wallet authentication - auto register/login with wallet address
app.post('/api/auth/wallet-login', async (req, res) => {
    try {
        const { walletAddress } = req.body;
        
        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }
        
        // Validate wallet address format (basic check)
        if (!walletAddress.startsWith('bc1') || walletAddress.length < 20) {
            return res.status(400).json({
                success: false,
                error: 'Invalid wallet address format'
            });
        }
        
        const result = await authManager.walletAuth(walletAddress);
        
        if (result.success) {
            res.json({
                success: true,
                message: result.isNewUser ? 'Wallet account created and logged in' : 'Wallet logged in successfully',
                token: result.token,
                user: result.user,
                isNewUser: result.isNewUser
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Wallet login endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// HD Wallet API Endpoints

// Get or generate deposit address for authenticated user
app.get('/api/wallet/deposit-address', authenticateToken, async (req, res) => {
    try {
        if (!hdWalletService) {
            return res.status(503).json({
                success: false,
                error: 'HD Wallet service not available'
            });
        }
        
        const depositInfo = await hdWalletService.getOrGenerateDepositAddress(req.user.userId);
        
        res.json({
            success: true,
            address: depositInfo.address,
            isNew: depositInfo.isNew,
            message: depositInfo.isNew ? 'New deposit address generated' : 'Existing deposit address returned'
        });
    } catch (error) {
        console.error('Deposit address endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get deposit address'
        });
    }
});

// Get user's deposit history
app.get('/api/wallet/deposits', authenticateToken, async (req, res) => {
    try {
        if (!hdWalletService) {
            return res.status(503).json({
                success: false,
                error: 'HD Wallet service not available'
            });
        }
        
        const limit = parseInt(req.query.limit) || 50;
        const deposits = await hdWalletService.getUserDeposits(req.user.userId, limit);
        
        res.json({
            success: true,
            deposits: deposits,
            count: deposits.length
        });
    } catch (error) {
        console.error('Deposits history endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get deposit history'
        });
    }
});

// Get user's FB and MY balances
app.get('/api/wallet/balances', authenticateToken, (req, res) => {
    try {
        const user = authManager.getUserById(req.user.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        res.json({
            success: true,
            balances: {
                mooncoins: user.mooncoins_balance || 0,
                fb: user.fb_balance || '0',
                my: user.my_balance || '0'
            }
        });
    } catch (error) {
        console.error('Balances endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get balances'
        });
    }
});

// Store API Endpoints

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
app.post('/api/store/purchase', optionalAuth, (req, res) => {
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
            userId: req.user ? req.user.userId : null, // Include user ID if authenticated
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

// === ECOSYSTEM PRODUCT MANAGEMENT ===

// Get available products
app.get('/api/ecosystem/products', (req, res) => {
    const products = [
        {
            id: 'slots',
            name: 'MoonYetis Slots',
            status: 'live',
            icon: '🎰',
            description: 'Classic slot machine with MoonYetis and Fractal Bitcoin rewards',
            category: 'casino',
            minBet: 10000,
            maxBet: 2500000,
            currency: 'MY',
            features: ['Progressive Jackpot', 'Free Spins', 'Wild Symbols', 'Scatter Rewards'],
            launchDate: '2024-12-01',
            lastUpdate: new Date().toISOString()
        },
        {
            id: 'lottery',
            name: 'MoonYetis Lottery',
            status: 'coming_soon',
            icon: '🎟️',
            description: 'Daily and weekly lotteries with accumulative prizes in MY tokens',
            category: 'lottery',
            estimatedLaunch: 'Q2 2025',
            features: ['Daily Draws', 'Weekly Jackpots', 'Transparent Results', 'MY Token Prizes'],
            lastUpdate: new Date().toISOString()
        },
        {
            id: 'faucet',
            name: 'MoonYetis Faucet',
            status: 'coming_soon',
            icon: '💧',
            description: 'Free MY tokens every 24 hours with anti-bot verification',
            category: 'utility',
            estimatedLaunch: 'Q3 2025',
            features: ['Daily Claims', 'Anti-Bot Protection', 'Activity Bonuses', 'Free MY Tokens'],
            lastUpdate: new Date().toISOString()
        },
        {
            id: 'charity',
            name: 'MoonYetis Charity',
            status: 'coming_soon',
            icon: '❤️',
            description: 'Donate to verified charitable causes with full blockchain transparency',
            category: 'charity',
            estimatedLaunch: 'Q4 2025',
            features: ['Verified Causes', 'Blockchain Transparency', 'Matching Donations', 'Impact Tracking'],
            lastUpdate: new Date().toISOString()
        }
    ];
    
    res.json({
        success: true,
        products: products,
        totalProducts: products.length,
        liveProducts: products.filter(p => p.status === 'live').length,
        timestamp: new Date().toISOString()
    });
});

// Get specific product details
app.get('/api/ecosystem/products/:productId', (req, res) => {
    const { productId } = req.params;
    
    // For now, only slots has detailed stats
    if (productId === 'slots') {
        res.json({
            success: true,
            product: {
                id: 'slots',
                name: 'MoonYetis Slots',
                status: 'live',
                stats: {
                    totalPlayers: userBalances.size,
                    totalWagered: 50000000, // Mock data
                    bigWins: 1250, // Mock data
                    jackpotAmount: 1000000, // Mock data
                    activeNow: 45 // Mock data
                },
                recentActivity: [
                    { player: 'CryptoKing', amount: 2450000, time: '2 min ago' },
                    { player: 'MoonWhale', amount: 1890000, time: '5 min ago' },
                    { player: 'YetiHunter', amount: 1250000, time: '8 min ago' }
                ]
            },
            timestamp: new Date().toISOString()
        });
    } else {
        res.json({
            success: false,
            error: 'Product not found or not available yet',
            availableProducts: ['slots']
        });
    }
});

// Get ecosystem stats
app.get('/api/ecosystem/stats', (req, res) => {
    const stats = {
        totalUsers: userBalances.size,
        totalProducts: 4,
        liveProducts: 1,
        totalTransactions: processedTransactions.size,
        totalVolume: 50000000, // Mock data
        averageSession: '25 min', // Mock data
        topCountries: ['US', 'Canada', 'UK', 'Germany', 'Japan']
    };
    
    res.json({
        success: true,
        stats: stats,
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

app.listen(config.port, () => {
    console.log(`🏪 MoonYetis Store Server V2 running on port ${config.port}`);
    console.log('🔐 Payment address:', config.paymentAddress);
    console.log('💱 Price service: Active');
    console.log('🔍 Transaction monitor: Active');
    
    // Log configuration
    config.logConfig();
});