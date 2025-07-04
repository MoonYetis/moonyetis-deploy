#!/usr/bin/env node

/**
 * Auto-setup test credentials for development
 * This creates secure encrypted storage with test/demo credentials
 */

const secureCredentials = require('../services/secureCredentialsManager');
const crypto = require('crypto');

async function setupTestCredentials() {
    console.log('🔐 Setting up test credentials for development...');
    
    try {
        // Generate test house wallet credentials (these are for testing only)
        const testHouseWallet = {
            address: 'bc1p_test_address_for_development_only_12345678',
            privateKey: crypto.randomBytes(32).toString('hex'),
            publicKey: crypto.randomBytes(33).toString('hex')
        };

        // Test database credentials
        const testDatabaseCredentials = {
            user: 'moonyetis_user',
            password: 'secure_test_password_' + crypto.randomBytes(8).toString('hex'),
            database: 'moonyetis_slots',
            host: 'localhost',
            port: '5432'
        };

        // Store house wallet credentials
        await secureCredentials.setHouseWalletCredentials(testHouseWallet);
        console.log('✅ Test house wallet credentials stored');

        // Store database credentials
        await secureCredentials.setDatabaseCredentials(testDatabaseCredentials);
        console.log('✅ Test database credentials stored');

        // Store API keys and secrets
        const testSecrets = {
            fractalApiKey: 'test_fractal_api_key_' + crypto.randomBytes(16).toString('hex'),
            jwtSecret: crypto.randomBytes(64).toString('hex'),
            sessionSecret: crypto.randomBytes(64).toString('hex'),
            dataEncryptionKey: crypto.randomBytes(32).toString('hex')
        };

        for (const [key, value] of Object.entries(testSecrets)) {
            await secureCredentials.setCredential(key, value);
        }
        console.log('✅ Test API keys and secrets stored');

        // Verify all credentials can be loaded
        const loadedCredentials = await secureCredentials.loadCredentials();
        
        if (loadedCredentials && 
            loadedCredentials.houseWallet && 
            loadedCredentials.database &&
            loadedCredentials.jwtSecret) {
            
            console.log('✅ All test credentials verified successfully');
            console.log('');
            console.log('📋 Credentials Summary:');
            console.log(`   House Wallet: ${loadedCredentials.houseWallet.address.substring(0, 20)}...`);
            console.log(`   Database: ${loadedCredentials.database.database}@${loadedCredentials.database.host}`);
            console.log(`   JWT Secret: ${loadedCredentials.jwtSecret.substring(0, 16)}...`);
            console.log(`   Session Secret: ${loadedCredentials.sessionSecret.substring(0, 16)}...`);
            console.log('');
            console.log('⚠️  IMPORTANT: These are TEST credentials for development only!');
            console.log('🔄 For production, use real wallet addresses and secure passwords');
            
            return true;
        } else {
            throw new Error('Failed to verify stored credentials');
        }
        
    } catch (error) {
        console.error('❌ Failed to setup test credentials:', error.message);
        return false;
    }
}

// Run setup if called directly
if (require.main === module) {
    setupTestCredentials()
        .then(success => {
            if (success) {
                console.log('🎉 Test credentials setup completed!');
                process.exit(0);
            } else {
                console.error('❌ Test credentials setup failed');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('❌ Setup error:', error.message);
            process.exit(1);
        });
}

module.exports = { setupTestCredentials };