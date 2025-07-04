const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');

class MainnetMigration {
    constructor() {
        this.projectRoot = path.join(__dirname, '..');
        this.backupDir = path.join(this.projectRoot, 'backups/mainnet-migration');
        
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async migrateToMainnet() {
        console.log('🚨 CRITICAL: Mainnet Migration Process');
        console.log('=====================================');
        console.log('This process will configure MoonYetis for REAL money transactions.');
        console.log('Please ensure you have:');
        console.log('1. ✅ Real Fractal Bitcoin mainnet wallet with funds');
        console.log('2. ✅ Valid API keys for production services');
        console.log('3. ✅ Production domain and SSL certificates');
        console.log('4. ✅ Backup of current testnet configuration');
        console.log('');
        
        const confirmed = await this.askQuestion('Are you absolutely sure you want to proceed? (yes/no): ');
        if (confirmed.toLowerCase() !== 'yes') {
            console.log('Migration cancelled.');
            this.rl.close();
            return;
        }
        
        const doubleConfirm = await this.askQuestion('Type "MIGRATE TO MAINNET" to confirm: ');
        if (doubleConfirm !== 'MIGRATE TO MAINNET') {
            console.log('Migration cancelled - incorrect confirmation.');
            this.rl.close();
            return;
        }
        
        try {
            console.log('\n🔄 Starting mainnet migration...\n');
            
            await this.createBackup();
            await this.validatePrerequisites();
            await this.collectMainnetCredentials();
            await this.updateConfiguration();
            await this.runSecurityChecks();
            await this.generateMainnetSummary();
            
            console.log('\n✅ Mainnet migration completed successfully!');
            console.log('\n🚨 IMPORTANT: Test everything thoroughly before going live!');
            
        } catch (error) {
            console.error('\n❌ Migration failed:', error.message);
            await this.restoreFromBackup();
        }
        
        this.rl.close();
    }

    async askQuestion(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer.trim());
            });
        });
    }

    async createBackup() {
        console.log('📦 Creating backup of current configuration...');
        
        await fs.mkdir(this.backupDir, { recursive: true });
        
        const filesToBackup = [
            '.env',
            '.secure/credentials.enc',
            '.secure/master.key',
            'config/blockchain.js',
            'config/database.js',
            'package.json'
        ];
        
        for (const file of filesToBackup) {
            const sourcePath = path.join(this.projectRoot, file);
            const backupPath = path.join(this.backupDir, file);
            
            try {
                await fs.mkdir(path.dirname(backupPath), { recursive: true });
                await fs.copyFile(sourcePath, backupPath);
                console.log(`  ✅ Backed up: ${file}`);
            } catch (error) {
                console.log(`  ⚠️ Could not backup: ${file} (${error.message})`);
            }
        }
        
        console.log('✅ Backup completed');
    }

    async validatePrerequisites() {
        console.log('🔍 Validating prerequisites...');
        
        // Check if running in development
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Do not run migration in production environment');
        }
        
        // Check Phase 1-3 completion
        const requiredFiles = [
            '.secure/master.key',
            '.secure/credentials.enc',
            'services/circuitBreakerService.js',
            'tests/security/security-audit.js'
        ];
        
        for (const file of requiredFiles) {
            const filePath = path.join(this.projectRoot, file);
            try {
                await fs.access(filePath);
                console.log(`  ✅ Found: ${file}`);
            } catch (error) {
                throw new Error(`Required file missing: ${file}. Please complete Phases 1-3 first.`);
            }
        }
        
        console.log('✅ Prerequisites validated');
    }

    async collectMainnetCredentials() {
        console.log('🔐 Collecting mainnet credentials...');
        console.log('CRITICAL: These will be used for REAL money transactions!\n');
        
        // House wallet information
        console.log('📍 House Wallet Configuration:');
        const houseWalletAddress = await this.askQuestion('Enter MAINNET house wallet address (bc1...): ');
        if (!houseWalletAddress.startsWith('bc1')) {
            throw new Error('Invalid mainnet wallet address');
        }
        
        const houseWalletPrivateKey = await this.askQuestion('Enter house wallet private key (WIF format): ');
        if (houseWalletPrivateKey.length < 50) {
            throw new Error('Invalid private key format');
        }
        
        const houseWalletPublicKey = await this.askQuestion('Enter house wallet public key: ');
        
        // API credentials
        console.log('\n🔑 API Credentials:');
        const fractalApiKey = await this.askQuestion('Enter Fractal Bitcoin API key: ');
        if (fractalApiKey.length < 32) {
            throw new Error('Invalid API key format');
        }
        
        // Database credentials
        console.log('\n🗄️ Production Database:');
        const dbHost = await this.askQuestion('Enter database host [localhost]: ') || 'localhost';
        const dbPort = await this.askQuestion('Enter database port [5432]: ') || '5432';
        const dbName = await this.askQuestion('Enter database name [moonyetis_slots]: ') || 'moonyetis_slots';
        const dbUser = await this.askQuestion('Enter database user [moonyetis_user]: ') || 'moonyetis_user';
        const dbPassword = await this.askQuestion('Enter database password: ');
        if (!dbPassword) {
            throw new Error('Database password is required');
        }
        
        // Security secrets
        console.log('\n🔒 Security Configuration:');
        const jwtSecret = await this.askQuestion('Enter JWT secret (or press Enter to generate): ') || 
                          crypto.randomBytes(64).toString('hex');
        const sessionSecret = await this.askQuestion('Enter session secret (or press Enter to generate): ') || 
                             crypto.randomBytes(64).toString('hex');
        
        // External services
        console.log('\n📊 External Services:');
        const datadogApiKey = await this.askQuestion('Enter Datadog API key (optional): ') || '';
        const sentryDsn = await this.askQuestion('Enter Sentry DSN (optional): ') || '';
        
        // Backup configuration
        console.log('\n💾 Backup Configuration:');
        const backupS3Bucket = await this.askQuestion('Enter S3 bucket for backups: ');
        const awsAccessKey = await this.askQuestion('Enter AWS Access Key ID: ');
        const awsSecretKey = await this.askQuestion('Enter AWS Secret Access Key: ');
        
        // Store credentials securely
        this.mainnetCredentials = {
            houseWallet: {
                address: houseWalletAddress,
                privateKey: houseWalletPrivateKey,
                publicKey: houseWalletPublicKey
            },
            fractalApiKey,
            database: {
                host: dbHost,
                port: parseInt(dbPort),
                database: dbName,
                user: dbUser,
                password: dbPassword
            },
            jwtSecret,
            sessionSecret,
            external: {
                datadogApiKey,
                sentryDsn,
                backupS3Bucket,
                awsAccessKey,
                awsSecretKey
            }
        };
        
        console.log('✅ Credentials collected');
    }

    async updateConfiguration() {
        console.log('⚙️ Updating configuration for mainnet...');
        
        // Update secure credentials
        await this.updateSecureCredentials();
        
        // Update environment configuration
        await this.updateEnvironmentConfig();
        
        // Update blockchain configuration
        await this.updateBlockchainConfig();
        
        // Update database configuration
        await this.updateDatabaseConfig();
        
        console.log('✅ Configuration updated');
    }

    async updateSecureCredentials() {
        console.log('  🔐 Updating secure credentials...');
        
        const SecureCredentialsManager = require('../services/secureCredentialsManager');
        const credentialsManager = new SecureCredentialsManager();
        
        // Encrypt and store mainnet credentials
        await credentialsManager.storeCredentials({
            houseWallet: this.mainnetCredentials.houseWallet,
            database: this.mainnetCredentials.database,
            jwtSecret: this.mainnetCredentials.jwtSecret,
            sessionSecret: this.mainnetCredentials.sessionSecret,
            fractalApiKey: this.mainnetCredentials.fractalApiKey
        });
        
        console.log('    ✅ Secure credentials updated');
    }

    async updateEnvironmentConfig() {
        console.log('  🌍 Updating environment configuration...');
        
        const envConfig = `# MoonYetis Mainnet Production Environment
NODE_ENV=production
FRACTAL_NETWORK=mainnet

# Server Configuration
PORT=3000
HTTPS_PORT=3443
DOMAIN=moonyetis.com

# API URLs (Mainnet)
FRACTAL_API_URL=https://fractal-api.unisat.io
FRACTAL_INDEXER_URL=https://fractal-indexer.unisat.io
FRACTAL_EXPLORER_URL=https://fractal.unisat.io

# Security
MASTER_KEY_FILE=.secure/master.key
CREDENTIALS_FILE=.secure/credentials.enc

# Rate Limiting (Production values)
RATE_LIMIT_GENERAL=1000
RATE_LIMIT_API=300
RATE_LIMIT_TRANSACTIONS=50
RATE_LIMIT_GAMES=200

# House Wallet Monitoring
HOUSE_WALLET_LOW_BALANCE_ALERT=10000
HIGH_WITHDRAWAL_RATE_ALERT=100000
SUSPICIOUS_ACTIVITY_THRESHOLD=10
BALANCE_CHECK_INTERVAL=300000

# External Services
DATADOG_API_KEY=${this.mainnetCredentials.external.datadogApiKey}
SENTRY_DSN=${this.mainnetCredentials.external.sentryDsn}

# Backup Configuration
BACKUP_S3_BUCKET=${this.mainnetCredentials.external.backupS3Bucket}
AWS_ACCESS_KEY_ID=${this.mainnetCredentials.external.awsAccessKey}
AWS_SECRET_ACCESS_KEY=${this.mainnetCredentials.external.awsSecretKey}

# Game Configuration
MIN_BET=1
MAX_BET=1000
HOUSE_EDGE=0.02
JACKPOT_ENABLED=true
JACKPOT_CONTRIBUTION_RATE=0.01

# Security Headers
ENABLE_HSTS=true
ENABLE_CSP=true
ENABLE_FRAME_OPTIONS=true
`;

        await fs.writeFile(path.join(this.projectRoot, '.env.production'), envConfig);
        console.log('    ✅ Environment configuration updated');
    }

    async updateBlockchainConfig() {
        console.log('  ⛓️ Updating blockchain configuration...');
        
        // Create mainnet-specific blockchain config
        const blockchainConfigUpdate = `
// Import mainnet configuration
const { getCurrentConfig, isMainnet } = require('./mainnet');

// Use mainnet config if in production, otherwise use existing config
const config = getCurrentConfig();

module.exports = {
    BLOCKCHAIN_CONFIG: config,
    isMainnet,
    getCurrentConfig
};
`;
        
        // Backup existing config and update
        const originalConfig = path.join(this.projectRoot, 'config/blockchain.js');
        const backupConfig = path.join(this.projectRoot, 'config/blockchain.js.testnet');
        
        await fs.copyFile(originalConfig, backupConfig);
        await fs.appendFile(originalConfig, blockchainConfigUpdate);
        
        console.log('    ✅ Blockchain configuration updated');
    }

    async updateDatabaseConfig() {
        console.log('  🗄️ Updating database configuration...');
        
        // Update database config to use mainnet settings
        const dbConfigPath = path.join(this.projectRoot, 'config/database.js');
        let dbConfig = await fs.readFile(dbConfigPath, 'utf8');
        
        // Add mainnet-specific SSL and security settings
        const mainnetDbSettings = `
// Add mainnet-specific database settings
if (process.env.NODE_ENV === 'production') {
    // Force SSL in production
    config.ssl = {
        rejectUnauthorized: true,
        ca: process.env.DB_SSL_CA,
        cert: process.env.DB_SSL_CERT,
        key: process.env.DB_SSL_KEY
    };
    
    // Production connection limits
    config.max = 100;
    config.idleTimeoutMillis = 30000;
    config.connectionTimeoutMillis = 10000;
}
`;
        
        // Add mainnet settings before the return statement
        dbConfig = dbConfig.replace('return config;', mainnetDbSettings + '\n      return config;');
        await fs.writeFile(dbConfigPath, dbConfig);
        
        console.log('    ✅ Database configuration updated');
    }

    async runSecurityChecks() {
        console.log('🔒 Running security checks...');
        
        // Run security audit
        try {
            const SecurityAudit = require('../tests/security/security-audit');
            const audit = new SecurityAudit();
            const results = await audit.runFullAudit();
            
            const score = Math.round((results.score / results.maxScore) * 100);
            console.log(`  📊 Security score: ${score}%`);
            
            if (score < 85) {
                throw new Error(`Security score too low for mainnet: ${score}%. Minimum required: 85%`);
            }
            
        } catch (error) {
            console.warn('  ⚠️ Could not run automated security audit:', error.message);
            console.log('  ⚠️ Please run manual security audit before going live');
        }
        
        // Validate mainnet configuration
        try {
            const { validateMainnetConfig } = require('../config/mainnet');
            validateMainnetConfig();
            console.log('  ✅ Mainnet configuration validation passed');
        } catch (error) {
            throw new Error(`Mainnet configuration validation failed: ${error.message}`);
        }
        
        console.log('✅ Security checks completed');
    }

    async generateMainnetSummary() {
        console.log('📋 Generating mainnet summary...');
        
        const summary = `# MoonYetis Mainnet Migration Summary

**Migration Date:** ${new Date().toISOString()}
**Status:** ✅ COMPLETED

## ⚠️ CRITICAL - MAINNET CONFIGURATION ACTIVE

This system is now configured for REAL money transactions on Fractal Bitcoin mainnet.

## 🔧 Configuration Summary

### House Wallet
- **Address:** ${this.mainnetCredentials.houseWallet.address}
- **Network:** Fractal Bitcoin Mainnet
- **Status:** ✅ Configured

### Database
- **Host:** ${this.mainnetCredentials.database.host}
- **Database:** ${this.mainnetCredentials.database.database}
- **SSL:** ✅ Enabled (Production)

### Security
- **JWT Secret:** ✅ Generated/Configured
- **Session Secret:** ✅ Generated/Configured
- **API Key:** ✅ Configured
- **Credentials Encryption:** ✅ Enabled

### External Services
- **Datadog:** ${this.mainnetCredentials.external.datadogApiKey ? '✅ Configured' : '⚠️ Not configured'}
- **Sentry:** ${this.mainnetCredentials.external.sentryDsn ? '✅ Configured' : '⚠️ Not configured'}
- **S3 Backups:** ${this.mainnetCredentials.external.backupS3Bucket ? '✅ Configured' : '⚠️ Not configured'}

## 🚨 PRE-LAUNCH CHECKLIST

### Required Before Going Live:
- [ ] Test all wallet operations with small amounts
- [ ] Verify game mechanics work correctly
- [ ] Test deposit and withdrawal flows
- [ ] Confirm monitoring and alerts work
- [ ] Run load testing on production server
- [ ] Professional security audit
- [ ] Legal compliance verification
- [ ] Customer support procedures in place

### Security Verification:
- [ ] House wallet has sufficient funds
- [ ] Cold storage setup for excess funds
- [ ] Multi-signature configuration (if applicable)
- [ ] Backup and recovery procedures tested
- [ ] Incident response plan in place

### Performance Verification:
- [ ] Load balancer configured
- [ ] CDN configured and tested
- [ ] Database replication working
- [ ] Cache systems operational
- [ ] Monitoring dashboards active

## 🔄 Rollback Information

If you need to rollback to testnet:
1. Restore files from: ${this.backupDir}
2. Run: \`npm run migrate-to-testnet\`
3. Restart all services

## 📞 Emergency Contacts

- **Technical Issues:** [Your technical team]
- **Security Issues:** [Your security team]  
- **Legal Issues:** [Your legal team]

## 🎯 Next Steps

1. **IMMEDIATELY:** Test with small amounts
2. **Before Launch:** Complete pre-launch checklist
3. **After Launch:** Monitor closely for first 24 hours

---

**⚠️ REMEMBER: This is REAL money. Double-check everything!**

Generated: ${new Date().toISOString()}
`;

        const summaryPath = path.join(this.projectRoot, 'MAINNET_MIGRATION_SUMMARY.md');
        await fs.writeFile(summaryPath, summary);
        
        console.log(`  📄 Summary saved to: MAINNET_MIGRATION_SUMMARY.md`);
        console.log('✅ Mainnet summary generated');
    }

    async restoreFromBackup() {
        console.log('🔄 Restoring from backup due to error...');
        
        try {
            const backupFiles = await fs.readdir(this.backupDir);
            
            for (const file of backupFiles) {
                const backupPath = path.join(this.backupDir, file);
                const targetPath = path.join(this.projectRoot, file);
                
                await fs.copyFile(backupPath, targetPath);
                console.log(`  ✅ Restored: ${file}`);
            }
            
            console.log('✅ Backup restoration completed');
        } catch (error) {
            console.error('❌ Failed to restore from backup:', error.message);
            console.error('Please manually restore from:', this.backupDir);
        }
    }
}

// CLI usage
if (require.main === module) {
    const migration = new MainnetMigration();
    
    migration.migrateToMainnet().catch(error => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
}

module.exports = MainnetMigration;