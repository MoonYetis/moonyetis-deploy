#!/bin/bash

# MoonYetis Security Setup Script
# Phase 1: Secure Credentials and SSL Configuration

set -e

echo "🔐 MoonYetis Security Setup - Phase 1"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the MoonYetis project root directory"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if OpenSSL is available
if ! command -v openssl &> /dev/null; then
    print_warning "OpenSSL not found. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install openssl
        else
            print_error "Please install Homebrew first: https://brew.sh/"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y openssl
    else
        print_error "Please install OpenSSL manually for your operating system"
        exit 1
    fi
fi

print_status "Prerequisites check completed"

# Create secure directories
print_info "Creating secure directories..."
mkdir -p .secure
chmod 700 .secure

mkdir -p .ssl
chmod 700 .ssl

mkdir -p logs
chmod 755 logs

print_status "Secure directories created"

# Install dependencies if needed
print_info "Checking dependencies..."
if [ ! -d "node_modules" ]; then
    print_info "Installing Node.js dependencies..."
    npm install
fi

print_status "Dependencies checked"

# Backup existing .env file
if [ -f ".env" ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    print_warning "Backed up existing .env file"
fi

# Run credentials migration
print_info "Running secure credentials migration..."
echo ""
echo "🔧 This will migrate your credentials to encrypted storage."
echo "📝 Please have the following information ready:"
echo "   • House wallet address"
echo "   • House wallet private key"
echo "   • House wallet public key"
echo "   • Database password"
echo ""

read -p "Continue with migration? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    node scripts/migrate-to-secure-credentials.js
    if [ $? -eq 0 ]; then
        print_status "Credentials migration completed"
    else
        print_error "Credentials migration failed"
        exit 1
    fi
else
    print_warning "Migration cancelled. You can run it later with:"
    print_info "node scripts/migrate-to-secure-credentials.js"
fi

# Generate SSL certificates for development
print_info "Generating development SSL certificates..."
if node -e "require('./config/ssl').generateDevCertificate()" 2>/dev/null; then
    print_status "Development SSL certificates generated"
else
    print_warning "SSL certificate generation failed, will use fallback"
fi

# Create production-ready environment template
print_info "Creating secure environment template..."

cat > .env.secure.template << 'EOF'
# MoonYetis Secure Production Environment
# Copy this to .env and configure for your environment

# Node Environment
NODE_ENV=production

# Server Configuration
PORT=3000
HTTPS_PORT=3443
HOST=0.0.0.0
DOMAIN=yourdomain.com

# Network Configuration
FRACTAL_API_URL=https://fractal-api.unisat.io
FRACTAL_INDEXER_URL=https://fractal-indexer.unisat.io
FRACTAL_EXPLORER_URL=https://fractal.unisat.io

# Secure Credentials (encrypted storage paths)
MASTER_KEY_FILE=.secure/master.key
CREDENTIALS_FILE=.secure/credentials.enc

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=moonyetis_prod
DB_USER=moonyetis
# DB_PASSWORD now stored in encrypted credentials

# SSL/TLS Configuration
SSL_CERT_PATH=/etc/ssl/certs/moonyetis.crt
SSL_KEY_PATH=/etc/ssl/private/moonyetis.key
SSL_CA_PATH=/etc/ssl/certs/ca-bundle.crt

# Database SSL (for production)
DB_SSL_CA=/etc/ssl/certs/db-ca.crt
DB_SSL_CERT=/etc/ssl/certs/db-client.crt
DB_SSL_KEY=/etc/ssl/private/db-client.key

# Logging
LOG_LEVEL=info
LOG_FILE=logs/moonyetis.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security Headers
SECURE_HEADERS=true
HTTPS_REDIRECT=true

# Monitoring
ENABLE_HEALTH_CHECKS=true
HEALTH_CHECK_INTERVAL=30000

# IMPORTANT SECURITY NOTES:
# 1. All sensitive credentials are now encrypted in .secure/credentials.enc
# 2. Never commit .secure/ directory to version control
# 3. Backup master.key file securely and separately
# 4. Use environment-specific values for production
# 5. Enable proper SSL certificates for production
EOF

print_status "Secure environment template created"

# Create Docker secrets setup script
print_info "Creating Docker secrets setup..."

cat > setup-docker-secrets.sh << 'EOF'
#!/bin/bash

# Docker Secrets Setup for Production
echo "Setting up Docker secrets..."

# Generate secure passwords
DB_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)

# Create Docker secrets
echo "$DB_PASSWORD" | docker secret create moonyetis_db_password -
echo "$REDIS_PASSWORD" | docker secret create moonyetis_redis_password -

echo "✅ Docker secrets created"
echo "📝 Store these passwords securely:"
echo "   Database: $DB_PASSWORD"
echo "   Redis: $REDIS_PASSWORD"
EOF

chmod +x setup-docker-secrets.sh
print_status "Docker secrets setup script created"

# Create security validation script
cat > scripts/validate-security.js << 'EOF'
#!/usr/bin/env node

const secureCredentials = require('../services/secureCredentialsManager');
const sslManager = require('../config/ssl');

async function validateSecurity() {
    console.log('🔍 MoonYetis Security Validation');
    console.log('================================\n');

    try {
        // Check credentials
        const credentialsHealth = await secureCredentials.securityHealthCheck();
        console.log('🔐 Credentials Security:');
        console.log(`   Status: ${credentialsHealth.status}`);
        console.log(`   Master Key: ${credentialsHealth.checks.masterKeyExists ? '✅' : '❌'}`);
        console.log(`   Encrypted File: ${credentialsHealth.checks.credentialsFileExists ? '✅' : '❌'}`);
        console.log(`   Can Decrypt: ${credentialsHealth.checks.canDecrypt ? '✅' : '❌'}`);

        // Check SSL
        const sslInfo = await sslManager.getCertificateInfo();
        console.log('\n🔒 SSL/TLS Security:');
        console.log(`   Environment: ${sslInfo.environment}`);
        if (sslInfo.validation) {
            console.log(`   Certificate Valid: ${sslInfo.validation.valid ? '✅' : '❌'}`);
            if (sslInfo.validation.valid) {
                console.log(`   Days Until Expiry: ${sslInfo.validation.daysUntilExpiry}`);
                if (sslInfo.validation.warnings.length > 0) {
                    console.log('   Warnings:');
                    sslInfo.validation.warnings.forEach(warning => {
                        console.log(`     ⚠️  ${warning}`);
                    });
                }
            }
        }

        console.log('\n📊 Security Score:');
        let score = 0;
        let maxScore = 5;

        if (credentialsHealth.checks.masterKeyExists) score++;
        if (credentialsHealth.checks.credentialsFileExists) score++;
        if (credentialsHealth.checks.canDecrypt) score++;
        if (sslInfo.validation && sslInfo.validation.valid) score++;
        if (process.env.NODE_ENV === 'production') score++;

        console.log(`   Score: ${score}/${maxScore} (${Math.round(score/maxScore*100)}%)`);

        if (score === maxScore) {
            console.log('   🎉 Excellent security configuration!');
        } else if (score >= 3) {
            console.log('   ⚠️  Good security, some improvements needed');
        } else {
            console.log('   ❌ Security configuration needs attention');
        }

        console.log('\n✅ Security validation completed');

    } catch (error) {
        console.error('❌ Security validation failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    validateSecurity();
}

module.exports = { validateSecurity };
EOF

chmod +x scripts/validate-security.js
print_status "Security validation script created"

# Final instructions
echo ""
echo "🎉 Security Setup Phase 1 Completed!"
echo "===================================="
echo ""
print_status "Secure credentials system implemented"
print_status "SSL/TLS configuration ready"
print_status "Docker security configuration created"
print_status "Validation tools installed"
echo ""
print_info "Next Steps:"
echo "1. Review and configure .env.secure.template"
echo "2. For production: Run ./setup-docker-secrets.sh"
echo "3. Validate security: node scripts/validate-security.js"
echo "4. Test with: npm start"
echo ""
print_warning "Important Security Reminders:"
echo "• Backup .secure/master.key file securely"
echo "• Never commit .secure/ directory to git"
echo "• Use production SSL certificates for mainnet"
echo "• Run security validation regularly"
echo ""
print_status "Phase 1 security setup complete! 🛡️"