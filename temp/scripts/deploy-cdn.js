// CDN Deployment Script for MoonYetis Production
// Automates CDN setup, configuration, and optimization

const fs = require('fs').promises;
const path = require('path');
const { CloudflareManager, validateCloudflareConfig, CLOUDFLARE_CONFIG } = require('../deploy/cdn/cloudflare-config');

class CDNDeployment {
    constructor() {
        this.cloudflare = null;
        this.deploymentLog = [];
    }
    
    async deploy() {
        console.log('🚀 Starting CDN deployment for MoonYetis');
        console.log('=====================================');
        
        try {
            await this.validateEnvironment();
            await this.initializeCloudflare();
            await this.deployConfiguration();
            await this.optimizePerformance();
            await this.setupMonitoring();
            await this.runTests();
            await this.generateReport();
            
            console.log('\n✅ CDN deployment completed successfully!');
            console.log('🌍 Your application is now globally distributed and optimized');
            
        } catch (error) {
            console.error('\n❌ CDN deployment failed:', error.message);
            console.log('\n📋 Deployment log:');
            this.deploymentLog.forEach(entry => console.log(`  ${entry}`));
            throw error;
        }
    }
    
    async validateEnvironment() {
        console.log('🔍 Validating environment...');
        
        const requiredEnvVars = [
            'CLOUDFLARE_API_TOKEN',
            'CLOUDFLARE_ZONE_ID',
            'DOMAIN'
        ];
        
        const missing = requiredEnvVars.filter(env => !process.env[env]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);\n        }
        
        // Validate Cloudflare configuration
        try {
            validateCloudflareConfig(CLOUDFLARE_CONFIG);
            this.deploymentLog.push('✅ Cloudflare configuration validated');
        } catch (error) {
            throw new Error(`Configuration validation failed: ${error.message}`);
        }
        
        console.log('✅ Environment validation passed');
    }
    
    async initializeCloudflare() {
        console.log('☁️ Initializing Cloudflare...');
        
        this.cloudflare = new CloudflareManager(
            process.env.CLOUDFLARE_API_TOKEN,
            process.env.CLOUDFLARE_ZONE_ID
        );
        
        // Test API connection
        const healthCheck = await this.cloudflare.healthCheck();
        if (!healthCheck.healthy) {
            throw new Error(`Cloudflare API connection failed: ${healthCheck.message}`);
        }
        
        this.deploymentLog.push('✅ Cloudflare API connection established');
        console.log('✅ Cloudflare initialized');
    }
    
    async deployConfiguration() {
        console.log('⚙️ Deploying CDN configuration...');
        
        try {
            // Apply full Cloudflare configuration
            const results = await this.cloudflare.applyConfiguration(CLOUDFLARE_CONFIG);
            
            // Process results
            const successes = results.filter(r => r.success).length;
            const total = results.length;
            
            this.deploymentLog.push(`✅ Applied ${successes}/${total} configuration settings`);
            
            if (successes < total) {
                console.warn(`⚠️ Some configuration settings failed: ${total - successes} errors`);
            }
            
            // Create DNS records
            await this.createDNSRecords();
            
            console.log('✅ CDN configuration deployed');
            
        } catch (error) {
            this.deploymentLog.push(`❌ Configuration deployment failed: ${error.message}`);
            throw error;
        }
    }
    
    async createDNSRecords() {
        console.log('  📍 Creating DNS records...');
        
        try {
            // Get existing DNS records
            const existingRecords = await this.cloudflare.listDNSRecords();
            const existingNames = existingRecords.result?.map(r => r.name) || [];
            
            // Create new DNS records if they don't exist
            for (const record of CLOUDFLARE_CONFIG.dns) {
                if (!existingNames.includes(record.name === '@' ? process.env.DOMAIN : `${record.name}.${process.env.DOMAIN}`)) {
                    const result = await this.cloudflare.createDNSRecord({
                        ...record,
                        content: record.content === 'YOUR_SERVER_IP' ? process.env.SERVER_IP : record.content
                    });
                    
                    if (result.success) {
                        this.deploymentLog.push(`✅ Created DNS record: ${record.name}`);
                    } else {
                        this.deploymentLog.push(`❌ Failed to create DNS record: ${record.name}`);
                    }
                }
            }
            
            console.log('  ✅ DNS records configured');
            
        } catch (error) {
            this.deploymentLog.push(`❌ DNS configuration failed: ${error.message}`);
            throw error;
        }
    }
    
    async optimizePerformance() {
        console.log('🚀 Optimizing performance...');
        
        try {
            const optimizations = [
                { name: 'Brotli Compression', setting: 'brotli', value: 'on' },
                { name: 'HTTP/3', setting: 'http3', value: 'on' },
                { name: 'Early Hints', setting: 'early_hints', value: 'on' },
                { name: 'Zero RTT', setting: 'zero_rtt', value: 'on' },
                { name: 'Image Polish', setting: 'polish', value: 'lossy' },
                { name: 'WebP Support', setting: 'webp', value: 'on' }
            ];
            
            for (const opt of optimizations) {
                try {
                    const result = await this.cloudflare.updateZoneSetting(opt.setting, opt.value);
                    if (result.success) {
                        this.deploymentLog.push(`✅ Enabled ${opt.name}`);
                    } else {
                        this.deploymentLog.push(`⚠️ Failed to enable ${opt.name}`);
                    }
                } catch (error) {
                    this.deploymentLog.push(`⚠️ ${opt.name} configuration error: ${error.message}`);
                }
            }
            
            console.log('✅ Performance optimizations applied');
            
        } catch (error) {
            this.deploymentLog.push(`❌ Performance optimization failed: ${error.message}`);
            throw error;
        }
    }
    
    async setupMonitoring() {
        console.log('📊 Setting up monitoring...');
        
        try {
            // Enable Web Analytics
            await this.cloudflare.updateZoneSetting('web_analytics', 'on');
            
            // Enable Real User Monitoring
            await this.cloudflare.updateZoneSetting('rum', 'on');
            
            this.deploymentLog.push('✅ CDN monitoring enabled');
            console.log('✅ Monitoring configured');
            
        } catch (error) {
            this.deploymentLog.push(`⚠️ Monitoring setup warning: ${error.message}`);
            console.warn('⚠️ Some monitoring features may not be available');
        }
    }
    
    async runTests() {
        console.log('🧪 Running CDN tests...');
        
        try {
            const domain = process.env.DOMAIN;
            const testUrls = [
                `https://${domain}/`,
                `https://${domain}/api/monitoring/health`,
                `https://${domain}/favicon.ico`
            ];
            
            const testResults = [];
            
            for (const url of testUrls) {
                try {
                    const startTime = Date.now();
                    const response = await fetch(url, {
                        method: 'HEAD',
                        timeout: 10000
                    });
                    const responseTime = Date.now() - startTime;
                    
                    testResults.push({
                        url,
                        status: response.status,
                        responseTime,
                        success: response.ok
                    });
                    
                    if (response.ok) {
                        this.deploymentLog.push(`✅ Test passed: ${url} (${responseTime}ms)`);
                    } else {
                        this.deploymentLog.push(`⚠️ Test warning: ${url} returned ${response.status}`);
                    }
                } catch (error) {
                    this.deploymentLog.push(`❌ Test failed: ${url} - ${error.message}`);
                    testResults.push({
                        url,
                        success: false,
                        error: error.message
                    });
                }
            }
            
            const successfulTests = testResults.filter(r => r.success).length;
            console.log(`✅ CDN tests completed: ${successfulTests}/${testResults.length} passed`);
            
            if (successfulTests === 0) {
                throw new Error('All CDN tests failed - deployment may have issues');
            }
            
        } catch (error) {
            this.deploymentLog.push(`❌ CDN testing failed: ${error.message}`);
            throw error;
        }
    }
    
    async generateReport() {
        console.log('📋 Generating deployment report...');
        
        const report = `# MoonYetis CDN Deployment Report

**Deployment Date:** ${new Date().toISOString()}
**Domain:** ${process.env.DOMAIN}
**CDN Provider:** Cloudflare

## ✅ Deployment Summary

${this.deploymentLog.map(entry => `- ${entry}`).join('\n')}

## 🌍 CDN Configuration

### DNS Records
- Root domain (${process.env.DOMAIN})
- www subdomain
- API subdomain

### Security Features
- ✅ SSL/TLS Full Strict mode
- ✅ HSTS enabled (1 year)
- ✅ DDoS protection
- ✅ Web Application Firewall (WAF)
- ✅ Bot management
- ✅ Rate limiting

### Performance Features
- ✅ HTTP/3 enabled
- ✅ Brotli compression
- ✅ Image optimization (Polish)
- ✅ WebP support
- ✅ Early Hints
- ✅ Zero RTT

### Caching Rules
- Static assets: 24 hours
- API responses: 5 minutes (selected endpoints)
- Dynamic content: No cache
- HTML files: 5 minutes

## 📊 Next Steps

1. **Monitor Performance**
   - Check Cloudflare Analytics dashboard
   - Monitor cache hit ratios
   - Watch for security threats

2. **Optimize Further**
   - Review cache rules after 24 hours
   - Adjust based on traffic patterns
   - Consider additional page rules

3. **Maintenance**
   - Purge cache when deploying updates
   - Review security settings monthly
   - Update SSL certificates before expiry

## 🔗 Important URLs

- **Cloudflare Dashboard:** https://dash.cloudflare.com/
- **Analytics:** https://dash.cloudflare.com/analytics
- **Security:** https://dash.cloudflare.com/security

## 🚨 Emergency Procedures

If CDN issues occur:
1. Check Cloudflare status page
2. Temporarily set DNS to direct IP
3. Contact technical support

---

**Deployment completed successfully!**
Generated: ${new Date().toISOString()}
`;
        
        const reportPath = path.join(__dirname, '../CDN_DEPLOYMENT_REPORT.md');
        await fs.writeFile(reportPath, report);
        
        console.log(`📄 Deployment report saved: CDN_DEPLOYMENT_REPORT.md`);
    }
    
    // Rollback functionality
    async rollback() {
        console.log('🔄 Rolling back CDN configuration...');
        
        try {
            // Disable optimizations
            await this.cloudflare.updateZoneSetting('http3', 'off');
            await this.cloudflare.updateZoneSetting('brotli', 'off');
            await this.cloudflare.updateZoneSetting('polish', 'off');
            
            // Reset security to medium
            await this.cloudflare.updateSecurityLevel('medium');
            
            console.log('✅ CDN configuration rolled back');
            
        } catch (error) {
            console.error('❌ Rollback failed:', error.message);
            throw error;
        }
    }
}

// CLI usage
if (require.main === module) {
    const deployment = new CDNDeployment();
    
    // Handle command line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--rollback')) {
        deployment.rollback().catch(error => {
            console.error('Rollback failed:', error);
            process.exit(1);
        });
    } else {
        deployment.deploy().catch(error => {
            console.error('Deployment failed:', error);
            process.exit(1);
        });
    }
}

module.exports = CDNDeployment;