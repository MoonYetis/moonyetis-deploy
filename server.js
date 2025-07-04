const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const WebSocket = require('ws');
const http = require('http');
require('dotenv').config();

// Import blockchain modules
const blockchainRoutes = require('./routes/blockchain');
const leaderboardRoutes = require('./routes/leaderboard');
const monitoringRoutes = require('./routes/monitoring');
const database = require('./config/database');
const fractalBitcoinService = require('./services/fractalBitcoinService');
const depositMonitorService = require('./services/depositMonitorService');
const withdrawalService = require('./services/withdrawalService');
const monitoringService = require('./services/monitoringService');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Session configuration for blockchain features
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'moonyetis-blockchain-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
};

if (process.env.NODE_ENV === 'production') {
    sessionConfig.cookie.sameSite = 'strict';
    sessionConfig.cookie.domain = process.env.DOMAIN;
}

// WebSocket server
const wss = new WebSocket.Server({ server });

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"]
        }
    }
}));

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session(sessionConfig));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests' }
});
app.use('/api/', limiter);

// Serve frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// Enhanced WebSocket handling for blockchain features
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

// Database middleware - make db available to routes
app.use((req, res, next) => {
    req.app.locals.db = database;
    next();
});

// API Routes
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.get('/api/health', async (req, res) => {
    const dbHealth = await database.healthCheck();
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        environment: process.env.NODE_ENV,
        websockets: { connected: wss.clients.size },
        database: dbHealth,
        blockchain: {
            enabled: true,
            network: 'Fractal Bitcoin',
            features: ['deposits', 'withdrawals', 'provably-fair', 'real-gambling']
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

// 404 handler
app.use('*', (req, res) => {
    if (req.originalUrl.startsWith('/api/')) {
        res.status(404).json({ error: 'API route not found' });
    } else {
        res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
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
    
    server.close(() => {
        console.log('HTTP server closed');
        console.log('🎰 MoonYetis server shutdown complete');
        process.exit(0);
    });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Initialize server
server.listen(PORT, () => {
    console.log('\x1b[36m%s\x1b[0m', '🎰 ============================================');
    console.log('\x1b[32m%s\x1b[0m', '🚀 MoonYetis Blockchain Slots API Started!');
    console.log('\x1b[36m%s\x1b[0m', '🎰 ============================================');
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
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
});

module.exports = { app, server, wss };
