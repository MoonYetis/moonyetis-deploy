// Minimal server for testing authentication
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config');

const app = express();

// CORS configuration
app.use(cors({
    origin: config.corsOrigins,
    credentials: true
}));

app.use(bodyParser.json());

// Simple in-memory storage for testing
const users = new Map();
let userIdCounter = 1;

// Health check
app.get('/api/store/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        environment: config.environment,
        port: config.port
    });
});

// Registration endpoint
app.post('/api/auth/register', (req, res) => {
    const { username, email, password, referralCode } = req.body;
    
    console.log('🔐 Registration attempt:', { username, email, referralCode });
    
    // Validate input
    if (!username || !email || !password) {
        return res.status(400).json({ 
            error: 'Missing required fields',
            details: 'Username, email, and password are required'
        });
    }
    
    // Check if user exists
    for (const user of users.values()) {
        if (user.email === email || user.username === username) {
            return res.status(409).json({ 
                error: 'User already exists',
                details: 'Username or email is already taken'
            });
        }
    }
    
    // Create user
    const user = {
        id: userIdCounter++,
        username,
        email,
        password, // In real app, this would be hashed
        referralCode,
        mooncoins: 100, // Starting bonus
        createdAt: new Date().toISOString()
    };
    
    users.set(user.id, user);
    
    console.log('✅ User registered successfully:', user.id);
    
    res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            mooncoins: user.mooncoins,
            mooncoinsBalance: user.mooncoins  // Add consistent property name
        }
    });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
    const { email, password, usernameOrEmail } = req.body;
    
    // Support both email and usernameOrEmail parameters
    const loginField = usernameOrEmail || email;
    
    console.log('🔐 Login attempt:', { loginField });
    
    // Validate input
    if (!loginField || !password) {
        return res.status(400).json({ 
            error: 'Missing credentials',
            details: 'Email/username and password are required'
        });
    }
    
    // Find user by email or username
    const user = Array.from(users.values()).find(u => 
        u.email === loginField || u.username === loginField
    );
    
    if (!user || user.password !== password) {
        return res.status(401).json({ 
            error: 'Invalid credentials',
            details: 'Email/username or password is incorrect'
        });
    }
    
    console.log('✅ User logged in successfully:', user.id);
    
    res.json({
        success: true,
        message: 'Login successful',
        token: `test-token-${user.id}`, // Simple token for testing
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            mooncoins: user.mooncoins,
            mooncoinsBalance: user.mooncoins  // Add consistent property name
        }
    });
});

// Get user profile
app.get('/api/auth/profile', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !token.startsWith('test-token-')) {
        return res.status(401).json({ error: 'Invalid token' });
    }
    
    const userId = parseInt(token.replace('test-token-', ''));
    const user = users.get(userId);
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
        success: true,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            mooncoins: user.mooncoins,
            mooncoinsBalance: user.mooncoins  // Add consistent property name
        }
    });
});

// Validate referral code
app.get('/api/auth/validate-referral/:code', (req, res) => {
    const { code } = req.params;
    
    console.log('🔍 Validating referral code:', code);
    
    // Simple validation - in real app this would check database
    const hasCorrectLength = code && code.length >= 4;
    const hasValidFormat = code && code.match(/^[A-Z0-9]+$/);
    const hasCorrectPrefix = code && code.startsWith('MOON');
    const isValid = hasCorrectLength && hasValidFormat && hasCorrectPrefix;
    
    console.log('🔍 Validation details:', { 
        code, 
        hasCorrectLength, 
        hasValidFormat: !!hasValidFormat, 
        hasCorrectPrefix, 
        isValid 
    });
    
    res.json({
        success: true,
        valid: isValid,
        message: isValid ? 'Referral code is valid' : 'Invalid referral code'
    });
});

// Get referrals (dummy endpoint)
app.get('/api/auth/referrals', (req, res) => {
    res.json({
        referrals: [],
        totalRewards: 0
    });
});

// Daily login (dummy endpoint)
app.post('/api/auth/daily-login', (req, res) => {
    res.json({
        success: true,
        reward: 10,
        streak: 1
    });
});

// Start server
const port = config.port;
app.listen(port, () => {
    console.log(`🚀 Auth Test Server running on port ${port}`);
    console.log(`📍 Environment: ${config.environment}`);
    console.log(`🌐 Base URL: ${config.getBaseUrl()}`);
    console.log(`🔗 CORS Origins: ${config.corsOrigins.join(', ')}`);
    console.log('');
    console.log('📋 Available endpoints:');
    console.log('   GET  /api/store/health');
    console.log('   POST /api/auth/register');
    console.log('   POST /api/auth/login');
    console.log('   GET  /api/auth/profile');
    console.log('   GET  /api/auth/validate-referral/:code');
    console.log('   GET  /api/auth/referrals');
    console.log('   POST /api/auth/daily-login');
    console.log('');
    console.log('✅ Ready for testing!');
});