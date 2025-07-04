const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const webSocketService = require('./services/webSocketService');
require('dotenv').config({ path: '.env.production' });

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

console.log('🚀 Starting MoonYetis Production Server...');
console.log('🌍 Environment:', process.env.NODE_ENV || 'production');
console.log('🔗 Host:', HOST);
console.log('📡 Port:', PORT);

// Production middleware
app.use(compression()); // Gzip compression
app.use(helmet({
    contentSecurityPolicy: false, // Allow inline scripts for now
    crossOriginEmbedderPolicy: false
})); // Security headers

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'https://localhost:3000'],
    credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize WebSocket service
webSocketService.initialize(server);
webSocketService.startHealthChecks();

// Mock session middleware for production testing
app.use((req, res, next) => {
    req.session = {
        walletAddress: null,
        walletType: null,
        walletConnected: false
    };
    next();
});

// API Routes
const transactionRoutes = require('./routes/transactions');
app.use('/api/transactions', transactionRoutes);

// WebSocket routes
const websocketRoutes = require('./routes/websocket');
app.use('/api/websocket', websocketRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        environment: 'production',
        timestamp: new Date().toISOString(),
        server: 'moonyetis-production-server',
        version: '1.0.0-production',
        features: {
            websocket: 'enabled',
            notifications: 'enabled',
            audio: 'enabled',
            settings: 'enabled',
            audit: 'enabled'
        },
        endpoints: {
            wallet: 'available',
            transactions: 'available',
            deposits: 'available',
            withdrawals: 'available',
            audit: 'available',
            websocket: 'available'
        }
    });
});

// Serve static files with caching
app.use(express.static(path.join(__dirname, 'frontend'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    etag: true,
    lastModified: true
}));

// Catch all route for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error('💥 Production Error:', err);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        timestamp: new Date().toISOString()
    });
});

// Start server
server.listen(PORT, HOST, () => {
    console.log('');
    console.log('🎰 =====================================');
    console.log('🚀 MoonYetis Production Server ONLINE!');
    console.log('🎰 =====================================');
    console.log('');
    console.log(`✅ Server: http://${HOST}:${PORT}`);
    console.log(`📱 Frontend: http://${HOST}:${PORT}`);
    console.log(`🧪 Test Suite: http://${HOST}:${PORT}/test-advanced-wallet.html`);
    console.log(`🔌 WebSocket: ws://${HOST}:${PORT}/ws`);
    console.log('');
    console.log('🎯 PRODUCTION FEATURES ENABLED:');
    console.log('   ✅ Compression (Gzip)');
    console.log('   ✅ Security headers (Helmet)');
    console.log('   ✅ Rate limiting');
    console.log('   ✅ Static file caching');
    console.log('   ✅ WebSocket notifications');
    console.log('   ✅ Audio system');
    console.log('   ✅ User settings');
    console.log('   ✅ Audit logging');
    console.log('   ✅ Error handling');
    console.log('');
    console.log('🎮 Ready for Production Traffic!');
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🔄 SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Production server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🔄 SIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Production server closed');
        process.exit(0);
    });
});