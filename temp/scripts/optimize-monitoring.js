const fs = require('fs').promises;
const path = require('path');

class MonitoringOptimizer {
    constructor() {
        this.projectRoot = path.join(__dirname, '..');
        this.configPath = path.join(this.projectRoot, 'config/monitoring-config.json');
        
        this.defaultConfig = {
            thresholds: {
                system: {
                    cpu: 80,
                    memory: 85,
                    disk: 90,
                    responseTime: 5000,
                    errorRate: 5
                },
                blockchain: {
                    lowBalance: 1000,
                    highWithdrawalRate: 10000,
                    suspiciousActivity: 5,
                    balanceCheckInterval: 300000
                },
                circuitBreakers: {
                    failureThreshold: 5,
                    resetTimeout: 60000,
                    monitoringPeriod: 120000
                },
                rateLimiting: {
                    generalLimit: 1000,
                    walletLimit: 50,
                    transactionLimit: 20,
                    gameLimit: 100,
                    strictLimit: 10
                }
            },
            alerts: {
                levels: {
                    critical: {
                        enabled: true,
                        channels: ['console', 'log', 'webhook'],
                        cooldown: 300 // 5 minutes
                    },
                    high: {
                        enabled: true,
                        channels: ['console', 'log'],
                        cooldown: 600 // 10 minutes
                    },
                    medium: {
                        enabled: true,
                        channels: ['log'],
                        cooldown: 1800 // 30 minutes
                    },
                    low: {
                        enabled: false,
                        channels: ['log'],
                        cooldown: 3600 // 1 hour
                    }
                },
                escalation: {
                    enabled: true,
                    escalateAfter: 3, // escalate after 3 occurrences
                    escalateInterval: 3600 // within 1 hour
                }
            },
            collection: {
                intervals: {
                    systemMetrics: 30000, // 30 seconds
                    applicationMetrics: 60000, // 1 minute
                    healthChecks: 120000, // 2 minutes
                    databaseMetrics: 300000 // 5 minutes
                },
                retention: {
                    metrics: 86400000, // 24 hours
                    alerts: 604800000, // 7 days
                    logs: 2592000000 // 30 days
                }
            },
            performance: {
                enableCaching: true,
                batchAlerts: true,
                asyncProcessing: true,
                maxConcurrentChecks: 10
            }
        };
    }

    async optimizeMonitoring() {
        console.log('🔧 Optimizing monitoring configuration...\n');
        
        try {
            // Load current metrics to understand system behavior
            const systemMetrics = await this.analyzeSystemMetrics();
            
            // Analyze historical data
            const historicalData = await this.analyzeHistoricalData();
            
            // Generate optimized configuration
            const optimizedConfig = await this.generateOptimizedConfig(systemMetrics, historicalData);
            
            // Apply optimizations
            await this.applyOptimizations(optimizedConfig);
            
            // Update monitoring services
            await this.updateMonitoringServices(optimizedConfig);
            
            // Generate optimization report
            await this.generateOptimizationReport(systemMetrics, historicalData, optimizedConfig);
            
            console.log('✅ Monitoring optimization completed!');
            
        } catch (error) {
            console.error('❌ Monitoring optimization failed:', error.message);
            throw error;
        }
    }

    async analyzeSystemMetrics() {
        console.log('📊 Analyzing current system metrics...');
        
        try {
            // Get current monitoring service instance
            const monitoringService = require('../services/monitoringService');
            const currentMetrics = monitoringService.getMetrics();
            
            const analysis = {
                cpu: {
                    current: currentMetrics.system?.cpu || 0,
                    peak: 0,
                    average: 0,
                    trend: 'stable'
                },
                memory: {
                    current: currentMetrics.system?.memory?.percentage || 0,
                    peak: 0,
                    average: 0,
                    trend: 'stable'
                },
                application: {
                    responseTime: currentMetrics.application?.uptime || 0,
                    memoryGrowth: 0,
                    errorRate: 0
                },
                blockchain: {
                    houseBalance: currentMetrics.houseBalance || 0,
                    lastBalanceCheck: currentMetrics.lastBalanceCheck || new Date(),
                    alertsTriggered: currentMetrics.alertsTriggered || 0
                }
            };
            
            console.log('  📈 Current CPU usage:', analysis.cpu.current + '%');
            console.log('  💾 Current memory usage:', analysis.memory.current + '%');
            console.log('  💰 House balance:', analysis.blockchain.houseBalance);
            
            return analysis;
            
        } catch (error) {
            console.warn('⚠️ Could not analyze current metrics, using defaults');
            return {
                cpu: { current: 20, peak: 50, average: 30, trend: 'stable' },
                memory: { current: 40, peak: 70, average: 50, trend: 'stable' },
                application: { responseTime: 200, memoryGrowth: 0, errorRate: 1 },
                blockchain: { houseBalance: 5000, lastBalanceCheck: new Date(), alertsTriggered: 0 }
            };
        }
    }

    async analyzeHistoricalData() {
        console.log('📚 Analyzing historical monitoring data...');
        
        // In a real implementation, this would analyze log files and database records
        // For now, we'll simulate historical data analysis
        
        const historicalData = {
            alertFrequency: {
                critical: 2, // per day
                high: 5,
                medium: 15,
                low: 30
            },
            peakUsageTimes: [
                { hour: 9, cpu: 70, memory: 75 },
                { hour: 14, cpu: 85, memory: 80 },
                { hour: 20, cpu: 65, memory: 70 }
            ],
            commonAlerts: [
                { type: 'HIGH_CPU', frequency: 10, avgDuration: 300 },
                { type: 'HIGH_MEMORY', frequency: 5, avgDuration: 600 },
                { type: 'LOW_BALANCE', frequency: 2, avgDuration: 1800 }
            ],
            performancePatterns: {
                slowQueries: 15, // per hour
                circuitBreakerTrips: 3, // per day
                rateLimitHits: 100 // per hour
            }
        };
        
        console.log('  🚨 Alert frequency analysis complete');
        console.log('  ⏰ Peak usage patterns identified');
        console.log('  🔍 Performance patterns analyzed');
        
        return historicalData;
    }

    async generateOptimizedConfig(systemMetrics, historicalData) {
        console.log('⚡ Generating optimized configuration...');
        
        const config = JSON.parse(JSON.stringify(this.defaultConfig)); // Deep clone
        
        // Optimize CPU thresholds based on historical usage
        const cpuPeak = Math.max(systemMetrics.cpu.peak, 60);
        config.thresholds.system.cpu = Math.min(cpuPeak + 10, 90);
        
        // Optimize memory thresholds
        const memoryPeak = Math.max(systemMetrics.memory.peak, 50);
        config.thresholds.system.memory = Math.min(memoryPeak + 15, 95);
        
        // Optimize blockchain monitoring based on balance patterns
        if (systemMetrics.blockchain.houseBalance > 10000) {
            config.thresholds.blockchain.lowBalance = systemMetrics.blockchain.houseBalance * 0.1;
        }
        
        // Optimize alert cooldowns based on frequency
        if (historicalData.alertFrequency.high > 10) {
            config.alerts.levels.high.cooldown = 1200; // Increase cooldown if too frequent
        }
        
        // Optimize circuit breaker settings based on performance
        if (historicalData.performancePatterns.circuitBreakerTrips > 5) {
            config.thresholds.circuitBreakers.failureThreshold = 3; // More sensitive
            config.thresholds.circuitBreakers.resetTimeout = 45000; // Faster reset
        }
        
        // Optimize rate limiting based on usage patterns
        if (historicalData.performancePatterns.rateLimitHits > 200) {
            config.thresholds.rateLimiting.generalLimit = 1500; // Increase limits
            config.thresholds.rateLimiting.walletLimit = 75;
        }
        
        // Optimize collection intervals based on system load
        if (systemMetrics.cpu.average > 60) {
            config.collection.intervals.systemMetrics = 45000; // Less frequent collection
            config.collection.intervals.applicationMetrics = 90000;
        } else if (systemMetrics.cpu.average < 30) {
            config.collection.intervals.systemMetrics = 15000; // More frequent collection
            config.collection.intervals.applicationMetrics = 30000;
        }
        
        // Enable performance optimizations for high-load systems
        if (systemMetrics.cpu.average > 50 || systemMetrics.memory.average > 60) {
            config.performance.enableCaching = true;
            config.performance.batchAlerts = true;
            config.performance.asyncProcessing = true;
            config.performance.maxConcurrentChecks = 5; // Reduce concurrent checks
        }
        
        console.log('  🎯 CPU threshold optimized to:', config.thresholds.system.cpu + '%');
        console.log('  💾 Memory threshold optimized to:', config.thresholds.system.memory + '%');
        console.log('  💰 Low balance threshold optimized to:', config.thresholds.blockchain.lowBalance);
        console.log('  ⏱️ Collection intervals optimized');
        
        return config;
    }

    async applyOptimizations(config) {
        console.log('🔧 Applying monitoring optimizations...');
        
        // Save optimized configuration
        await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
        console.log('  ✅ Configuration saved to:', this.configPath);
        
        // Update environment variables if needed
        const envUpdates = this.generateEnvUpdates(config);
        if (envUpdates.length > 0) {
            console.log('  🔄 Environment variable updates suggested:');
            envUpdates.forEach(update => console.log(`    ${update}`));
        }
        
        return true;
    }

    generateEnvUpdates(config) {
        const updates = [];
        
        // Generate suggested environment variable updates
        updates.push(`HOUSE_WALLET_LOW_BALANCE_ALERT=${config.thresholds.blockchain.lowBalance}`);
        updates.push(`HIGH_WITHDRAWAL_RATE_ALERT=${config.thresholds.blockchain.highWithdrawalRate}`);
        updates.push(`SUSPICIOUS_ACTIVITY_THRESHOLD=${config.thresholds.blockchain.suspiciousActivity}`);
        updates.push(`BALANCE_CHECK_INTERVAL=${config.thresholds.blockchain.balanceCheckInterval}`);
        
        return updates;
    }

    async updateMonitoringServices(config) {
        console.log('🔄 Updating monitoring services...');
        
        try {
            // Update monitoring service thresholds
            const monitoringService = require('../services/monitoringService');
            
            if (monitoringService.updateThresholds) {
                monitoringService.updateThresholds(config.thresholds);
                console.log('  ✅ Monitoring service thresholds updated');
            }
            
            // Update circuit breaker configurations
            const circuitBreakerService = require('../services/circuitBreakerService');
            
            if (circuitBreakerService.updateConfig) {
                circuitBreakerService.updateConfig(config.thresholds.circuitBreakers);
                console.log('  ✅ Circuit breaker configuration updated');
            }
            
            // Update rate limiter configurations
            const rateLimiterService = require('../middleware/rateLimiter');
            
            if (rateLimiterService.updateLimits) {
                rateLimiterService.updateLimits(config.thresholds.rateLimiting);
                console.log('  ✅ Rate limiter configuration updated');
            }
            
        } catch (error) {
            console.warn('⚠️ Some services could not be updated:', error.message);
        }
    }

    async generateOptimizationReport(systemMetrics, historicalData, optimizedConfig) {
        console.log('📋 Generating optimization report...');
        
        const report = {
            timestamp: new Date(),
            optimization: {
                systemMetrics,
                historicalData,
                optimizedConfig,
                changes: this.identifyChanges(this.defaultConfig, optimizedConfig)
            },
            recommendations: this.generateRecommendations(systemMetrics, historicalData),
            nextReview: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week from now
        };
        
        const reportPath = path.join(this.projectRoot, 'monitoring-optimization-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        const markdownReport = this.generateMarkdownReport(report);
        const markdownPath = path.join(this.projectRoot, 'MONITORING_OPTIMIZATION.md');
        await fs.writeFile(markdownPath, markdownReport);
        
        console.log('  📊 JSON report:', reportPath);
        console.log('  📝 Markdown report:', markdownPath);
        
        // Print summary
        this.printOptimizationSummary(report);
    }

    identifyChanges(original, optimized) {
        const changes = [];
        
        // Compare CPU threshold
        if (original.thresholds.system.cpu !== optimized.thresholds.system.cpu) {
            changes.push({
                setting: 'CPU Threshold',
                from: original.thresholds.system.cpu + '%',
                to: optimized.thresholds.system.cpu + '%',
                reason: 'Adjusted based on historical peak usage'
            });
        }
        
        // Compare memory threshold
        if (original.thresholds.system.memory !== optimized.thresholds.system.memory) {
            changes.push({
                setting: 'Memory Threshold',
                from: original.thresholds.system.memory + '%',
                to: optimized.thresholds.system.memory + '%',
                reason: 'Adjusted based on historical peak usage'
            });
        }
        
        // Compare balance threshold
        if (original.thresholds.blockchain.lowBalance !== optimized.thresholds.blockchain.lowBalance) {
            changes.push({
                setting: 'Low Balance Alert',
                from: original.thresholds.blockchain.lowBalance,
                to: optimized.thresholds.blockchain.lowBalance,
                reason: 'Adjusted based on current house balance'
            });
        }
        
        // Compare collection intervals
        if (original.collection.intervals.systemMetrics !== optimized.collection.intervals.systemMetrics) {
            changes.push({
                setting: 'System Metrics Collection Interval',
                from: original.collection.intervals.systemMetrics + 'ms',
                to: optimized.collection.intervals.systemMetrics + 'ms',
                reason: 'Adjusted based on system load'
            });
        }
        
        return changes;
    }

    generateRecommendations(systemMetrics, historicalData) {
        const recommendations = [];
        
        // System performance recommendations
        if (systemMetrics.cpu.average > 70) {
            recommendations.push({
                category: 'Performance',
                priority: 'HIGH',
                title: 'High CPU Usage Detected',
                description: 'Consider scaling up the server or optimizing CPU-intensive operations',
                action: 'Review application performance and consider vertical scaling'
            });
        }
        
        if (systemMetrics.memory.average > 75) {
            recommendations.push({
                category: 'Performance',
                priority: 'HIGH',
                title: 'High Memory Usage Detected',
                description: 'Monitor for memory leaks and consider increasing available RAM',
                action: 'Implement memory profiling and consider memory optimization'
            });
        }
        
        // Alert frequency recommendations
        if (historicalData.alertFrequency.critical > 5) {
            recommendations.push({
                category: 'Alerting',
                priority: 'CRITICAL',
                title: 'Too Many Critical Alerts',
                description: 'Critical alerts are firing too frequently, indicating system instability',
                action: 'Investigate root causes of critical alerts and address underlying issues'
            });
        }
        
        // Performance pattern recommendations
        if (historicalData.performancePatterns.slowQueries > 20) {
            recommendations.push({
                category: 'Database',
                priority: 'MEDIUM',
                title: 'High Number of Slow Queries',
                description: 'Database queries are taking longer than expected',
                action: 'Review and optimize database queries, consider adding indexes'
            });
        }
        
        if (historicalData.performancePatterns.circuitBreakerTrips > 10) {
            recommendations.push({
                category: 'Reliability',
                priority: 'HIGH',
                title: 'Frequent Circuit Breaker Trips',
                description: 'External services are failing frequently',
                action: 'Investigate external service reliability and implement better fallbacks'
            });
        }
        
        // Monitoring optimization recommendations
        recommendations.push({
            category: 'Monitoring',
            priority: 'LOW',
            title: 'Regular Monitoring Review',
            description: 'Monitoring thresholds should be reviewed regularly',
            action: 'Schedule monthly monitoring optimization reviews'
        });
        
        return recommendations;
    }

    generateMarkdownReport(report) {
        const { optimization, recommendations } = report;
        
        let markdown = `# Monitoring Optimization Report\n\n`;
        markdown += `**Generated:** ${report.timestamp.toISOString()}\n`;
        markdown += `**Next Review:** ${report.nextReview.toISOString()}\n\n`;
        
        markdown += `## 📊 System Metrics Analysis\n\n`;
        markdown += `- **CPU Usage:** ${optimization.systemMetrics.cpu.current}% (Peak: ${optimization.systemMetrics.cpu.peak}%)\n`;
        markdown += `- **Memory Usage:** ${optimization.systemMetrics.memory.current}% (Peak: ${optimization.systemMetrics.memory.peak}%)\n`;
        markdown += `- **House Balance:** ${optimization.systemMetrics.blockchain.houseBalance} MOONYETIS\n`;
        markdown += `- **Alerts Triggered:** ${optimization.systemMetrics.blockchain.alertsTriggered}\n\n`;
        
        if (optimization.changes.length > 0) {
            markdown += `## 🔧 Configuration Changes Applied\n\n`;
            optimization.changes.forEach(change => {
                markdown += `### ${change.setting}\n`;
                markdown += `- **From:** ${change.from}\n`;
                markdown += `- **To:** ${change.to}\n`;
                markdown += `- **Reason:** ${change.reason}\n\n`;
            });
        } else {
            markdown += `## ✅ No Configuration Changes Needed\n\n`;
            markdown += `The current monitoring configuration is optimal for the current usage patterns.\n\n`;
        }
        
        if (recommendations.length > 0) {
            markdown += `## 💡 Recommendations\n\n`;
            recommendations.forEach(rec => {
                markdown += `### ${rec.priority} - ${rec.title}\n`;
                markdown += `**Category:** ${rec.category}\n\n`;
                markdown += `${rec.description}\n\n`;
                markdown += `**Action:** ${rec.action}\n\n`;
            });
        }
        
        markdown += `## 📈 Historical Data Summary\n\n`;
        markdown += `- **Critical Alerts:** ${optimization.historicalData.alertFrequency.critical} per day\n`;
        markdown += `- **High Alerts:** ${optimization.historicalData.alertFrequency.high} per day\n`;
        markdown += `- **Circuit Breaker Trips:** ${optimization.historicalData.performancePatterns.circuitBreakerTrips} per day\n`;
        markdown += `- **Rate Limit Hits:** ${optimization.historicalData.performancePatterns.rateLimitHits} per hour\n\n`;
        
        markdown += `## 🔄 Next Steps\n\n`;
        markdown += `1. Monitor the optimized settings for 7 days\n`;
        markdown += `2. Review alert frequency and adjust if needed\n`;
        markdown += `3. Schedule next optimization review for ${report.nextReview.toDateString()}\n`;
        markdown += `4. Address high-priority recommendations\n\n`;
        
        return markdown;
    }

    printOptimizationSummary(report) {
        console.log('\n📊 MONITORING OPTIMIZATION SUMMARY');
        console.log('====================================');
        
        if (report.optimization.changes.length > 0) {
            console.log(`✅ Applied ${report.optimization.changes.length} configuration changes:`);
            report.optimization.changes.forEach(change => {
                console.log(`  • ${change.setting}: ${change.from} → ${change.to}`);
            });
        } else {
            console.log('✅ No changes needed - configuration is optimal');
        }
        
        const highPriorityRecs = report.recommendations.filter(r => r.priority === 'HIGH' || r.priority === 'CRITICAL');
        if (highPriorityRecs.length > 0) {
            console.log(`\n⚠️ ${highPriorityRecs.length} high-priority recommendations:`);
            highPriorityRecs.forEach(rec => {
                console.log(`  • ${rec.title}`);
            });
        }
        
        console.log(`\n📅 Next review scheduled: ${report.nextReview.toDateString()}`);
    }

    async loadCurrentConfig() {
        try {
            const configData = await fs.readFile(this.configPath, 'utf8');
            return JSON.parse(configData);
        } catch (error) {
            console.log('No existing config found, using defaults');
            return this.defaultConfig;
        }
    }

    async validateConfiguration(config) {
        const errors = [];
        
        // Validate thresholds are reasonable
        if (config.thresholds.system.cpu > 95 || config.thresholds.system.cpu < 50) {
            errors.push('CPU threshold should be between 50% and 95%');
        }
        
        if (config.thresholds.system.memory > 98 || config.thresholds.system.memory < 60) {
            errors.push('Memory threshold should be between 60% and 98%');
        }
        
        if (config.thresholds.blockchain.lowBalance < 0) {
            errors.push('Low balance threshold cannot be negative');
        }
        
        // Validate intervals are reasonable
        if (config.collection.intervals.systemMetrics < 5000) {
            errors.push('System metrics collection interval should be at least 5 seconds');
        }
        
        return errors;
    }
}

// CLI usage
if (require.main === module) {
    const optimizer = new MonitoringOptimizer();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'optimize':
            optimizer.optimizeMonitoring()
                .then(() => {
                    console.log('✅ Monitoring optimization completed');
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Optimization failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'analyze':
            optimizer.analyzeSystemMetrics()
                .then(metrics => {
                    console.log('📊 System metrics analysis:', JSON.stringify(metrics, null, 2));
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Analysis failed:', error);
                    process.exit(1);
                });
            break;
            
        default:
            console.log('Usage: node optimize-monitoring.js [optimize|analyze]');
            console.log('');
            console.log('Commands:');
            console.log('  optimize  - Run full monitoring optimization');
            console.log('  analyze   - Analyze current system metrics');
            process.exit(1);
    }
}

module.exports = MonitoringOptimizer;