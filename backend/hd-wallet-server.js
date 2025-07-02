const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

// WARNING: This contains your actual seed - use only for testing
const MASTER_SEED = 'gap cheap unusual edge scatter lawn giant pattern genre weather february apart';

const app = express();
app.use(cors());
app.use(express.json());

// In-memory storage for user address mappings
const userAddresses = new Map();

// Simple HD address simulation
class SimpleHDWallet {
    constructor(seedPhrase) {
        this.seed = this.mnemonicToSeed(seedPhrase);
    }
    
    mnemonicToSeed(mnemonic) {
        return crypto.createHash('sha256').update(mnemonic).digest('hex');
    }
    
    deriveAddress(index) {
        // Simplified HD derivation for development
        const indexHash = crypto.createHash('sha256')
            .update(this.seed + index.toString())
            .digest('hex');
        
        // Generate a Bitcoin-like address
        const addressSuffix = indexHash.substring(0, 32);
        return `bc1q${addressSuffix}`;
    }
    
    getUserIndex(userWallet) {
        // Create deterministic index from user wallet address
        const hash = crypto.createHash('sha256').update(userWallet).digest('hex');
        return parseInt(hash.substring(0, 8), 16) % 1000000;
    }
}

const hdWallet = new SimpleHDWallet(MASTER_SEED);

// Generate unique deposit address for user
app.post('/api/deposit/generate-address', (req, res) => {
    try {
        const { userWallet } = req.body;
        const walletHeader = req.headers['x-wallet-address'];
        
        console.log('🔐 Address generation request for:', userWallet);
        
        if (!userWallet || userWallet !== walletHeader) {
            return res.status(400).json({
                success: false,
                error: 'Invalid wallet address'
            });
        }
        
        // Check if user already has an address
        if (userAddresses.has(userWallet)) {
            const existingData = userAddresses.get(userWallet);
            console.log('♻️ Returning existing address for user');
            return res.json({
                success: true,
                depositAddress: existingData.address,
                index: existingData.index,
                isExisting: true
            });
        }
        
        // Generate new address
        const userIndex = hdWallet.getUserIndex(userWallet);
        const depositAddress = hdWallet.deriveAddress(userIndex);
        
        // Store mapping
        userAddresses.set(userWallet, {
            address: depositAddress,
            index: userIndex,
            createdAt: new Date().toISOString(),
            deposits: []
        });
        
        console.log(`✅ Generated address: ${depositAddress} (index: ${userIndex})`);
        
        res.json({
            success: true,
            depositAddress,
            index: userIndex,
            isExisting: false
        });
        
    } catch (error) {
        console.error('❌ Error generating address:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Get user's deposit address
app.get('/api/deposit/address/:userWallet', (req, res) => {
    const { userWallet } = req.params;
    
    if (userAddresses.has(userWallet)) {
        const data = userAddresses.get(userWallet);
        res.json({
            success: true,
            ...data
        });
    } else {
        res.status(404).json({
            success: false,
            error: 'No address found for this user'
        });
    }
});

// List all generated addresses (for debugging)
app.get('/api/deposit/addresses', (req, res) => {
    const addresses = Array.from(userAddresses.entries()).map(([userWallet, data]) => ({
        userWallet,
        ...data
    }));
    
    res.json({
        success: true,
        count: addresses.length,
        addresses
    });
});

// Simulate deposit processing
app.post('/api/deposit/process', (req, res) => {
    try {
        const { depositAddress, txHash, amount } = req.body;
        const userWallet = req.headers['x-wallet-address'];
        
        console.log('💰 Processing deposit:', { depositAddress, txHash, amount, userWallet });
        
        // Find user by deposit address
        let targetUser = null;
        for (const [wallet, data] of userAddresses.entries()) {
            if (data.address === depositAddress) {
                targetUser = { wallet, ...data };
                break;
            }
        }
        
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                error: 'Deposit address not found'
            });
        }
        
        // Simulate deposit processing
        const depositRecord = {
            txHash,
            amount,
            timestamp: new Date().toISOString(),
            status: 'confirmed',
            gameChips: amount * 1000 // Convert to game chips (1 BTC = 1000 chips)
        };
        
        targetUser.deposits.push(depositRecord);
        userAddresses.set(targetUser.wallet, targetUser);
        
        console.log(`✅ Deposit processed: ${amount} → ${depositRecord.gameChips} chips`);
        
        res.json({
            success: true,
            deposit: depositRecord,
            userWallet: targetUser.wallet
        });
        
    } catch (error) {
        console.error('❌ Error processing deposit:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 HD Wallet Server running on port ${PORT}`);
    console.log(`🌐 Production domain: moonyetis.io:${PORT}`);
    console.log(`🔐 Master seed loaded: ${MASTER_SEED.split(' ').slice(0, 3).join(' ')}...`);
    console.log(`📡 API endpoints available:`);
    console.log(`   POST https://moonyetis.io:${PORT}/api/deposit/generate-address`);
    console.log(`   GET  https://moonyetis.io:${PORT}/api/deposit/address/:userWallet`);
    console.log(`   GET  https://moonyetis.io:${PORT}/api/deposit/addresses`);
    console.log(`   POST https://moonyetis.io:${PORT}/api/deposit/process`);
    console.log(`⚠️  PRODUCTION MODE - Using real seed phrase`);
});