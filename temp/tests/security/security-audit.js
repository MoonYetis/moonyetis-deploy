const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class SecurityAudit {
    constructor() {
        this.projectRoot = path.join(__dirname, '../..');
        this.results = {
            timestamp: new Date(),
            score: 0,
            maxScore: 0,
            vulnerabilities: [],
            recommendations: [],
            passed: [],
            failed: []
        };
    }

    async runFullAudit() {
        console.log('🔒 Starting MoonYetis Security Audit...\n');
        
        try {
            await this.checkFilePermissions();
            await this.checkCredentialsStorage();
            await this.checkSSLConfiguration();
            await this.auditDependencies();
            await this.checkCodeVulnerabilities();
            await this.testRateLimiting();
            await this.testInputValidation();
            await this.checkDatabaseSecurity();
            await this.testSessionSecurity();
            await this.checkLoggingSecurity();
            
            await this.generateReport();
            
            const percentage = Math.round((this.results.score / this.results.maxScore) * 100);
            console.log(`\n🎯 Security Score: ${this.results.score}/${this.results.maxScore} (${percentage}%)`);
            
            if (percentage >= 90) {
                console.log('✅ Excellent security posture!');
            } else if (percentage >= 80) {
                console.log('⚠️ Good security, but some improvements needed');
            } else {
                console.log('❌ Security needs significant improvement');
            }
            
        } catch (error) {
            console.error('❌ Security audit failed:', error.message);
            throw error;
        }
    }

    async checkFilePermissions() {
        console.log('🔍 Checking file permissions...');
        this.results.maxScore += 10;
        
        const criticalPaths = [
            '.secure',
            '.ssl',
            '.secrets',
            'config/database.js',
            'services/secureCredentialsManager.js'
        ];
        
        let permissionScore = 0;
        
        for (const relativePath of criticalPaths) {
            const fullPath = path.join(this.projectRoot, relativePath);
            
            try {
                const stats = await fs.stat(fullPath);
                const mode = stats.mode;
                const permissions = (mode & parseInt('777', 8)).toString(8);
                
                if (relativePath.includes('.secure') || relativePath.includes('.ssl') || relativePath.includes('.secrets')) {
                    // Directories should be 700 (owner only)
                    if (permissions === '700') {
                        this.addPassed(`✅ ${relativePath}: Secure permissions (${permissions})`);
                        permissionScore += 2;
                    } else {
                        this.addFailed(`❌ ${relativePath}: Insecure permissions (${permissions}), should be 700`);
                        this.addVulnerability('INSECURE_PERMISSIONS', `${relativePath} has permissions ${permissions}`, 'HIGH');
                    }
                } else {
                    // Files should be 600 or 644
                    if (permissions === '600' || permissions === '644') {
                        this.addPassed(`✅ ${relativePath}: Secure permissions (${permissions})`);
                        permissionScore += 1;
                    } else {
                        this.addFailed(`❌ ${relativePath}: Insecure permissions (${permissions})`);
                        this.addVulnerability('INSECURE_PERMISSIONS', `${relativePath} has permissions ${permissions}`, 'MEDIUM');
                    }
                }
            } catch (error) {
                this.addFailed(`❌ ${relativePath}: File not found or inaccessible`);
            }
        }
        
        this.results.score += permissionScore;
        console.log(`  Score: ${permissionScore}/10\n`);
    }

    async checkCredentialsStorage() {
        console.log('🔐 Checking credentials storage...');
        this.results.maxScore += 15;
        
        let credentialsScore = 0;
        
        try {
            // Check if master key exists and is encrypted
            const masterKeyPath = path.join(this.projectRoot, '.secure/master.key');
            await fs.access(masterKeyPath);
            this.addPassed('✅ Master key file exists');
            credentialsScore += 3;
            
            // Check if credentials are encrypted
            const credentialsPath = path.join(this.projectRoot, '.secure/credentials.enc');
            const credentialsData = await fs.readFile(credentialsPath, 'utf8');
            
            if (credentialsData.includes('password') && !credentialsData.includes('-----BEGIN')) {
                this.addFailed('❌ Credentials appear to be stored in plaintext');
                this.addVulnerability('PLAINTEXT_CREDENTIALS', 'Credentials stored in plaintext', 'CRITICAL');
            } else {
                this.addPassed('✅ Credentials appear to be encrypted');
                credentialsScore += 5;
            }
            
            // Check for hardcoded secrets in code
            const codeFiles = await this.findCodeFiles();
            let hardcodedFound = false;
            
            for (const file of codeFiles) {
                const content = await fs.readFile(file, 'utf8');
                const suspiciousPatterns = [
                    /password\s*[:=]\s*['"][^'"]*['"]/i,
                    /secret\s*[:=]\s*['"][^'"]*['"]/i,
                    /api_key\s*[:=]\s*['"][^'"]*['"]/i,
                    /private_key\s*[:=]\s*['"][^'"]*['"]/i
                ];
                
                for (const pattern of suspiciousPatterns) {
                    if (pattern.test(content)) {
                        hardcodedFound = true;
                        this.addFailed(`❌ Potential hardcoded secret in ${path.relative(this.projectRoot, file)}`);
                        this.addVulnerability('HARDCODED_SECRETS', `Potential hardcoded secret in ${file}`, 'HIGH');
                        break;
                    }
                }
            }
            
            if (!hardcodedFound) {
                this.addPassed('✅ No hardcoded secrets found in code');
                credentialsScore += 4;
            }
            
            // Check environment variable usage
            const envFile = path.join(this.projectRoot, '.env');
            try {
                const envContent = await fs.readFile(envFile, 'utf8');
                if (envContent.includes('password') || envContent.includes('secret')) {
                    this.addFailed('❌ Sensitive data found in .env file');
                    this.addVulnerability('ENV_SECRETS', 'Sensitive data in .env file', 'HIGH');
                } else {
                    this.addPassed('✅ .env file does not contain sensitive data');
                    credentialsScore += 3;
                }
            } catch (error) {
                this.addPassed('✅ No .env file found (good for security)');
                credentialsScore += 3;
            }
            
        } catch (error) {
            this.addFailed('❌ Credentials storage check failed');
            this.addVulnerability('MISSING_CREDENTIALS', 'Secure credentials system not properly configured', 'CRITICAL');
        }
        
        this.results.score += credentialsScore;
        console.log(`  Score: ${credentialsScore}/15\n`);
    }

    async checkSSLConfiguration() {
        console.log('🔒 Checking SSL/TLS configuration...');
        this.results.maxScore += 10;
        
        let sslScore = 0;
        
        try {
            // Check SSL certificates
            const certPath = path.join(this.projectRoot, '.ssl/dev-cert.pem');
            const keyPath = path.join(this.projectRoot, '.ssl/dev-key.pem');
            
            await fs.access(certPath);
            await fs.access(keyPath);
            this.addPassed('✅ SSL certificates exist');
            sslScore += 3;
            
            // Check certificate validity
            try {
                const { stdout } = await execAsync(`openssl x509 -in "${certPath}" -text -noout`);
                if (stdout.includes('2048 bit') || stdout.includes('4096 bit')) {
                    this.addPassed('✅ SSL certificate has adequate key size');
                    sslScore += 2;
                } else {
                    this.addFailed('❌ SSL certificate may have weak key size');
                    this.addVulnerability('WEAK_SSL_KEY', 'SSL certificate has weak key size', 'MEDIUM');
                }
            } catch (error) {
                this.addFailed('❌ Could not verify SSL certificate details');
            }
            
            // Check SSL configuration in code
            const sslConfig = await fs.readFile(path.join(this.projectRoot, 'config/ssl.js'), 'utf8');
            
            if (sslConfig.includes('TLSv1.2') || sslConfig.includes('TLSv1.3')) {
                this.addPassed('✅ Secure TLS versions configured');
                sslScore += 2;
            } else {
                this.addFailed('❌ TLS version not explicitly configured');
                this.addRecommendation('Configure explicit TLS versions (1.2+) in SSL config');
            }
            
            if (sslConfig.includes('HTTPS_PORT')) {
                this.addPassed('✅ HTTPS port configured');
                sslScore += 1;
            }
            
            if (sslConfig.includes('Strict-Transport-Security')) {
                this.addPassed('✅ HSTS header configured');
                sslScore += 2;
            } else {
                this.addFailed('❌ HSTS header not configured');
                this.addVulnerability('MISSING_HSTS', 'HTTP Strict Transport Security not configured', 'MEDIUM');
                this.addRecommendation('Add HSTS header for improved security');
            }
            
        } catch (error) {
            this.addFailed('❌ SSL configuration incomplete');
            this.addVulnerability('MISSING_SSL', 'SSL/TLS not properly configured', 'HIGH');
        }
        
        this.results.score += sslScore;
        console.log(`  Score: ${sslScore}/10\n`);
    }

    async auditDependencies() {
        console.log('📦 Auditing dependencies...');
        this.results.maxScore += 10;
        
        let depScore = 0;
        
        try {
            // Run npm audit
            const { stdout, stderr } = await execAsync('npm audit --json', { cwd: this.projectRoot });
            const auditResult = JSON.parse(stdout);
            
            if (auditResult.vulnerabilities) {
                const vulnCount = Object.keys(auditResult.vulnerabilities).length;
                
                if (vulnCount === 0) {
                    this.addPassed('✅ No known vulnerabilities in dependencies');
                    depScore += 10;
                } else {
                    const critical = Object.values(auditResult.vulnerabilities).filter(v => v.severity === 'critical').length;
                    const high = Object.values(auditResult.vulnerabilities).filter(v => v.severity === 'high').length;
                    const moderate = Object.values(auditResult.vulnerabilities).filter(v => v.severity === 'moderate').length;
                    
                    if (critical > 0) {
                        this.addFailed(`❌ ${critical} critical vulnerabilities in dependencies`);
                        this.addVulnerability('CRITICAL_DEPENDENCIES', `${critical} critical vulnerabilities in dependencies`, 'CRITICAL');
                    } else if (high > 0) {
                        this.addFailed(`❌ ${high} high severity vulnerabilities in dependencies`);
                        this.addVulnerability('HIGH_DEPENDENCIES', `${high} high severity vulnerabilities in dependencies`, 'HIGH');
                        depScore += 3;
                    } else if (moderate > 0) {
                        this.addFailed(`⚠️ ${moderate} moderate vulnerabilities in dependencies`);
                        this.addVulnerability('MODERATE_DEPENDENCIES', `${moderate} moderate vulnerabilities in dependencies`, 'MEDIUM');
                        depScore += 6;
                    }
                    
                    this.addRecommendation('Run "npm audit fix" to address dependency vulnerabilities');
                }
            }
        } catch (error) {
            this.addFailed('❌ Could not run dependency audit');
            this.addRecommendation('Install npm and run dependency audit manually');
        }
        
        this.results.score += depScore;
        console.log(`  Score: ${depScore}/10\n`);
    }

    async checkCodeVulnerabilities() {
        console.log('🔍 Scanning code for vulnerabilities...');
        this.results.maxScore += 15;
        
        let codeScore = 0;
        const codeFiles = await this.findCodeFiles();
        
        const vulnerabilityPatterns = [
            {
                pattern: /eval\s*\(/,
                name: 'CODE_INJECTION',
                severity: 'CRITICAL',
                description: 'Use of eval() can lead to code injection'
            },
            {
                pattern: /innerHTML\s*=.*\+/,
                name: 'XSS_RISK',
                severity: 'HIGH',
                description: 'Dynamic innerHTML assignment may lead to XSS'
            },
            {
                pattern: /exec\s*\(\s*[^)]*\+/,
                name: 'COMMAND_INJECTION',
                severity: 'CRITICAL',
                description: 'Dynamic command execution may lead to injection'
            },
            {
                pattern: /JSON\.parse\s*\(\s*req\./,
                name: 'JSON_INJECTION',
                severity: 'MEDIUM',
                description: 'Unsafe JSON parsing of user input'
            },
            {
                pattern: /res\.send\s*\(\s*[^)]*\+/,
                name: 'RESPONSE_INJECTION',
                severity: 'MEDIUM',
                description: 'Dynamic response content may lead to injection'
            }
        ];
        
        let vulnerabilitiesFound = 0;
        
        for (const file of codeFiles) {
            const content = await fs.readFile(file, 'utf8');
            const lines = content.split('\n');
            
            for (const vuln of vulnerabilityPatterns) {
                for (let i = 0; i < lines.length; i++) {
                    if (vuln.pattern.test(lines[i])) {
                        vulnerabilitiesFound++;
                        const relativePath = path.relative(this.projectRoot, file);
                        this.addFailed(`❌ ${vuln.name} in ${relativePath}:${i + 1}`);
                        this.addVulnerability(vuln.name, `${vuln.description} in ${relativePath}:${i + 1}`, vuln.severity);
                    }
                }
            }
        }
        
        if (vulnerabilitiesFound === 0) {
            this.addPassed('✅ No common code vulnerabilities found');
            codeScore += 15;
        } else {
            codeScore += Math.max(0, 15 - vulnerabilitiesFound * 3);
        }
        
        this.results.score += codeScore;
        console.log(`  Score: ${codeScore}/15\n`);
    }

    async testRateLimiting() {
        console.log('⚡ Testing rate limiting...');
        this.results.maxScore += 10;
        
        let rateLimitScore = 0;
        
        try {
            // Test if rate limiting middleware exists
            const serverFile = await fs.readFile(path.join(this.projectRoot, 'server.js'), 'utf8');
            
            if (serverFile.includes('rateLimiterService') || serverFile.includes('rateLimit')) {
                this.addPassed('✅ Rate limiting middleware detected');
                rateLimitScore += 5;
                
                if (serverFile.includes('ddosProtection')) {
                    this.addPassed('✅ DDoS protection enabled');
                    rateLimitScore += 3;
                }
                
                if (serverFile.includes('transactionLimiter')) {
                    this.addPassed('✅ Transaction rate limiting configured');
                    rateLimitScore += 2;
                }
            } else {
                this.addFailed('❌ Rate limiting not detected');
                this.addVulnerability('MISSING_RATE_LIMITING', 'No rate limiting configured', 'HIGH');
                this.addRecommendation('Implement rate limiting to prevent abuse');
            }
            
        } catch (error) {
            this.addFailed('❌ Could not check rate limiting configuration');
        }
        
        this.results.score += rateLimitScore;
        console.log(`  Score: ${rateLimitScore}/10\n`);
    }

    async testInputValidation() {
        console.log('🛡️ Testing input validation...');
        this.results.maxScore += 10;
        
        let validationScore = 0;
        
        try {
            const routeFiles = await this.findRouteFiles();
            let validationFound = false;
            
            for (const file of routeFiles) {
                const content = await fs.readFile(file, 'utf8');
                
                // Check for input validation patterns
                if (content.includes('joi') || content.includes('validator') || content.includes('express-validator')) {
                    validationFound = true;
                    this.addPassed(`✅ Input validation found in ${path.relative(this.projectRoot, file)}`);
                    validationScore += 3;
                }
                
                // Check for SQL injection protection
                if (content.includes('parameterized') || content.includes('prepared') || content.includes('$1')) {
                    this.addPassed(`✅ Parameterized queries detected in ${path.relative(this.projectRoot, file)}`);
                    validationScore += 2;
                }
            }
            
            if (!validationFound) {
                this.addFailed('❌ No input validation library detected');
                this.addVulnerability('MISSING_INPUT_VALIDATION', 'No input validation detected', 'HIGH');
                this.addRecommendation('Implement input validation using joi or express-validator');
            }
            
            // Check for CORS configuration
            const serverFile = await fs.readFile(path.join(this.projectRoot, 'server.js'), 'utf8');
            if (serverFile.includes('cors(')) {
                this.addPassed('✅ CORS configured');
                validationScore += 2;
            } else {
                this.addFailed('❌ CORS not configured');
                this.addRecommendation('Configure CORS to restrict cross-origin requests');
            }
            
            // Check for helmet usage
            if (serverFile.includes('helmet(')) {
                this.addPassed('✅ Helmet security headers configured');
                validationScore += 3;
            } else {
                this.addFailed('❌ Helmet security headers not detected');
                this.addRecommendation('Use helmet to set security headers');
            }
            
        } catch (error) {
            this.addFailed('❌ Could not check input validation');
        }
        
        this.results.score += validationScore;
        console.log(`  Score: ${validationScore}/10\n`);
    }

    async checkDatabaseSecurity() {
        console.log('🗄️ Checking database security...');
        this.results.maxScore += 10;
        
        let dbScore = 0;
        
        try {
            const dbConfig = await fs.readFile(path.join(this.projectRoot, 'config/database.js'), 'utf8');
            
            // Check for connection pooling
            if (dbConfig.includes('Pool') || dbConfig.includes('pool')) {
                this.addPassed('✅ Database connection pooling configured');
                dbScore += 3;
            }
            
            // Check for SSL database connections
            if (dbConfig.includes('ssl:') || dbConfig.includes('sslmode')) {
                this.addPassed('✅ Database SSL connection configured');
                dbScore += 3;
            } else {
                this.addFailed('❌ Database SSL not configured');
                this.addRecommendation('Enable SSL for database connections in production');
            }
            
            // Check if credentials come from secure storage
            if (dbConfig.includes('secureCredentials') || dbConfig.includes('getCredential')) {
                this.addPassed('✅ Database credentials from secure storage');
                dbScore += 4;
            } else {
                this.addFailed('❌ Database credentials not from secure storage');
                this.addVulnerability('INSECURE_DB_CREDENTIALS', 'Database credentials not securely stored', 'HIGH');
            }
            
        } catch (error) {
            this.addFailed('❌ Could not check database configuration');
        }
        
        this.results.score += dbScore;
        console.log(`  Score: ${dbScore}/10\n`);
    }

    async testSessionSecurity() {
        console.log('🍪 Testing session security...');
        this.results.maxScore += 10;
        
        let sessionScore = 0;
        
        try {
            const serverFile = await fs.readFile(path.join(this.projectRoot, 'server.js'), 'utf8');
            
            // Check for secure session configuration
            if (serverFile.includes('httpOnly: true')) {
                this.addPassed('✅ HttpOnly cookies enabled');
                sessionScore += 3;
            } else {
                this.addFailed('❌ HttpOnly cookies not configured');
                this.addVulnerability('INSECURE_COOKIES', 'Cookies not set to HttpOnly', 'MEDIUM');
            }
            
            if (serverFile.includes('secure:') && serverFile.includes('process.env.NODE_ENV')) {
                this.addPassed('✅ Secure cookies for production');
                sessionScore += 3;
            }
            
            if (serverFile.includes('sameSite')) {
                this.addPassed('✅ SameSite cookie attribute configured');
                sessionScore += 2;
            }
            
            if (serverFile.includes('sessionSecret') && serverFile.includes('secureCredentials')) {
                this.addPassed('✅ Session secret from secure storage');
                sessionScore += 2;
            } else {
                this.addFailed('❌ Session secret not securely configured');
                this.addVulnerability('WEAK_SESSION_SECRET', 'Session secret not securely configured', 'MEDIUM');
            }
            
        } catch (error) {
            this.addFailed('❌ Could not check session configuration');
        }
        
        this.results.score += sessionScore;
        console.log(`  Score: ${sessionScore}/10\n`);
    }

    async checkLoggingSecurity() {
        console.log('📝 Checking logging security...');
        this.results.maxScore += 5;
        
        let loggingScore = 0;
        
        try {
            const codeFiles = await this.findCodeFiles();
            let sensitiveLogging = false;
            
            for (const file of codeFiles) {
                const content = await fs.readFile(file, 'utf8');
                
                // Check for sensitive data in logs
                const sensitivePatterns = [
                    /console\.log.*password/i,
                    /console\.log.*secret/i,
                    /console\.log.*key/i,
                    /console\.log.*token/i
                ];
                
                for (const pattern of sensitivePatterns) {
                    if (pattern.test(content)) {
                        sensitiveLogging = true;
                        this.addFailed(`❌ Potential sensitive data logged in ${path.relative(this.projectRoot, file)}`);
                        this.addVulnerability('SENSITIVE_LOGGING', `Potential sensitive data in logs: ${file}`, 'MEDIUM');
                        break;
                    }
                }
            }
            
            if (!sensitiveLogging) {
                this.addPassed('✅ No sensitive data detected in logs');
                loggingScore += 5;
            }
            
        } catch (error) {
            this.addFailed('❌ Could not check logging security');
        }
        
        this.results.score += loggingScore;
        console.log(`  Score: ${loggingScore}/5\n`);
    }

    async findCodeFiles() {
        const codeFiles = [];
        
        const searchDirs = ['routes', 'services', 'middleware', 'config'];
        
        for (const dir of searchDirs) {
            const dirPath = path.join(this.projectRoot, dir);
            try {
                const files = await fs.readdir(dirPath, { recursive: true });
                for (const file of files) {
                    if (file.endsWith('.js')) {
                        codeFiles.push(path.join(dirPath, file));
                    }
                }
            } catch (error) {
                // Directory doesn't exist, skip
            }
        }
        
        // Add main files
        const mainFiles = ['server.js', 'app.js', 'index.js'];
        for (const file of mainFiles) {
            const filePath = path.join(this.projectRoot, file);
            try {
                await fs.access(filePath);
                codeFiles.push(filePath);
            } catch (error) {
                // File doesn't exist, skip
            }
        }
        
        return codeFiles;
    }

    async findRouteFiles() {
        const routeFiles = [];
        const routesDir = path.join(this.projectRoot, 'routes');
        
        try {
            const files = await fs.readdir(routesDir);
            for (const file of files) {
                if (file.endsWith('.js')) {
                    routeFiles.push(path.join(routesDir, file));
                }
            }
        } catch (error) {
            // Routes directory doesn't exist
        }
        
        return routeFiles;
    }

    addPassed(message) {
        this.results.passed.push(message);
        console.log(`  ${message}`);
    }

    addFailed(message) {
        this.results.failed.push(message);
        console.log(`  ${message}`);
    }

    addVulnerability(type, description, severity) {
        this.results.vulnerabilities.push({
            type,
            description,
            severity,
            timestamp: new Date()
        });
    }

    addRecommendation(recommendation) {
        this.results.recommendations.push(recommendation);
    }

    async generateReport() {
        const reportPath = path.join(this.projectRoot, 'tests/security/security-audit-report.json');
        await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
        
        const markdownPath = path.join(this.projectRoot, 'tests/security/security-audit-report.md');
        const markdown = this.generateMarkdownReport();
        await fs.writeFile(markdownPath, markdown);
        
        console.log(`\n📋 Security audit report generated:`);
        console.log(`  JSON: ${reportPath}`);
        console.log(`  Markdown: ${markdownPath}`);
    }

    generateMarkdownReport() {
        const percentage = Math.round((this.results.score / this.results.maxScore) * 100);
        
        let report = `# MoonYetis Security Audit Report\n\n`;
        report += `**Date:** ${this.results.timestamp.toISOString()}\n`;
        report += `**Score:** ${this.results.score}/${this.results.maxScore} (${percentage}%)\n\n`;
        
        if (this.results.vulnerabilities.length > 0) {
            report += `## 🚨 Vulnerabilities Found\n\n`;
            for (const vuln of this.results.vulnerabilities) {
                report += `### ${vuln.severity} - ${vuln.type}\n`;
                report += `${vuln.description}\n\n`;
            }
        }
        
        if (this.results.recommendations.length > 0) {
            report += `## 💡 Recommendations\n\n`;
            for (const rec of this.results.recommendations) {
                report += `- ${rec}\n`;
            }
            report += `\n`;
        }
        
        report += `## ✅ Passed Checks\n\n`;
        for (const pass of this.results.passed) {
            report += `- ${pass}\n`;
        }
        
        if (this.results.failed.length > 0) {
            report += `\n## ❌ Failed Checks\n\n`;
            for (const fail of this.results.failed) {
                report += `- ${fail}\n`;
            }
        }
        
        return report;
    }
}

// Run audit if called directly
if (require.main === module) {
    const audit = new SecurityAudit();
    audit.runFullAudit().catch(error => {
        console.error('Security audit failed:', error);
        process.exit(1);
    });
}

module.exports = SecurityAudit;