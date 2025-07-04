const axios = require('axios');
const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');

class StressTestSuite {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
        this.results = {
            testSuite: 'MoonYetis Stress Testing',
            timestamp: new Date(),
            baseUrl,
            tests: [],
            summary: {
                totalTests: 0,
                passed: 0,
                failed: 0,
                totalRequests: 0,
                totalErrors: 0,
                avgResponseTime: 0,
                maxResponseTime: 0,
                minResponseTime: Infinity
            }
        };
        
        this.thresholds = {
            maxResponseTime: 5000, // 5 seconds
            maxErrorRate: 5, // 5%
            minThroughput: 10 // requests per second
        };
    }

    async runFullStressTest() {
        console.log('🔥 Starting MoonYetis Stress Test Suite...\n');
        
        try {
            // Check if server is running
            await this.checkServerHealth();
            
            // Run stress tests in sequence
            await this.testBasicEndpoints();
            await this.testWalletOperations();
            await this.testGameEngine();
            await this.testDatabaseStress();
            await this.testConcurrentUsers();
            await this.testMemoryLeaks();
            await this.testCircuitBreakers();
            await this.testRateLimiting();
            
            // Generate report
            await this.generateReport();
            
            console.log('\n✅ Stress testing completed!');
            return this.results;
            
        } catch (error) {
            console.error('\n❌ Stress testing failed:', error.message);
            throw error;
        }
    }

    async checkServerHealth() {
        console.log('🏥 Checking server health...');
        
        try {
            const response = await axios.get(`${this.baseUrl}/api/monitoring/health`, {
                timeout: 5000
            });
            
            if (response.status === 200) {
                console.log('✅ Server is healthy\n');
            } else {
                throw new Error(`Server returned status ${response.status}`);
            }
        } catch (error) {
            throw new Error(`Server health check failed: ${error.message}`);
        }
    }

    async testBasicEndpoints() {
        console.log('📡 Testing basic endpoints under stress...');
        
        const endpoints = [
            { path: '/api/monitoring/health', name: 'Health Check' },
            { path: '/api/leaderboard', name: 'Leaderboard' },
            { path: '/api/monitoring/metrics', name: 'Metrics' },
            { path: '/', name: 'Homepage' }
        ];
        
        for (const endpoint of endpoints) {
            await this.stressTestEndpoint(endpoint.path, endpoint.name, {
                concurrent: 50,
                requests: 1000,
                method: 'GET'
            });
        }
    }

    async testWalletOperations() {
        console.log('💰 Testing wallet operations under stress...');
        
        const walletTests = [
            {
                path: '/api/blockchain/balance',
                name: 'Balance Check',
                method: 'GET',
                concurrent: 25,
                requests: 500
            },
            {
                path: '/api/blockchain/generate-address',
                name: 'Address Generation',
                method: 'POST',
                data: { network: 'fractal-testnet' },
                concurrent: 20,
                requests: 200
            }
        ];
        
        for (const test of walletTests) {
            await this.stressTestEndpoint(test.path, test.name, test);
        }
    }

    async testGameEngine() {
        console.log('🎰 Testing game engine under stress...');
        
        const gameData = {
            bet: 10,
            lines: 5
        };
        
        await this.stressTestEndpoint('/api/game/spin', 'Game Spin', {
            method: 'POST',
            data: gameData,
            concurrent: 30,
            requests: 300
        });
    }

    async testDatabaseStress() {
        console.log('🗄️ Testing database under stress...');
        
        // Test read-heavy operations
        await this.stressTestEndpoint('/api/leaderboard', 'Database Read Stress', {
            concurrent: 100,
            requests: 2000,
            method: 'GET'
        });
        
        // Test transaction queries
        await this.stressTestEndpoint('/api/blockchain/balance', 'Transaction Query Stress', {
            concurrent: 75,
            requests: 1500,
            method: 'GET'
        });
    }

    async testConcurrentUsers() {
        console.log('👥 Testing concurrent user simulation...');
        
        const userScenarios = [
            { path: '/api/leaderboard', weight: 30 },
            { path: '/api/blockchain/balance', weight: 25 },
            { path: '/api/monitoring/health', weight: 20 },
            { path: '/', weight: 25 }
        ];
        
        const totalRequests = 1000;
        const concurrentUsers = 100;
        
        const promises = [];
        
        for (let i = 0; i < concurrentUsers; i++) {
            const userPromise = this.simulateUser(userScenarios, totalRequests / concurrentUsers);
            promises.push(userPromise);
        }
        
        const startTime = performance.now();
        const results = await Promise.allSettled(promises);
        const endTime = performance.now();
        
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        this.recordTest('Concurrent Users', {
            concurrent: concurrentUsers,
            requests: totalRequests,
            duration: endTime - startTime,
            successful,
            failed,
            successRate: (successful / concurrentUsers) * 100
        });
    }

    async simulateUser(scenarios, requestsPerUser) {
        const requests = [];
        
        for (let i = 0; i < requestsPerUser; i++) {
            // Choose random scenario based on weight
            const scenario = this.weightedRandomChoice(scenarios);
            
            const requestPromise = axios.get(`${this.baseUrl}${scenario.path}`, {
                timeout: 10000
            }).catch(error => {
                // Don't throw, just record the error
                return { error: error.message };
            });
            
            requests.push(requestPromise);
            
            // Random delay between requests (0-500ms)
            await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
        }
        
        return Promise.all(requests);
    }

    weightedRandomChoice(items) {
        const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const item of items) {
            random -= item.weight;
            if (random <= 0) {
                return item;
            }
        }
        
        return items[0]; // fallback
    }

    async testMemoryLeaks() {
        console.log('🧠 Testing for memory leaks...');
        
        const iterations = 10;
        const requestsPerIteration = 100;
        const memorySnapshots = [];
        
        for (let i = 0; i < iterations; i++) {
            // Take memory snapshot
            const memBefore = process.memoryUsage();
            
            // Make requests
            const promises = [];
            for (let j = 0; j < requestsPerIteration; j++) {
                promises.push(
                    axios.get(`${this.baseUrl}/api/monitoring/health`, { timeout: 5000 })
                        .catch(() => {}) // Ignore errors for this test
                );
            }
            
            await Promise.all(promises);
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            const memAfter = process.memoryUsage();
            
            memorySnapshots.push({
                iteration: i + 1,
                heapUsed: memAfter.heapUsed,
                heapTotal: memAfter.heapTotal,
                rss: memAfter.rss,
                heapGrowth: memAfter.heapUsed - memBefore.heapUsed
            });
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Analyze memory growth
        const avgGrowth = memorySnapshots.reduce((sum, snap) => sum + snap.heapGrowth, 0) / iterations;
        const maxHeap = Math.max(...memorySnapshots.map(snap => snap.heapUsed));
        
        this.recordTest('Memory Leak Test', {
            iterations,
            avgHeapGrowth: avgGrowth,
            maxHeapUsage: maxHeap,
            memoryLeak: avgGrowth > 1024 * 1024, // > 1MB average growth
            snapshots: memorySnapshots
        });
    }

    async testCircuitBreakers() {
        console.log('⚡ Testing circuit breakers...');
        
        // First, check circuit breaker status
        const statusResponse = await axios.get(`${this.baseUrl}/api/monitoring/circuit-breakers`);
        const initialStatus = statusResponse.data;
        
        // Attempt to trigger circuit breakers with high load
        await this.stressTestEndpoint('/api/blockchain/balance', 'Circuit Breaker Trigger', {
            concurrent: 100,
            requests: 500,
            method: 'GET',
            expectErrors: true
        });
        
        // Check if circuit breakers activated
        const finalStatusResponse = await axios.get(`${this.baseUrl}/api/monitoring/circuit-breakers`);
        const finalStatus = finalStatusResponse.data;
        
        this.recordTest('Circuit Breaker Test', {
            initialOpenBreakers: initialStatus.global?.openBreakers || 0,
            finalOpenBreakers: finalStatus.global?.openBreakers || 0,
            breakersActivated: (finalStatus.global?.openBreakers || 0) > (initialStatus.global?.openBreakers || 0),
            status: finalStatus
        });
    }

    async testRateLimiting() {
        console.log('🚦 Testing rate limiting...');
        
        // Test rate limits by sending rapid requests
        const rapidRequests = 200;
        const promises = [];
        
        for (let i = 0; i < rapidRequests; i++) {
            promises.push(
                axios.get(`${this.baseUrl}/api/monitoring/metrics`, { timeout: 5000 })
                    .then(response => ({ status: response.status, rateLimited: false }))
                    .catch(error => ({
                        status: error.response?.status || 0,
                        rateLimited: error.response?.status === 429
                    }))
            );
        }
        
        const results = await Promise.all(promises);
        
        const rateLimitedCount = results.filter(r => r.rateLimited).length;
        const successCount = results.filter(r => r.status === 200).length;
        
        this.recordTest('Rate Limiting Test', {
            totalRequests: rapidRequests,
            successful: successCount,
            rateLimited: rateLimitedCount,
            rateLimitingWorking: rateLimitedCount > 0,
            rateLimitingPercentage: (rateLimitedCount / rapidRequests) * 100
        });
    }

    async stressTestEndpoint(path, testName, options = {}) {
        const {
            concurrent = 50,
            requests = 1000,
            method = 'GET',
            data = null,
            expectErrors = false
        } = options;
        
        console.log(`  Testing ${testName}: ${concurrent} concurrent, ${requests} total requests`);
        
        const startTime = performance.now();
        const promises = [];
        const results = [];
        
        for (let i = 0; i < requests; i++) {
            const requestPromise = this.makeRequest(path, method, data)
                .then(response => {
                    results.push({
                        success: true,
                        status: response.status,
                        responseTime: response.responseTime,
                        size: response.data ? JSON.stringify(response.data).length : 0
                    });
                })
                .catch(error => {
                    results.push({
                        success: false,
                        status: error.response?.status || 0,
                        error: error.message,
                        responseTime: 0
                    });
                });
            
            promises.push(requestPromise);
            
            // Control concurrency
            if (promises.length >= concurrent) {
                await Promise.all(promises.splice(0, concurrent));
            }
        }
        
        // Wait for remaining requests
        await Promise.all(promises);
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Calculate metrics
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        const responseTimes = results.filter(r => r.success).map(r => r.responseTime);
        const avgResponseTime = responseTimes.length > 0 
            ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
            : 0;
        const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
        const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
        const throughput = successful / (duration / 1000); // requests per second
        const errorRate = (failed / requests) * 100;
        
        const testResult = {
            name: testName,
            path,
            method,
            concurrent,
            totalRequests: requests,
            successful,
            failed,
            duration,
            avgResponseTime,
            maxResponseTime,
            minResponseTime,
            throughput,
            errorRate,
            passed: this.evaluateTestResult(avgResponseTime, errorRate, throughput, expectErrors)
        };
        
        this.recordTest(testName, testResult);
        
        console.log(`    ✅ ${successful} successful, ❌ ${failed} failed`);
        console.log(`    ⏱️ Avg: ${Math.round(avgResponseTime)}ms, Max: ${Math.round(maxResponseTime)}ms`);
        console.log(`    🚀 Throughput: ${Math.round(throughput)} req/s, Error rate: ${Math.round(errorRate)}%\n`);
    }

    async makeRequest(path, method, data) {
        const startTime = performance.now();
        
        const config = {
            method,
            url: `${this.baseUrl}${path}`,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
            config.data = data;
        }
        
        const response = await axios(config);
        const endTime = performance.now();
        
        response.responseTime = endTime - startTime;
        return response;
    }

    evaluateTestResult(avgResponseTime, errorRate, throughput, expectErrors) {
        if (expectErrors) {
            // For tests where we expect errors (like circuit breaker tests)
            return avgResponseTime < this.thresholds.maxResponseTime;
        }
        
        return avgResponseTime < this.thresholds.maxResponseTime &&
               errorRate < this.thresholds.maxErrorRate &&
               throughput > this.thresholds.minThroughput;
    }

    recordTest(testName, result) {
        this.results.tests.push(result);
        this.results.summary.totalTests++;
        
        if (result.passed !== false) {
            this.results.summary.passed++;
        } else {
            this.results.summary.failed++;
        }
        
        if (result.totalRequests) {
            this.results.summary.totalRequests += result.totalRequests;
        }
        
        if (result.failed) {
            this.results.summary.totalErrors += result.failed;
        }
        
        if (result.avgResponseTime) {
            this.results.summary.avgResponseTime = (
                (this.results.summary.avgResponseTime * (this.results.summary.totalTests - 1) + result.avgResponseTime) / 
                this.results.summary.totalTests
            );
        }
        
        if (result.maxResponseTime > this.results.summary.maxResponseTime) {
            this.results.summary.maxResponseTime = result.maxResponseTime;
        }
        
        if (result.minResponseTime < this.results.summary.minResponseTime) {
            this.results.summary.minResponseTime = result.minResponseTime;
        }
    }

    async generateReport() {
        console.log('📊 Generating stress test report...');
        
        const reportDir = path.join(__dirname, '../reports');
        await fs.mkdir(reportDir, { recursive: true });
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const jsonPath = path.join(reportDir, `stress-test-${timestamp}.json`);
        const htmlPath = path.join(reportDir, `stress-test-${timestamp}.html`);
        
        // Save JSON report
        await fs.writeFile(jsonPath, JSON.stringify(this.results, null, 2));
        
        // Generate HTML report
        const html = this.generateHtmlReport();
        await fs.writeFile(htmlPath, html);
        
        console.log(`📋 Reports generated:`);
        console.log(`  JSON: ${jsonPath}`);
        console.log(`  HTML: ${htmlPath}`);
        
        // Print summary
        this.printSummary();
    }

    generateHtmlReport() {
        const passRate = (this.results.summary.passed / this.results.summary.totalTests) * 100;
        
        return `
<!DOCTYPE html>
<html>
<head>
    <title>MoonYetis Stress Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #e9f5ff; padding: 15px; border-radius: 5px; flex: 1; text-align: center; }
        .test-result { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .passed { border-left: 5px solid #4CAF50; }
        .failed { border-left: 5px solid #f44336; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .status-good { color: #4CAF50; font-weight: bold; }
        .status-warning { color: #ff9800; font-weight: bold; }
        .status-error { color: #f44336; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔥 MoonYetis Stress Test Report</h1>
        <p><strong>Generated:</strong> ${this.results.timestamp}</p>
        <p><strong>Target:</strong> ${this.results.baseUrl}</p>
        <p><strong>Overall Status:</strong> 
            <span class="${passRate >= 80 ? 'status-good' : passRate >= 60 ? 'status-warning' : 'status-error'}">
                ${passRate.toFixed(1)}% Pass Rate
            </span>
        </p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>${this.results.summary.totalTests}</h3>
            <p>Total Tests</p>
        </div>
        <div class="metric">
            <h3>${this.results.summary.totalRequests.toLocaleString()}</h3>
            <p>Total Requests</p>
        </div>
        <div class="metric">
            <h3>${Math.round(this.results.summary.avgResponseTime)}ms</h3>
            <p>Avg Response</p>
        </div>
        <div class="metric">
            <h3>${this.results.summary.totalErrors.toLocaleString()}</h3>
            <p>Total Errors</p>
        </div>
    </div>

    <h2>Test Results</h2>
    ${this.results.tests.map(test => `
    <div class="test-result ${test.passed !== false ? 'passed' : 'failed'}">
        <h3>${test.name} ${test.passed !== false ? '✅' : '❌'}</h3>
        ${test.path ? `<p><strong>Endpoint:</strong> ${test.method} ${test.path}</p>` : ''}
        ${test.totalRequests ? `
        <table>
            <tr><th>Metric</th><th>Value</th></tr>
            <tr><td>Total Requests</td><td>${test.totalRequests.toLocaleString()}</td></tr>
            <tr><td>Successful</td><td>${test.successful?.toLocaleString() || 'N/A'}</td></tr>
            <tr><td>Failed</td><td>${test.failed?.toLocaleString() || 'N/A'}</td></tr>
            <tr><td>Avg Response Time</td><td>${Math.round(test.avgResponseTime || 0)}ms</td></tr>
            <tr><td>Max Response Time</td><td>${Math.round(test.maxResponseTime || 0)}ms</td></tr>
            <tr><td>Throughput</td><td>${Math.round(test.throughput || 0)} req/s</td></tr>
            <tr><td>Error Rate</td><td>${Math.round(test.errorRate || 0)}%</td></tr>
        </table>
        ` : ''}
    </div>
    `).join('')}

    <div style="margin-top: 40px; padding: 20px; background: #f9f9f9; border-radius: 5px;">
        <h3>Performance Thresholds</h3>
        <ul>
            <li>Max Response Time: ${this.thresholds.maxResponseTime}ms</li>
            <li>Max Error Rate: ${this.thresholds.maxErrorRate}%</li>
            <li>Min Throughput: ${this.thresholds.minThroughput} req/s</li>
        </ul>
    </div>
</body>
</html>`;
    }

    printSummary() {
        const { summary } = this.results;
        const passRate = (summary.passed / summary.totalTests) * 100;
        
        console.log('\n📊 STRESS TEST SUMMARY');
        console.log('=======================');
        console.log(`✅ Tests Passed: ${summary.passed}/${summary.totalTests} (${passRate.toFixed(1)}%)`);
        console.log(`📨 Total Requests: ${summary.totalRequests.toLocaleString()}`);
        console.log(`❌ Total Errors: ${summary.totalErrors.toLocaleString()}`);
        console.log(`⏱️ Avg Response Time: ${Math.round(summary.avgResponseTime)}ms`);
        console.log(`🚀 Max Response Time: ${Math.round(summary.maxResponseTime)}ms`);
        
        if (passRate >= 80) {
            console.log('\n🎉 EXCELLENT! System handles stress very well.');
        } else if (passRate >= 60) {
            console.log('\n⚠️ GOOD: System handles stress reasonably well, but has room for improvement.');
        } else {
            console.log('\n🚨 POOR: System struggles under stress. Optimization needed.');
        }
    }
}

// Run stress tests if called directly
if (require.main === module) {
    const stressTest = new StressTestSuite();
    
    stressTest.runFullStressTest()
        .then(results => {
            const passRate = (results.summary.passed / results.summary.totalTests) * 100;
            process.exit(passRate >= 60 ? 0 : 1);
        })
        .catch(error => {
            console.error('Stress test failed:', error);
            process.exit(1);
        });
}

module.exports = StressTestSuite;