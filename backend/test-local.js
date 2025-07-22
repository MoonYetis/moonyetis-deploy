// Local development testing suite
const config = require('./config');

console.log('🧪 MoonYetis Local Testing Suite');
console.log('================================');
console.log('');

// Test configuration
console.log('📋 Configuration Test:');
console.log(`   Environment: ${config.environment}`);
console.log(`   Port: ${config.port}`);
console.log(`   Base URL: ${config.getBaseUrl()}`);
console.log(`   Debug Mode: ${config.debugMode}`);
console.log('');

// Test API endpoints
async function testEndpoints() {
    console.log('🔌 API Endpoints Test:');
    
    const endpoints = [
        '/api/store/health',
        '/api/store/prices',
        '/api/store/products',
        '/api/store/monitor-status'
    ];
    
    for (const endpoint of endpoints) {
        try {
            const url = `${config.getBaseUrl()}${endpoint}`;
            const response = await fetch(url);
            const status = response.ok ? '✅' : '❌';
            console.log(`   ${status} ${endpoint} (${response.status})`);
            
            if (!response.ok) {
                console.log(`      Error: ${response.statusText}`);
            }
        } catch (error) {
            console.log(`   ❌ ${endpoint} (Connection failed)`);
            console.log(`      Error: ${error.message}`);
        }
    }
}

// Test purchase flow
async function testPurchaseFlow() {
    console.log('');
    console.log('🛒 Purchase Flow Test:');
    
    try {
        const purchaseData = {
            userWallet: 'bc1qtest123456789abcdef',
            packId: 'pack1',
            paymentMethod: 'fb'
        };
        
        const response = await fetch(`${config.getBaseUrl()}/api/store/purchase`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(purchaseData)
        });
        
        if (response.ok) {
            const order = await response.json();
            console.log('   ✅ Purchase order created');
            console.log(`      Order ID: ${order.orderId}`);
            console.log(`      Amount: ${order.amount} ${order.currency}`);
            console.log(`      Mooncoins: ${order.mooncoins}`);
            
            // Test order status
            const statusResponse = await fetch(`${config.getBaseUrl()}/api/store/order/${order.orderId}`);
            if (statusResponse.ok) {
                console.log('   ✅ Order status check working');
            } else {
                console.log('   ❌ Order status check failed');
            }
        } else {
            console.log('   ❌ Purchase order failed');
            console.log(`      Status: ${response.status}`);
        }
    } catch (error) {
        console.log('   ❌ Purchase flow test failed');
        console.log(`      Error: ${error.message}`);
    }
}

// Test price updates
async function testPriceUpdates() {
    console.log('');
    console.log('💱 Price Updates Test:');
    
    try {
        const response = await fetch(`${config.getBaseUrl()}/api/store/prices`);
        if (response.ok) {
            const data = await response.json();
            console.log('   ✅ Price data retrieved');
            console.log(`      FB Price: $${data.prices.fb}`);
            console.log(`      MY Price: $${data.prices.my}`);
            
            // Test price calculation
            const productsResponse = await fetch(`${config.getBaseUrl()}/api/store/products`);
            if (productsResponse.ok) {
                const products = await productsResponse.json();
                console.log('   ✅ Product prices calculated');
                console.log(`      Starter Pack FB: ${products.products[0].prices.fb}`);
                console.log(`      Starter Pack MY: ${products.products[0].prices.my}`);
            }
        } else {
            console.log('   ❌ Price data retrieval failed');
        }
    } catch (error) {
        console.log('   ❌ Price updates test failed');
        console.log(`      Error: ${error.message}`);
    }
}

// Main test runner
async function runTests() {
    console.log('🚀 Starting tests...');
    console.log('');
    
    // Wait a bit for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testEndpoints();
    await testPurchaseFlow();
    await testPriceUpdates();
    
    console.log('');
    console.log('✅ Local testing complete');
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Open http://localhost:8080 in browser');
    console.log('   2. Test wallet connection');
    console.log('   3. Test store modal functionality');
    console.log('   4. Verify price updates in UI');
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { runTests, testEndpoints, testPurchaseFlow, testPriceUpdates };