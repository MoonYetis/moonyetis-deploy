const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Basic middleware (SIN helmet para evitar CSP)
app.use(cors());
app.use(express.json());

// Servir archivos estáticos SIN restricciones de seguridad
app.use(express.static(path.join(__dirname, 'frontend'), {
    setHeaders: (res, path) => {
        // Eliminar cualquier CSP restrictivo
        res.removeHeader('Content-Security-Policy');
        res.removeHeader('X-Content-Security-Policy');
        res.removeHeader('X-WebKit-CSP');
    }
}));

// API endpoints
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '1.0.0-simple',
        message: 'MoonYetis Server - NO CSP restrictions'
    });
});

app.post('/api/game/spin', (req, res) => {
    const { betAmount = 10, activeLines = 25 } = req.body;
    
    const symbols = ['🏔️', '🚀', '🌙', '🪙', '⭐', '🪐', '👽', '🛸'];
    const reels = [];
    
    for (let i = 0; i < 5; i++) {
        const reel = [];
        for (let j = 0; j < 3; j++) {
            reel.push(symbols[Math.floor(Math.random() * symbols.length)]);
        }
        reels.push(reel);
    }
    
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

// Frontend routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'simple-slot.html'));
});

app.get('/simple-slot.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'simple-slot.html'));
});

app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint not found' });
    } else {
        res.sendFile(path.join(__dirname, 'frontend', 'simple-slot.html'));
    }
});

app.listen(PORT, () => {
    console.log('🎰 MoonYetis Server - CSP Free!');
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log(`🎮 Simple Slot: http://localhost:${PORT}/simple-slot.html`);
    console.log('🔓 No CSP restrictions - JavaScript should work!');
    console.log('✅ Ready to play!');
});
