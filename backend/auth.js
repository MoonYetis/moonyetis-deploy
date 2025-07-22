// Authentication module for MoonYetis Casino
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class AuthManager {
    constructor(database) {
        this.db = database;
        this.jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
        this.saltRounds = 12;
        
        // Prepare statements for performance
        this.statements = {
            createUser: this.db.db.prepare(`
                INSERT INTO users (username, email, password_hash, referral_code, referred_by)
                VALUES (?, ?, ?, ?, ?)
            `),
            getUserByUsername: this.db.db.prepare('SELECT * FROM users WHERE username = ?'),
            getUserByEmail: this.db.db.prepare('SELECT * FROM users WHERE email = ?'),
            getUserById: this.db.db.prepare('SELECT * FROM users WHERE id = ?'),
            getUserByReferralCode: this.db.db.prepare('SELECT id FROM users WHERE referral_code = ?'),
            updateLastLogin: this.db.db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?'),
            updateMoonCoinsBalance: this.db.db.prepare('UPDATE users SET mooncoins_balance = ? WHERE id = ?'),
            incrementMoonCoins: this.db.db.prepare('UPDATE users SET mooncoins_balance = mooncoins_balance + ? WHERE id = ?')
        };
        
        console.log('✅ AuthManager initialized');
    }
    
    // Register new user
    async register(username, email, password, referralCode = null) {
        try {
            // Validate input
            if (!username || !email || !password) {
                throw new Error('Username, email, and password are required');
            }
            
            if (username.length < 3 || username.length > 20) {
                throw new Error('Username must be between 3 and 20 characters');
            }
            
            if (password.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }
            
            // Check if user already exists
            if (this.statements.getUserByUsername.get(username)) {
                throw new Error('Username already exists');
            }
            
            if (this.statements.getUserByEmail.get(email)) {
                throw new Error('Email already registered');
            }
            
            // Validate referral code if provided
            let referrerId = null;
            if (referralCode) {
                const referrer = this.statements.getUserByReferralCode.get(referralCode);
                if (!referrer) {
                    throw new Error('Invalid referral code');
                }
                referrerId = referrer.id;
            }
            
            // Hash password
            const passwordHash = await bcrypt.hash(password, this.saltRounds);
            
            // Generate unique referral code for new user
            const newUserReferralCode = this.db.generateUniqueReferralCode();
            
            // Create user
            const result = this.statements.createUser.run(
                username, email, passwordHash, newUserReferralCode, referrerId
            );
            
            const userId = result.lastInsertRowid;
            
            // Initialize login streak
            this.initializeLoginStreak(userId);
            
            // Create referral record if referred
            if (referrerId) {
                this.createReferralRecord(referrerId, userId);
            }
            
            console.log(`✅ User registered: ${username} (ID: ${userId})`);
            
            return {
                success: true,
                userId: userId,
                username: username,
                referralCode: newUserReferralCode
            };
            
        } catch (error) {
            console.error('❌ Registration error:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Login user
    async login(usernameOrEmail, password) {
        try {
            // Find user by username or email
            let user = this.statements.getUserByUsername.get(usernameOrEmail);
            if (!user) {
                user = this.statements.getUserByEmail.get(usernameOrEmail);
            }
            
            if (!user) {
                throw new Error('User not found');
            }
            
            if (!user.is_active) {
                throw new Error('Account is deactivated');
            }
            
            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                throw new Error('Invalid password');
            }
            
            // Update last login
            this.statements.updateLastLogin.run(user.id);
            
            // Process daily login reward
            const dailyReward = this.processDailyLogin(user.id);
            
            // Generate JWT token
            const token = jwt.sign(
                { 
                    userId: user.id, 
                    username: user.username,
                    email: user.email
                },
                this.jwtSecret,
                { expiresIn: '7d' }
            );
            
            console.log(`✅ User logged in: ${user.username}`);
            
            return {
                success: true,
                token: token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    mooncoinsBalance: user.mooncoins_balance,
                    referralCode: user.referral_code,
                    associatedWallet: user.associated_wallet
                },
                dailyReward: dailyReward
            };
            
        } catch (error) {
            console.error('❌ Login error:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Verify JWT token
    verifyToken(token) {
        try {
            const decoded = jwt.verify(token, this.jwtSecret);
            return {
                success: true,
                userId: decoded.userId,
                username: decoded.username,
                email: decoded.email
            };
        } catch (error) {
            return {
                success: false,
                error: 'Invalid token'
            };
        }
    }
    
    // Initialize login streak for new user
    initializeLoginStreak(userId) {
        const stmt = this.db.db.prepare(`
            INSERT INTO login_streaks (user_id, current_streak, last_login_date)
            VALUES (?, 0, NULL)
        `);
        stmt.run(userId);
    }
    
    // Create referral record
    createReferralRecord(referrerId, referredId) {
        const stmt = this.db.db.prepare(`
            INSERT INTO referrals (referrer_id, referred_id, status)
            VALUES (?, ?, 'pending')
        `);
        stmt.run(referrerId, referredId);
    }
    
    // Process daily login and return reward info
    processDailyLogin(userId) {
        const streakStmt = this.db.db.prepare('SELECT * FROM login_streaks WHERE user_id = ?');
        const streak = streakStmt.get(userId);
        
        if (!streak) {
            this.initializeLoginStreak(userId);
            return this.processDailyLogin(userId);
        }
        
        const today = new Date().toISOString().split('T')[0];
        const lastLogin = streak.last_login_date;
        
        // If already claimed today, return no reward
        if (lastLogin === today) {
            return {
                alreadyClaimed: true,
                currentStreak: streak.current_streak,
                nextReward: this.getStreakReward(streak.current_streak + 1)
            };
        }
        
        let newStreak = streak.current_streak;
        let daysSinceLastLogin = 0;
        
        if (lastLogin) {
            const lastLoginDate = new Date(lastLogin);
            const todayDate = new Date(today);
            daysSinceLastLogin = Math.floor((todayDate - lastLoginDate) / (1000 * 60 * 60 * 24));
        }
        
        // Reset streak if more than 1 day gap
        if (daysSinceLastLogin > 1) {
            newStreak = 1;
        } else if (daysSinceLastLogin === 1) {
            newStreak = Math.min(streak.current_streak + 1, 7);
        } else {
            newStreak = 1; // First login
        }
        
        // Get reward for current day
        const reward = this.getStreakReward(newStreak);
        
        // Update streak
        const updateStreakStmt = this.db.db.prepare(`
            UPDATE login_streaks 
            SET current_streak = ?, 
                longest_streak = MAX(longest_streak, ?),
                last_login_date = ?,
                total_rewards_claimed = total_rewards_claimed + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `);
        updateStreakStmt.run(newStreak, newStreak, today, reward, userId);
        
        // Award MoonCoins
        this.statements.incrementMoonCoins.run(reward, userId);
        
        // Log reward
        this.logReward(userId, 'daily_login', reward, `Day ${newStreak} login streak`, newStreak);
        
        console.log(`✅ Daily login reward: User ${userId}, Day ${newStreak}, Reward: ${reward} MC`);
        
        return {
            reward: reward,
            streakDay: newStreak,
            isStreakComplete: newStreak === 7,
            nextReward: newStreak < 7 ? this.getStreakReward(newStreak + 1) : this.getStreakReward(1)
        };
    }
    
    // Get reward amount for streak day
    getStreakReward(day) {
        const rewards = [0, 5, 5, 8, 8, 10, 10, 4]; // Index 0 unused, days 1-7
        return rewards[day] || 0;
    }
    
    // Log reward in reward_logs table
    logReward(userId, type, amount, reason, streakDay = null, referralId = null) {
        const stmt = this.db.db.prepare(`
            INSERT INTO reward_logs (user_id, type, amount, reason, streak_day, referral_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        stmt.run(userId, type, amount, reason, streakDay, referralId);
    }
    
    // Update user's MoonCoins balance
    updateMoonCoinsBalance(userId, newBalance) {
        this.statements.updateMoonCoinsBalance.run(newBalance, userId);
    }
    
    // Add MoonCoins to user's balance
    addMoonCoins(userId, amount, reason = 'manual') {
        this.statements.incrementMoonCoins.run(amount, userId);
        this.logReward(userId, 'manual', amount, reason);
    }
    
    // Get user by ID
    getUserById(userId) {
        return this.statements.getUserById.get(userId);
    }
}

module.exports = AuthManager;