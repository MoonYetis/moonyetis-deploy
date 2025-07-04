const crypto = require('crypto');

// Generate random wallet addresses for testing
function generateRandomAddress(context, events, done) {
    const prefix = 'bc1p';
    const randomSuffix = crypto.randomBytes(16).toString('hex');
    context.vars.walletAddress = `${prefix}${randomSuffix}`;
    
    // Random bet amounts for game testing
    context.vars.betAmount = Math.floor(Math.random() * 100) + 1;
    context.vars.lines = Math.floor(Math.random() * 20) + 1;
    
    return done();
}

// Generate realistic user behavior patterns
function generateUserSession(context, events, done) {
    const sessionId = crypto.randomUUID();
    const userId = Math.floor(Math.random() * 10000);
    
    context.vars.sessionId = sessionId;
    context.vars.userId = userId;
    context.vars.userAgent = `MoonYetis-LoadTest-${userId}`;
    
    // Random think times (1-5 seconds)
    context.vars.thinkTime = Math.floor(Math.random() * 4) + 1;
    
    return done();
}

// Track response times and errors
function trackMetrics(context, events, done) {
    const responseTime = context.response.elapsedTime;
    const statusCode = context.response.statusCode;
    
    // Log slow responses (>2 seconds)
    if (responseTime > 2000) {
        console.log(`⚠️ Slow response: ${responseTime}ms for ${context.request.url}`);
    }
    
    // Log errors
    if (statusCode >= 400) {
        console.log(`❌ Error ${statusCode} for ${context.request.url}`);
    }
    
    return done();
}

// Simulate realistic wallet operations
function simulateWalletFlow(context, events, done) {
    const operations = ['balance', 'deposit', 'withdraw', 'history'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    context.vars.operation = operation;
    context.vars.amount = Math.floor(Math.random() * 1000) + 10;
    
    return done();
}

// Generate blockchain transaction data
function generateTransaction(context, events, done) {
    const transactionTypes = ['BRC20_TRANSFER', 'FRACTAL_NATIVE'];
    const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
    
    context.vars.transactionType = type;
    context.vars.fromAddress = `bc1p${crypto.randomBytes(16).toString('hex')}`;
    context.vars.toAddress = `bc1p${crypto.randomBytes(16).toString('hex')}`;
    context.vars.amount = Math.floor(Math.random() * 1000) + 1;
    
    return done();
}

module.exports = {
    generateRandomAddress,
    generateUserSession,
    trackMetrics,
    simulateWalletFlow,
    generateTransaction
};