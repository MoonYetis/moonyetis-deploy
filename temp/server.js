const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const WebSocket = require('ws');
const http = require('http');
const https = require('https');
require('dotenv').config();

// Import security modules
const sslManager = require('./config/ssl');
const secureCredentials = require('./services/secureCredentialsManager');

// Import blockchain modules
const blockchainRoutes = require('./routes/blockchain');
const leaderboardRoutes = require('./routes/leaderboard');
const monitoringRoutes = require('./routes/monitoring');
const database = require('./config/database');
const fractalBitcoinService = require('./services/fractalBitcoinService');
const depositMonitorService = require('./services/depositMonitorService');
const withdrawalService = require('./services/withdrawalService');
const monitoringService = require('./services/monitoringService');

// Import Phase 2 infrastructure services
const rateLimiterService = require('./middleware/rateLimiter');
const circuitBreakerService = require('./services/circuitBreakerService');

const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// Server instances
let httpServer;
let httpsServer;
let wss;

// Initialize secure session configuration
async function initializeSessionConfig() {
    try {
        // Get session secret from secure storage
        const sessionSecret = await secureCredentials.getCredential('sessionSecret');
        
        return {
            secret: sessionSecret,
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000, // 24 hours
                sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
            },
            ...(process.env.NODE_ENV === 'production' && {
                cookie: {
                    ...this.cookie,
                    domain: process.env.DOMAIN
                }
            })
        };
    } catch (error) {
        console.warn('⚠️  Using fallback session secret');
        return {
            secret: process.env.SESSION_SECRET || 'moonyetis-blockchain-secret-key',
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000
            }
        };
    }
}

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com"],
            scriptSrcAttr: ["'unsafe-inline'"], // Permitir event handlers inline
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:", "https:"]
        }
    }
}));

app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8080',
        'http://localhost:9000'
    ],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize middleware after loading secure session config
async function initializeMiddleware() {
    const sessionConfig = await initializeSessionConfig();
    app.use(session(sessionConfig));
    
    // Add security headers
    app.use((req, res, next) => {
        const securityHeaders = sslManager.getSecurityHeaders();
        Object.entries(securityHeaders).forEach(([header, value]) => {
            res.setHeader(header, value);
        });
        next();
    });
    
    // Phase 2: Advanced rate limiting and DDoS protection
    app.use(rateLimiterService.ddosProtection());
    app.use('/api', rateLimiterService.generalLimiter());
    app.use('/api/blockchain', rateLimiterService.walletLimiter());
    app.use('/api/blockchain/deposit', rateLimiterService.transactionLimiter());
    app.use('/api/blockchain/withdraw', rateLimiterService.transactionLimiter());
    app.use('/api/game', rateLimiterService.gameLimiter());
    app.use('/api/monitoring', rateLimiterService.strictLimiter());
    
    console.log('🔒 Security middleware initialized');
    console.log('🛡️ Advanced rate limiting and DDoS protection enabled');
}

// Legacy rate limiting (keeping for backwards compatibility)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests' }
});
app.use('/api/', limiter);

// Serve frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// Enhanced WebSocket handling for blockchain features
function initializeWebSocket(server) {
    const wss = new WebSocket.Server({ server });
    
    wss.on('connection', (ws) => {
        console.log('🔗 New WebSocket connection');
        let walletAddress = null;
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'wallet_connect':
                    walletAddress = data.walletAddress;
                    ws.send(JSON.stringify({ 
                        type: 'wallet_connected', 
                        walletAddress 
                    }));
                    break;
                    
                case 'game_update':
                    // Broadcast game updates to connected clients
                    wss.clients.forEach(client => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'game_broadcast',
                                data: data.gameData
                            }));
                        }
                    });
                    break;
                    
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                    break;
                    
                default:
                    ws.send(JSON.stringify({ type: 'pong', data }));
            }
        } catch (error) {
            console.error('WebSocket error:', error);
            ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'Invalid message format' 
            }));
        }
    });
    
    ws.on('close', () => {
        console.log('🔌 WebSocket disconnected', walletAddress ? `(${walletAddress})` : '');
    });
    
    // Send welcome message with blockchain capabilities
    ws.send(JSON.stringify({
        type: 'welcome',
        features: {
            blockchain: true,
            realGambling: true,
            provablyFair: true,
            walletSupport: ['UniSat', 'OKX']
        }
    }));
    });

    return wss;
}

// Database middleware - make db available to routes
app.use((req, res, next) => {
    req.app.locals.db = database;
    next();
});

// Import new wallet and transaction routes
const walletRoutes = require('./routes/wallet');
const transactionRoutes = require('./routes/transactions');
const transactionMonitor = require('./services/transactionMonitor');
const gameTransactionHandler = require('./services/gameTransactionHandler');

// API Routes
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/transactions', transactionRoutes);
app.get('/api/health', async (req, res) => {
    const dbHealth = await database.healthCheck();
    const monitoringStats = transactionMonitor.getMonitoringStats();
    const gameStats = gameTransactionHandler.getStats();
    
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        environment: process.env.NODE_ENV,
        websockets: { connected: 0 }, // Will be updated after WebSocket initialization
        database: dbHealth,
        blockchain: {
            enabled: true,
            network: 'Fractal Bitcoin',
            features: ['deposits', 'withdrawals', 'provably-fair', 'real-gambling']
        },
        transactionMonitoring: {
            active: monitoringStats.isMonitoring,
            monitoredAddresses: monitoringStats.monitoredAddressCount,
            pendingDeposits: gameStats.pendingDepositsCount,
            registeredPlayers: gameStats.registeredPlayersCount
        },
        realWallet: {
            serviceActive: true,
            network: process.env.NODE_ENV === 'production' ? 'mainnet' : 'testnet'
        },
        uptime: process.uptime()
    });
});

app.get('/api/metrics', (req, res) => {
    res.json({
        timestamp: new Date().toISOString(),
        system: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            connections: wss.clients.size
        }
    });
});

// Demo game endpoints
app.post('/api/game/spin', (req, res) => {
    const { betAmount, activeLines } = req.body;
    
    // Simulate spin result
    const reels = [];
    const symbols = ['🏔️', '🚀', '🌙', '🪙', '⭐', '🪐', '👽', '🛸'];
    
    for (let i = 0; i < 5; i++) {
        const reel = [];
        for (let j = 0; j < 3; j++) {
            reel.push(symbols[Math.floor(Math.random() * symbols.length)]);
        }
        reels.push(reel);
    }
    
    // Simulate win (random)
    const win = Math.random() > 0.7 ? betAmount * (1 + Math.random() * 10) : 0;
    
    res.json({
        success: true,
        spin: {
            reels,
            winAmount: Math.floor(win),
            betAmount,
            activeLines,
            timestamp: new Date().toISOString()
        }
    });
});

// Frontend route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Import error handling middleware
const { 
    globalErrorHandler, 
    notFoundHandler, 
    timeoutHandler,
    errorLogger 
} = require('./middleware/errorHandler');

// Timeout middleware para todas las rutas
app.use(timeoutHandler(30000)); // 30 segundos

// 404 handler para rutas API
app.use('/api/*', notFoundHandler);

// Catch-all para frontend
app.use('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Global error handler (debe ser el último middleware)
app.use(globalErrorHandler);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    errorLogger.error('Uncaught Exception:', {
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
    });
    
    console.error('💥 Uncaught Exception! Shutting down...');
    console.error(err);
    
    // Cerrar servidor gracefully
    if (httpServer) {
        httpServer.close(() => {
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
    
    // Forzar salida después de 5 segundos
    setTimeout(() => {
        process.exit(1);
    }, 5000);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    errorLogger.error('Unhandled Rejection:', {
        reason: reason?.message || reason,
        stack: reason?.stack,
        promise: promise.toString(),
        timestamp: new Date().toISOString()
    });
    
    console.error('💥 Unhandled Rejection! Shutting down...');
    console.error(reason);
    
    // Cerrar servidor gracefully
    if (httpServer) {
        httpServer.close(() => {
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
    
    // Forzar salida después de 5 segundos
    setTimeout(() => {
        process.exit(1);
    }, 5000);
});

// Enhanced graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`${signal} received, shutting down gracefully...`);
    
    // Close WebSocket connections
    wss.clients.forEach(client => {
        client.send(JSON.stringify({ 
            type: 'server_shutdown', 
            message: 'Server is shutting down' 
        }));
        client.close();
    });
    
    wss.close(() => {
        console.log('WebSocket server closed');
    });
    
    // Shutdown blockchain services
    try {
        console.log('🔗 Shutting down blockchain services...');
        await depositMonitorService.shutdown();
        await withdrawalService.shutdown();
        console.log('✅ Blockchain services shutdown complete');
    } catch (error) {
        console.error('Error shutting down blockchain services:', error);
    }
    
    // Close database connections
    try {
        await database.close();
        console.log('Database connections closed');
    } catch (error) {
        console.error('Error closing database:', error);
    }
    
    if (httpServer) {
        httpServer.close(() => {
            console.log('HTTP server closed');
            if (httpsServer) {
                httpsServer.close(() => {
                    console.log('HTTPS server closed');
                    console.log('🎰 MoonYetis server shutdown complete');
                    process.exit(0);
                });
            } else {
                console.log('🎰 MoonYetis server shutdown complete');
                process.exit(0);
            }
        });
    } else {
        console.log('🎰 MoonYetis server shutdown complete');
        process.exit(0);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Initialize server with secure configurations
async function startServer() {
    try {
        console.log('🚀 Starting MoonYetis server with enhanced security...');
        
        // Initialize middleware
        await initializeMiddleware();
        
        // HTTP to HTTPS redirect in production
        if (process.env.NODE_ENV === 'production') {
            app.use((req, res, next) => {
                if (req.header('x-forwarded-proto') !== 'https') {
                    res.redirect(`https://${req.header('host')}${req.url}`);
                } else {
                    next();
                }
            });
        }
        
        // Start HTTP server
        httpServer = http.createServer(app);
        wss = initializeWebSocket(httpServer);
        
        httpServer.listen(PORT, () => {
            console.log(`🌐 HTTP Server: http://localhost:${PORT}`);
        });
        
        // Start HTTPS server
        try {
            httpsServer = await sslManager.createHTTPSServer(app);
            // Use the same WebSocket server for both HTTP and HTTPS
            
            httpsServer.listen(HTTPS_PORT, () => {
                console.log(`🔒 HTTPS Server: https://localhost:${HTTPS_PORT}`);
            });
            
            // Setup certificate monitoring
            sslManager.setupCertificateMonitoring();
            
        } catch (sslError) {
            console.warn('⚠️  HTTPS server failed to start:', sslError.message);
            console.log('🔧 Running in HTTP-only mode');
        }
        
        // Display startup information
        console.log('\x1b[36m%s\x1b[0m', '🎰 ============================================');
        console.log('\x1b[32m%s\x1b[0m', '🚀 MoonYetis Blockchain Slots API Started!');
        console.log('\x1b[36m%s\x1b[0m', '🎰 ============================================');
        console.log(`🌐 HTTP: http://localhost:${PORT}`);
        if (httpsServer) {
            console.log(`🔒 HTTPS: https://localhost:${HTTPS_PORT}`);
        }
        console.log(`📊 Health: http://localhost:${PORT}/api/health`);
        console.log(`⛓️  Blockchain API: http://localhost:${PORT}/api/blockchain`);
        console.log(`🔗 WebSocket: ws://localhost:${PORT}`);
        console.log('');
        console.log('\x1b[33m%s\x1b[0m', '🪙 Blockchain Features:');
        console.log('   • Fractal Bitcoin Integration');
        console.log('   • BRC-20 MOONYETIS Token Support');
        console.log('   • Real Money Gambling');
        console.log('   • Provably Fair Gaming');
        console.log('   • UniSat & OKX Wallet Support');
        console.log('');
        console.log('\x1b[35m%s\x1b[0m', '🎯 Available Endpoints:');
        console.log('   • POST /api/blockchain/wallet/connect');
        console.log('   • POST /api/blockchain/deposit');
        console.log('   • POST /api/blockchain/withdraw');
        console.log('   • POST /api/blockchain/game/play');
        console.log('   • GET  /api/blockchain/account/info');
        console.log('   • GET  /api/blockchain/token/validate');
        console.log('   • GET  /api/blockchain/network/status');
        console.log('   • GET  /api/blockchain/fractal/health');
        console.log('   • GET  /api/leaderboard');
        console.log('   • POST /api/leaderboard/update');
        console.log('   • GET  /api/leaderboard/player/:wallet');
        console.log('');
        console.log('\x1b[32m%s\x1b[0m', '💚 Health check completed');
        
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

// Start the server
startServer();

module.exports = { app, httpServer, httpsServer, wss };
