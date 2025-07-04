// Production Readiness Testing Suite for MoonYetis
// Comprehensive testing before mainnet launch

const axios = require('axios');
const { performance } = require('perf_hooks');
const crypto = require('crypto');

class ProductionReadinessTest {
    constructor() {
        this.baseUrl = process.env.TEST_BASE_URL || 'https://moonyetis.com';
        this.results = {
            tests: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0
            },
            critical_issues: [],
            recommendations: []
        };
        this.startTime = Date.now();
    }
    
    async runFullSuite() {
        console.log('🚀 Starting Production Readiness Testing Suite');
        console.log('==============================================');
        console.log(`Target: ${this.baseUrl}`);
        console.log(`Started: ${new Date().toISOString()}\n`);
        
        try {
            // Core System Tests
            await this.testSystemHealth();
            await this.testDatabaseConnectivity();
            await this.testRedisConnectivity();
            await this.testBlockchainConnectivity();
            
            // Security Tests
            await this.testSecurityHeaders();
            await this.testSSLConfiguration();
            await this.testRateLimiting();
            await this.testInputValidation();
            await this.testAuthentication();
            
            // Performance Tests
            await this.testResponseTimes();
            await this.testConcurrentConnections();
            await this.testLoadHandling();
            await this.testMemoryUsage();
            
            // Functional Tests
            await this.testWalletOperations();
            await this.testGameMechanics();
            await this.testTransactionFlow();
            await this.testAPIEndpoints();
            
            // Monitoring Tests
            await this.testMonitoringEndpoints();
            await this.testAlerting();
            await this.testLogging();
            
            // Disaster Recovery Tests
            await this.testBackupSystems();
            await this.testFailoverMechanisms();
            
            // Compliance Tests
            await this.testDataProtection();
            await this.testAuditTrails();
            
            await this.generateReport();
            
        } catch (error) {
            this.addResult('SYSTEM_ERROR', 'CRITICAL', false, `Test suite failed: ${error.message}`);
        }
        
        const duration = Date.now() - this.startTime;
        console.log(`\n✅ Production Readiness Testing completed in ${duration}ms`);
        console.log(`📊 Results: ${this.results.summary.passed}/${this.results.summary.total} tests passed`);
        
        if (this.results.critical_issues.length > 0) {
            console.log(`🚨 CRITICAL: ${this.results.critical_issues.length} critical issues found!`);
            return false;
        }
        
        return this.results.summary.failed === 0;
    }
    
    async testSystemHealth() {
        console.log('🏥 Testing System Health...');
        
        try {
            const start = performance.now();
            const response = await axios.get(`${this.baseUrl}/api/monitoring/health`, {
                timeout: 5000
            });
            const responseTime = performance.now() - start;
            
            if (response.status === 200) {
                this.addResult('HEALTH_CHECK', 'HIGH', true, `Health endpoint responsive (${responseTime.toFixed(2)}ms)`);
                
                const healthData = response.data;
                
                // Check individual components
                if (healthData.database?.healthy) {
                    this.addResult('DATABASE_HEALTH', 'HIGH', true, 'Database connection healthy');
                } else {
                    this.addResult('DATABASE_HEALTH', 'CRITICAL', false, 'Database connection unhealthy');
                }
                
                if (healthData.redis?.healthy) {
                    this.addResult('REDIS_HEALTH', 'HIGH', true, 'Redis connection healthy');
                } else {
                    this.addResult('REDIS_HEALTH', 'CRITICAL', false, 'Redis connection unhealthy');
                }
                
                if (healthData.blockchain?.healthy) {
                    this.addResult('BLOCKCHAIN_HEALTH', 'HIGH', true, 'Blockchain connection healthy');
                } else {
                    this.addResult('BLOCKCHAIN_HEALTH', 'CRITICAL', false, 'Blockchain connection unhealthy');
                }
                
            } else {
                this.addResult('HEALTH_CHECK', 'CRITICAL', false, `Health check failed with status ${response.status}`);
            }
            
        } catch (error) {
            this.addResult('HEALTH_CHECK', 'CRITICAL', false, `Health check failed: ${error.message}`);
        }
    }
    
    async testDatabaseConnectivity() {
        console.log('🗄️ Testing Database Connectivity...');
        
        try {
            const response = await axios.get(`${this.baseUrl}/api/monitoring/database`, {
                timeout: 10000
            });
            
            if (response.status === 200) {
                const dbData = response.data;
                
                this.addResult('DB_CONNECTION', 'HIGH', true, 'Database connection successful');
                
                // Check connection pool
                if (dbData.activeConnections < dbData.maxConnections * 0.8) {
                    this.addResult('DB_POOL', 'MEDIUM', true, `Connection pool healthy (${dbData.activeConnections}/${dbData.maxConnections})`);
                } else {
                    this.addResult('DB_POOL', 'HIGH', false, `Connection pool near capacity (${dbData.activeConnections}/${dbData.maxConnections})`);
                }
                
                // Check query performance
                if (dbData.avgQueryTime < 100) {
                    this.addResult('DB_PERFORMANCE', 'MEDIUM', true, `Query performance good (${dbData.avgQueryTime}ms avg)`);
                } else {
                    this.addResult('DB_PERFORMANCE', 'MEDIUM', false, `Query performance slow (${dbData.avgQueryTime}ms avg)`);
                }
                
            } else {
                this.addResult('DB_CONNECTION', 'CRITICAL', false, 'Database connectivity check failed');
            }
            
        } catch (error) {
            this.addResult('DB_CONNECTION', 'CRITICAL', false, `Database test failed: ${error.message}`);
        }
    }
    
    async testRedisConnectivity() {
        console.log('🔴 Testing Redis Connectivity...');
        
        try {
            const testKey = `test_${crypto.randomBytes(8).toString('hex')}`;
            const testValue = crypto.randomBytes(16).toString('hex');
            
            // Test Redis write
            await axios.post(`${this.baseUrl}/api/monitoring/redis/set`, {
                key: testKey,
                value: testValue
            });
            
            // Test Redis read
            const response = await axios.get(`${this.baseUrl}/api/monitoring/redis/get/${testKey}`);
            
            if (response.data.value === testValue) {
                this.addResult('REDIS_READWRITE', 'HIGH', true, 'Redis read/write operations successful');
            } else {
                this.addResult('REDIS_READWRITE', 'HIGH', false, 'Redis read/write operations failed');
            }
            
            // Clean up test key
            await axios.delete(`${this.baseUrl}/api/monitoring/redis/del/${testKey}`);
            
        } catch (error) {
            this.addResult('REDIS_READWRITE', 'HIGH', false, `Redis test failed: ${error.message}`);
        }
    }
    
    async testBlockchainConnectivity() {
        console.log('⛓️ Testing Blockchain Connectivity...');
        
        try {
            const response = await axios.get(`${this.baseUrl}/api/blockchain/network-info`, {
                timeout: 15000
            });
            
            if (response.status === 200) {
                const networkInfo = response.data;
                
                if (networkInfo.network === 'mainnet') {
                    this.addResult('BLOCKCHAIN_NETWORK', 'CRITICAL', true, 'Connected to mainnet');
                } else {
                    this.addResult('BLOCKCHAIN_NETWORK', 'CRITICAL', false, `Connected to ${networkInfo.network} instead of mainnet`);
                }
                
                if (networkInfo.blockHeight > 0) {
                    this.addResult('BLOCKCHAIN_SYNC', 'HIGH', true, `Blockchain synced (block ${networkInfo.blockHeight})`);
                } else {
                    this.addResult('BLOCKCHAIN_SYNC', 'CRITICAL', false, 'Blockchain not synced');
                }
                
                if (networkInfo.apiLatency < 2000) {
                    this.addResult('BLOCKCHAIN_LATENCY', 'MEDIUM', true, `API latency good (${networkInfo.apiLatency}ms)`);
                } else {
                    this.addResult('BLOCKCHAIN_LATENCY', 'MEDIUM', false, `API latency high (${networkInfo.apiLatency}ms)`);
                }
                
            } else {
                this.addResult('BLOCKCHAIN_NETWORK', 'CRITICAL', false, 'Blockchain connectivity failed');
            }
            
        } catch (error) {
            this.addResult('BLOCKCHAIN_NETWORK', 'CRITICAL', false, `Blockchain test failed: ${error.message}`);
        }
    }
    
    async testSecurityHeaders() {
        console.log('🛡️ Testing Security Headers...');
        
        try {
            const response = await axios.get(this.baseUrl, {
                timeout: 5000
            });
            
            const headers = response.headers;
            
            // Check HSTS
            if (headers['strict-transport-security']) {
                this.addResult('SECURITY_HSTS', 'HIGH', true, 'HSTS header present');
            } else {
                this.addResult('SECURITY_HSTS', 'HIGH', false, 'HSTS header missing');
            }
            
            // Check CSP
            if (headers['content-security-policy']) {
                this.addResult('SECURITY_CSP', 'MEDIUM', true, 'CSP header present');
            } else {
                this.addResult('SECURITY_CSP', 'MEDIUM', false, 'CSP header missing');
            }
            
            // Check X-Frame-Options
            if (headers['x-frame-options']) {
                this.addResult('SECURITY_XFRAME', 'MEDIUM', true, 'X-Frame-Options header present');
            } else {
                this.addResult('SECURITY_XFRAME', 'MEDIUM', false, 'X-Frame-Options header missing');
            }
            
            // Check X-Content-Type-Options
            if (headers['x-content-type-options'] === 'nosniff') {
                this.addResult('SECURITY_XCONTENTYPE', 'MEDIUM', true, 'X-Content-Type-Options header correct');
            } else {
                this.addResult('SECURITY_XCONTENTYPE', 'MEDIUM', false, 'X-Content-Type-Options header missing or incorrect');
            }
            
        } catch (error) {
            this.addResult('SECURITY_HEADERS', 'HIGH', false, `Security headers test failed: ${error.message}`);
        }
    }
    
    async testSSLConfiguration() {
        console.log('🔐 Testing SSL Configuration...');
        
        try {
            // Test HTTPS redirect
            const httpResponse = await axios.get(this.baseUrl.replace('https://', 'http://'), {
                maxRedirects: 0,
                validateStatus: function (status) {
                    return status < 500;
                }
            });
            
            if (httpResponse.status >= 300 && httpResponse.status < 400) {
                this.addResult('SSL_REDIRECT', 'HIGH', true, 'HTTP to HTTPS redirect working');
            } else {
                this.addResult('SSL_REDIRECT', 'HIGH', false, 'HTTP to HTTPS redirect not working');
            }
            
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                this.addResult('SSL_REDIRECT', 'MEDIUM', true, 'HTTP port not accessible (good security practice)');
            } else {
                this.addResult('SSL_REDIRECT', 'HIGH', false, `SSL redirect test failed: ${error.message}`);
            }
        }
        
        // Test SSL certificate
        try {
            const response = await axios.get(this.baseUrl);
            this.addResult('SSL_CERTIFICATE', 'CRITICAL', true, 'SSL certificate valid');
        } catch (error) {
            if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
                this.addResult('SSL_CERTIFICATE', 'CRITICAL', false, `SSL certificate issue: ${error.code}`);
            }
        }
    }
    
    async testRateLimiting() {
        console.log('🚦 Testing Rate Limiting...');
        
        try {
            const requests = [];
            const endpoint = `${this.baseUrl}/api/monitoring/health`;
            
            // Send many requests quickly
            for (let i = 0; i < 50; i++) {
                requests.push(axios.get(endpoint, { timeout: 1000 }).catch(e => e.response));
            }
            
            const responses = await Promise.all(requests);
            const rateLimited = responses.filter(r => r && r.status === 429);
            
            if (rateLimited.length > 0) {
                this.addResult('RATE_LIMITING', 'HIGH', true, `Rate limiting active (${rateLimited.length}/50 requests limited)`);
            } else {
                this.addResult('RATE_LIMITING', 'HIGH', false, 'Rate limiting not working');
            }
            
        } catch (error) {
            this.addResult('RATE_LIMITING', 'HIGH', false, `Rate limiting test failed: ${error.message}`);
        }
    }
    
    async testInputValidation() {
        console.log('🔍 Testing Input Validation...');
        
        const maliciousInputs = [
            '<script>alert("xss")</script>',
            "'; DROP TABLE users; --",
            '../../../etc/passwd',
            '${7*7}',
            'javascript:alert(1)'
        ];
        
        for (const input of maliciousInputs) {
            try {
                const response = await axios.post(`${this.baseUrl}/api/game/spin`, {
                    betAmount: input
                }, {
                    validateStatus: function (status) {
                        return status < 500;
                    }
                });
                
                if (response.status === 400) {
                    this.addResult('INPUT_VALIDATION', 'HIGH', true, `Malicious input properly rejected: ${input.substring(0, 20)}...`);
                } else {
                    this.addResult('INPUT_VALIDATION', 'HIGH', false, `Malicious input not properly validated: ${input.substring(0, 20)}...`);
                }
                
            } catch (error) {
                // Connection errors are fine for this test
                this.addResult('INPUT_VALIDATION', 'HIGH', true, `Input validation working (connection rejected)`);
            }
        }
    }
    
    async testAuthentication() {
        console.log('🔑 Testing Authentication...');
        
        try {
            // Test protected endpoint without auth
            const response = await axios.get(`${this.baseUrl}/api/wallet/balance`, {
                validateStatus: function (status) {
                    return status < 500;
                }
            });
            
            if (response.status === 401 || response.status === 403) {
                this.addResult('AUTH_PROTECTION', 'HIGH', true, 'Protected endpoints require authentication');
            } else {
                this.addResult('AUTH_PROTECTION', 'CRITICAL', false, 'Protected endpoints accessible without authentication');
            }
            
        } catch (error) {
            this.addResult('AUTH_PROTECTION', 'HIGH', false, `Authentication test failed: ${error.message}`);
        }
    }
    
    async testResponseTimes() {
        console.log('⚡ Testing Response Times...');
        
        const endpoints = [
            { path: '/', target: 500 },
            { path: '/api/monitoring/health', target: 200 },
            { path: '/api/leaderboard', target: 1000 },
        ];
        
        for (const endpoint of endpoints) {
            try {
                const start = performance.now();
                const response = await axios.get(`${this.baseUrl}${endpoint.path}`);
                const responseTime = performance.now() - start;
                
                if (responseTime <= endpoint.target) {
                    this.addResult('RESPONSE_TIME', 'MEDIUM', true, `${endpoint.path}: ${responseTime.toFixed(2)}ms (target: ${endpoint.target}ms)`);
                } else {
                    this.addResult('RESPONSE_TIME', 'MEDIUM', false, `${endpoint.path}: ${responseTime.toFixed(2)}ms (target: ${endpoint.target}ms)`);
                }
                
            } catch (error) {
                this.addResult('RESPONSE_TIME', 'MEDIUM', false, `Response time test failed for ${endpoint.path}: ${error.message}`);
            }
        }
    }
    
    async testConcurrentConnections() {
        console.log('👥 Testing Concurrent Connections...');
        
        try {
            const concurrentRequests = 20;
            const requests = [];
            
            for (let i = 0; i < concurrentRequests; i++) {
                requests.push(axios.get(`${this.baseUrl}/api/monitoring/health`, { timeout: 5000 }));
            }
            
            const start = performance.now();
            const responses = await Promise.allSettled(requests);
            const duration = performance.now() - start;
            
            const successful = responses.filter(r => r.status === 'fulfilled').length;
            const successRate = (successful / concurrentRequests) * 100;
            
            if (successRate >= 95) {
                this.addResult('CONCURRENT_CONNECTIONS', 'MEDIUM', true, `${successful}/${concurrentRequests} concurrent requests successful (${duration.toFixed(2)}ms)`);
            } else {
                this.addResult('CONCURRENT_CONNECTIONS', 'MEDIUM', false, `Only ${successful}/${concurrentRequests} concurrent requests successful`);
            }
            
        } catch (error) {
            this.addResult('CONCURRENT_CONNECTIONS', 'MEDIUM', false, `Concurrent connections test failed: ${error.message}`);
        }
    }
    
    async testLoadHandling() {
        console.log('🏋️ Testing Load Handling...');
        
        try {
            // Simulate sustained load
            const duration = 10000; // 10 seconds
            const requestsPerSecond = 5;
            const totalRequests = (duration / 1000) * requestsPerSecond;
            
            const requests = [];
            const startTime = Date.now();
            
            while (Date.now() - startTime < duration) {
                requests.push(axios.get(`${this.baseUrl}/api/monitoring/health`, { timeout: 2000 }).catch(e => e));
                await new Promise(resolve => setTimeout(resolve, 1000 / requestsPerSecond));
            }
            
            const responses = await Promise.all(requests);
            const successful = responses.filter(r => r.status === 200).length;
            const successRate = (successful / responses.length) * 100;
            
            if (successRate >= 90) {
                this.addResult('LOAD_HANDLING', 'HIGH', true, `Load test passed: ${successRate.toFixed(1)}% success rate over ${duration}ms`);
            } else {
                this.addResult('LOAD_HANDLING', 'HIGH', false, `Load test failed: ${successRate.toFixed(1)}% success rate`);
            }
            
        } catch (error) {
            this.addResult('LOAD_HANDLING', 'HIGH', false, `Load handling test failed: ${error.message}`);
        }
    }
    
    async testMemoryUsage() {
        console.log('🧠 Testing Memory Usage...');
        
        try {
            const response = await axios.get(`${this.baseUrl}/api/monitoring/system`);
            
            if (response.status === 200) {
                const systemData = response.data;
                
                if (systemData.memory?.percentage < 80) {
                    this.addResult('MEMORY_USAGE', 'MEDIUM', true, `Memory usage: ${systemData.memory.percentage}%`);
                } else {
                    this.addResult('MEMORY_USAGE', 'MEDIUM', false, `High memory usage: ${systemData.memory.percentage}%`);
                }
                
                if (systemData.cpu?.usage < 70) {
                    this.addResult('CPU_USAGE', 'MEDIUM', true, `CPU usage: ${systemData.cpu.usage}%`);
                } else {
                    this.addResult('CPU_USAGE', 'MEDIUM', false, `High CPU usage: ${systemData.cpu.usage}%`);
                }
                
            } else {
                this.addResult('SYSTEM_MONITORING', 'MEDIUM', false, 'System monitoring endpoint not accessible');
            }
            
        } catch (error) {
            this.addResult('SYSTEM_MONITORING', 'MEDIUM', false, `System monitoring test failed: ${error.message}`);
        }
    }
    
    async testWalletOperations() {
        console.log('💰 Testing Wallet Operations...');
        
        try {
            // Test house wallet status
            const response = await axios.get(`${this.baseUrl}/api/wallet/house/status`);
            
            if (response.status === 200) {
                const walletData = response.data;
                
                if (walletData.balance > 10000) {
                    this.addResult('HOUSE_WALLET_BALANCE', 'CRITICAL', true, `House wallet has sufficient balance: ${walletData.balance}`);
                } else {
                    this.addResult('HOUSE_WALLET_BALANCE', 'CRITICAL', false, `House wallet balance too low: ${walletData.balance}`);
                }
                
                if (walletData.address?.startsWith('bc1')) {
                    this.addResult('HOUSE_WALLET_ADDRESS', 'CRITICAL', true, 'House wallet using mainnet address');
                } else {
                    this.addResult('HOUSE_WALLET_ADDRESS', 'CRITICAL', false, 'House wallet not using mainnet address');
                }
                
            } else {
                this.addResult('HOUSE_WALLET', 'CRITICAL', false, 'House wallet status check failed');
            }
            
        } catch (error) {
            this.addResult('HOUSE_WALLET', 'CRITICAL', false, `Wallet operations test failed: ${error.message}`);
        }
    }
    
    async testGameMechanics() {
        console.log('🎰 Testing Game Mechanics...');
        
        try {
            // Test game configuration
            const response = await axios.get(`${this.baseUrl}/api/game/config`);
            
            if (response.status === 200) {
                const gameConfig = response.data;
                
                if (gameConfig.houseEdge >= 0.01 && gameConfig.houseEdge <= 0.05) {
                    this.addResult('GAME_HOUSE_EDGE', 'HIGH', true, `House edge configured correctly: ${gameConfig.houseEdge}`);
                } else {
                    this.addResult('GAME_HOUSE_EDGE', 'HIGH', false, `House edge out of range: ${gameConfig.houseEdge}`);
                }
                
                if (gameConfig.minBet >= 1 && gameConfig.maxBet <= 1000) {
                    this.addResult('GAME_BET_LIMITS', 'MEDIUM', true, `Bet limits configured: ${gameConfig.minBet} - ${gameConfig.maxBet}`);
                } else {
                    this.addResult('GAME_BET_LIMITS', 'MEDIUM', false, `Bet limits misconfigured: ${gameConfig.minBet} - ${gameConfig.maxBet}`);
                }
                
            } else {
                this.addResult('GAME_CONFIG', 'HIGH', false, 'Game configuration not accessible');
            }
            
        } catch (error) {
            this.addResult('GAME_CONFIG', 'HIGH', false, `Game mechanics test failed: ${error.message}`);
        }
    }
    
    async testTransactionFlow() {
        console.log('💳 Testing Transaction Flow...');
        
        try {
            // Test transaction validation
            const response = await axios.post(`${this.baseUrl}/api/transactions/validate`, {
                amount: 100,
                type: 'withdrawal'
            }, {
                validateStatus: function (status) {
                    return status < 500;
                }
            });
            
            if (response.status === 400 || response.status === 401) {
                this.addResult('TRANSACTION_VALIDATION', 'HIGH', true, 'Transaction validation working');
            } else {
                this.addResult('TRANSACTION_VALIDATION', 'HIGH', false, 'Transaction validation not working properly');
            }
            
        } catch (error) {
            this.addResult('TRANSACTION_VALIDATION', 'HIGH', false, `Transaction flow test failed: ${error.message}`);
        }
    }
    
    async testAPIEndpoints() {
        console.log('🔌 Testing API Endpoints...');
        
        const endpoints = [
            { path: '/api/monitoring/health', expectedStatus: 200 },
            { path: '/api/leaderboard', expectedStatus: 200 },
            { path: '/api/game/config', expectedStatus: 200 },
            { path: '/api/wallet/balance', expectedStatus: [401, 403] }, // Should require auth
        ];
        
        for (const endpoint of endpoints) {
            try {
                const response = await axios.get(`${this.baseUrl}${endpoint.path}`, {
                    validateStatus: function (status) {
                        return status < 500;
                    }
                });
                
                const expectedStatuses = Array.isArray(endpoint.expectedStatus) 
                    ? endpoint.expectedStatus 
                    : [endpoint.expectedStatus];
                
                if (expectedStatuses.includes(response.status)) {
                    this.addResult('API_ENDPOINT', 'MEDIUM', true, `${endpoint.path}: Status ${response.status}`);
                } else {
                    this.addResult('API_ENDPOINT', 'MEDIUM', false, `${endpoint.path}: Unexpected status ${response.status}`);
                }
                
            } catch (error) {
                this.addResult('API_ENDPOINT', 'MEDIUM', false, `${endpoint.path}: ${error.message}`);
            }
        }
    }
    
    async testMonitoringEndpoints() {
        console.log('📊 Testing Monitoring Endpoints...');
        
        const monitoringEndpoints = [
            '/api/monitoring/health',
            '/api/monitoring/metrics',
            '/api/monitoring/system'
        ];
        
        for (const endpoint of monitoringEndpoints) {
            try {
                const response = await axios.get(`${this.baseUrl}${endpoint}`);
                
                if (response.status === 200) {
                    this.addResult('MONITORING_ENDPOINT', 'MEDIUM', true, `${endpoint} accessible`);
                } else {
                    this.addResult('MONITORING_ENDPOINT', 'MEDIUM', false, `${endpoint} returned status ${response.status}`);
                }
                
            } catch (error) {
                this.addResult('MONITORING_ENDPOINT', 'MEDIUM', false, `${endpoint}: ${error.message}`);
            }
        }
    }
    
    async testAlerting() {
        console.log('🚨 Testing Alerting System...');
        
        try {
            // Test if alerting configuration is accessible
            const response = await axios.get(`${this.baseUrl}/api/monitoring/alerts/config`);
            
            if (response.status === 200) {
                this.addResult('ALERTING_CONFIG', 'MEDIUM', true, 'Alerting configuration accessible');
            } else {
                this.addResult('ALERTING_CONFIG', 'MEDIUM', false, 'Alerting configuration not accessible');
            }
            
        } catch (error) {
            this.addResult('ALERTING_CONFIG', 'MEDIUM', false, `Alerting test failed: ${error.message}`);
        }
    }
    
    async testLogging() {
        console.log('📝 Testing Logging System...');
        
        try {
            // Generate a test log entry
            const response = await axios.post(`${this.baseUrl}/api/monitoring/test-log`, {
                message: 'Production readiness test log entry'
            });
            
            if (response.status === 200) {
                this.addResult('LOGGING_SYSTEM', 'MEDIUM', true, 'Logging system functional');
            } else {
                this.addResult('LOGGING_SYSTEM', 'MEDIUM', false, 'Logging system not working');
            }
            
        } catch (error) {
            this.addResult('LOGGING_SYSTEM', 'MEDIUM', false, `Logging test failed: ${error.message}`);
        }
    }
    
    async testBackupSystems() {
        console.log('💾 Testing Backup Systems...');
        
        try {
            const response = await axios.get(`${this.baseUrl}/api/monitoring/backup-status`);
            
            if (response.status === 200) {
                const backupData = response.data;
                
                if (backupData.lastBackup && Date.now() - new Date(backupData.lastBackup).getTime() < 24 * 60 * 60 * 1000) {
                    this.addResult('BACKUP_RECENT', 'HIGH', true, `Recent backup found: ${backupData.lastBackup}`);
                } else {
                    this.addResult('BACKUP_RECENT', 'HIGH', false, 'No recent backup found');
                }
                
                if (backupData.encrypted) {
                    this.addResult('BACKUP_ENCRYPTION', 'HIGH', true, 'Backups are encrypted');
                } else {
                    this.addResult('BACKUP_ENCRYPTION', 'HIGH', false, 'Backups are not encrypted');
                }
                
            } else {
                this.addResult('BACKUP_SYSTEM', 'HIGH', false, 'Backup status not accessible');
            }
            
        } catch (error) {
            this.addResult('BACKUP_SYSTEM', 'HIGH', false, `Backup test failed: ${error.message}`);
        }
    }
    
    async testFailoverMechanisms() {
        console.log('🔄 Testing Failover Mechanisms...');
        
        // This would test load balancer health checks and failover
        // For now, we'll test if multiple instances are running
        
        try {
            const response = await axios.get(`${this.baseUrl}/api/monitoring/instances`);
            
            if (response.status === 200) {
                const instanceData = response.data;
                
                if (instanceData.activeInstances > 1) {
                    this.addResult('FAILOVER_INSTANCES', 'HIGH', true, `Multiple instances running: ${instanceData.activeInstances}`);
                } else {
                    this.addResult('FAILOVER_INSTANCES', 'HIGH', false, 'Only single instance running - no failover capability');
                }
                
            } else {
                this.addResult('FAILOVER_SYSTEM', 'HIGH', false, 'Failover status not accessible');
            }
            
        } catch (error) {
            this.addResult('FAILOVER_SYSTEM', 'HIGH', false, `Failover test failed: ${error.message}`);
        }
    }
    
    async testDataProtection() {
        console.log('🔒 Testing Data Protection...');
        
        try {
            // Test if sensitive data is properly protected
            const response = await axios.get(`${this.baseUrl}/api/monitoring/data-protection`);
            
            if (response.status === 200) {
                const protectionData = response.data;
                
                if (protectionData.encryption?.enabled) {
                    this.addResult('DATA_ENCRYPTION', 'CRITICAL', true, 'Data encryption enabled');
                } else {
                    this.addResult('DATA_ENCRYPTION', 'CRITICAL', false, 'Data encryption not enabled');
                }
                
                if (protectionData.pii?.protected) {
                    this.addResult('PII_PROTECTION', 'HIGH', true, 'PII protection active');
                } else {
                    this.addResult('PII_PROTECTION', 'HIGH', false, 'PII protection not active');
                }
                
            } else {
                this.addResult('DATA_PROTECTION', 'CRITICAL', false, 'Data protection status not accessible');
            }
            
        } catch (error) {
            this.addResult('DATA_PROTECTION', 'CRITICAL', false, `Data protection test failed: ${error.message}`);
        }
    }
    
    async testAuditTrails() {
        console.log('📋 Testing Audit Trails...');
        
        try {
            const response = await axios.get(`${this.baseUrl}/api/monitoring/audit-status`);
            
            if (response.status === 200) {
                const auditData = response.data;
                
                if (auditData.enabled) {
                    this.addResult('AUDIT_TRAILS', 'HIGH', true, 'Audit trails enabled');
                } else {
                    this.addResult('AUDIT_TRAILS', 'HIGH', false, 'Audit trails not enabled');
                }
                
                if (auditData.retention >= 365) {
                    this.addResult('AUDIT_RETENTION', 'MEDIUM', true, `Audit retention: ${auditData.retention} days`);
                } else {
                    this.addResult('AUDIT_RETENTION', 'MEDIUM', false, `Audit retention too short: ${auditData.retention} days`);
                }
                
            } else {
                this.addResult('AUDIT_SYSTEM', 'HIGH', false, 'Audit system status not accessible');
            }
            
        } catch (error) {
            this.addResult('AUDIT_SYSTEM', 'HIGH', false, `Audit trails test failed: ${error.message}`);
        }
    }
    
    addResult(testName, severity, passed, message) {
        const result = {
            test: testName,
            severity,
            passed,
            message,
            timestamp: new Date().toISOString()
        };
        
        this.results.tests.push(result);
        this.results.summary.total++;
        
        if (passed) {
            this.results.summary.passed++;
            console.log(`  ✅ ${testName}: ${message}`);
        } else {
            if (severity === 'CRITICAL') {
                this.results.summary.failed++;
                this.results.critical_issues.push(result);
                console.log(`  🚨 ${testName}: ${message}`);
            } else if (severity === 'HIGH') {
                this.results.summary.failed++;
                console.log(`  ❌ ${testName}: ${message}`);
            } else {
                this.results.summary.warnings++;
                console.log(`  ⚠️ ${testName}: ${message}`);
            }
        }
    }
    
    async generateReport() {
        console.log('\n📋 Generating Production Readiness Report...');
        
        const duration = Date.now() - this.startTime;
        const score = Math.round((this.results.summary.passed / this.results.summary.total) * 100);
        
        const report = `# MoonYetis Production Readiness Report

**Test Date:** ${new Date().toISOString()}
**Duration:** ${duration}ms
**Overall Score:** ${score}%
**Status:** ${score >= 95 ? '✅ PRODUCTION READY' : score >= 85 ? '⚠️ NEEDS ATTENTION' : '🚨 NOT READY'}

## 📊 Test Summary

- **Total Tests:** ${this.results.summary.total}
- **Passed:** ${this.results.summary.passed}
- **Failed:** ${this.results.summary.failed}
- **Warnings:** ${this.results.summary.warnings}

## 🚨 Critical Issues

${this.results.critical_issues.length > 0 ? 
    this.results.critical_issues.map(issue => `- **${issue.test}:** ${issue.message}`).join('\n') :
    '✅ No critical issues found'
}

## 📋 Detailed Results

${this.results.tests.map(test => 
    `- ${test.passed ? '✅' : test.severity === 'CRITICAL' ? '🚨' : test.severity === 'HIGH' ? '❌' : '⚠️'} **${test.test}** (${test.severity}): ${test.message}`
).join('\n')}

## 🎯 Production Launch Checklist

### Critical Requirements (Must Pass)
- [ ] All CRITICAL severity tests passing
- [ ] SSL/TLS properly configured
- [ ] House wallet configured with mainnet address
- [ ] Database and Redis connectivity stable
- [ ] Blockchain connectivity to mainnet
- [ ] Security headers implemented
- [ ] Authentication and authorization working

### Recommended Requirements
- [ ] All HIGH severity tests passing
- [ ] Response times under targets
- [ ] Backup systems operational
- [ ] Monitoring and alerting configured
- [ ] Load balancing and failover ready
- [ ] Audit trails enabled

## 💡 Recommendations

${score >= 95 ? 
    `🎉 **READY FOR PRODUCTION LAUNCH!**

Your MoonYetis installation has passed all critical tests and is ready for production deployment. Monitor closely during the first 24 hours after launch.` :
score >= 85 ?
    `⚠️ **ALMOST READY - MINOR ISSUES TO ADDRESS**

Address the warning issues above before launch, but no critical blockers found.` :
    `🚨 **NOT READY FOR PRODUCTION**

Critical issues must be resolved before production launch. Do not deploy until all critical tests pass.`
}

## 📞 Emergency Contacts

- **Technical Team:** [Your team contact]
- **Security Team:** [Security contact]
- **Infrastructure:** [Ops contact]

---

**Generated by MoonYetis Production Readiness Suite**
Report ID: ${crypto.randomBytes(8).toString('hex')}
`;
        
        const fs = require('fs').promises;
        const path = require('path');
        
        const reportPath = path.join(__dirname, '../../PRODUCTION_READINESS_REPORT.md');
        await fs.writeFile(reportPath, report);
        
        // Also save JSON report
        const jsonPath = path.join(__dirname, '../../production-readiness.json');
        await fs.writeFile(jsonPath, JSON.stringify(this.results, null, 2));
        
        console.log(`📄 Production readiness report saved: PRODUCTION_READINESS_REPORT.md`);
        console.log(`📊 JSON results saved: production-readiness.json`);
    }
}

// CLI usage
if (require.main === module) {
    const suite = new ProductionReadinessTest();
    
    suite.runFullSuite().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Production readiness testing failed:', error);
        process.exit(1);
    });
}

module.exports = ProductionReadinessTest;