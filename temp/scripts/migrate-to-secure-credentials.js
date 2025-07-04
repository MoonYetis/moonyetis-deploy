#!/usr/bin/env node

/**
 * Migration script to move credentials from environment variables
 * to encrypted secure storage
 */

const secureCredentials = require('../services/secureCredentialsManager');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

async function migrateCredentials() {
    console.log('🔐 MoonYetis Secure Credentials Migration Tool');
    console.log('============================================\n');

    try {
        // Check if we already have encrypted credentials
        const existingCredentials = await secureCredentials.loadCredentials();
        
        if (existingCredentials) {
            console.log('⚠️  Encrypted credentials already exist!');
            const overwrite = await askQuestion('Do you want to overwrite them? (y/N): ');
            
            if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
                console.log('❌ Migration cancelled');
                process.exit(0);
            }
        }

        console.log('📝 Starting credentials migration...\n');

        // 1. House Wallet Credentials
        console.log('🏦 House Wallet Configuration:');
        
        let houseWalletAddress = process.env.HOUSE_WALLET_ADDRESS;
        let houseWalletPrivateKey = process.env.HOUSE_WALLET_PRIVATE_KEY;
        let houseWalletPublicKey = process.env.HOUSE_WALLET_PUBLIC_KEY;

        if (!houseWalletAddress) {
            houseWalletAddress = await askQuestion('Enter house wallet address: ');
        } else {
            console.log(`   Found address: ${houseWalletAddress.substring(0, 10)}...`);
        }

        if (!houseWalletPrivateKey) {
            houseWalletPrivateKey = await askQuestion('Enter house wallet private key: ');
        } else {
            console.log('   ✅ Private key found in environment');
        }

        if (!houseWalletPublicKey) {
            houseWalletPublicKey = await askQuestion('Enter house wallet public key: ');
        } else {
            console.log('   ✅ Public key found in environment');
        }

        // Validate house wallet credentials
        if (!houseWalletAddress || !houseWalletPrivateKey) {
            throw new Error('House wallet address and private key are required');
        }

        // Store house wallet credentials
        await secureCredentials.setHouseWalletCredentials({
            address: houseWalletAddress,
            privateKey: houseWalletPrivateKey,
            publicKey: houseWalletPublicKey
        });

        // 2. Database Credentials
        console.log('\n🗄️  Database Configuration:');
        
        const dbUser = process.env.DB_USER || 'moonyetis_user';
        const dbPassword = process.env.DB_PASSWORD || await askQuestion('Enter database password: ');
        const dbName = process.env.DB_NAME || 'moonyetis_slots';
        const dbHost = process.env.DB_HOST || 'localhost';
        const dbPort = process.env.DB_PORT || '5432';

        console.log(`   Database: ${dbName}@${dbHost}:${dbPort}`);
        console.log(`   User: ${dbUser}`);

        await secureCredentials.setDatabaseCredentials({
            user: dbUser,
            password: dbPassword,
            database: dbName,
            host: dbHost,
            port: dbPort
        });

        // 3. API Keys
        console.log('\n🔑 API Keys Configuration:');
        
        const fractalApiKey = process.env.FRACTAL_API_KEY;
        if (fractalApiKey) {
            await secureCredentials.setCredential('fractalApiKey', fractalApiKey);
            console.log('   ✅ Fractal API key migrated');
        }

        // 4. JWT Secrets
        const jwtSecret = process.env.JWT_SECRET || require('crypto').randomBytes(64).toString('hex');
        await secureCredentials.setCredential('jwtSecret', jwtSecret);
        console.log('   ✅ JWT secret configured');

        // 5. Session Secrets
        const sessionSecret = process.env.SESSION_SECRET || require('crypto').randomBytes(64).toString('hex');
        await secureCredentials.setCredential('sessionSecret', sessionSecret);
        console.log('   ✅ Session secret configured');

        // 6. Encryption keys for sensitive data
        const dataEncryptionKey = require('crypto').randomBytes(32).toString('hex');
        await secureCredentials.setCredential('dataEncryptionKey', dataEncryptionKey);
        console.log('   ✅ Data encryption key generated');

        console.log('\n✅ Migration completed successfully!\n');

        // Security recommendations
        console.log('🛡️  Security Recommendations:');
        console.log('   1. Remove credentials from environment variables');
        console.log('   2. Backup the master key file securely (.secure/master.key)');
        console.log('   3. Set restrictive file permissions on .secure/ directory');
        console.log('   4. Consider using hardware security modules (HSM) for production');
        console.log('   5. Regularly rotate encryption keys');

        // Generate .env.example for documentation
        const envExample = `# MoonYetis Slots Environment Configuration
# 
# SECURITY NOTICE: Sensitive credentials are now encrypted
# Only non-sensitive configuration should be in environment variables

# Node Environment
NODE_ENV=production

# Server Configuration
PORT=3000
HOST=0.0.0.0

# Network Configuration
FRACTAL_API_URL=https://fractal-api.unisat.io
FRACTAL_INDEXER_URL=https://fractal-indexer.unisat.io
FRACTAL_EXPLORER_URL=https://fractal.unisat.io

# Secure Credentials (paths to encrypted files)
MASTER_KEY_FILE=.secure/master.key
CREDENTIALS_FILE=.secure/credentials.enc

# Non-sensitive defaults
DB_PORT=5432
DB_HOST=localhost

# SSL Configuration
SSL_CERT_PATH=/etc/ssl/certs/moonyetis.crt
SSL_KEY_PATH=/etc/ssl/private/moonyetis.key

# IMPORTANT: The following are NO LONGER USED (moved to encrypted storage)
# HOUSE_WALLET_PRIVATE_KEY=REMOVED_FOR_SECURITY
# HOUSE_WALLET_ADDRESS=REMOVED_FOR_SECURITY
# DB_PASSWORD=REMOVED_FOR_SECURITY
# JWT_SECRET=REMOVED_FOR_SECURITY
# SESSION_SECRET=REMOVED_FOR_SECURITY
`;

        fs.writeFileSync(path.join(process.cwd(), '.env.example'), envExample);
        console.log('\n📁 Generated .env.example with secure configuration');

        // Test the encrypted credentials
        console.log('\n🧪 Testing encrypted credentials...');
        const testCredentials = await secureCredentials.loadCredentials();
        
        if (testCredentials && testCredentials.houseWallet && testCredentials.database) {
            console.log('✅ All credentials can be decrypted successfully');
        } else {
            console.log('⚠️  Warning: Some credentials may not have been stored correctly');
        }

        console.log('\n🎉 Migration completed! Your credentials are now securely encrypted.');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateCredentials().catch(console.error);
}

module.exports = { migrateCredentials };