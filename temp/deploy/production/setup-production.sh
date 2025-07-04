#!/bin/bash

# MoonYetis Production Setup Script
# This script sets up the production environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="moonyetis.com"  # Replace with your actual domain
EMAIL="admin@moonyetis.com"  # Replace with your email
SERVER_USER="moonyetis"
APP_DIR="/opt/moonyetis"
BACKUP_DIR="/opt/moonyetis-backups"

echo -e "${BLUE}🚀 MoonYetis Production Setup${NC}"
echo -e "${BLUE}============================${NC}"
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo "App Directory: $APP_DIR"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should not be run as root for security reasons"
        print_error "Please run as a regular user with sudo privileges"
        exit 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if user has sudo privileges
    if ! sudo -n true 2>/dev/null; then
        print_error "User needs sudo privileges"
        exit 1
    fi
    
    print_status "Prerequisites check passed"
}

# Function to create system user
create_system_user() {
    print_status "Creating system user..."
    
    if ! id "$SERVER_USER" &>/dev/null; then
        sudo useradd -r -m -s /bin/bash -d "$APP_DIR" "$SERVER_USER"
        sudo usermod -aG docker "$SERVER_USER"
        print_status "Created user: $SERVER_USER"
    else
        print_status "User $SERVER_USER already exists"
    fi
}

# Function to setup directories
setup_directories() {
    print_status "Setting up directories..."
    
    sudo mkdir -p "$APP_DIR"
    sudo mkdir -p "$BACKUP_DIR"
    sudo mkdir -p /etc/moonyetis
    sudo mkdir -p /var/log/moonyetis
    
    # Set ownership
    sudo chown -R "$SERVER_USER:$SERVER_USER" "$APP_DIR"
    sudo chown -R "$SERVER_USER:$SERVER_USER" "$BACKUP_DIR"
    sudo chown -R "$SERVER_USER:$SERVER_USER" /var/log/moonyetis
    
    print_status "Directories created and configured"
}

# Function to install system dependencies
install_dependencies() {
    print_status "Installing system dependencies..."
    
    sudo apt-get update
    sudo apt-get install -y \
        curl \
        wget \
        git \
        nginx \
        certbot \
        python3-certbot-nginx \
        ufw \
        fail2ban \
        logrotate \
        htop \
        iotop \
        net-tools \
        postgresql-client \
        redis-tools
    
    print_status "System dependencies installed"
}

# Function to configure firewall
configure_firewall() {
    print_status "Configuring firewall..."
    
    # Reset UFW
    sudo ufw --force reset
    
    # Default policies
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # Allow SSH
    sudo ufw allow ssh
    
    # Allow HTTP and HTTPS
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    # Allow application ports (only from localhost)
    sudo ufw allow from 127.0.0.1 to any port 3000
    sudo ufw allow from 127.0.0.1 to any port 3443
    
    # Allow monitoring (restricted)
    sudo ufw allow from 10.0.0.0/8 to any port 9090
    sudo ufw allow from 172.16.0.0/12 to any port 9090
    sudo ufw allow from 192.168.0.0/16 to any port 9090
    
    # Enable firewall
    sudo ufw --force enable
    
    print_status "Firewall configured"
}

# Function to configure fail2ban
configure_fail2ban() {
    print_status "Configuring fail2ban..."
    
    sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
backend = systemd

[sshd]
enabled = true

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log

[moonyetis-api]
enabled = true
port = http,https
filter = moonyetis-api
logpath = /var/log/moonyetis/error.log
maxretry = 5
bantime = 7200

EOF

    # Create custom filter for MoonYetis
    sudo tee /etc/fail2ban/filter.d/moonyetis-api.conf > /dev/null <<EOF
[Definition]
failregex = ^.*\[ERROR\].*IP: <HOST>.*$
            ^.*Rate limit exceeded.*<HOST>.*$
ignoreregex =
EOF

    sudo systemctl enable fail2ban
    sudo systemctl restart fail2ban
    
    print_status "Fail2ban configured"
}

# Function to setup SSL certificates
setup_ssl() {
    print_status "Setting up SSL certificates..."
    
    # Stop nginx if running
    sudo systemctl stop nginx 2>/dev/null || true
    
    # Obtain SSL certificate
    sudo certbot certonly \
        --standalone \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        -d "$DOMAIN" \
        -d "www.$DOMAIN"
    
    # Setup automatic renewal
    sudo crontab -l 2>/dev/null | grep -v certbot || true
    (sudo crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | sudo crontab -
    
    print_status "SSL certificates configured"
}

# Function to configure nginx
configure_nginx() {
    print_status "Configuring nginx..."
    
    sudo tee /etc/nginx/sites-available/moonyetis > /dev/null <<EOF
# Rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=general:10m rate=30r/s;

# Upstream backend
upstream moonyetis_backend {
    least_conn;
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    # Add more servers here for load balancing
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect everything else to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:MozTLS:10m;
    ssl_session_tickets off;
    
    # Modern configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss: https:; font-src 'self' https:" always;
    
    # Rate limiting
    limit_req zone=general burst=50 nodelay;
    
    # Logging
    access_log /var/log/nginx/moonyetis.access.log;
    error_log /var/log/nginx/moonyetis.error.log;
    
    # API endpoints with stricter rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://moonyetis_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # Static content with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://moonyetis_backend;
        proxy_cache_valid 200 1d;
        add_header Cache-Control "public, max-age=86400";
    }
    
    # WebSocket support
    location /ws {
        proxy_pass http://moonyetis_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Default location
    location / {
        proxy_pass http://moonyetis_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://moonyetis_backend/api/monitoring/health;
    }
}
EOF

    # Enable site
    sudo ln -sf /etc/nginx/sites-available/moonyetis /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test nginx configuration
    sudo nginx -t
    
    # Start nginx
    sudo systemctl enable nginx
    sudo systemctl restart nginx
    
    print_status "Nginx configured"
}

# Function to setup log rotation
setup_logrotate() {
    print_status "Setting up log rotation..."
    
    sudo tee /etc/logrotate.d/moonyetis > /dev/null <<EOF
/var/log/moonyetis/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    su $SERVER_USER $SERVER_USER
}
EOF

    print_status "Log rotation configured"
}

# Function to setup monitoring
setup_monitoring() {
    print_status "Setting up system monitoring..."
    
    # Create monitoring script
    sudo tee /usr/local/bin/moonyetis-monitor > /dev/null <<'EOF'
#!/bin/bash
# MoonYetis System Monitor

LOGFILE="/var/log/moonyetis/system-monitor.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Function to log messages
log_message() {
    echo "[$TIMESTAMP] $1" >> "$LOGFILE"
}

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 85 ]; then
    log_message "WARNING: Disk usage is ${DISK_USAGE}%"
fi

# Check memory usage
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.2f", $3*100/$2}')
if (( $(echo "$MEMORY_USAGE > 85" | bc -l) )); then
    log_message "WARNING: Memory usage is ${MEMORY_USAGE}%"
fi

# Check if MoonYetis is running
if ! pgrep -f "node.*server.js" > /dev/null; then
    log_message "ERROR: MoonYetis application is not running"
fi

# Check nginx status
if ! systemctl is-active --quiet nginx; then
    log_message "ERROR: Nginx is not running"
fi

# Check SSL certificate expiry
CERT_EXPIRY=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/cert.pem" 2>/dev/null | cut -d= -f2)
if [ -n "$CERT_EXPIRY" ]; then
    EXPIRY_DATE=$(date -d "$CERT_EXPIRY" +%s)
    CURRENT_DATE=$(date +%s)
    DAYS_LEFT=$(( (EXPIRY_DATE - CURRENT_DATE) / 86400 ))
    
    if [ "$DAYS_LEFT" -lt 30 ]; then
        log_message "WARNING: SSL certificate expires in $DAYS_LEFT days"
    fi
fi
EOF

    sudo chmod +x /usr/local/bin/moonyetis-monitor
    
    # Add to crontab
    (sudo crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/moonyetis-monitor") | sudo crontab -
    
    print_status "System monitoring configured"
}

# Function to create environment file
create_environment() {
    print_status "Creating production environment file..."
    
    sudo -u "$SERVER_USER" tee "$APP_DIR/.env.production" > /dev/null <<EOF
# MoonYetis Production Environment
NODE_ENV=production
PORT=3000
HTTPS_PORT=3443
DOMAIN=$DOMAIN

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=moonyetis_slots
DB_USER=moonyetis_user

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Blockchain
FRACTAL_NETWORK=mainnet
FRACTAL_API_URL=https://fractal-api.unisat.io

# Security
MASTER_KEY_FILE=/opt/moonyetis/.secure/master.key
CREDENTIALS_FILE=/opt/moonyetis/.secure/credentials.enc

# Monitoring
DATADOG_API_KEY=your_datadog_api_key_here
SENTRY_DSN=your_sentry_dsn_here

# Backups
BACKUP_S3_BUCKET=moonyetis-backups
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here

# Rate Limiting
RATE_LIMIT_GENERAL=100
RATE_LIMIT_API=30
RATE_LIMIT_TRANSACTIONS=10

# Alerts
ALERT_EMAIL=$EMAIL
ALERT_WEBHOOK_URL=your_webhook_url_here
EOF

    sudo chmod 600 "$APP_DIR/.env.production"
    
    print_status "Environment file created"
}

# Function to setup systemd service
setup_systemd_service() {
    print_status "Setting up systemd service..."
    
    sudo tee /etc/systemd/system/moonyetis.service > /dev/null <<EOF
[Unit]
Description=MoonYetis Blockchain Slots Application
After=network.target postgresql.service redis.service
Wants=postgresql.service redis.service

[Service]
Type=simple
User=$SERVER_USER
Group=$SERVER_USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/moonyetis/app.log
StandardError=append:/var/log/moonyetis/error.log

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR /var/log/moonyetis

# Resource limits
LimitNOFILE=65536
LimitNPROC=32768

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable moonyetis.service
    
    print_status "Systemd service configured"
}

# Function to create deployment script
create_deployment_script() {
    print_status "Creating deployment script..."
    
    sudo tee /usr/local/bin/deploy-moonyetis > /dev/null <<'EOF'
#!/bin/bash
# MoonYetis Deployment Script

set -e

APP_DIR="/opt/moonyetis"
BACKUP_DIR="/opt/moonyetis-backups"
USER="moonyetis"

echo "🚀 Starting MoonYetis deployment..."

# Create backup
echo "📦 Creating backup..."
sudo -u $USER mkdir -p "$BACKUP_DIR/$(date +%Y%m%d_%H%M%S)"
sudo -u $USER cp -r "$APP_DIR" "$BACKUP_DIR/$(date +%Y%m%d_%H%M%S)/"

# Stop services
echo "🛑 Stopping services..."
sudo systemctl stop moonyetis
sudo systemctl stop nginx

# Update application
echo "🔄 Updating application..."
cd "$APP_DIR"
sudo -u $USER git pull origin main
sudo -u $USER npm ci --production

# Run migrations if needed
echo "🗄️ Running database migrations..."
sudo -u $USER npm run migrate || true

# Start services
echo "🚀 Starting services..."
sudo systemctl start moonyetis
sudo systemctl start nginx

# Verify deployment
echo "✅ Verifying deployment..."
sleep 10
if curl -f http://localhost:3000/api/monitoring/health > /dev/null 2>&1; then
    echo "✅ Deployment successful!"
else
    echo "❌ Deployment failed - check logs"
    exit 1
fi

echo "🎉 MoonYetis deployment completed!"
EOF

    sudo chmod +x /usr/local/bin/deploy-moonyetis
    
    print_status "Deployment script created"
}

# Function to display final instructions
show_final_instructions() {
    print_status "Production setup completed!"
    echo ""
    echo -e "${GREEN}🎉 MoonYetis Production Environment Ready!${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Copy your application code to: $APP_DIR"
    echo "2. Set up your secure credentials in: $APP_DIR/.secure/"
    echo "3. Configure your production environment variables in: $APP_DIR/.env.production"
    echo "4. Start the application: sudo systemctl start moonyetis"
    echo "5. Check status: sudo systemctl status moonyetis"
    echo ""
    echo -e "${BLUE}Important Files:${NC}"
    echo "- Application directory: $APP_DIR"
    echo "- Logs: /var/log/moonyetis/"
    echo "- Nginx config: /etc/nginx/sites-available/moonyetis"
    echo "- SSL certificates: /etc/letsencrypt/live/$DOMAIN/"
    echo "- Deployment script: /usr/local/bin/deploy-moonyetis"
    echo ""
    echo -e "${BLUE}Monitoring:${NC}"
    echo "- System monitor: /usr/local/bin/moonyetis-monitor"
    echo "- Application status: sudo systemctl status moonyetis"
    echo "- Nginx status: sudo systemctl status nginx"
    echo "- View logs: sudo journalctl -u moonyetis -f"
    echo ""
    echo -e "${YELLOW}Security Notes:${NC}"
    echo "- Firewall is enabled and configured"
    echo "- Fail2ban is active"
    echo "- SSL certificates will auto-renew"
    echo "- Regular security updates recommended"
    echo ""
    echo -e "${GREEN}Your site should be accessible at: https://$DOMAIN${NC}"
}

# Main execution
main() {
    check_root
    check_prerequisites
    create_system_user
    setup_directories
    install_dependencies
    configure_firewall
    configure_fail2ban
    setup_ssl
    configure_nginx
    setup_logrotate
    setup_monitoring
    create_environment
    setup_systemd_service
    create_deployment_script
    show_final_instructions
}

# Run main function
main "$@"