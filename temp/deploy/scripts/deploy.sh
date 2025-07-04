#!/bin/bash

# MoonYetis Production Deployment Script
# Automated deployment with zero-downtime rolling updates

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOYMENT_ENV="${1:-production}"
VERSION="${2:-latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking deployment prerequisites..."
    
    # Check required tools
    local required_tools=("docker" "docker-compose" "git" "curl" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "Required tool '$tool' is not installed"
            exit 1
        fi
    done
    
    # Check environment variables
    local required_vars=("DOCKER_REGISTRY" "APP_VERSION" "DOMAIN")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Required environment variable '$var' is not set"
            exit 1
        fi
    done
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Backup current deployment
backup_current_deployment() {
    log_info "Creating backup of current deployment..."
    
    local backup_dir="/var/backups/moonyetis/$(date +%Y%m%d_%H%M%S)"
    sudo mkdir -p "$backup_dir"
    
    # Backup database
    if docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$backup_dir/database.sql.gz"; then
        log_success "Database backup created"
    else
        log_error "Database backup failed"
        exit 1
    fi
    
    # Backup application data
    sudo cp -r "$PROJECT_ROOT/.secure" "$backup_dir/" 2>/dev/null || true
    sudo cp "$PROJECT_ROOT/.env.production" "$backup_dir/" 2>/dev/null || true
    
    # Save current Docker images
    docker images --format "{{.Repository}}:{{.Tag}}" | grep moonyetis > "$backup_dir/images.txt"
    
    echo "$backup_dir" > /tmp/moonyetis_backup_location
    log_success "Backup completed: $backup_dir"
}

# Pull latest images
pull_images() {
    log_info "Pulling latest Docker images..."
    
    local image_tag="${DOCKER_REGISTRY}/moonyetis-backend:${VERSION}"
    
    if docker pull "$image_tag"; then
        log_success "Successfully pulled $image_tag"
    else
        log_error "Failed to pull Docker image"
        exit 1
    fi
    
    # Pull supporting images
    docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" pull
}

# Run pre-deployment tests
run_pre_deployment_tests() {
    log_info "Running pre-deployment tests..."
    
    # Health check on new image
    local test_container="moonyetis-test-$(date +%s)"
    
    if docker run --name "$test_container" --rm -d \
        -e NODE_ENV=test \
        -e PORT=3001 \
        "${DOCKER_REGISTRY}/moonyetis-backend:${VERSION}"; then
        
        sleep 10
        
        # Test health endpoint
        if docker exec "$test_container" curl -f http://localhost:3001/api/monitoring/health; then
            log_success "Health check passed"
        else
            log_error "Health check failed"
            docker stop "$test_container" || true
            exit 1
        fi
        
        docker stop "$test_container"
    else
        log_error "Failed to start test container"
        exit 1
    fi
}

# Update configuration
update_configuration() {
    log_info "Updating configuration..."
    
    # Update environment file
    if [[ -f "$PROJECT_ROOT/.env.production.new" ]]; then
        mv "$PROJECT_ROOT/.env.production.new" "$PROJECT_ROOT/.env.production"
        log_success "Configuration updated"
    fi
    
    # Validate configuration
    if node "$PROJECT_ROOT/config/validate-config.js" --env=production; then
        log_success "Configuration validation passed"
    else
        log_error "Configuration validation failed"
        exit 1
    fi
}

# Deploy with zero downtime
deploy_zero_downtime() {
    log_info "Starting zero-downtime deployment..."
    
    # Start new containers with different names
    docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" \
        -p moonyetis-new up -d --no-deps app
    
    # Wait for new containers to be healthy
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" \
            -p moonyetis-new exec app curl -f http://localhost:3000/api/monitoring/health &> /dev/null; then
            log_success "New containers are healthy"
            break
        fi
        
        log_info "Waiting for containers to be healthy... (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        log_error "New containers failed to become healthy"
        docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" -p moonyetis-new down
        exit 1
    fi
    
    # Update load balancer to point to new containers
    update_load_balancer "moonyetis-new"
    
    # Wait for traffic to drain from old containers
    sleep 30
    
    # Stop old containers
    docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" -p moonyetis down
    
    # Rename new containers to main
    docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" \
        -p moonyetis-new stop
    
    # Start main containers with new image
    docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" \
        -p moonyetis up -d
    
    # Update load balancer back to main containers
    update_load_balancer "moonyetis"
    
    log_success "Zero-downtime deployment completed"
}

# Update load balancer configuration
update_load_balancer() {
    local project_name="$1"
    log_info "Updating load balancer for project: $project_name"
    
    # Update HAProxy configuration
    local haproxy_config="/etc/haproxy/haproxy.cfg"
    local temp_config="/tmp/haproxy.cfg.new"
    
    # Generate new configuration
    sed "s/moonyetis_app1/$project_name-app-1/g; s/moonyetis_app2/$project_name-app-2/g" \
        "$PROJECT_ROOT/deploy/load-balancer/haproxy.cfg" > "$temp_config"
    
    # Validate configuration
    if haproxy -f "$temp_config" -c; then
        sudo mv "$temp_config" "$haproxy_config"
        sudo systemctl reload haproxy
        log_success "Load balancer configuration updated"
    else
        log_error "Invalid HAProxy configuration"
        rm -f "$temp_config"
        exit 1
    fi
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    if docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" \
        exec app npm run db:migrate:production; then
        log_success "Database migrations completed"
    else
        log_error "Database migrations failed"
        exit 1
    fi
}

# Purge CDN cache
purge_cdn_cache() {
    log_info "Purging CDN cache..."
    
    if node "$PROJECT_ROOT/deploy/cdn/cdn-manager.js" --purge-all; then
        log_success "CDN cache purged"
    else
        log_warning "CDN cache purge failed (continuing anyway)"
    fi
}

# Run post-deployment tests
run_post_deployment_tests() {
    log_info "Running post-deployment tests..."
    
    local base_url="https://${DOMAIN}"
    local max_attempts=5
    local attempt=1
    
    # Test critical endpoints
    local endpoints=(
        "/api/monitoring/health"
        "/api/leaderboard"
        "/"
    )
    
    for endpoint in "${endpoints[@]}"; do
        while [[ $attempt -le $max_attempts ]]; do
            if curl -f -s "${base_url}${endpoint}" > /dev/null; then
                log_success "Endpoint test passed: $endpoint"
                break
            fi
            
            log_warning "Endpoint test failed: $endpoint (attempt $attempt/$max_attempts)"
            sleep 5
            ((attempt++))
        done
        
        if [[ $attempt -gt $max_attempts ]]; then
            log_error "Endpoint test failed after $max_attempts attempts: $endpoint"
            exit 1
        fi
        
        attempt=1
    done
    
    # Run smoke tests
    if npm run test:smoke -- --url="$base_url"; then
        log_success "Smoke tests passed"
    else
        log_error "Smoke tests failed"
        exit 1
    fi
}

# Send notifications
send_notifications() {
    log_info "Sending deployment notifications..."
    
    local status="$1"
    local message="MoonYetis deployment to $DEPLOYMENT_ENV: $status (version: $VERSION)"
    
    # Slack notification
    if [[ -n "${SLACK_WEBHOOK:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK"
    fi
    
    # Discord notification
    if [[ -n "${DISCORD_WEBHOOK:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"content\":\"$message\"}" \
            "$DISCORD_WEBHOOK"
    fi
    
    # Email notification (if configured)
    if [[ -n "${NOTIFICATION_EMAIL:-}" ]]; then
        echo "$message" | mail -s "MoonYetis Deployment" "$NOTIFICATION_EMAIL"
    fi
    
    log_success "Notifications sent"
}

# Rollback function
rollback() {
    log_warning "Initiating rollback..."
    
    local backup_location
    if [[ -f /tmp/moonyetis_backup_location ]]; then
        backup_location=$(cat /tmp/moonyetis_backup_location)
    else
        log_error "No backup location found"
        exit 1
    fi
    
    # Stop current containers
    docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" down
    
    # Restore database
    if [[ -f "$backup_location/database.sql.gz" ]]; then
        gunzip -c "$backup_location/database.sql.gz" | \
            docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" \
            exec -T postgres psql -U "$DB_USER" "$DB_NAME"
        log_success "Database restored"
    fi
    
    # Restore configuration
    if [[ -f "$backup_location/.env.production" ]]; then
        cp "$backup_location/.env.production" "$PROJECT_ROOT/"
        log_success "Configuration restored"
    fi
    
    # Restore application data
    if [[ -d "$backup_location/.secure" ]]; then
        cp -r "$backup_location/.secure" "$PROJECT_ROOT/"
        log_success "Application data restored"
    fi
    
    # Start containers with previous version
    docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" up -d
    
    send_notifications "ROLLED BACK"
    log_success "Rollback completed"
}

# Main deployment function
main() {
    local start_time=$(date +%s)
    
    log_info "Starting MoonYetis deployment to $DEPLOYMENT_ENV (version: $VERSION)"
    log_info "=================================================="
    
    # Set trap for rollback on error
    trap 'log_error "Deployment failed!"; rollback; exit 1' ERR
    
    # Change to project directory
    cd "$PROJECT_ROOT"
    
    # Main deployment steps
    check_prerequisites
    backup_current_deployment
    pull_images
    run_pre_deployment_tests
    update_configuration
    run_migrations
    deploy_zero_downtime
    purge_cdn_cache
    run_post_deployment_tests
    
    # Calculate deployment time
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_success "Deployment completed successfully in ${duration} seconds"
    send_notifications "SUCCESS"
    
    # Cleanup
    log_info "Performing cleanup..."
    docker system prune -f
    
    log_success "MoonYetis deployment to $DEPLOYMENT_ENV completed!"
}

# Script usage
usage() {
    echo "Usage: $0 [environment] [version]"
    echo "  environment: production, staging (default: production)"
    echo "  version: Docker image tag (default: latest)"
    echo ""
    echo "Examples:"
    echo "  $0 production v1.2.3"
    echo "  $0 staging latest"
    echo ""
    echo "Environment variables:"
    echo "  DOCKER_REGISTRY - Docker registry URL"
    echo "  APP_VERSION - Application version"
    echo "  DOMAIN - Production domain"
    echo "  SLACK_WEBHOOK - Slack notification webhook (optional)"
    echo "  DISCORD_WEBHOOK - Discord notification webhook (optional)"
    echo "  NOTIFICATION_EMAIL - Email for notifications (optional)"
}

# Handle command line arguments
case "${1:-}" in
    -h|--help)
        usage
        exit 0
        ;;
    rollback)
        rollback
        exit 0
        ;;
    *)
        main
        ;;
esac