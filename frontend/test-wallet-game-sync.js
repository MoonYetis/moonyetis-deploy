// Test Script: Complete Ecosystem Synchronization (Wallet + Games)
// This tests the full integration between wallet conversions and game balance sync

console.log('🌐 Testing Complete Ecosystem Synchronization...');

function testWalletGameSync() {
    console.log('\n=== WALLET-GAME SYNCHRONIZATION TEST ===');
    
    // Test 1: Check if all systems are available
    console.log('1. Checking system availability...');
    const systems = {
        BalanceManager: !!window.balanceManager,
        WalletConnectionHub: !!window.walletConnectionModal,
        DashboardModal: !!window.dashboardModal,
        CoinFlipGame: !!window.coinFlipGame,
        DiceRollGame: !!window.diceRollGame,
        JupiterLotteryGame: !!window.jupiterLotteryGame,
        MarsFaucetGame: !!window.marsFaucetGame
    };
    
    for (const [system, available] of Object.entries(systems)) {
        console.log(`   ${system}: ${available ? '✅' : '❌'}`);
    }
    
    if (!systems.BalanceManager || !systems.WalletConnectionHub) {
        console.error('❌ Critical systems missing. Test cannot continue.');
        return false;
    }
    
    // Test 2: Simulate wallet connection and initial balance setup
    console.log('\n2. Setting up test environment...');
    
    // Mock user authentication if not already done
    const walletHub = window.walletConnectionModal;
    if (!walletHub.isUserAuthenticated()) {
        console.log('   ⚠️ No wallet connected. Test requires connected wallet.');
        console.log('   Please connect wallet and run again.');
        return false;
    }
    
    // Get initial balances
    const initialFB = walletHub.getUserBalance('FB');
    const initialMY = walletHub.getUserBalance('MY');
    const initialMC = walletHub.getUserBalance('MC');
    const initialGameMC = window.balanceManager.getBalance();
    
    console.log(`   Initial FB: ${initialFB}`);
    console.log(`   Initial MY: ${initialMY}`);
    console.log(`   Initial Wallet MC: ${initialMC}`);
    console.log(`   Initial Game MC: ${initialGameMC}`);
    
    // Test 3: Test Wallet → Game Sync
    console.log('\n3. Testing Wallet → Game Synchronization...');
    
    if (initialMY >= 100) {
        console.log('   Simulating MY→MC conversion in wallet...');
        
        // Simulate conversion: 100 MY → MC (should be ~82 MC with bonus, NO FEE for buying MC)
        const conversionAmount = 100;
        const expectedMC = Math.floor(conversionAmount * 0.8 * 1.03); // 82 MC
        
        // Update wallet balances (simulating dashboard conversion)
        walletHub.updateUserBalance('MY', initialMY - conversionAmount);
        walletHub.updateUserBalance('MC', initialMC + expectedMC);
        
        console.log(`   Simulated: ${conversionAmount} MY → ${expectedMC} MC`);
        
        // Check if BalanceManager was updated
        setTimeout(() => {
            const newGameMC = window.balanceManager.getBalance();
            const expectedTotal = initialGameMC + expectedMC;
            const isSync = newGameMC === expectedTotal;
            
            console.log(`   Expected Game MC: ${expectedTotal}`);
            console.log(`   Actual Game MC: ${newGameMC}`);
            console.log(`   Wallet→Game Sync: ${isSync ? '✅' : '❌'}`);
            
            // Test 4: Test Game → Wallet Sync
            console.log('\n4. Testing Game → Wallet Synchronization...');
            console.log('   Simulating game balance change...');
            
            // Simulate game win/loss
            const gameChange = 50;
            window.balanceManager.addBalance(gameChange, 'Test Game Win');
            
            setTimeout(() => {
                const newWalletMC = walletHub.getUserBalance('MC');
                const expectedWalletMC = initialMC + expectedMC + gameChange;
                const isWalletSync = newWalletMC === expectedWalletMC;
                
                console.log(`   Game added: ${gameChange} MC`);
                console.log(`   Expected Wallet MC: ${expectedWalletMC}`);
                console.log(`   Actual Wallet MC: ${newWalletMC}`);
                console.log(`   Game→Wallet Sync: ${isWalletSync ? '✅' : '❌'}`);
                
                // Test 5: Verify all games are synchronized
                console.log('\n5. Verifying all games are synchronized...');
                
                const currentBalance = window.balanceManager.getBalance();
                const gamesToCheck = [
                    { name: 'Coin Flip', state: window.coinFlipState },
                    { name: 'Dice Roll', state: window.diceRollState },
                    { name: 'Jupiter Lottery', state: window.jupiterLotteryState },
                    { name: 'Mars Faucet', state: window.marsFaucetState }
                ];
                
                let allSynced = true;
                gamesToCheck.forEach(({ name, state }) => {
                    if (!state) {
                        console.log(`   ${name}: ⚠️ Not loaded`);
                        return;
                    }
                    
                    const gameBalance = state.balance || state.moonCoinBalance || 0;
                    const isSync = gameBalance === currentBalance;
                    allSynced = allSynced && isSync;
                    
                    console.log(`   ${name}: ${gameBalance} MC ${isSync ? '✅' : '❌'}`);
                });
                
                // Final Summary
                console.log('\n=== TEST SUMMARY ===');
                console.log(`✅ Systems Available: ${Object.values(systems).filter(Boolean).length}/${Object.keys(systems).length}`);
                console.log(`${isSync ? '✅' : '❌'} Wallet→Game Sync`);
                console.log(`${isWalletSync ? '✅' : '❌'} Game→Wallet Sync`);
                console.log(`${allSynced ? '✅' : '❌'} All Games Synchronized`);
                
                if (isSync && isWalletSync && allSynced) {
                    console.log('\n🎉 COMPLETE ECOSYSTEM SYNCHRONIZATION WORKING PERFECTLY!');
                    console.log('🚀 Users can now:');
                    console.log('   • Convert MY/FB to MC in wallet → See balance instantly in all games');
                    console.log('   • Win/lose in games → See balance update instantly in wallet');
                    console.log('   • All balances stay synchronized across the entire ecosystem');
                } else {
                    console.log('\n⚠️ Some synchronization issues detected. Check integration.');
                }
                
                // Test 6: Test fee conversions (MC → MY, MC → FB)
                console.log('\n6. Testing fee-based conversions...');
                const testMCAmount = 100;
                
                if (walletHub.getUserBalance('MC') >= testMCAmount) {
                    console.log(`   Testing MC→MY conversion with 1% fee...`);
                    
                    // Expected: 100 MC → 120 MY gross → 118.8 MY net (1% fee)
                    const expectedGross = testMCAmount * 1.2; // 120 MY
                    const expectedFee = expectedGross * 0.01; // 1.2 MY
                    const expectedNet = expectedGross - expectedFee; // 118.8 MY
                    
                    console.log(`   Expected: ${testMCAmount} MC → ${expectedGross} MY gross → ${expectedNet} MY net`);
                    console.log(`   Fee: ${expectedFee} MY (1%)`);
                    
                    // Test MC→FB conversion
                    const expectedFBGross = testMCAmount / 67500; // ~0.00148 FB
                    const expectedFBFee = expectedFBGross * 0.01; // ~0.0000148 FB
                    const expectedFBNet = expectedFBGross - expectedFBFee; // ~0.001463 FB
                    
                    console.log(`   Expected: ${testMCAmount} MC → ${expectedFBGross.toFixed(6)} FB gross → ${expectedFBNet.toFixed(6)} FB net`);
                    console.log(`   Fee: ${expectedFBFee.toFixed(6)} FB (1%)`);
                    
                } else {
                    console.log('   ⚠️ Not enough MC for fee conversion test');
                }
                
                console.log('\n=== MANUAL TEST INSTRUCTIONS ===');
                console.log('1. Connect wallet and open dashboard');
                console.log('2. Try MY→MC conversion (need at least 100 MY) - NO FEE');
                console.log('3. Check all games show updated MC balance immediately');
                console.log('4. Try MC→MY conversion (1% fee applies)');
                console.log('5. Try MC→FB conversion (1% fee applies)');
                console.log('6. Play Coin Flip or claim Mars Faucet');
                console.log('7. Check wallet dashboard shows updated balance');
                console.log('\n💡 Fee Structure:');
                console.log('   • Buying MC (FB→MC, MY→MC): NO FEE');
                console.log('   • Selling MC (MC→MY, MC→FB): 1% FEE');
                
                // Reset balances to original state
                console.log('\n🔄 Resetting balances to original state...');
                walletHub.updateUserBalance('MY', initialMY);
                walletHub.updateUserBalance('MC', initialMC);
                window.balanceManager.setBalance(initialGameMC);
                console.log('✅ Reset complete');
                
            }, 500);
            
        }, 500);
        
    } else {
        console.log('   ⚠️ Not enough MY tokens for conversion test (need at least 100)');
        console.log('   Adding test MY tokens...');
        walletHub.updateUserBalance('MY', 1000);
        
        setTimeout(() => {
            console.log('   Test tokens added. Running conversion test...');
            // Recursive call with sufficient balance
            testWalletGameSync();
        }, 1000);
        return;
    }
    
    return true;
}

// Auto-run test if systems are ready
if (typeof window !== 'undefined' && window.balanceManager && window.walletConnectionModal) {
    setTimeout(() => {
        testWalletGameSync();
    }, 1000);
} else {
    console.log('⏳ Waiting for systems to load...');
    setTimeout(() => {
        if (window.balanceManager && window.walletConnectionModal) {
            testWalletGameSync();
        } else {
            console.error('❌ Systems not loaded after waiting');
        }
    }, 5000);
}

console.log('\n💡 To run manual test: testWalletGameSync()');
window.testWalletGameSync = testWalletGameSync;