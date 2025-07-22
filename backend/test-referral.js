// Test script to simulate referral reward processing
const MoonYetisDatabase = require('./database');
const AuthManager = require('./auth');
const ReferralManager = require('./referrals');

async function testReferralSystem() {
    console.log('🧪 Testing Referral System...');
    
    // Initialize systems
    const database = new MoonYetisDatabase();
    const authManager = new AuthManager(database);
    const referralManager = new ReferralManager(database, authManager);
    
    // Simulate referral purchase for user ID 2 (referreduser)
    console.log('\n1. Checking referral status before purchase...');
    const beforeStats = referralManager.getReferralStats(1); // referrer user
    console.log('Before:', beforeStats);
    
    console.log('\n2. Processing referral purchase for user 2...');
    const result = await referralManager.processReferralPurchase(2, 3.00); // $3 purchase
    console.log('Referral processing result:', result);
    
    console.log('\n3. Checking referral status after purchase...');
    const afterStats = referralManager.getReferralStats(1); // referrer user
    console.log('After:', afterStats);
    
    console.log('\n4. Checking updated balances...');
    const user1 = authManager.getUserById(1);
    const user2 = authManager.getUserById(2);
    console.log('User 1 (referrer) balance:', user1.mooncoins_balance);
    console.log('User 2 (referred) balance:', user2.mooncoins_balance);
    
    console.log('\n5. Checking referrals table...');
    const referrals = database.db.prepare('SELECT * FROM referrals').all();
    console.log('Referrals:', referrals);
    
    console.log('\n6. Checking reward logs...');
    const rewards = database.db.prepare('SELECT * FROM reward_logs ORDER BY created_at DESC LIMIT 5').all();
    console.log('Recent rewards:', rewards);
    
    database.close();
    console.log('\n✅ Test completed');
}

testReferralSystem().catch(console.error);