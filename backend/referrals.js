// Referral system for MoonYetis Casino
class ReferralManager {
    constructor(database, authManager) {
        this.db = database;
        this.auth = authManager;
        
        // Prepared statements for performance
        this.statements = {
            getReferralByReferred: this.db.db.prepare('SELECT * FROM referrals WHERE referred_id = ?'),
            updateReferralStatus: this.db.db.prepare(`
                UPDATE referrals 
                SET status = ?, purchase_date = CURRENT_TIMESTAMP, reward_claimed = 1
                WHERE referred_id = ?
            `),
            getReferralStats: this.db.db.prepare(`
                SELECT 
                    COUNT(*) as total_referrals,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_referrals,
                    SUM(CASE WHEN reward_claimed = 1 THEN reward_amount ELSE 0 END) as total_earned
                FROM referrals 
                WHERE referrer_id = ?
            `),
            getUserReferrals: this.db.db.prepare(`
                SELECT r.*, u.username as referred_username, u.created_at as referred_date
                FROM referrals r
                JOIN users u ON r.referred_id = u.id
                WHERE r.referrer_id = ?
                ORDER BY r.created_at DESC
            `),
            updateUserPurchaseTotal: this.db.db.prepare(`
                UPDATE users SET total_purchased = total_purchased + ? WHERE id = ?
            `)
        };
        
        console.log('✅ ReferralManager initialized');
    }
    
    // Process referral reward when referred user makes first purchase
    async processReferralPurchase(userId, purchaseAmount) {
        try {
            const referral = this.statements.getReferralByReferred.get(userId);
            
            if (!referral) {
                // No referral for this user
                return { success: true, hasReferral: false };
            }
            
            if (referral.reward_claimed) {
                // Reward already claimed
                return { success: true, alreadyClaimed: true };
            }
            
            // Update user's total purchased amount
            this.statements.updateUserPurchaseTotal.run(purchaseAmount, userId);
            
            // Mark referral as completed and reward claimed
            this.statements.updateReferralStatus.run('completed', userId);
            
            // Award 30 MoonCoins to referrer
            const REFERRAL_REWARD = 30;
            this.auth.addMoonCoins(
                referral.referrer_id, 
                REFERRAL_REWARD, 
                `Referral reward for user ${userId}`
            );
            
            // Log the referral reward
            this.auth.logReward(
                referral.referrer_id,
                'referral',
                REFERRAL_REWARD,
                `Referral purchase by ${userId}`,
                null,
                referral.id
            );
            
            console.log(`✅ Referral reward processed: ${REFERRAL_REWARD} MC to user ${referral.referrer_id}`);
            
            return {
                success: true,
                rewardGranted: true,
                referrerId: referral.referrer_id,
                rewardAmount: REFERRAL_REWARD
            };
            
        } catch (error) {
            console.error('❌ Error processing referral purchase:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Get referral statistics for a user
    getReferralStats(userId) {
        try {
            const stats = this.statements.getReferralStats.get(userId);
            const referrals = this.statements.getUserReferrals.all(userId);
            
            return {
                success: true,
                stats: {
                    totalReferrals: stats.total_referrals || 0,
                    successfulReferrals: stats.successful_referrals || 0,
                    totalEarned: stats.total_earned || 0,
                    pendingReferrals: (stats.total_referrals || 0) - (stats.successful_referrals || 0)
                },
                referrals: referrals.map(ref => ({
                    username: ref.referred_username,
                    status: ref.status,
                    referredDate: ref.referred_date,
                    purchaseDate: ref.purchase_date,
                    rewardClaimed: ref.reward_claimed,
                    rewardAmount: ref.reward_amount
                }))
            };
            
        } catch (error) {
            console.error('❌ Error getting referral stats:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Validate referral code
    validateReferralCode(code) {
        try {
            if (!code || code.length !== 8 || !code.startsWith('MOON')) {
                return { valid: false, error: 'Invalid referral code format' };
            }
            
            const user = this.auth.statements.getUserByReferralCode.get(code);
            if (!user) {
                return { valid: false, error: 'Referral code not found' };
            }
            
            return { valid: true, referrerId: user.id };
            
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }
    
    // Get user's own referral code and stats
    getUserReferralInfo(userId) {
        try {
            const user = this.auth.getUserById(userId);
            if (!user) {
                return { success: false, error: 'User not found' };
            }
            
            const stats = this.getReferralStats(userId);
            
            return {
                success: true,
                referralCode: user.referral_code,
                stats: stats.stats,
                recentReferrals: stats.referrals.slice(0, 5) // Last 5 referrals
            };
            
        } catch (error) {
            console.error('❌ Error getting user referral info:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Check if user has pending referral rewards
    checkPendingReferralRewards(userId) {
        try {
            const pendingReferrals = this.db.db.prepare(`
                SELECT COUNT(*) as count
                FROM referrals 
                WHERE referrer_id = ? AND status = 'pending'
            `).get(userId);
            
            return {
                success: true,
                pendingCount: pendingReferrals.count || 0
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Generate referral link for sharing
    generateReferralLink(referralCode, baseUrl = 'http://localhost:8080') {
        return `${baseUrl}?ref=${referralCode}`;
    }
    
    // Admin function to manually process referral (if needed)
    manuallyProcessReferral(referralId, adminNote = '') {
        try {
            const referral = this.db.db.prepare('SELECT * FROM referrals WHERE id = ?').get(referralId);
            
            if (!referral) {
                return { success: false, error: 'Referral not found' };
            }
            
            if (referral.reward_claimed) {
                return { success: false, error: 'Reward already claimed' };
            }
            
            // Award reward
            const REFERRAL_REWARD = 30;
            this.auth.addMoonCoins(
                referral.referrer_id,
                REFERRAL_REWARD,
                `Manual referral reward - ${adminNote}`
            );
            
            // Update referral
            this.statements.updateReferralStatus.run('completed', referral.referred_id);
            
            console.log(`✅ Manual referral processed: ID ${referralId}, ${REFERRAL_REWARD} MC awarded`);
            
            return {
                success: true,
                rewardAmount: REFERRAL_REWARD
            };
            
        } catch (error) {
            console.error('❌ Error in manual referral processing:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = ReferralManager;