#!/bin/bash

# ==============================================
# MoonYetis Slots - Mainnet Deployment Script
# ==============================================

set -e

echo "🚀 MoonYetis Slots - Mainnet Deployment"
echo "======================================="
echo ""

# Configuration
VPS_HOST="${VPS_HOST:-root@168.231.124.18}"
VPS_PATH="${VPS_PATH:-/var/www/html/moonyetis-backend}"
LOCAL_PROJECT="/Users/Warlink/Desktop/projects/moonyetis-backend"
BACKUP_DIR="/var/backups/moonyetis"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if .env.production exists
    if [[ ! -f "$LOCAL_PROJECT/.env.production" ]]; then
        error ".env.production file not found!"
        echo "Run: node scripts/setup-house-wallet.js"
        exit 1
    fi
    
    # Check if mainnet integration tests pass
    log "Running mainnet integration tests..."
    if ! node "$LOCAL_PROJECT/scripts/test-mainnet-integration.js"; then
        error "Mainnet integration tests failed!"
        echo "Fix the issues before deploying to mainnet."
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Function to create backup
create_backup() {
    log "Creating backup of current deployment..."
    
    ssh $VPS_HOST "
        mkdir -p $BACKUP_DIR
        BACKUP_NAME=\"moonyetis-backup-\$(date +%Y%m%d_%H%M%S)\"
        if [ -d '$VPS_PATH' ]; then
            tar -czf \"$BACKUP_DIR/\$BACKUP_NAME.tar.gz\" -C '$VPS_PATH/..' moonyetis-backend
            echo \"Backup created: $BACKUP_DIR/\$BACKUP_NAME.tar.gz\"
        fi
        
        # Keep only last 5 backups
        cd $BACKUP_DIR
        ls -t moonyetis-backup-*.tar.gz | tail -n +6 | xargs -r rm
    "
    
    success "Backup created"
}

# Function to deploy files
deploy_files() {
    log "Deploying files to production server..."
    
    # Create deployment directory if it doesn't exist
    ssh $VPS_HOST "mkdir -p $VPS_PATH"
    
    # Sync files (excluding sensitive files and dev dependencies)
    rsync -av --delete \
        --exclude='.env*' \
        --exclude='node_modules/' \
        --exclude='.git/' \
        --exclude='*.log' \
        --exclude='house-wallet-info.json' \
        --exclude='test-results.json' \
        "$LOCAL_PROJECT/" \
        "$VPS_HOST:$VPS_PATH/"
    
    success "Files deployed"
}

# Function to deploy environment configuration
deploy_environment() {
    log "Deploying environment configuration..."
    
    # Copy production environment file
    scp "$LOCAL_PROJECT/.env.production" "$VPS_HOST:$VPS_PATH/.env"
    
    # Set secure permissions
    ssh $VPS_HOST "
        chmod 600 $VPS_PATH/.env
        chown root:root $VPS_PATH/.env
    "
    
    success "Environment configuration deployed"
}

# Function to install dependencies and build
install_dependencies() {
    log "Installing production dependencies..."
    
    ssh $VPS_HOST "
        cd $VPS_PATH
        
        # Install production dependencies only
        npm ci --only=production
        
        # Set proper permissions
        chown -R root:root .
        find . -type f -exec chmod 644 {} \;
        find . -type d -exec chmod 755 {} \;
        chmod +x deploy-mainnet.sh
        chmod +x scripts/*.js
    "
    
    success "Dependencies installed"
}

# Function to run database migrations
run_migrations() {
    log "Running database migrations..."
    
    ssh $VPS_HOST "
        cd $VPS_PATH
        
        # Run migrations
        for migration in migrations/*.sql; do
            if [ -f \"\$migration\" ]; then
                echo \"Running migration: \$migration\"
                psql -U moonyetis_user -d moonyetis_slots -f \"\$migration\" || echo \"Migration \$migration may have already been applied\"
            fi
        done
    "
    
    success "Database migrations completed"
}

# Function to start services
start_services() {
    log "Starting MoonYetis services..."
    
    ssh $VPS_HOST "
        cd $VPS_PATH
        
        # Stop existing processes
        pkill -f 'node server.js' || true
        sleep 2
        
        # Start the application with production settings
        nohup node server.js > server.log 2>&1 &
        
        # Wait a moment and check if it started
        sleep 3
        if pgrep -f 'node server.js' > /dev/null; then
            echo 'MoonYetis server started successfully'
        else
            echo 'Failed to start MoonYetis server'
            exit 1
        fi
        
        # Check if nginx is running and reload config
        if command -v nginx > /dev/null 2>&1; then
            nginx -t && nginx -s reload || echo 'Nginx configuration issue'
        fi
    "
    
    success "Services started"
}

# Function to verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Test API health endpoint
    sleep 5
    if ssh $VPS_HOST "curl -s http://localhost:3000/api/health | grep -q 'OK'"; then
        success "API health check passed"
    else
        error "API health check failed"
        return 1
    fi
    
    # Test blockchain endpoints
    if ssh $VPS_HOST "curl -s http://localhost:3000/api/blockchain/fractal/health | grep -q 'success'"; then
        success "Blockchain health check passed"
    else
        warning "Blockchain health check failed - check configuration"
    fi
    
    # Test website accessibility
    HTTP_STATUS=$(ssh $VPS_HOST "curl -s -o /dev/null -w '%{http_code}' http://localhost/ || echo '000'")
    if [ "$HTTP_STATUS" = "200" ]; then
        success "Website is accessible (HTTP $HTTP_STATUS)"
    else
        warning "Website returned HTTP $HTTP_STATUS"
    fi
    
    success "Deployment verification completed"
}

# Function to show post-deployment information
show_deployment_info() {
    echo ""
    echo "🎉 MAINNET DEPLOYMENT COMPLETED!"
    echo "================================="
    echo ""
    echo "🌐 Your site: http://168.231.124.18"
    echo "🔗 API Health: http://168.231.124.18/api/health"
    echo "⛓️ Blockchain Health: http://168.231.124.18/api/blockchain/fractal/health"
    echo ""
    echo "📊 MONITORING COMMANDS:"
    echo "• Server logs: ssh $VPS_HOST 'tail -f $VPS_PATH/server.log'"
    echo "• System stats: ssh $VPS_HOST 'curl localhost:3000/api/blockchain/admin/stats'"
    echo "• Process status: ssh $VPS_HOST 'ps aux | grep node'"
    echo ""
    echo "🔐 SECURITY REMINDERS:"
    echo "• Monitor wallet balances regularly"
    echo "• Check server logs for any errors"
    echo "• Test all functionality with small amounts first"
    echo "• Set up monitoring alerts"
    echo "• Keep backups of wallet seeds secure"
    echo ""
    echo "🚨 IMPORTANT NEXT STEPS:"
    echo "1. Fund the house wallet with MOONYETIS tokens"
    echo "2. Test deposit/withdrawal flows with small amounts"
    echo "3. Monitor the leaderboard functionality"
    echo "4. Set up SSL certificates for HTTPS"
    echo "5. Configure domain name if applicable"
    echo ""
}

# Main execution
main() {
    echo "This script will deploy MoonYetis Slots to MAINNET production."
    echo "This involves REAL cryptocurrency transactions!"
    echo ""
    
    read -p "Are you sure you want to continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo "Deployment cancelled."
        exit 0
    fi
    
    echo ""
    log "Starting mainnet deployment..."
    
    check_prerequisites
    create_backup
    deploy_files
    deploy_environment
    install_dependencies
    run_migrations
    start_services
    verify_deployment
    show_deployment_info
    
    success "Mainnet deployment completed successfully!"
}

# Run main function
main "$@"