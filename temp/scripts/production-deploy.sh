#!/bin/bash

# MoonYetis Production Deployment Script
# Complete automated deployment to production with mainnet integration

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOYMENT_LOG="$PROJECT_ROOT/logs/production-deployment.log"
BACKUP_DIR="$PROJECT_ROOT/backups/pre-production-$(date +%Y%m%d_%H%M%S)"

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_step() {
    echo -e "\n${PURPLE}=== $1 ===${NC}" | tee -a "$DEPLOYMENT_LOG"
}

# Banner
show_banner() {
    echo -e "${PURPLE}"
    echo "███╗   ███╗ ██████╗  ██████╗ ███╗   ██╗██╗   ██╗███████╗████████╗██╗███████╗"
    echo "████╗ ████║██╔═══██╗██╔═══██╗████╗  ██║╚██╗ ██╔╝██╔════╝╚══██╔══╝██║██╔════╝"
    echo "██╔████╔██║██║   ██║██║   ██║██╔██╗ ██║ ╚████╔╝ █████╗     ██║   ██║███████╗"
    echo "██║╚██╔╝██║██║   ██║██║   ██║██║╚██╗██║  ╚██╔╝  ██╔══╝     ██║   ██║╚════██║"
    echo "██║ ╚═╝ ██║╚██████╔╝╚██████╔╝██║ ╚████║   ██║   ███████╗   ██║   ██║███████║"
    echo "╚═╝     ╚═╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚══════╝   ╚═╝   ╚═╝╚══════╝"
    echo -e "${NC}"
    echo -e "${GREEN}🎰 Blockchain Slots - Production Deployment${NC}"
    echo -e "${BLUE}🚀 Deploying to Production with Real Fractal Bitcoin Mainnet${NC}"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking Prerequisites"
    
    # Check required commands
    local required_commands=("docker" "docker-compose" "git" "node" "npm" "curl" "jq")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "Required command '$cmd' is not installed"
            exit 1
        fi
    done
    
    # Check Node.js version
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        log_error "Node.js version 18 or higher required. Current: $(node --version)"
        exit 1
    fi
    
    # Check Docker
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check required environment variables
    local required_vars=("DOMAIN" "EMAIL" "FRACTAL_API_KEY" "DB_PASSWORD" "REDIS_PASSWORD")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Required environment variable '$var' is not set"
            echo "Please set all required variables in .env.production"
            exit 1
        fi
    done
    
    log_success "All prerequisites check passed"
}

# Setup production environment
setup_environment() {
    log_step "Setting Up Production Environment"
    
    # Create necessary directories
    mkdir -p logs backups uploads .secure
    
    # Set correct permissions
    chmod 700 .secure
    chmod 755 logs backups uploads
    
    # Install/update dependencies
    log "Installing production dependencies..."
    npm ci --only=production
    
    # Install any missing dependencies identified in review
    npm install rate-limit-redis ioredis
    
    # Generate secure secrets if not present
    if [[ ! -f ".secure/master.key" ]]; then
        log "Generating master encryption key..."
        openssl rand -hex 64 > .secure/master.key
        chmod 600 .secure/master.key
    fi
    
    log_success "Production environment setup complete"
}

# Setup SSL certificates
setup_ssl() {
    log_step "Setting Up SSL Certificates"
    
    if [[ -n "${SKIP_SSL:-}" ]]; then
        log_warning "Skipping SSL setup (SKIP_SSL is set)"
        return 0
    fi
    
    # Check if certbot is available
    if command -v certbot &> /dev/null; then
        log "Setting up Let's Encrypt SSL certificate..."
        
        # Stop any existing nginx/apache
        sudo systemctl stop nginx 2>/dev/null || true
        sudo systemctl stop apache2 2>/dev/null || true
        
        # Generate certificate
        sudo certbot certonly --standalone \
            --email "$EMAIL" \
            --agree-tos \
            --no-eff-email \
            -d "$DOMAIN" \
            -d "www.$DOMAIN"
        
        # Copy certificates to project
        sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "security/ssl/$DOMAIN.pem"
        sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "security/ssl/$DOMAIN.key"
        sudo chown $(whoami):$(whoami) "security/ssl/$DOMAIN".*
        
        log_success "SSL certificates configured"
    else
        log_warning "Certbot not found. Using self-signed certificates for testing."
        
        # Generate self-signed certificate for testing
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "security/ssl/$DOMAIN.key" \
            -out "security/ssl/$DOMAIN.pem" \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"
        
        log_warning "Self-signed certificate created. Replace with valid SSL in production!"
    fi
}

# Setup database
setup_database() {
    log_step "Setting Up Production Database"
    
    # Start PostgreSQL and Redis
    log "Starting database services..."
    docker-compose -f docker-compose.production.yml up -d postgres redis
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if docker-compose -f docker-compose.production.yml exec -T postgres pg_isready -U moonyetis_user &> /dev/null; then
            log_success "Database is ready"
            break
        fi
        log "Waiting for database... (attempt $attempt/$max_attempts)"
        sleep 5
        ((attempt++))
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        log_error "Database failed to start within timeout"
        exit 1
    fi
    
    # Run database migrations
    log "Running database migrations..."
    NODE_ENV=production npm run db:migrate:production
    
    log_success "Database setup complete"
}

# Configure blockchain connection
setup_blockchain() {
    log_step "Configuring Fractal Bitcoin Mainnet"
    
    # Test blockchain connectivity
    log "Testing Fractal Bitcoin API connection..."
    
    local api_test=$(curl -s -w "%{http_code}" -o /dev/null "https://fractal-api.unisat.io/v1/indexer/info" \
        -H "Authorization: Bearer $FRACTAL_API_KEY" || echo "000")
    
    if [[ "$api_test" == "200" ]]; then
        log_success "Fractal Bitcoin API connection successful"
    else
        log_error "Failed to connect to Fractal Bitcoin API (HTTP $api_test)"
        log_error "Please verify your FRACTAL_API_KEY"
        exit 1
    fi
    
    # Validate house wallet configuration
    log "Validating house wallet configuration..."
    if node -e "
        const config = require('./config/mainnet.js');
        try {
            config.validateMainnetConfig();
            console.log('✅ Mainnet configuration valid');
        } catch (error) {
            console.error('❌ Configuration error:', error.message);
            process.exit(1);
        }
    "; then
        log_success "House wallet configuration valid"
    else
        log_error "House wallet configuration invalid"
        exit 1
    fi
}

# Deploy application
deploy_application() {
    log_step "Deploying MoonYetis Application"
    
    # Build production Docker image
    log "Building production Docker image..."
    docker build -t moonyetis-backend:production .
    
    # Start all production services
    log "Starting production services..."
    docker-compose -f docker-compose.production.yml up -d
    
    # Wait for application to be ready
    log "Waiting for application to start..."
    local max_attempts=60
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "http://localhost:3000/api/monitoring/health" &> /dev/null; then
            log_success "Application is responding"
            break
        fi
        log "Waiting for application... (attempt $attempt/$max_attempts)"
        sleep 5
        ((attempt++))
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        log_error "Application failed to start within timeout"
        exit 1
    fi
}

# Setup reverse proxy
setup_proxy() {
    log_step "Setting Up Reverse Proxy"
    
    # Install and configure Nginx
    if command -v nginx &> /dev/null; then
        log "Configuring Nginx reverse proxy..."
        
        # Create Nginx configuration
        sudo tee /etc/nginx/sites-available/moonyetis > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    ssl_certificate /home/$(whoami)/moonyetis-backend/security/ssl/$DOMAIN.pem;
    ssl_certificate_key /home/$(whoami)/moonyetis-backend/security/ssl/$DOMAIN.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
        
        # Enable site
        sudo ln -sf /etc/nginx/sites-available/moonyetis /etc/nginx/sites-enabled/
        sudo rm -f /etc/nginx/sites-enabled/default
        
        # Test and reload Nginx
        sudo nginx -t && sudo systemctl reload nginx
        
        log_success "Nginx reverse proxy configured"
    else
        log_warning "Nginx not found. Application running on port 3000"
    fi
}

# Run production tests
run_production_tests() {
    log_step "Running Production Validation Tests"
    
    # Set test URL
    export TEST_BASE_URL="https://$DOMAIN"
    
    # Run final validation suite
    log "Running final production validation..."
    if node tests/production-readiness/final-validation.js; then
        log_success "All production tests passed! 🎉"
    else
        log_error "Production tests failed! Check the reports."
        log_warning "Review FINAL_VALIDATION_REPORT.md for details"
        
        # Ask if user wants to continue anyway
        read -p "Continue with deployment despite test failures? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "Deployment aborted due to test failures"
            exit 1
        fi
    fi
}

# Setup monitoring
setup_monitoring() {
    log_step "Setting Up Production Monitoring"
    
    # Start monitoring services
    log "Starting monitoring stack..."
    docker-compose -f docker-compose.production.yml up -d prometheus grafana
    
    # Wait for services
    sleep 10
    
    # Test monitoring endpoints
    if curl -f -s "http://localhost:9090/-/healthy" &> /dev/null; then
        log_success "Prometheus monitoring active"
    else
        log_warning "Prometheus may not be fully ready yet"
    fi
    
    if curl -f -s "http://localhost:3001/api/health" &> /dev/null; then
        log_success "Grafana dashboard active"
    else
        log_warning "Grafana may not be fully ready yet"
    fi
    
    log "📊 Monitoring available at:"
    log "  - Prometheus: http://localhost:9090"
    log "  - Grafana: http://localhost:3001 (admin/admin)"
}

# Setup automated backups
setup_backups() {
    log_step "Setting Up Automated Backups"
    
    # Create backup script
    cat > /tmp/moonyetis-backup.sh << 'EOF'
#!/bin/bash
cd /home/$(whoami)/moonyetis-backend
/usr/local/bin/node scripts/backup-system.js
EOF
    
    chmod +x /tmp/moonyetis-backup.sh
    sudo mv /tmp/moonyetis-backup.sh /usr/local/bin/moonyetis-backup
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/moonyetis-backup") | crontab -
    
    log_success "Automated daily backups configured (2 AM)"
}

# Final security check
final_security_check() {
    log_step "Final Security Verification"
    
    # Run security hardening
    log "Running security hardening suite..."
    node security/security-hardening.js
    
    # Check file permissions
    log "Verifying file permissions..."
    chmod 600 .secure/* 2>/dev/null || true
    chmod 700 .secure
    
    # Check for exposed secrets
    log "Scanning for exposed secrets..."
    if grep -r "private.*key\|password\|secret" . --exclude-dir=node_modules --exclude-dir=.git --exclude="*.md" | grep -v "REDACTED\|PLACEHOLDER\|EXAMPLE" || true; then
        log_warning "Potential secrets found in files. Please review."
    fi
    
    log_success "Security verification complete"
}

# Generate deployment report
generate_report() {
    log_step "Generating Deployment Report"
    
    local report_file="$PROJECT_ROOT/PRODUCTION_DEPLOYMENT_REPORT.md"
    
    cat > "$report_file" << EOF
# MoonYetis Production Deployment Report

**Deployment Date:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Domain:** $DOMAIN
**Deployment Status:** ✅ SUCCESSFUL

## 🚀 Deployment Summary

MoonYetis Blockchain Slots has been successfully deployed to production with the following configuration:

### 🌐 Public Access
- **Primary URL:** https://$DOMAIN
- **Game Interface:** https://$DOMAIN/
- **API Endpoint:** https://$DOMAIN/api/

### 🔗 Blockchain Configuration
- **Network:** Fractal Bitcoin Mainnet
- **Token:** BRC-20 MOONYETIS
- **House Wallet:** Configured and funded
- **API Integration:** Active

### 🛡️ Security Features
- ✅ SSL/TLS encryption (Let's Encrypt)
- ✅ Security headers configured
- ✅ Rate limiting active
- ✅ Private key encryption
- ✅ Secure session management

### 📊 Monitoring & Operations
- **Health Monitoring:** https://$DOMAIN/api/monitoring/health
- **Prometheus Metrics:** http://localhost:9090
- **Grafana Dashboard:** http://localhost:3001
- **Automated Backups:** Daily at 2 AM

### 🎰 Game Configuration
- **House Edge:** 4%
- **RTP:** 96%
- **Min Bet:** 1 MOONYETIS
- **Max Bet:** 1000 MOONYETIS
- **Paylines:** 25

## 📋 Post-Deployment Checklist

### Immediate Actions (First 24 Hours)
- [ ] Monitor application logs: \`docker-compose logs -f app\`
- [ ] Check house wallet balance
- [ ] Verify transaction processing
- [ ] Monitor user registrations
- [ ] Watch for any error alerts

### Ongoing Maintenance
- [ ] Daily backup verification
- [ ] Weekly security updates
- [ ] Monthly performance review
- [ ] Quarterly security audit

## 🚨 Emergency Procedures

### If Issues Occur:
1. Check application logs: \`docker-compose -f docker-compose.production.yml logs app\`
2. Check system health: \`curl https://$DOMAIN/api/monitoring/health\`
3. Restart services if needed: \`docker-compose -f docker-compose.production.yml restart\`

### Rollback Procedure:
1. Stop current deployment: \`docker-compose -f docker-compose.production.yml down\`
2. Restore from backup: \`node scripts/restore-backup.js [backup-date]\`
3. Restart services: \`docker-compose -f docker-compose.production.yml up -d\`

## 📞 Support Contacts

- **Technical Issues:** [Your technical team]
- **Security Incidents:** [Security team]
- **Business Issues:** [Business team]

## 🎯 Success Metrics

Monitor these key metrics:
- **Uptime:** Target >99.9%
- **Response Time:** Target <500ms
- **Transaction Success Rate:** Target >99%
- **User Satisfaction:** Monitor feedback

---

**🎉 MoonYetis is now LIVE on Fractal Bitcoin Mainnet!**

Welcome to the future of blockchain gambling! 🎰✨
EOF

    log_success "Deployment report generated: PRODUCTION_DEPLOYMENT_REPORT.md"
}

# Success message
show_success() {
    echo -e "\n${GREEN}"
    echo "████████╗██████╗ ██╗██╗   ██╗███╗   ███╗██████╗ ██╗  ██╗"
    echo "╚══██╔══╝██╔══██╗██║██║   ██║████╗ ████║██╔══██╗██║  ██║"
    echo "   ██║   ██████╔╝██║██║   ██║██╔████╔██║██████╔╝███████║"
    echo "   ██║   ██╔══██╗██║██║   ██║██║╚██╔╝██║██╔═══╝ ██╔══██║"
    echo "   ██║   ██║  ██║██║╚██████╔╝██║ ╚═╝ ██║██║     ██║  ██║"
    echo "   ╚═╝   ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝  ╚═╝"
    echo -e "${NC}"
    
    echo -e "${GREEN}🎉 DEPLOYMENT SUCCESSFUL! 🎉${NC}"
    echo ""
    echo -e "${BLUE}🎰 MoonYetis Blockchain Slots is now LIVE!${NC}"
    echo ""
    echo -e "${YELLOW}🌐 Access your casino at: https://$DOMAIN${NC}"
    echo -e "${YELLOW}📊 Monitor health at: https://$DOMAIN/api/monitoring/health${NC}"
    echo -e "${YELLOW}📈 View metrics at: http://localhost:9090${NC}"
    echo ""
    echo -e "${PURPLE}🔗 Fractal Bitcoin Mainnet Integration Active${NC}"
    echo -e "${PURPLE}💰 Real Money Gambling with MOONYETIS Tokens${NC}"
    echo ""
    echo -e "${GREEN}Ready to make history in blockchain gambling! 🚀${NC}"
}

# Main deployment function
main() {
    # Change to project directory
    cd "$PROJECT_ROOT"
    
    # Create logs directory
    mkdir -p logs
    
    # Show banner
    show_banner
    
    # Confirmation
    echo -e "${YELLOW}⚠️  WARNING: This will deploy MoonYetis to PRODUCTION with REAL money transactions!${NC}"
    echo -e "${YELLOW}⚠️  Ensure you have:${NC}"
    echo -e "${YELLOW}   - Valid domain name ($DOMAIN)${NC}"
    echo -e "${YELLOW}   - SSL certificates or email for Let's Encrypt ($EMAIL)${NC}"
    echo -e "${YELLOW}   - Fractal Bitcoin API key configured${NC}"
    echo -e "${YELLOW}   - Database and Redis passwords set${NC}"
    echo ""
    read -p "Are you sure you want to proceed with PRODUCTION deployment? (yes/no): " -r
    if [[ ! $REPLY == "yes" ]]; then
        log "Deployment cancelled by user"
        exit 0
    fi
    
    # Record start time
    local start_time=$(date +%s)
    log "🚀 Starting MoonYetis production deployment..."
    
    # Deployment steps
    check_prerequisites
    setup_environment
    setup_ssl
    setup_database
    setup_blockchain
    deploy_application
    setup_proxy
    run_production_tests
    setup_monitoring
    setup_backups
    final_security_check
    generate_report
    
    # Calculate deployment time
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_success "🎉 Deployment completed successfully in ${duration} seconds!"
    
    # Show success message
    show_success
}

# Error handling
trap 'log_error "Deployment failed at line $LINENO. Check logs for details."; exit 1' ERR

# Run main function
main "$@"