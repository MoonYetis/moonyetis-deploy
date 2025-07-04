// Stress Testing Suite for MoonYetis Production
// High-load testing to validate production readiness

const axios = require('axios');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

class StressTest {
    constructor() {
        this.baseUrl = process.env.TEST_BASE_URL || 'https://moonyetis.com';
        this.results = {
            startTime: Date.now(),
            endTime: null,
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            minResponseTime: Infinity,
            maxResponseTime: 0,
            requestsPerSecond: 0,
            errors: [],
            responseTimeDistribution: {},
            statusCodeDistribution: {},
            memoryUsage: [],
            cpuUsage: []
        };
        this.workers = [];
        this.isRunning = false;
    }
    
    async runStressTest() {
        console.log('🏋️ Starting MoonYetis Stress Test Suite');
        console.log('======================================');
        console.log(`Target: ${this.baseUrl}`);
        console.log(`CPU Cores: ${os.cpus().length}`);
        console.log(`Available Memory: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB\n`);
        
        try {
            // Light load test
            await this.runLoadTest('Light Load', 50, 30000, 5); // 50 concurrent, 30 seconds, 5 RPS each
            
            // Medium load test
            await this.runLoadTest('Medium Load', 100, 60000, 10); // 100 concurrent, 60 seconds, 10 RPS each
            
            // Heavy load test
            await this.runLoadTest('Heavy Load', 200, 120000, 15); // 200 concurrent, 120 seconds, 15 RPS each
            
            // Spike test
            await this.runSpikeTest();
            
            // Endurance test
            await this.runEnduranceTest();
            
            // Memory stress test
            await this.runMemoryStressTest();
            
            await this.generateStressReport();
            
        } catch (error) {
            console.error('❌ Stress test suite failed:', error.message);
            throw error;
        }
    }
    
    async runLoadTest(testName, concurrentUsers, duration, requestsPerSecond) {
        console.log(`\n🚀 Running ${testName}...`);
        console.log(`Concurrent Users: ${concurrentUsers}`);
        console.log(`Duration: ${duration / 1000}s`);
        console.log(`Target RPS per user: ${requestsPerSecond}`);
        console.log(`Total Target RPS: ${concurrentUsers * requestsPerSecond}`);
        
        const testResults = await this.executeLoadTest(concurrentUsers, duration, requestsPerSecond);
        
        console.log(`\n📊 ${testName} Results:`);
        console.log(`Total Requests: ${testResults.totalRequests}`);
        console.log(`Successful: ${testResults.successfulRequests} (${((testResults.successfulRequests / testResults.totalRequests) * 100).toFixed(2)}%)`);
        console.log(`Failed: ${testResults.failedRequests} (${((testResults.failedRequests / testResults.totalRequests) * 100).toFixed(2)}%)`);
        console.log(`Average Response Time: ${testResults.averageResponseTime.toFixed(2)}ms`);
        console.log(`Min Response Time: ${testResults.minResponseTime.toFixed(2)}ms`);
        console.log(`Max Response Time: ${testResults.maxResponseTime.toFixed(2)}ms`);
        console.log(`Actual RPS: ${testResults.requestsPerSecond.toFixed(2)}`);
        
        // Evaluate results
        const successRate = (testResults.successfulRequests / testResults.totalRequests) * 100;
        const avgResponseTime = testResults.averageResponseTime;
        
        if (successRate >= 99.5 && avgResponseTime <= 500) {
            console.log(`✅ ${testName}: EXCELLENT - System handles load very well`);
        } else if (successRate >= 99 && avgResponseTime <= 1000) {
            console.log(`✅ ${testName}: GOOD - System handles load adequately`);
        } else if (successRate >= 95 && avgResponseTime <= 2000) {
            console.log(`⚠️ ${testName}: ACCEPTABLE - System shows stress but functions`);
        } else {
            console.log(`❌ ${testName}: POOR - System struggles under load`);
        }
        
        return testResults;
    }
    
    async executeLoadTest(concurrentUsers, duration, requestsPerSecond) {
        const results = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            responseTimes: [],
            errors: [],
            startTime: Date.now()
        };
        
        const workerPromises = [];
        const numWorkers = Math.min(concurrentUsers, os.cpus().length * 2);
        const usersPerWorker = Math.ceil(concurrentUsers / numWorkers);
        
        // Start system monitoring
        const monitoringInterval = this.startSystemMonitoring();
        
        for (let i = 0; i < numWorkers; i++) {
            const actualUsers = Math.min(usersPerWorker, concurrentUsers - i * usersPerWorker);
            if (actualUsers <= 0) break;
            
            const workerPromise = this.createWorker({
                baseUrl: this.baseUrl,
                concurrentUsers: actualUsers,
                duration,
                requestsPerSecond,
                workerId: i
            });
            
            workerPromises.push(workerPromise);
        }
        
        const workerResults = await Promise.all(workerPromises);
        
        // Stop monitoring
        clearInterval(monitoringInterval);
        
        // Aggregate results
        for (const workerResult of workerResults) {
            results.totalRequests += workerResult.totalRequests;
            results.successfulRequests += workerResult.successfulRequests;
            results.failedRequests += workerResult.failedRequests;
            results.responseTimes.push(...workerResult.responseTimes);
            results.errors.push(...workerResult.errors);
        }
        
        const endTime = Date.now();
        const actualDuration = endTime - results.startTime;
        
        return {
            totalRequests: results.totalRequests,
            successfulRequests: results.successfulRequests,
            failedRequests: results.failedRequests,
            averageResponseTime: results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length || 0,
            minResponseTime: Math.min(...results.responseTimes) || 0,
            maxResponseTime: Math.max(...results.responseTimes) || 0,
            requestsPerSecond: results.totalRequests / (actualDuration / 1000),
            errors: results.errors,
            duration: actualDuration
        };
    }
    
    async createWorker(config) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(__filename, {
                workerData: config
            });
            
            worker.on('message', (result) => {
                resolve(result);
            });
            
            worker.on('error', reject);
            worker.on('exit', (code) => {
                if (code !== 0) {
                    reject(new Error(`Worker stopped with exit code ${code}`));
                }
            });
            
            this.workers.push(worker);
        });
    }
    
    async runSpikeTest() {
        console.log('\n⚡ Running Spike Test...');
        console.log('Simulating sudden traffic spikes');
        
        const spikes = [
            { users: 50, duration: 10000 },   // 50 users for 10s
            { users: 200, duration: 5000 },   // Spike to 200 for 5s
            { users: 50, duration: 10000 },   // Back to 50 for 10s
            { users: 500, duration: 3000 },   // Massive spike to 500 for 3s
            { users: 50, duration: 10000 }    // Recovery period
        ];
        
        for (let i = 0; i < spikes.length; i++) {
            const spike = spikes[i];
            console.log(`\nSpike ${i + 1}: ${spike.users} users for ${spike.duration / 1000}s`);
            
            const results = await this.executeLoadTest(spike.users, spike.duration, 10);
            
            const successRate = (results.successfulRequests / results.totalRequests) * 100;
            console.log(`Success Rate: ${successRate.toFixed(2)}%`);
            console.log(`Avg Response Time: ${results.averageResponseTime.toFixed(2)}ms`);
            
            // Brief pause between spikes
            if (i < spikes.length - 1) {
                console.log('Pausing for system recovery...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        console.log('✅ Spike test completed');
    }
    
    async runEnduranceTest() {
        console.log('\n🏃 Running Endurance Test...');
        console.log('Testing system stability over extended period');
        console.log('Duration: 10 minutes with sustained load');
        
        const duration = 10 * 60 * 1000; // 10 minutes
        const concurrentUsers = 100;
        const requestsPerSecond = 5;
        
        const startTime = Date.now();
        const checkpoints = [];
        
        // Monitor performance every minute
        const monitoringInterval = setInterval(async () => {
            const elapsed = Date.now() - startTime;
            console.log(`\nEndurance checkpoint: ${Math.round(elapsed / 60000)} minutes`);
            
            try {
                const healthResponse = await axios.get(`${this.baseUrl}/api/monitoring/health`, { timeout: 5000 });
                const systemResponse = await axios.get(`${this.baseUrl}/api/monitoring/system`, { timeout: 5000 });
                
                checkpoints.push({
                    timestamp: elapsed,
                    health: healthResponse.status === 200,
                    memory: systemResponse.data?.memory?.percentage || 0,
                    cpu: systemResponse.data?.cpu?.usage || 0
                });
                
            } catch (error) {
                checkpoints.push({
                    timestamp: elapsed,
                    health: false,
                    error: error.message
                });
            }
        }, 60000);
        
        // Run the sustained load
        const results = await this.executeLoadTest(concurrentUsers, duration, requestsPerSecond);
        
        clearInterval(monitoringInterval);
        
        console.log('\n📊 Endurance Test Results:');
        console.log(`Total Duration: ${Math.round(results.duration / 60000)} minutes`);
        console.log(`Total Requests: ${results.totalRequests}`);
        console.log(`Success Rate: ${((results.successfulRequests / results.totalRequests) * 100).toFixed(2)}%`);
        console.log(`Average Response Time: ${results.averageResponseTime.toFixed(2)}ms`);
        
        // Check for performance degradation
        const avgMemory = checkpoints.reduce((sum, cp) => sum + (cp.memory || 0), 0) / checkpoints.length;
        const avgCpu = checkpoints.reduce((sum, cp) => sum + (cp.cpu || 0), 0) / checkpoints.length;
        
        console.log(`Average Memory Usage: ${avgMemory.toFixed(1)}%`);
        console.log(`Average CPU Usage: ${avgCpu.toFixed(1)}%`);
        
        if (avgMemory < 80 && avgCpu < 70 && results.successfulRequests / results.totalRequests > 0.99) {
            console.log('✅ Endurance test: EXCELLENT - System maintains performance over time');
        } else {
            console.log('⚠️ Endurance test: System shows signs of stress over time');
        }
        
        return { results, checkpoints };
    }
    
    async runMemoryStressTest() {
        console.log('\n🧠 Running Memory Stress Test...');
        console.log('Testing memory-intensive operations');
        
        const memoryTestEndpoints = [
            '/api/leaderboard',           // Database query
            '/api/game/history',          // Large data sets
            '/api/monitoring/metrics'     // System metrics
        ];
        
        for (const endpoint of memoryTestEndpoints) {
            console.log(`\nTesting endpoint: ${endpoint}`);
            
            const requests = [];
            const concurrentRequests = 50;
            
            // Make many concurrent requests to stress memory
            for (let i = 0; i < concurrentRequests; i++) {
                requests.push(
                    axios.get(`${this.baseUrl}${endpoint}`, { timeout: 10000 })
                        .catch(error => ({ error: error.message }))
                );
            }
            
            const startTime = Date.now();
            const responses = await Promise.all(requests);
            const duration = Date.now() - startTime;
            
            const successful = responses.filter(r => !r.error && r.status === 200).length;
            const successRate = (successful / concurrentRequests) * 100;
            
            console.log(`Concurrent Requests: ${concurrentRequests}`);
            console.log(`Success Rate: ${successRate.toFixed(2)}%`);
            console.log(`Total Duration: ${duration}ms`);
            console.log(`Average per Request: ${(duration / concurrentRequests).toFixed(2)}ms`);
            
            if (successRate >= 95) {
                console.log(`✅ ${endpoint}: Memory handling good`);
            } else {
                console.log(`⚠️ ${endpoint}: Memory stress detected`);
            }
        }
    }
    
    startSystemMonitoring() {
        return setInterval(async () => {
            try {
                const response = await axios.get(`${this.baseUrl}/api/monitoring/system`, { timeout: 3000 });
                
                if (response.status === 200) {
                    const systemData = response.data;
                    
                    this.results.memoryUsage.push({
                        timestamp: Date.now(),
                        usage: systemData.memory?.percentage || 0,
                        rss: systemData.application?.memory?.rss || 0
                    });
                    
                    this.results.cpuUsage.push({
                        timestamp: Date.now(),
                        usage: systemData.cpu?.usage || 0
                    });
                }
            } catch (error) {
                // Ignore monitoring errors during stress test
            }
        }, 5000); // Every 5 seconds
    }
    
    async generateStressReport() {
        console.log('\n📋 Generating Stress Test Report...');
        
        const duration = Date.now() - this.results.startTime;
        
        // Calculate peak memory and CPU usage
        const peakMemory = Math.max(...this.results.memoryUsage.map(m => m.usage));
        const avgMemory = this.results.memoryUsage.reduce((sum, m) => sum + m.usage, 0) / this.results.memoryUsage.length;
        const peakCpu = Math.max(...this.results.cpuUsage.map(c => c.usage));
        const avgCpu = this.results.cpuUsage.reduce((sum, c) => sum + c.usage, 0) / this.results.cpuUsage.length;
        
        const report = `# MoonYetis Stress Test Report

**Test Date:** ${new Date().toISOString()}
**Total Duration:** ${Math.round(duration / 60000)} minutes
**Target System:** ${this.baseUrl}

## 🏋️ Test Summary

### System Performance Under Stress

- **Peak Memory Usage:** ${peakMemory.toFixed(1)}%
- **Average Memory Usage:** ${avgMemory.toFixed(1)}%
- **Peak CPU Usage:** ${peakCpu.toFixed(1)}%
- **Average CPU Usage:** ${avgCpu.toFixed(1)}%

### Load Test Results

#### Light Load (50 concurrent users)
- Target: Low-stress baseline testing
- Expected: >99% success rate, <500ms response time

#### Medium Load (100 concurrent users)
- Target: Normal production load simulation
- Expected: >99% success rate, <1000ms response time

#### Heavy Load (200 concurrent users)
- Target: Peak traffic simulation
- Expected: >95% success rate, <2000ms response time

#### Spike Test
- Target: Sudden traffic increase handling
- Expected: System recovery after spikes

#### Endurance Test (10 minutes sustained)
- Target: Long-term stability validation
- Expected: No performance degradation over time

## 📊 Performance Metrics

### Memory Performance
${peakMemory < 80 ? '✅' : peakMemory < 90 ? '⚠️' : '❌'} **Peak Memory:** ${peakMemory.toFixed(1)}%
${avgMemory < 60 ? '✅' : avgMemory < 75 ? '⚠️' : '❌'} **Average Memory:** ${avgMemory.toFixed(1)}%

### CPU Performance
${peakCpu < 70 ? '✅' : peakCpu < 85 ? '⚠️' : '❌'} **Peak CPU:** ${peakCpu.toFixed(1)}%
${avgCpu < 50 ? '✅' : avgCpu < 70 ? '⚠️' : '❌'} **Average CPU:** ${avgCpu.toFixed(1)}%

## 🎯 Stress Test Evaluation

${this.generateStressEvaluation(peakMemory, avgMemory, peakCpu, avgCpu)}

## 💡 Recommendations

### Immediate Actions Required
${peakMemory > 90 ? '- ⚠️ Memory usage too high - consider increasing server memory or optimizing memory usage' : ''}
${peakCpu > 85 ? '- ⚠️ CPU usage too high - consider scaling horizontally or upgrading CPU' : ''}
${avgMemory > 75 ? '- ⚠️ Sustained high memory usage - investigate memory leaks' : ''}

### Performance Optimizations
- Monitor memory usage patterns during peak traffic
- Consider implementing connection pooling optimizations
- Review database query performance under load
- Implement caching strategies for frequently accessed data

### Scaling Recommendations
${avgCpu > 50 ? '- Consider horizontal scaling (add more instances)' : ''}
${peakMemory > 70 ? '- Consider vertical scaling (increase memory)' : ''}
- Implement auto-scaling based on CPU/memory thresholds
- Set up load balancer health checks

## 🚨 Production Readiness

${this.getProductionReadinessStatus(peakMemory, avgMemory, peakCpu, avgCpu)}

---

**Generated by MoonYetis Stress Testing Suite**
Test ID: ${require('crypto').randomBytes(8).toString('hex')}
`;
        
        const fs = require('fs').promises;
        const path = require('path');
        
        const reportPath = path.join(__dirname, '../../STRESS_TEST_REPORT.md');
        await fs.writeFile(reportPath, report);
        
        // Save detailed JSON results
        const jsonPath = path.join(__dirname, '../../stress-test-results.json');
        await fs.writeFile(jsonPath, JSON.stringify({
            ...this.results,
            endTime: Date.now(),
            peakMemory,
            avgMemory,
            peakCpu,
            avgCpu
        }, null, 2));
        
        console.log(`📄 Stress test report saved: STRESS_TEST_REPORT.md`);
        console.log(`📊 Detailed results saved: stress-test-results.json`);
    }
    
    generateStressEvaluation(peakMemory, avgMemory, peakCpu, avgCpu) {
        if (peakMemory < 80 && avgMemory < 60 && peakCpu < 70 && avgCpu < 50) {
            return `**🎉 EXCELLENT PERFORMANCE**

The system handles stress exceptionally well:
- Memory usage remains well within acceptable limits
- CPU utilization is efficient and sustainable
- System is ready for production deployment with high traffic confidence`;
        } else if (peakMemory < 90 && avgMemory < 75 && peakCpu < 85 && avgCpu < 70) {
            return `**✅ GOOD PERFORMANCE**

The system performs well under stress with minor optimization opportunities:
- Resource usage is within acceptable ranges
- Some optimization could improve efficiency
- Production ready with monitoring recommended`;
        } else {
            return `**⚠️ PERFORMANCE CONCERNS**

The system shows stress under heavy load:
- Resource usage approaching or exceeding recommended limits
- Performance optimization required before production deployment
- Consider infrastructure scaling or code optimization`;
        }
    }
    
    getProductionReadinessStatus(peakMemory, avgMemory, peakCpu, avgCpu) {
        if (peakMemory < 80 && peakCpu < 70) {
            return `**✅ READY FOR PRODUCTION**

Stress testing confirms the system is ready for production deployment:
- Resource utilization within safe limits
- Performance remains stable under heavy load
- Recommended to proceed with production launch`;
        } else if (peakMemory < 90 && peakCpu < 85) {
            return `**⚠️ PRODUCTION READY WITH MONITORING**

System can handle production load but requires close monitoring:
- Set up alerting for memory > 80% and CPU > 70%
- Prepare scaling procedures for high traffic periods
- Monitor performance closely during initial launch`;
        } else {
            return `**❌ NOT READY FOR PRODUCTION**

System requires optimization before production deployment:
- Resource usage too high under stress
- Risk of performance degradation or outages under load
- Complete performance optimization before considering production launch`;
        }
    }
}

// Worker thread code
if (!isMainThread) {
    const config = workerData;
    
    async function runWorkerLoad() {
        const results = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            responseTimes: [],
            errors: []
        };
        
        const startTime = Date.now();
        const endTime = startTime + config.duration;
        const delayBetweenRequests = 1000 / config.requestsPerSecond;
        
        const workers = [];
        
        // Create concurrent user simulations
        for (let i = 0; i < config.concurrentUsers; i++) {
            workers.push(simulateUser(i));
        }
        
        await Promise.all(workers);
        
        parentPort.postMessage(results);
        
        async function simulateUser(userId) {
            while (Date.now() < endTime) {
                const requestStart = Date.now();
                
                try {
                    const response = await axios.get(`${config.baseUrl}/api/monitoring/health`, {
                        timeout: 5000,
                        headers: {
                            'User-Agent': `StressTest-Worker${config.workerId}-User${userId}`
                        }
                    });
                    
                    const responseTime = Date.now() - requestStart;
                    
                    results.totalRequests++;
                    results.responseTimes.push(responseTime);
                    
                    if (response.status === 200) {
                        results.successfulRequests++;
                    } else {
                        results.failedRequests++;
                    }
                    
                } catch (error) {
                    results.totalRequests++;
                    results.failedRequests++;
                    results.errors.push({
                        userId,
                        timestamp: Date.now(),
                        error: error.message
                    });
                }
                
                // Wait before next request
                const elapsed = Date.now() - requestStart;
                const delay = Math.max(0, delayBetweenRequests - elapsed);
                if (delay > 0) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
    }
    
    runWorkerLoad().catch(error => {
        parentPort.postMessage({
            error: error.message,
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            responseTimes: [],
            errors: []
        });
    });
}

// CLI usage
if (require.main === module && isMainThread) {
    const stressTest = new StressTest();
    
    stressTest.runStressTest().then(() => {
        console.log('\n✅ Stress testing completed successfully');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Stress testing failed:', error);
        process.exit(1);
    });
}

module.exports = StressTest;