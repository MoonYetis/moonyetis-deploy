const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// Simple API endpoints
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '1.0.0-simple',
        message: 'MoonYetis Simple Server Running'
    });
});

app.post('/api/game/spin', (req, res) => {
    const { betAmount = 10, activeLines = 25 } = req.body;
    
    // Generate random slot results
    const symbols = ['🏔️', '🚀', '🌙', '🪙', '⭐', '🪐', '👽', '🛸'];
    const reels = [];
    
    for (let i = 0; i < 5; i++) {
        const reel = [];
        for (let j = 0; j < 3; j++) {
            reel.push(symbols[Math.floor(Math.random() * symbols.length)]);
        }
        reels.push(reel);
    }
    
    // Simple win calculation
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

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint not found' });
    } else {
        res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
    }
});

app.listen(PORT, () => {
    console.log('🎰 MoonYetis Simple Server Running!');
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log('📡 No database dependencies - ready to play!');
    console.log('🚀 Open your browser and enjoy the slot machine!');
});
