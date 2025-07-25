// Database module for MoonYetis Casino - User Management & Rewards
const Database = require('better-sqlite3');
const path = require('path');

class MoonYetisDatabase {
    constructor() {
        const dbPath = path.join(__dirname, 'moonyetis.db');
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');
        
        this.initTables();
        console.log('✅ MoonYetis Database initialized');
    }
    
    initTables() {
        // Users table - Traditional registration system
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                mooncoins_balance INTEGER DEFAULT 0,
                associated_wallet TEXT NULL,
                wallet_type TEXT NULL,
                total_purchased REAL DEFAULT 0,
                referral_code TEXT UNIQUE NOT NULL,
                referred_by INTEGER NULL,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME NULL,
                FOREIGN KEY (referred_by) REFERENCES users(id)
            )
        `);
        
        // Login streaks table - 7-day reward system
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS login_streaks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                current_streak INTEGER DEFAULT 0,
                longest_streak INTEGER DEFAULT 0,
                last_login_date DATE NULL,
                total_rewards_claimed INTEGER DEFAULT 0,
                streak_broken_count INTEGER DEFAULT 0,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id)
            )
        `);
        
        // Referrals table - Track referral rewards
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS referrals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                referrer_id INTEGER NOT NULL,
                referred_id INTEGER NOT NULL,
                status TEXT DEFAULT 'pending',
                reward_claimed BOOLEAN DEFAULT 0,
                purchase_date DATETIME NULL,
                reward_amount INTEGER DEFAULT 30,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (referrer_id) REFERENCES users(id),
                FOREIGN KEY (referred_id) REFERENCES users(id),
                UNIQUE(referred_id)
            )
        `);
        
        // Reward logs - Complete history of all rewards
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS reward_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                amount INTEGER NOT NULL,
                reason TEXT NOT NULL,
                streak_day INTEGER NULL,
                referral_id INTEGER NULL,
                metadata TEXT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (referral_id) REFERENCES referrals(id)
            )
        `);
        
        // Transactions table - MoonCoins transactions
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                amount INTEGER NOT NULL,
                currency TEXT DEFAULT 'MC',
                from_wallet TEXT NULL,
                to_address TEXT NULL,
                tx_hash TEXT NULL,
                status TEXT DEFAULT 'pending',
                confirmations INTEGER DEFAULT 0,
                metadata TEXT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
        
        // User deposit addresses table - HD wallet derived addresses
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS user_deposit_addresses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                deposit_address TEXT UNIQUE NOT NULL,
                derivation_path TEXT NOT NULL,
                derivation_index INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id)
            )
        `);
        
        // User deposits table - Track all incoming deposits
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS user_deposits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                deposit_address TEXT NOT NULL,
                tx_hash TEXT UNIQUE NOT NULL,
                amount TEXT NOT NULL,
                token_type TEXT NOT NULL CHECK(token_type IN ('FB', 'MY')),
                confirmations INTEGER DEFAULT 0,
                status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'failed')),
                detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                confirmed_at DATETIME,
                metadata TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
        
        // Add FB and MY balance columns to users table if they don't exist
        try {
            // Check if columns exist
            const stmt = this.db.prepare("PRAGMA table_info(users)");
            const columns = stmt.all();
            const columnNames = columns.map(col => col.name);
            
            if (!columnNames.includes('fb_balance')) {
                this.db.exec(`ALTER TABLE users ADD COLUMN fb_balance TEXT DEFAULT '0'`);
                console.log('✅ Added fb_balance column to users table');
            }
            
            if (!columnNames.includes('my_balance')) {
                this.db.exec(`ALTER TABLE users ADD COLUMN my_balance TEXT DEFAULT '0'`);
                console.log('✅ Added my_balance column to users table');
            }
        } catch (error) {
            console.log('ℹ️ FB/MY balance columns already exist or error adding them:', error.message);
        }
        
        // Indexes for performance
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
            CREATE INDEX IF NOT EXISTS idx_login_streaks_user_id ON login_streaks(user_id);
            CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
            CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
            CREATE INDEX IF NOT EXISTS idx_reward_logs_user_id ON reward_logs(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_deposit_addresses_user_id ON user_deposit_addresses(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_deposit_addresses_address ON user_deposit_addresses(deposit_address);
            CREATE INDEX IF NOT EXISTS idx_user_deposits_user_id ON user_deposits(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_deposits_address ON user_deposits(deposit_address);
            CREATE INDEX IF NOT EXISTS idx_user_deposits_tx_hash ON user_deposits(tx_hash);
        `);
        
        console.log('✅ Database tables initialized');
    }
    
    // Helper method to generate unique referral codes
    generateReferralCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = 'MOON';
        for (let i = 0; i < 4; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    // Check if referral code is unique
    isReferralCodeUnique(code) {
        const stmt = this.db.prepare('SELECT id FROM users WHERE referral_code = ?');
        return !stmt.get(code);
    }
    
    // Generate unique referral code
    generateUniqueReferralCode() {
        let code;
        let attempts = 0;
        do {
            code = this.generateReferralCode();
            attempts++;
        } while (!this.isReferralCodeUnique(code) && attempts < 10);
        
        if (attempts >= 10) {
            throw new Error('Unable to generate unique referral code');
        }
        
        return code;
    }
    
    // Close database connection
    close() {
        this.db.close();
        console.log('✅ Database connection closed');
    }
}

module.exports = MoonYetisDatabase;