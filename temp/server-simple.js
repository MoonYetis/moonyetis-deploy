// MoonYetis Slots - Servidor Simplificado para Despliegue Rápido
const express = require('express');
const path = require('path');
const { BLOCKCHAIN_CONFIG, BLOCKCHAIN_UTILS } = require('./config/blockchain');

console.log('🚀 Iniciando MoonYetis Slots Ultra-Accessible Casino...');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware básico
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Headers de seguridad básicos
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// CORS básico
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Logging básico
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
    next();
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'frontend'), {
    maxAge: NODE_ENV === 'production' ? '1d' : '0'
}));

// API de configuración
app.get('/api/config', (req, res) => {
    const config = {
        success: true,
        timestamp: new Date().toISOString(),
        version: '2.1.0-simple',
        environment: NODE_ENV,
        config: {
            network: {
                name: BLOCKCHAIN_CONFIG.FRACTAL_NETWORK.name,
                chainId: BLOCKCHAIN_CONFIG.FRACTAL_NETWORK.chainId,
                networkType: BLOCKCHAIN_CONFIG.FRACTAL_NETWORK.networkType,
                explorerUrl: BLOCKCHAIN_CONFIG.FRACTAL_NETWORK.explorerUrl
            },
            token: {
                ticker: BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.ticker,
                decimals: BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.decimals,
                minDeposit: BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.minDeposit,
                maxDeposit: BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.maxDeposit,
                usdRate: BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.usdRate
            },
            game: {
                rtp: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.rtp,
                minBet: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.minBet,
                maxBet: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.maxBet,
                maxTotalBet: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.maxTotalBet,
                defaultBet: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.defaultBet,
                popularBets: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.popularBets
            },
            ultraAccessible: {
                minBetUSD: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.minBet * BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.usdRate,
                maxBetUSD: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.maxBet * BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.usdRate,
                defaultBetUSD: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.defaultBet * BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.usdRate,
                isSubCentGambling: (BLOCKCHAIN_CONFIG.GAME_ECONOMICS.minBet * BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.usdRate) < 0.01,
                popularBetsFormatted: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.popularBets.map(bet => ({
                    amount: bet,
                    formatted: BLOCKCHAIN_UTILS.formatTokenAmount(bet),
                    usd: BLOCKCHAIN_UTILS.formatUSDEquivalent(bet),
                    usdValue: bet * BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.usdRate
                }))
            },
            wallets: BLOCKCHAIN_CONFIG.SUPPORTED_WALLETS
        }
    };
    
    res.json(config);
});

// Health check
app.get('/health', (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.1.0-simple',
        environment: NODE_ENV,
        services: {
            frontend: 'operational',
            blockchain: 'ready',
            gambling: 'ultra-accessible'
        },
        limits: {
            minBet: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.minBet,
            maxBet: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.maxBet,
            minBetUSD: (BLOCKCHAIN_CONFIG.GAME_ECONOMICS.minBet * BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.usdRate).toFixed(4)
        }
    };
    
    res.json(health);
});

// API simulada de blockchain (para pruebas)
app.post('/api/blockchain/connect', (req, res) => {
    res.json({
        success: true,
        message: 'Wallet conectada (simulación)',
        walletAddress: 'bc1p_simulation_wallet_address',
        network: 'fractal-mainnet',
        balance: '1000000000' // 1B MOONYETIS
    });
});

app.post('/api/blockchain/deposit', (req, res) => {
    const { amount } = req.body;
    res.json({
        success: true,
        message: 'Depósito simulado',
        amount: amount,
        transactionHash: 'tx_' + Date.now(),
        confirmations: 3
    });
});

app.post('/api/blockchain/withdraw', (req, res) => {
    const { amount, address } = req.body;
    res.json({
        success: true,
        message: 'Retiro procesado (simulación)',
        amount: amount,
        address: address,
        transactionHash: 'tx_' + Date.now()
    });
});

// API de juego simplificada
app.post('/api/game/spin', (req, res) => {
    const { betAmount, activeLines = 1 } = req.body;
    
    // Validar apuesta
    if (!BLOCKCHAIN_UTILS.isValidBet(betAmount, activeLines)) {
        return res.status(400).json({
            success: false,
            error: 'Apuesta inválida',
            limits: {
                min: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.minBet,
                max: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.maxBet
            }
        });
    }
    
    // Generar resultados usando Provably Fair
    const serverSeed = BLOCKCHAIN_CONFIG.PROVABLY_FAIR.generateServerSeed();
    const clientSeed = 'client_seed_' + Date.now();
    const nonce = Math.floor(Math.random() * 1000000);
    const gameHash = BLOCKCHAIN_CONFIG.PROVABLY_FAIR.generateGameHash(serverSeed, clientSeed, nonce);
    const slotResults = BLOCKCHAIN_CONFIG.PROVABLY_FAIR.hashToSlotResults(gameHash);
    
    // Calcular payout
    const winAmount = BLOCKCHAIN_UTILS.calculatePayout(betAmount, slotResults);
    
    // Formatear resultados para display
    const grid = [];
    for (let row = 0; row < 3; row++) {
        grid[row] = slotResults.slice(row * 5, (row + 1) * 5);
    }
    
    const symbols = ['🍒', '🍋', '🍎', '🍇', '🍉', '🔔', '⭐', '7️⃣', '💎'];
    const displayGrid = grid.map(row => 
        row.map(symbolIndex => symbols[symbolIndex])
    );
    
    res.json({
        success: true,
        spin: {
            betAmount: betAmount,
            winAmount: winAmount,
            activeLines: activeLines,
            results: displayGrid,
            multiplier: winAmount > 0 ? (winAmount / betAmount).toFixed(2) : '0.00',
            isWin: winAmount > 0,
            timestamp: new Date().toISOString()
        },
        provablyFair: {
            serverSeed: serverSeed.substring(0, 8) + '...',
            clientSeed: clientSeed,
            nonce: nonce,
            gameHash: gameHash.substring(0, 16) + '...'
        },
        formatted: {
            bet: BLOCKCHAIN_UTILS.formatTokenAmount(betAmount) + BLOCKCHAIN_UTILS.formatUSDEquivalent(betAmount),
            win: BLOCKCHAIN_UTILS.formatTokenAmount(winAmount) + BLOCKCHAIN_UTILS.formatUSDEquivalent(winAmount)
        }
    });
});

// Métricas básicas
app.get('/metrics', (req, res) => {
    res.json({
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        gambling: {
            ultraAccessible: true,
            minBetCents: (BLOCKCHAIN_CONFIG.GAME_ECONOMICS.minBet * BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.usdRate * 100).toFixed(2),
            maxBetDollars: (BLOCKCHAIN_CONFIG.GAME_ECONOMICS.maxBet * BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.usdRate).toFixed(2)
        }
    });
});

// Leaderboard simulado
app.get('/api/leaderboard', (req, res) => {
    const mockLeaderboard = [
        { rank: 1, wallet: 'bc1p_whale_1', totalWon: 50000000, gamesPlayed: 1247 },
        { rank: 2, wallet: 'bc1p_whale_2', totalWon: 35000000, gamesPlayed: 892 },
        { rank: 3, wallet: 'bc1p_whale_3', totalWon: 28000000, gamesPlayed: 654 }
    ].map(player => ({
        ...player,
        totalWonFormatted: BLOCKCHAIN_UTILS.formatTokenAmount(player.totalWon) + BLOCKCHAIN_UTILS.formatUSDEquivalent(player.totalWon)
    }));
    
    res.json({
        success: true,
        leaderboard: mockLeaderboard,
        timestamp: new Date().toISOString()
    });
});

// Catch-all para SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(500).json({
        error: NODE_ENV === 'production' ? 'Error interno' : err.message,
        timestamp: new Date().toISOString()
    });
});

// Iniciar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('🎰 ============================================');
    console.log('🌙 MOONYETIS SLOTS ULTRA-ACCESSIBLE CASINO');
    console.log('🎰 ============================================');
    console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
    console.log(`🌍 Entorno: ${NODE_ENV}`);
    console.log(`💰 Apuesta mínima: $${(BLOCKCHAIN_CONFIG.GAME_ECONOMICS.minBet * BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.usdRate).toFixed(4)}`);
    console.log(`💎 Apuesta máxima: $${(BLOCKCHAIN_CONFIG.GAME_ECONOMICS.maxBet * BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.usdRate).toFixed(2)}`);
    console.log(`🎯 Ultra-Accessible: ${(BLOCKCHAIN_CONFIG.GAME_ECONOMICS.minBet * BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.usdRate) < 0.01 ? 'SÍ' : 'NO'}`);
    console.log('🎰 ============================================');
    console.log('');
    console.log(`🌐 Aplicación: http://localhost:${PORT}`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    console.log(`⚙️ Configuración: http://localhost:${PORT}/api/config`);
    console.log(`📊 Métricas: http://localhost:${PORT}/metrics`);
    console.log(`🏆 Leaderboard: http://localhost:${PORT}/api/leaderboard`);
    console.log('');
    console.log('🎮 Características:');
    console.log('   • Gambling desde $0.001 USD');
    console.log('   • Provably Fair Gaming');
    console.log('   • 6 botones ultra-accesibles');
    console.log('   • Formateo optimizado para micro-cantidades');
    console.log('   • Simulación completa de wallet/blockchain');
    console.log('');
    console.log('✨ ¡Casino Ultra-Accessible desplegado exitosamente!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🔄 Cerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor cerrado');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🔄 Cerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor cerrado');
        process.exit(0);
    });
});

module.exports = app;