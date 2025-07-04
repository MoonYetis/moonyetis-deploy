const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

/**
 * SSL/TLS Configuration Manager
 * Handles secure certificate management and HTTPS configuration
 */
class SSLManager {
    constructor() {
        this.certPath = process.env.SSL_CERT_PATH || '/etc/ssl/certs/moonyetis.crt';
        this.keyPath = process.env.SSL_KEY_PATH || '/etc/ssl/private/moonyetis.key';
        this.caPath = process.env.SSL_CA_PATH || '/etc/ssl/certs/ca-bundle.crt';
        
        // Development self-signed certificates
        this.devCertPath = path.join(process.cwd(), '.ssl', 'dev-cert.pem');
        this.devKeyPath = path.join(process.cwd(), '.ssl', 'dev-key.pem');
        
        this.sslOptions = null;
        this.isProduction = process.env.NODE_ENV === 'production';
        
        console.log('🔒 SSLManager initialized');
    }

    // Generate self-signed certificate for development
    async generateDevCertificate() {
        try {
            const sslDir = path.dirname(this.devCertPath);
            
            // Create .ssl directory if it doesn't exist
            if (!fs.existsSync(sslDir)) {
                fs.mkdirSync(sslDir, { mode: 0o700 });
                console.log('📁 Created .ssl directory');
            }

            // Check if dev certificates already exist
            if (fs.existsSync(this.devCertPath) && fs.existsSync(this.devKeyPath)) {
                console.log('✅ Development SSL certificates already exist');
                return true;
            }

            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);

            // Generate private key
            await execAsync(`openssl genrsa -out "${this.devKeyPath}" 2048`);
            
            // Generate self-signed certificate
            const certCommand = `openssl req -new -x509 -key "${this.devKeyPath}" -out "${this.devCertPath}" -days 365 -subj "/C=US/ST=Development/L=Development/O=MoonYetis/OU=Development/CN=localhost"`;
            await execAsync(certCommand);

            // Set proper permissions
            fs.chmodSync(this.devKeyPath, 0o600);
            fs.chmodSync(this.devCertPath, 0o644);

            console.log('🔒 Generated development SSL certificates');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to generate development certificates:', error.message);
            console.log('💡 Make sure OpenSSL is installed: brew install openssl (macOS) or apt-get install openssl (Ubuntu)');
            return false;
        }
    }

    // Load SSL certificates
    async loadCertificates() {
        try {
            let certPath, keyPath, caPath;

            if (this.isProduction) {
                // Production certificates
                certPath = this.certPath;
                keyPath = this.keyPath;
                caPath = this.caPath;

                console.log('🔒 Loading production SSL certificates...');
                
                // Validate production certificate files exist
                if (!fs.existsSync(certPath)) {
                    throw new Error(`Production certificate not found: ${certPath}`);
                }
                if (!fs.existsSync(keyPath)) {
                    throw new Error(`Production private key not found: ${keyPath}`);
                }
            } else {
                // Development certificates
                console.log('🔒 Loading development SSL certificates...');
                
                // Generate if they don't exist
                const generated = await this.generateDevCertificate();
                if (!generated) {
                    throw new Error('Failed to generate development certificates');
                }

                certPath = this.devCertPath;
                keyPath = this.devKeyPath;
            }

            // Load certificate files
            const cert = fs.readFileSync(certPath, 'utf8');
            const key = fs.readFileSync(keyPath, 'utf8');
            
            this.sslOptions = {
                cert: cert,
                key: key,
                // Security headers
                secureProtocol: 'TLSv1_2_method',
                ciphers: [
                    'ECDHE-RSA-AES128-GCM-SHA256',
                    'ECDHE-RSA-AES256-GCM-SHA384',
                    'ECDHE-RSA-AES128-SHA256',
                    'ECDHE-RSA-AES256-SHA384'
                ].join(':'),
                honorCipherOrder: true
            };

            // Add CA certificate for production
            if (this.isProduction && fs.existsSync(caPath)) {
                this.sslOptions.ca = fs.readFileSync(caPath, 'utf8');
            }

            console.log('✅ SSL certificates loaded successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to load SSL certificates:', error.message);
            throw error;
        }
    }

    // Get SSL options for HTTPS server
    async getSSLOptions() {
        if (!this.sslOptions) {
            await this.loadCertificates();
        }
        return this.sslOptions;
    }

    // Create HTTPS server with proper SSL configuration
    async createHTTPSServer(app) {
        try {
            const sslOptions = await this.getSSLOptions();
            const server = https.createServer(sslOptions, app);

            // Security configurations
            server.setTimeout(30000); // 30 second timeout
            server.keepAliveTimeout = 65000; // 65 seconds
            server.headersTimeout = 66000; // 66 seconds

            return server;
        } catch (error) {
            console.error('❌ Failed to create HTTPS server:', error.message);
            throw error;
        }
    }

    // Validate certificate chain
    async validateCertificate() {
        try {
            if (!this.sslOptions) {
                await this.loadCertificates();
            }

            const cert = this.sslOptions.cert;
            const key = this.sslOptions.key;

            // Parse certificate
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);

            // Write cert to temp file for validation
            const tempCertPath = '/tmp/moonyetis-cert-validation.pem';
            fs.writeFileSync(tempCertPath, cert);

            try {
                // Validate certificate
                const { stdout: certInfo } = await execAsync(`openssl x509 -in ${tempCertPath} -text -noout`);
                
                // Check expiration
                const { stdout: expiryDate } = await execAsync(`openssl x509 -in ${tempCertPath} -enddate -noout`);
                const expiry = new Date(expiryDate.replace('notAfter=', ''));
                const daysUntilExpiry = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));

                // Clean up temp file
                fs.unlinkSync(tempCertPath);

                const validation = {
                    valid: true,
                    expiryDate: expiry,
                    daysUntilExpiry: daysUntilExpiry,
                    subject: certInfo.match(/Subject: (.+)/)?.[1] || 'Unknown',
                    issuer: certInfo.match(/Issuer: (.+)/)?.[1] || 'Unknown',
                    warnings: []
                };

                // Add warnings
                if (daysUntilExpiry < 30) {
                    validation.warnings.push(`Certificate expires in ${daysUntilExpiry} days`);
                }

                if (certInfo.includes('localhost') && this.isProduction) {
                    validation.warnings.push('Using localhost certificate in production');
                }

                console.log('✅ SSL certificate validation completed');
                return validation;

            } catch (validationError) {
                console.error('❌ Certificate validation failed:', validationError.message);
                return {
                    valid: false,
                    error: validationError.message
                };
            }

        } catch (error) {
            console.error('❌ Certificate validation error:', error.message);
            return {
                valid: false,
                error: error.message
            };
        }
    }

    // Get security headers for Express
    getSecurityHeaders() {
        return {
            // Strict Transport Security (HSTS)
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
            
            // Content Security Policy
            'Content-Security-Policy': [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "font-src 'self' https://fonts.gstatic.com",
                "img-src 'self' data: https:",
                "connect-src 'self' ws: wss: https:",
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'"
            ].join('; '),
            
            // Prevent clickjacking
            'X-Frame-Options': 'DENY',
            
            // XSS Protection
            'X-XSS-Protection': '1; mode=block',
            
            // Content type sniffing
            'X-Content-Type-Options': 'nosniff',
            
            // Referrer policy
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            
            // Permissions policy
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
        };
    }

    // Certificate renewal reminder
    setupCertificateMonitoring() {
        if (!this.isProduction) {
            return;
        }

        // Check certificate expiry daily
        setInterval(async () => {
            try {
                const validation = await this.validateCertificate();
                
                if (validation.valid && validation.daysUntilExpiry <= 30) {
                    console.warn(`⚠️  SSL Certificate expires in ${validation.daysUntilExpiry} days!`);
                    console.warn('🔄 Consider renewing the certificate soon');
                    
                    // Here you could integrate with alerting systems
                    // sendAlert('SSL certificate expiring soon', validation);
                }
            } catch (error) {
                console.error('❌ Certificate monitoring error:', error.message);
            }
        }, 24 * 60 * 60 * 1000); // Check daily

        console.log('🔍 SSL certificate monitoring enabled');
    }

    // Get certificate information
    async getCertificateInfo() {
        try {
            const validation = await this.validateCertificate();
            
            return {
                environment: this.isProduction ? 'production' : 'development',
                certificatePath: this.isProduction ? this.certPath : this.devCertPath,
                keyPath: this.isProduction ? this.keyPath : this.devKeyPath,
                validation: validation,
                securityHeaders: Object.keys(this.getSecurityHeaders()).length,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Export singleton instance
module.exports = new SSLManager();