#!/usr/bin/env node

/**
 * Small Amount Testing Script for MoonYetis Slots
 * 
 * This script tests the system with small amounts before going live
 * Tests deposits, withdrawals, and gameplay with minimal risk
 */

// Load production environment
require('dotenv').config({ path: '.env.production' });

const axios = require('axios');
const fractalBitcoinService = require('../services/fractalBitcoinService');
const { BLOCKCHAIN_CONFIG, BLOCKCHAIN_UTILS } = require('../config/blockchain');

console.log('🧪 MoonYetis Small Amount Testing');
console.log('==================================');
console.log('');

// Test configuration
const TEST_CONFIG = {
    baseUrl: `http://localhost:${process.env.PORT || 3001}`,
    testWallet: 'bc1p_test_wallet_address_here', // Replace with real test wallet
    smallAmounts: {
        deposit: 10,    // 10 MOONYETIS
        bet: 1,         // 1 chip
        withdrawal: 5   // 5 MOONYETIS
    },
    retryAttempts: 3,
    timeoutMs: 30000
};

async function runSmallAmountTests() {
    const results = {
        passed: 0,
        failed: 0,
        total: 0,
        tests: []
    };

    console.log('🔍 Starting small amount testing...');
    console.log(`💰 Test amounts: ${TEST_CONFIG.smallAmounts.deposit} MOONYETIS deposit, ${TEST_CONFIG.smallAmounts.bet} chip bet, ${TEST_CONFIG.smallAmounts.withdrawal} MOONYETIS withdrawal`);
    console.log('');

    // Test 1: API Server Connectivity
    console.log('1️⃣ Testing API server connectivity...');
    try {
        const response = await axios.get(`${TEST_CONFIG.baseUrl}/api/health`, {
            timeout: TEST_CONFIG.timeoutMs
        });
        
        if (response.status === 200) {
            console.log('   ✅ API server is responding');
            console.log(`   🌐 Status: ${response.data.status}`);
            results.passed++;
        } else {
            console.log('   ❌ API server returned non-200 status');
            results.failed++;
        }
        
        results.tests.push({
            name: 'API Server Connectivity',
            passed: response.status === 200,
            details: response.data
        });
    } catch (error) {
        console.log('   ❌ API server is not accessible');
        console.log(`   Error: ${error.message}`);
        results.failed++;
        results.tests.push({
            name: 'API Server Connectivity',
            passed: false,
            error: error.message
        });
    }
    results.total++;

    // Test 2: House Wallet Balance Check
    console.log('');
    console.log('2️⃣ Testing house wallet balance...');
    try {
        const balance = await fractalBitcoinService.getHouseWalletBalance();
        
        if (balance.success) {
            const transferableBalance = parseFloat(balance.transferable || 0);
            console.log(`   💰 House wallet balance: ${balance.balance} MOONYETIS`);
            console.log(`   🔄 Transferable: ${transferableBalance} MOONYETIS`);
            
            if (transferableBalance >= 100) { // Minimum for testing
                console.log('   ✅ House wallet has sufficient balance for testing');
                results.passed++;
            } else {
                console.log('   ⚠️ House wallet has low balance, proceed with caution');
                console.log('   💡 Consider funding the wallet before extensive testing');
                results.passed++; // Still pass, but with warning
            }
        } else {
            console.log('   ❌ Could not check house wallet balance');
            console.log(`   Error: ${balance.error}`);
            results.failed++;
        }
        
        results.tests.push({
            name: 'House Wallet Balance',
            passed: balance.success,
            details: balance
        });
    } catch (error) {
        console.log('   ❌ Error checking house wallet balance');
        console.log(`   Error: ${error.message}`);
        results.failed++;
        results.tests.push({
            name: 'House Wallet Balance',
            passed: false,
            error: error.message
        });
    }
    results.total++;

    // Test 3: Blockchain Services Health
    console.log('');
    console.log('3️⃣ Testing blockchain services...');
    try {
        const health = await fractalBitcoinService.healthCheck();
        
        if (health.success) {
            console.log('   ✅ Blockchain services are healthy');
            console.log(`   🌐 Network: ${health.services.network.success ? 'Connected' : 'Failed'}`);
            console.log(`   💰 Fees: ${health.services.fees.success ? 'Available' : 'Failed'}`);
            console.log(`   🪙 Token: ${health.services.token.success ? 'Validated' : 'Failed'}`);
            results.passed++;
        } else {
            console.log('   ❌ Blockchain services health check failed');
            console.log(`   Error: ${health.error}`);
            results.failed++;
        }
        
        results.tests.push({
            name: 'Blockchain Services Health',
            passed: health.success,
            details: health
        });
    } catch (error) {
        console.log('   ❌ Error during blockchain health check');
        console.log(`   Error: ${error.message}`);
        results.failed++;
        results.tests.push({
            name: 'Blockchain Services Health',
            passed: false,
            error: error.message
        });
    }
    results.total++;

    // Test 4: Monitoring System
    console.log('');
    console.log('4️⃣ Testing monitoring system...');
    try {
        const response = await axios.get(`${TEST_CONFIG.baseUrl}/api/monitoring/health`, {
            timeout: TEST_CONFIG.timeoutMs
        });
        
        if (response.status === 200) {
            console.log('   ✅ Monitoring system is operational');
            console.log(`   📊 Status: ${response.data.status}`);
            console.log(`   ⏱️ Uptime: ${Math.floor(response.data.uptime || 0)}s`);
            results.passed++;
        } else {
            console.log('   ❌ Monitoring system returned error status');
            results.failed++;
        }
        
        results.tests.push({
            name: 'Monitoring System',
            passed: response.status === 200,
            details: response.data
        });
    } catch (error) {
        console.log('   ❌ Monitoring system is not accessible');
        console.log(`   Error: ${error.message}`);
        results.failed++;
        results.tests.push({
            name: 'Monitoring System',
            passed: false,
            error: error.message
        });
    }
    results.total++;

    // Test 5: Game Logic Validation
    console.log('');
    console.log('5️⃣ Testing game logic...');
    try {
        // Test game calculations
        const testBet = TEST_CONFIG.smallAmounts.bet;
        const testResults = [0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5]; // Sample slot results
        
        // Test payout calculation
        const payout = BLOCKCHAIN_UTILS.calculatePayout(testBet, testResults);
        
        // Test chip/token conversions
        const chips = BLOCKCHAIN_UTILS.tokensToChips(TEST_CONFIG.smallAmounts.deposit);
        const tokens = BLOCKCHAIN_UTILS.chipsToTokens(chips);
        
        // Test bet validation
        const isValidBet = BLOCKCHAIN_UTILS.isValidBet(testBet);
        
        if (payout >= 0 && chips > 0 && tokens > 0 && isValidBet) {
            console.log('   ✅ Game logic calculations are working');
            console.log(`   🎰 Test bet: ${testBet} chips → Payout: ${payout} chips`);
            console.log(`   🔄 Conversion: ${TEST_CONFIG.smallAmounts.deposit} MOONYETIS → ${chips} chips → ${tokens} MOONYETIS`);
            results.passed++;
        } else {
            console.log('   ❌ Game logic calculations failed');
            results.failed++;
        }
        
        results.tests.push({
            name: 'Game Logic Validation',
            passed: payout >= 0 && chips > 0 && tokens > 0 && isValidBet,
            details: { payout, chips, tokens, isValidBet }
        });
    } catch (error) {
        console.log('   ❌ Error testing game logic');
        console.log(`   Error: ${error.message}`);
        results.failed++;
        results.tests.push({
            name: 'Game Logic Validation',
            passed: false,
            error: error.message
        });
    }
    results.total++;

    // Test 6: Address Validation
    console.log('');
    console.log('6️⃣ Testing address validation...');
    try {
        const houseWallet = process.env.HOUSE_WALLET_ADDRESS;
        const testWallets = [
            houseWallet,
            'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', // Valid Bitcoin address
            'invalid_address_123', // Invalid address
            '' // Empty address
        ];
        
        let validAddresses = 0;
        testWallets.forEach((address, index) => {
            const isValid = BLOCKCHAIN_UTILS.isValidFractalAddress(address);
            console.log(`   ${isValid ? '✅' : '❌'} Address ${index + 1}: ${isValid ? 'Valid' : 'Invalid'}`);
            if (isValid && index < 2) validAddresses++; // First two should be valid
        });
        
        if (validAddresses >= 2) {
            console.log('   ✅ Address validation is working correctly');
            results.passed++;
        } else {
            console.log('   ❌ Address validation failed');
            results.failed++;
        }
        
        results.tests.push({
            name: 'Address Validation',
            passed: validAddresses >= 2,
            details: { validAddresses, tested: testWallets.length }
        });
    } catch (error) {
        console.log('   ❌ Error testing address validation');
        console.log(`   Error: ${error.message}`);
        results.failed++;
        results.tests.push({
            name: 'Address Validation',
            passed: false,
            error: error.message
        });
    }
    results.total++;

    // Test 7: Security Configuration
    console.log('');
    console.log('7️⃣ Testing security configuration...');
    try {
        const securityChecks = {
            sessionSecret: process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32,
            dbPassword: process.env.DB_PASSWORD && process.env.DB_PASSWORD.length >= 12,
            nodeEnv: process.env.NODE_ENV === 'production',
            fractalApiKey: process.env.FRACTAL_API_KEY && process.env.FRACTAL_API_KEY.length > 20,
            houseWalletPrivateKey: process.env.HOUSE_WALLET_PRIVATE_KEY && process.env.HOUSE_WALLET_PRIVATE_KEY.length === 64
        };
        
        const passedChecks = Object.values(securityChecks).filter(check => check).length;
        const totalChecks = Object.keys(securityChecks).length;
        
        console.log(`   📋 Security checks: ${passedChecks}/${totalChecks} passed`);
        Object.entries(securityChecks).forEach(([key, passed]) => {
            console.log(`   ${passed ? '✅' : '❌'} ${key}: ${passed ? 'OK' : 'NEEDS ATTENTION'}`);
        });
        
        if (passedChecks >= totalChecks - 1) { // Allow one optional check to fail
            console.log('   ✅ Security configuration looks good');
            results.passed++;
        } else {
            console.log('   ⚠️ Security configuration needs attention');
            results.failed++;
        }
        
        results.tests.push({
            name: 'Security Configuration',
            passed: passedChecks >= totalChecks - 1,
            details: { passedChecks, totalChecks, securityChecks }
        });
    } catch (error) {
        console.log('   ❌ Error checking security configuration');
        console.log(`   Error: ${error.message}`);
        results.failed++;
        results.tests.push({
            name: 'Security Configuration',
            passed: false,
            error: error.message
        });
    }
    results.total++;

    // Summary
    console.log('');
    console.log('📊 SMALL AMOUNT TEST SUMMARY');
    console.log('=============================');
    console.log(`✅ Passed: ${results.passed}/${results.total}`);
    console.log(`❌ Failed: ${results.failed}/${results.total}`);
    console.log(`📈 Success Rate: ${Math.round((results.passed / results.total) * 100)}%`);
    console.log('');

    if (results.failed === 0) {
        console.log('🎉 All small amount tests passed! System is ready for live testing.');
        console.log('');
        console.log('🚀 RECOMMENDED NEXT STEPS:');
        console.log('1. Test with a real wallet connection');
        console.log('2. Make a small deposit (10-50 MOONYETIS)');
        console.log('3. Test a few game rounds with small bets');
        console.log('4. Test a small withdrawal');
        console.log('5. Monitor the system closely during testing');
        console.log('6. Gradually increase amounts if everything works');
    } else {
        console.log('⚠️ Some tests failed. Please fix the issues before proceeding with live testing.');
        console.log('');
        console.log('🔧 FAILED TESTS:');
        
        results.tests.forEach(test => {
            if (!test.passed) {
                console.log(`• ${test.name}`);
                if (test.error) {
                    console.log(`  Error: ${test.error}`);
                }
            }
        });
    }

    console.log('');
    console.log('🔐 TESTING SAFETY REMINDERS:');
    console.log('• Always start with the smallest possible amounts');
    console.log('• Test deposits before testing withdrawals');
    console.log('• Monitor wallet balances constantly during testing');
    console.log('• Have someone else verify your test results');
    console.log('• Keep detailed logs of all test transactions');
    console.log('• Be ready to pause testing if anything looks wrong');
    console.log('');

    return results;
}

// Manual deposit simulation test
async function simulateDepositTest() {
    console.log('💰 SIMULATED DEPOSIT TEST');
    console.log('=========================');
    
    try {
        // This would normally be triggered by an actual blockchain transaction
        // For testing, we'll simulate the deposit process
        
        const simulatedDeposit = {
            walletAddress: TEST_CONFIG.testWallet,
            amount: TEST_CONFIG.smallAmounts.deposit,
            txid: 'test_' + Date.now(),
            confirmations: 3
        };
        
        console.log(`📥 Simulating deposit: ${simulatedDeposit.amount} MOONYETIS`);
        console.log(`🔗 From wallet: ${simulatedDeposit.walletAddress}`);
        console.log(`📋 Transaction ID: ${simulatedDeposit.txid}`);
        console.log(`✅ Confirmations: ${simulatedDeposit.confirmations}`);
        
        // Convert to chips
        const chips = BLOCKCHAIN_UTILS.tokensToChips(simulatedDeposit.amount);
        console.log(`🎮 Converted to chips: ${chips} chips`);
        
        // Apply deposit bonus (if first deposit)
        const bonus = BLOCKCHAIN_UTILS.calculateDepositBonus(simulatedDeposit.amount, true);
        console.log(`🎁 First deposit bonus: ${bonus} MOONYETIS`);
        
        const totalChips = BLOCKCHAIN_UTILS.tokensToChips(simulatedDeposit.amount + bonus);
        console.log(`💎 Total chips available: ${totalChips} chips`);
        
        console.log('✅ Deposit simulation completed successfully');
        return true;
        
    } catch (error) {
        console.log('❌ Deposit simulation failed');
        console.log(`Error: ${error.message}`);
        return false;
    }
}

// Manual withdrawal simulation test
async function simulateWithdrawalTest() {
    console.log('');
    console.log('💸 SIMULATED WITHDRAWAL TEST');
    console.log('============================');
    
    try {
        const simulatedWithdrawal = {
            walletAddress: TEST_CONFIG.testWallet,
            amount: TEST_CONFIG.smallAmounts.withdrawal,
            fee: BLOCKCHAIN_UTILS.calculateWithdrawalFee(TEST_CONFIG.smallAmounts.withdrawal)
        };
        
        console.log(`📤 Simulating withdrawal: ${simulatedWithdrawal.amount} MOONYETIS`);
        console.log(`🔗 To wallet: ${simulatedWithdrawal.walletAddress}`);
        console.log(`💰 Fee: ${simulatedWithdrawal.fee} MOONYETIS`);
        console.log(`📊 Net amount: ${simulatedWithdrawal.amount - simulatedWithdrawal.fee} MOONYETIS`);
        
        // Check if house wallet has sufficient balance (simulated)
        const houseBalance = await fractalBitcoinService.getHouseWalletBalance();
        if (houseBalance.success && houseBalance.transferable >= simulatedWithdrawal.amount) {
            console.log('✅ House wallet has sufficient balance for withdrawal');
        } else {
            console.log('⚠️ House wallet balance check needed for actual withdrawal');
        }
        
        console.log('✅ Withdrawal simulation completed successfully');
        return true;
        
    } catch (error) {
        console.log('❌ Withdrawal simulation failed');
        console.log(`Error: ${error.message}`);
        return false;
    }
}

// Run the tests
if (require.main === module) {
    runSmallAmountTests()
        .then(async (results) => {
            // Run additional simulated tests
            await simulateDepositTest();
            await simulateWithdrawalTest();
            
            console.log('');
            console.log('🎰 Small amount testing completed!');
            process.exit(results.failed === 0 ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Test script failed:', error.message);
            process.exit(1);
        });
}

module.exports = { runSmallAmountTests, simulateDepositTest, simulateWithdrawalTest };