const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Secure Credentials Manager
 * Handles encryption/decryption of sensitive data like private keys
 * Uses AES-256-GCM for strong encryption
 */
class SecureCredentialsManager {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.keyLength = 32; // 256 bits
        this.ivLength = 16;  // 128 bits
        this.tagLength = 16; // 128 bits
        
        // Master key location (should be stored securely)
        this.keyFile = process.env.MASTER_KEY_FILE || path.join(process.cwd(), '.secure', 'master.key');
        this.credentialsFile = process.env.CREDENTIALS_FILE || path.join(process.cwd(), '.secure', 'credentials.enc');
        
        this.masterKey = null;
        this.decryptedCredentials = null;
        
        this.initializeSecureStorage();
    }

    // Initialize secure storage directory and master key
    initializeSecureStorage() {
        try {
            const secureDir = path.dirname(this.keyFile);
            
            // Create secure directory if it doesn't exist
            if (!fs.existsSync(secureDir)) {
                fs.mkdirSync(secureDir, { mode: 0o700 });
                console.log('🔐 Created secure credentials directory');
            }
            
            // Generate or load master key
            if (!fs.existsSync(this.keyFile)) {
                this.generateMasterKey();
            } else {
                this.loadMasterKey();
            }
            
            console.log('🔐 SecureCredentialsManager initialized');
        } catch (error) {
            console.error('❌ Failed to initialize secure storage:', error.message);
            throw error;
        }
    }

    // Generate a new master key
    generateMasterKey() {
        try {
            const masterKey = crypto.randomBytes(this.keyLength);
            
            // Write key with strict permissions
            fs.writeFileSync(this.keyFile, masterKey, { mode: 0o600 });
            this.masterKey = masterKey;
            
            console.log('🔑 Generated new master encryption key');
            console.log(`📁 Key stored at: ${this.keyFile}`);
            console.log('⚠️  IMPORTANT: Backup this key file securely!');
            
        } catch (error) {
            console.error('❌ Failed to generate master key:', error.message);
            throw error;
        }
    }

    // Load existing master key
    loadMasterKey() {
        try {
            this.masterKey = fs.readFileSync(this.keyFile);
            console.log('🔑 Loaded master encryption key');
        } catch (error) {
            console.error('❌ Failed to load master key:', error.message);
            throw error;
        }
    }

    // Encrypt sensitive data
    encrypt(plaintext) {
        try {
            const iv = crypto.randomBytes(this.ivLength);
            const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);
            
            let encrypted = cipher.update(plaintext, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const tag = cipher.getAuthTag();
            
            // Combine IV + tag + encrypted data
            const result = iv.toString('hex') + tag.toString('hex') + encrypted;
            
            return result;
        } catch (error) {
            console.error('❌ Encryption failed:', error.message);
            throw error;
        }
    }

    // Decrypt sensitive data
    decrypt(encryptedData) {
        try {
            const ivHex = encryptedData.slice(0, this.ivLength * 2);
            const tagHex = encryptedData.slice(this.ivLength * 2, (this.ivLength + this.tagLength) * 2);
            const encrypted = encryptedData.slice((this.ivLength + this.tagLength) * 2);
            
            const iv = Buffer.from(ivHex, 'hex');
            const tag = Buffer.from(tagHex, 'hex');
            
            const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);
            decipher.setAuthTag(tag);
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('❌ Decryption failed:', error.message);
            throw error;
        }
    }

    // Store encrypted credentials to file
    async storeCredentials(credentials) {
        try {
            const encryptedData = this.encrypt(JSON.stringify(credentials));
            
            // Write encrypted credentials with strict permissions
            fs.writeFileSync(this.credentialsFile, encryptedData, { mode: 0o600 });
            
            // Cache in memory for current session
            this.decryptedCredentials = credentials;
            
            console.log('🔐 Credentials encrypted and stored securely');
            console.log(`📁 Stored at: ${this.credentialsFile}`);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to store credentials:', error.message);
            throw error;
        }
    }

    // Load and decrypt credentials from file
    async loadCredentials() {
        try {
            if (this.decryptedCredentials) {
                return this.decryptedCredentials;
            }
            
            if (!fs.existsSync(this.credentialsFile)) {
                console.warn('⚠️  No encrypted credentials file found');
                return null;
            }
            
            const encryptedData = fs.readFileSync(this.credentialsFile, 'utf8');
            const decryptedData = this.decrypt(encryptedData);
            const credentials = JSON.parse(decryptedData);
            
            // Cache in memory for current session
            this.decryptedCredentials = credentials;
            
            console.log('🔓 Credentials loaded and decrypted successfully');
            return credentials;
            
        } catch (error) {
            console.error('❌ Failed to load credentials:', error.message);
            throw error;
        }
    }

    // Get specific credential by key
    async getCredential(key) {
        try {
            const credentials = await this.loadCredentials();
            
            if (!credentials || !credentials[key]) {
                throw new Error(`Credential '${key}' not found`);
            }
            
            return credentials[key];
        } catch (error) {
            console.error(`❌ Failed to get credential '${key}':`, error.message);
            throw error;
        }
    }

    // Set specific credential
    async setCredential(key, value) {
        try {
            let credentials = await this.loadCredentials() || {};
            
            credentials[key] = value;
            await this.storeCredentials(credentials);
            
            console.log(`🔐 Credential '${key}' updated securely`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to set credential '${key}':`, error.message);
            throw error;
        }
    }

    // Remove credential
    async removeCredential(key) {
        try {
            let credentials = await this.loadCredentials() || {};
            
            if (credentials[key]) {
                delete credentials[key];
                await this.storeCredentials(credentials);
                console.log(`🗑️  Credential '${key}' removed`);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error(`❌ Failed to remove credential '${key}':`, error.message);
            throw error;
        }
    }

    // Get house wallet credentials securely
    async getHouseWalletCredentials() {
        try {
            const credentials = await this.loadCredentials();
            
            if (!credentials || !credentials.houseWallet) {
                throw new Error('House wallet credentials not found');
            }
            
            return credentials.houseWallet;
        } catch (error) {
            console.error('❌ Failed to get house wallet credentials:', error.message);
            throw error;
        }
    }

    // Set house wallet credentials securely
    async setHouseWalletCredentials(walletData) {
        try {
            await this.setCredential('houseWallet', {
                address: walletData.address,
                privateKey: walletData.privateKey,
                publicKey: walletData.publicKey,
                encryptedAt: new Date().toISOString(),
                network: process.env.NODE_ENV === 'production' ? 'mainnet' : 'testnet'
            });
            
            console.log('🏦 House wallet credentials stored securely');
            return true;
        } catch (error) {
            console.error('❌ Failed to store house wallet credentials:', error.message);
            throw error;
        }
    }

    // Get database credentials securely
    async getDatabaseCredentials() {
        try {
            const credentials = await this.loadCredentials();
            
            if (!credentials || !credentials.database) {
                // Fallback to environment variables (temporary)
                console.warn('⚠️  Using fallback database credentials from environment');
                return {
                    user: process.env.DB_USER,
                    password: process.env.DB_PASSWORD,
                    database: process.env.DB_NAME,
                    host: process.env.DB_HOST,
                    port: process.env.DB_PORT
                };
            }
            
            return credentials.database;
        } catch (error) {
            console.error('❌ Failed to get database credentials:', error.message);
            throw error;
        }
    }

    // Set database credentials securely
    async setDatabaseCredentials(dbData) {
        try {
            await this.setCredential('database', {
                user: dbData.user,
                password: dbData.password,
                database: dbData.database,
                host: dbData.host,
                port: dbData.port,
                encryptedAt: new Date().toISOString()
            });
            
            console.log('🗄️  Database credentials stored securely');
            return true;
        } catch (error) {
            console.error('❌ Failed to store database credentials:', error.message);
            throw error;
        }
    }

    // Clear all cached credentials from memory
    clearCache() {
        this.decryptedCredentials = null;
        console.log('🧹 Credentials cache cleared from memory');
    }

    // Rotate master key (advanced operation)
    async rotateMasterKey() {
        try {
            console.log('🔄 Starting master key rotation...');
            
            // Load current credentials
            const currentCredentials = await this.loadCredentials();
            
            // Backup current key
            const backupKeyFile = `${this.keyFile}.backup.${Date.now()}`;
            fs.copyFileSync(this.keyFile, backupKeyFile);
            
            // Generate new master key
            this.generateMasterKey();
            
            // Re-encrypt credentials with new key
            if (currentCredentials) {
                await this.storeCredentials(currentCredentials);
            }
            
            console.log('✅ Master key rotation completed successfully');
            console.log(`📁 Backup key stored at: ${backupKeyFile}`);
            
            return true;
        } catch (error) {
            console.error('❌ Master key rotation failed:', error.message);
            throw error;
        }
    }

    // Security health check
    async securityHealthCheck() {
        try {
            const health = {
                status: 'healthy',
                checks: {
                    masterKeyExists: fs.existsSync(this.keyFile),
                    credentialsFileExists: fs.existsSync(this.credentialsFile),
                    canDecrypt: false,
                    keyFilePermissions: null,
                    credentialsFilePermissions: null
                },
                timestamp: new Date().toISOString()
            };

            // Check file permissions
            if (health.checks.masterKeyExists) {
                const keyStats = fs.statSync(this.keyFile);
                health.checks.keyFilePermissions = (keyStats.mode & parseInt('777', 8)).toString(8);
            }

            if (health.checks.credentialsFileExists) {
                const credStats = fs.statSync(this.credentialsFile);
                health.checks.credentialsFilePermissions = (credStats.mode & parseInt('777', 8)).toString(8);
                
                // Test decryption
                try {
                    await this.loadCredentials();
                    health.checks.canDecrypt = true;
                } catch (error) {
                    health.status = 'unhealthy';
                    health.checks.decryptionError = error.message;
                }
            }

            return health;
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Export singleton instance
module.exports = new SecureCredentialsManager();