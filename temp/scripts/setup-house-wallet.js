#!/usr/bin/env node

/**
 * House Wallet Setup Script for MoonYetis Slots
 * 
 * This script helps set up and configure the house wallet for mainnet deployment
 * WARNING: This handles real cryptocurrency - use with extreme caution!
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🏠 MoonYetis House Wallet Setup');
console.log('================================');
console.log('');

// Generate secure random values
function generateSecureRandom(length) {
    return crypto.randomBytes(length).toString('hex');
}

// Generate wallet mnemonic (mock - in production use proper BIP39)
function generateMnemonic() {
    const words = [
        'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
        'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
        'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual'
    ];
    
    const mnemonic = [];
    for (let i = 0; i < 12; i++) {
        mnemonic.push(words[Math.floor(Math.random() * words.length)]);
    }
    
    return mnemonic.join(' ');
}

// Generate mock wallet address (Fractal Bitcoin format)
function generateWalletAddress() {
    // Generate a mock bc1p address for demonstration
    const randomHash = crypto.randomBytes(32).toString('hex');
    return `bc1p${randomHash.slice(0, 58)}`;
}

console.log('⚠️  CRITICAL SECURITY WARNING ⚠️');
console.log('');
console.log('This script generates EXAMPLE wallet credentials for development.');
console.log('For PRODUCTION use:');
console.log('1. Use a hardware wallet (Ledger, Trezor)');
console.log('2. Generate addresses offline');
console.log('3. Use proper key management systems');
console.log('4. Enable multi-signature if possible');
console.log('5. Regular security audits');
console.log('');

const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Do you want to generate DEVELOPMENT house wallet credentials? (yes/no): ', (answer) => {
    if (answer.toLowerCase() !== 'yes') {
        console.log('Setup cancelled.');
        rl.close();
        return;
    }

    console.log('');
    console.log('🔐 Generating development house wallet...');
    console.log('');

    // Generate wallet credentials
    const mnemonic = generateMnemonic();
    const address = generateWalletAddress();
    const privateKey = generateSecureRandom(32);
    const publicKey = generateSecureRandom(33);
    const apiKey = generateSecureRandom(32);

    // Generate session secret
    const sessionSecret = generateSecureRandom(64);

    console.log('✅ House Wallet Generated:');
    console.log('');
    console.log(`Address: ${address}`);
    console.log(`Private Key: ${privateKey}`);
    console.log(`Public Key: ${publicKey}`);
    console.log('');
    console.log(`Mnemonic: ${mnemonic}`);
    console.log('');
    console.log('🔑 Additional Secrets:');
    console.log(`API Key: ${apiKey}`);
    console.log(`Session Secret: ${sessionSecret}`);
    console.log('');

    // Create .env.production file
    const envContent = `# ==============================================
# MoonYetis Slots - Production Environment Configuration
# Generated on: ${new Date().toISOString()}
# ==============================================

# CRITICAL: Keep these values secure!
NODE_ENV=production
PORT=3000

# Fractal Bitcoin Network
FRACTAL_NETWORK_TYPE=mainnet
FRACTAL_API_URL=https://fractal-api.unisat.io
FRACTAL_INDEXER_URL=https://fractal-indexer.unisat.io
FRACTAL_EXPLORER_URL=https://fractal.unisat.io

# API Keys (REPLACE WITH REAL KEYS!)
FRACTAL_API_KEY=${apiKey}
UNISAT_API_KEY=your_real_unisat_api_key_here

# House Wallet (DEVELOPMENT ONLY - REPLACE FOR PRODUCTION!)
HOUSE_WALLET_ADDRESS=${address}
HOUSE_WALLET_PRIVATE_KEY=${privateKey}
HOUSE_WALLET_PUBLIC_KEY=${publicKey}
HOUSE_WALLET_MNEMONIC="${mnemonic}"

# Token Configuration
MOONYETIS_CONTRACT=bc1p_real_moonyetis_deployment_address
MOONYETIS_DEPLOY_INSCRIPTION=real_inscription_id_of_moonyetis_deployment

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=moonyetis_slots
DB_USER=moonyetis_user
DB_PASSWORD=${generateSecureRandom(16)}

# Security
SESSION_SECRET=${sessionSecret}
DOMAIN=your-domain.com
FRONTEND_URL=https://your-domain.com

# SSL (for HTTPS)
SSL_KEY_PATH=/path/to/ssl/private.key
SSL_CERT_PATH=/path/to/ssl/certificate.crt

# Monitoring
ENABLE_LOGGING=true
LOG_LEVEL=info
SENTRY_DSN=your_sentry_dsn_for_error_tracking

# Game Economics
MIN_BET_CHIPS=1
MAX_BET_CHIPS=1000
MAX_WIN_AMOUNT=50000
HOUSE_EDGE=0.04
RTP=0.96

# Security Limits
MAX_DAILY_DEPOSIT=10000
MAX_DAILY_WITHDRAWAL=5000
MAX_SESSION_TIME_MS=86400000

# Transaction Settings
DEPOSIT_CONFIRMATIONS=3
WITHDRAWAL_CONFIRMATIONS=1
TRANSACTION_TIMEOUT_MS=1800000

# ==============================================
# PRODUCTION CHECKLIST:
# 
# [ ] Replace house wallet with real secure wallet
# [ ] Set up proper API keys for Fractal Bitcoin services  
# [ ] Configure real database with strong password
# [ ] Set up SSL certificates
# [ ] Configure domain and HTTPS
# [ ] Set up monitoring and alerting
# [ ] Test all endpoints with small amounts first
# [ ] Enable proper backup systems
# [ ] Set up incident response procedures
# ==============================================
`;

    // Write .env.production file
    const envPath = path.join(__dirname, '..', '.env.production');
    fs.writeFileSync(envPath, envContent);

    console.log('📁 Environment file created: .env.production');
    console.log('');
    console.log('🔒 SECURITY RECOMMENDATIONS:');
    console.log('');
    console.log('1. IMMEDIATELY change file permissions:');
    console.log('   chmod 600 .env.production');
    console.log('');
    console.log('2. NEVER commit .env.production to version control');
    console.log('   Add to .gitignore if not already there');
    console.log('');
    console.log('3. For PRODUCTION deployment:');
    console.log('   - Replace ALL generated keys with real secure values');
    console.log('   - Use hardware wallet for house funds');
    console.log('   - Set up proper monitoring and alerts');
    console.log('   - Test with small amounts first');
    console.log('');
    console.log('4. Backup wallet credentials securely:');
    console.log('   - Store mnemonic in secure offline location');
    console.log('   - Use encrypted backups');
    console.log('   - Test recovery procedures');
    console.log('');

    // Create wallet info file
    const walletInfo = {
        address,
        generatedAt: new Date().toISOString(),
        networkType: 'development',
        warning: 'This is a development wallet - DO NOT use for production!',
        mnemonic,
        securityNotes: [
            'This wallet was generated for development purposes only',
            'Replace with secure production wallet before mainnet deployment',
            'Use hardware wallets for production house funds',
            'Implement proper key management procedures'
        ]
    };

    const walletInfoPath = path.join(__dirname, '..', 'house-wallet-info.json');
    fs.writeFileSync(walletInfoPath, JSON.stringify(walletInfo, null, 2));

    console.log('📋 Wallet info saved: house-wallet-info.json');
    console.log('');
    console.log('✅ House wallet setup complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Review and secure the generated files');
    console.log('2. Test the configuration in development');
    console.log('3. Replace with production credentials before mainnet');
    console.log('4. Fund the house wallet with MOONYETIS tokens');
    console.log('5. Test deposit/withdrawal flows thoroughly');

    rl.close();
});