// HD Wallet Service for MoonYetis - BIP32/BIP44 compliant
const crypto = require('crypto');
const { BIP32Factory } = require('bip32');
const ecc = require('tiny-secp256k1');
const bip39 = require('bip39');
const bitcoin = require('bitcoinjs-lib');

// Initialize BIP32
const bip32 = BIP32Factory(ecc);

// Fractal Bitcoin network configuration
const FRACTAL_NETWORK = {
    messagePrefix: '\x18Fractal Bitcoin Signed Message:\n',
    bech32: 'bc',
    bip32: {
        public: 0x0488b21e,
        private: 0x0488ade4,
    },
    pubKeyHash: 0x00,
    scriptHash: 0x05,
    wif: 0x80,
};

class HDWalletService {
    constructor(database, seedPhrase) {
        this.db = database;
        this.network = FRACTAL_NETWORK;
        
        // Validate and set seed phrase
        if (!bip39.validateMnemonic(seedPhrase)) {
            throw new Error('Invalid seed phrase');
        }
        
        // Generate seed from mnemonic
        this.seed = bip39.mnemonicToSeedSync(seedPhrase);
        this.masterNode = bip32.fromSeed(this.seed, this.network);
        
        // BIP44 path for Fractal Bitcoin: m/44'/0'/0'/0/index
        // Using Bitcoin's coin type (0) as Fractal Bitcoin is Bitcoin-compatible
        this.basePath = "m/44'/0'/0'/0";
        
        console.log('✅ HD Wallet Service initialized');
    }
    
    // Derive address for a specific index
    deriveAddress(index) {
        try {
            const path = `${this.basePath}/${index}`;
            const child = this.masterNode.derivePath(path);
            
            // Ensure publicKey is a Buffer
            let pubkeyBuffer;
            if (Buffer.isBuffer(child.publicKey)) {
                pubkeyBuffer = child.publicKey;
            } else if (child.publicKey instanceof Uint8Array) {
                // Convert Uint8Array to Buffer
                pubkeyBuffer = Buffer.from(child.publicKey);
            } else if (child.publicKey && child.publicKey.__value) {
                // Handle special case where publicKey might be wrapped
                pubkeyBuffer = Buffer.from(child.publicKey.__value);
            } else if (Array.isArray(child.publicKey)) {
                // Handle array format
                pubkeyBuffer = Buffer.from(child.publicKey);
            } else {
                console.error('❌ Unhandled publicKey format:', {
                    type: typeof child.publicKey,
                    constructor: child.publicKey.constructor.name,
                    isUint8Array: child.publicKey instanceof Uint8Array,
                    isBuffer: Buffer.isBuffer(child.publicKey)
                });
                throw new Error('Invalid public key format');
            }
            
            // Generate P2WPKH (Native SegWit) address
            const { address } = bitcoin.payments.p2wpkh({
                pubkey: pubkeyBuffer,
                network: this.network
            });
            
            return {
                address,
                publicKey: pubkeyBuffer.toString('hex'),
                path,
                index
            };
        } catch (error) {
            console.error('❌ Error in deriveAddress:', error.message);
            throw error;
        }
    }
    
    // Get or generate deposit address for user
    async getOrGenerateDepositAddress(userId) {
        try {
            // Check if user already has a deposit address
            const existingStmt = this.db.db.prepare(`
                SELECT * FROM user_deposit_addresses WHERE user_id = ?
            `);
            const existing = existingStmt.get(userId);
            
            if (existing) {
                console.log(`♻️ Returning existing deposit address for user ${userId}`);
                return {
                    address: existing.deposit_address,
                    path: existing.derivation_path,
                    index: existing.derivation_index,
                    isNew: false
                };
            }
            
            // Find next available index
            const maxIndexStmt = this.db.db.prepare(`
                SELECT MAX(derivation_index) as max_index FROM user_deposit_addresses
            `);
            const result = maxIndexStmt.get();
            const nextIndex = (result.max_index || -1) + 1;
            
            // Derive new address
            const derivedAddress = this.deriveAddress(nextIndex);
            
            // Store in database
            const insertStmt = this.db.db.prepare(`
                INSERT INTO user_deposit_addresses 
                (user_id, deposit_address, derivation_path, derivation_index)
                VALUES (?, ?, ?, ?)
            `);
            
            insertStmt.run(
                userId,
                derivedAddress.address,
                derivedAddress.path,
                derivedAddress.index
            );
            
            console.log(`✅ Generated new deposit address for user ${userId}: ${derivedAddress.address}`);
            
            return {
                address: derivedAddress.address,
                path: derivedAddress.path,
                index: derivedAddress.index,
                isNew: true
            };
            
        } catch (error) {
            console.error('❌ Error generating deposit address:', error);
            throw error;
        }
    }
    
    // Get all deposit addresses (for monitoring)
    async getAllDepositAddresses() {
        try {
            const stmt = this.db.db.prepare(`
                SELECT 
                    uda.*,
                    u.username,
                    u.email
                FROM user_deposit_addresses uda
                JOIN users u ON uda.user_id = u.id
                ORDER BY uda.derivation_index ASC
            `);
            
            return stmt.all();
        } catch (error) {
            console.error('❌ Error getting all deposit addresses:', error);
            throw error;
        }
    }
    
    // Get user by deposit address
    async getUserByDepositAddress(address) {
        try {
            const stmt = this.db.db.prepare(`
                SELECT 
                    u.*,
                    uda.deposit_address,
                    uda.derivation_path,
                    uda.derivation_index
                FROM users u
                JOIN user_deposit_addresses uda ON u.id = uda.user_id
                WHERE uda.deposit_address = ?
            `);
            
            return stmt.get(address);
        } catch (error) {
            console.error('❌ Error getting user by deposit address:', error);
            throw error;
        }
    }
    
    // Record a deposit
    async recordDeposit(userId, depositAddress, txHash, amount, tokenType, confirmations = 0) {
        try {
            const stmt = this.db.db.prepare(`
                INSERT INTO user_deposits 
                (user_id, deposit_address, tx_hash, amount, token_type, confirmations, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            
            const result = stmt.run(
                userId,
                depositAddress,
                txHash,
                amount.toString(),
                tokenType,
                confirmations,
                confirmations > 0 ? 'confirmed' : 'pending'
            );
            
            console.log(`📝 Recorded ${tokenType} deposit: ${amount} to user ${userId}`);
            
            return result.lastInsertRowid;
        } catch (error) {
            // Check if it's a duplicate transaction
            if (error.message.includes('UNIQUE constraint failed')) {
                console.log(`ℹ️ Deposit ${txHash} already recorded`);
                return null;
            }
            console.error('❌ Error recording deposit:', error);
            throw error;
        }
    }
    
    // Update deposit confirmation status
    async updateDepositConfirmations(txHash, confirmations) {
        try {
            const stmt = this.db.db.prepare(`
                UPDATE user_deposits 
                SET 
                    confirmations = ?,
                    status = CASE WHEN ? > 0 THEN 'confirmed' ELSE 'pending' END,
                    confirmed_at = CASE WHEN ? > 0 AND confirmed_at IS NULL THEN datetime('now') ELSE confirmed_at END
                WHERE tx_hash = ?
            `);
            
            stmt.run(confirmations, confirmations, confirmations, txHash);
            
            console.log(`✅ Updated deposit ${txHash} confirmations to ${confirmations}`);
        } catch (error) {
            console.error('❌ Error updating deposit confirmations:', error);
            throw error;
        }
    }
    
    // Get user deposits
    async getUserDeposits(userId, limit = 50) {
        try {
            const stmt = this.db.db.prepare(`
                SELECT * FROM user_deposits 
                WHERE user_id = ? 
                ORDER BY detected_at DESC 
                LIMIT ?
            `);
            
            return stmt.all(userId, limit);
        } catch (error) {
            console.error('❌ Error getting user deposits:', error);
            throw error;
        }
    }
    
    // Update user balance after confirmed deposit
    async updateUserBalance(userId, amount, tokenType) {
        try {
            const column = tokenType === 'FB' ? 'fb_balance' : 'my_balance';
            
            // Get current balance
            const getStmt = this.db.db.prepare(`SELECT ${column} FROM users WHERE id = ?`);
            const user = getStmt.get(userId);
            
            if (!user) {
                throw new Error('User not found');
            }
            
            // Calculate new balance with precision
            const currentBalance = parseFloat(user[column] || '0');
            const depositAmount = parseFloat(amount);
            const newBalance = (currentBalance + depositAmount).toFixed(8);
            
            // Update balance
            const updateStmt = this.db.db.prepare(`
                UPDATE users SET ${column} = ? WHERE id = ?
            `);
            
            updateStmt.run(newBalance, userId);
            
            console.log(`💰 Updated user ${userId} ${tokenType} balance: ${currentBalance} → ${newBalance}`);
            
            return newBalance;
        } catch (error) {
            console.error('❌ Error updating user balance:', error);
            throw error;
        }
    }
    
    // Get last known balance for an address
    async getLastKnownBalance(address) {
        try {
            const stmt = this.db.db.prepare(`
                SELECT last_known_balance FROM user_deposit_addresses 
                WHERE deposit_address = ?
            `);
            
            const result = stmt.get(address);
            return result ? parseInt(result.last_known_balance) : 0;
        } catch (error) {
            console.error('❌ Error getting last known balance:', error);
            return 0;
        }
    }
    
    // Update last known balance for an address
    async updateLastKnownBalance(address, newBalance) {
        try {
            const stmt = this.db.db.prepare(`
                UPDATE user_deposit_addresses 
                SET last_known_balance = ? 
                WHERE deposit_address = ?
            `);
            
            stmt.run(newBalance.toString(), address);
            console.log(`✅ Updated last known balance for ${address}: ${newBalance} sats`);
        } catch (error) {
            console.error('❌ Error updating last known balance:', error);
        }
    }
}

module.exports = HDWalletService;