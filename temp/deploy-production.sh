#!/bin/bash

# ===============================================
# MoonYetis Slots - Production Deployment Script
# ===============================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="moonyetis-slots"
DOMAIN="${DOMAIN:-your-domain.com}"
SERVER_USER="${SERVER_USER:-root}"
SERVER_HOST="${SERVER_HOST:-your-server-ip}"
SERVER_PORT="${SERVER_PORT:-22}"
REMOTE_DIR="/var/www/$APP_NAME"
DB_NAME="moonyetis_slots"
DB_USER="moonyetis_user"

echo -e "${CYAN}🎰 ============================================${NC}"
echo -e "${GREEN}🚀 MoonYetis Slots - Production Deployment${NC}"
echo -e "${CYAN}🎰 ============================================${NC}"
echo ""

# Step 1: Pre-deployment checks
echo -e "${BLUE}1️⃣ Running pre-deployment checks...${NC}"

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ .env.production file not found!${NC}"
    echo -e "${YELLOW}💡 Run: cp .env.example .env.production and configure it${NC}"
    exit 1
fi

# Check if mainnet integration tests pass
echo -e "${YELLOW}🧪 Running mainnet integration tests...${NC}"
if ! NODE_ENV=production node scripts/test-mainnet-integration.js > /dev/null 2>&1; then
    echo -e "${RED}❌ Mainnet integration tests failed!${NC}"
    echo -e "${YELLOW}💡 Fix the issues before deploying${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Pre-deployment checks passed${NC}"
echo ""

# Step 2: Build and package application
echo -e "${BLUE}2️⃣ Building and packaging application...${NC}"

# Create deployment package
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PACKAGE_NAME="$APP_NAME-$TIMESTAMP.tar.gz"

echo -e "${YELLOW}📦 Creating deployment package: $PACKAGE_NAME${NC}"

# Create temporary directory for deployment files
TEMP_DIR=$(mktemp -d)
APP_DIR="$TEMP_DIR/$APP_NAME"

# Copy application files
mkdir -p "$APP_DIR"
cp -r . "$APP_DIR"

# Clean up unnecessary files in the package
cd "$APP_DIR"
rm -rf node_modules/
rm -rf .git/
rm -f *.log
rm -f .DS_Store
rm -rf frontend/.DS_Store

# Create the package
cd "$TEMP_DIR"
tar -czf "$PACKAGE_NAME" "$APP_NAME"
mv "$PACKAGE_NAME" "$OLDPWD/"

# Clean up temp directory
rm -rf "$TEMP_DIR"

echo -e "${GREEN}✅ Package created: $PACKAGE_NAME${NC}"
echo ""

# Step 3: Server preparation
echo -e "${BLUE}3️⃣ Preparing server environment...${NC}"

# Generate server setup script
cat > server-setup.sh << 'EOF'
#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (using NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL certificates
sudo apt install -y certbot python3-certbot-nginx

# Create application directory
sudo mkdir -p /var/www/moonyetis-slots
sudo chown -R $USER:$USER /var/www/moonyetis-slots

# Create database and user
sudo -u postgres psql << EOSQL
CREATE DATABASE moonyetis_slots;
CREATE USER moonyetis_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE moonyetis_slots TO moonyetis_user;
ALTER USER moonyetis_user CREATEDB;
\q
EOSQL

echo "✅ Server environment prepared successfully"
EOF

echo -e "${YELLOW}📋 Server setup script created: server-setup.sh${NC}"
echo ""

# Step 4: Database migration script
echo -e "${BLUE}4️⃣ Creating database migration script...${NC}"

cat > migrate-production.sql << 'EOF'
-- MoonYetis Slots Production Database Migration
-- Run this script on the production database

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(100) UNIQUE NOT NULL,
    username VARCHAR(50),
    email VARCHAR(255),
    balance DECIMAL(20, 8) DEFAULT 0,
    total_deposited DECIMAL(20, 8) DEFAULT 0,
    total_withdrawn DECIMAL(20, 8) DEFAULT 0,
    total_wagered DECIMAL(20, 8) DEFAULT 0,
    total_won DECIMAL(20, 8) DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    transaction_type VARCHAR(20) NOT NULL, -- 'deposit', 'withdrawal', 'bet', 'win'
    amount DECIMAL(20, 8) NOT NULL,
    token_amount DECIMAL(20, 8),
    txid VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'failed'
    confirmations INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    game_type VARCHAR(50) DEFAULT 'slots',
    bet_amount DECIMAL(20, 8) NOT NULL,
    win_amount DECIMAL(20, 8) DEFAULT 0,
    game_result JSONB,
    server_seed VARCHAR(128),
    client_seed VARCHAR(128),
    nonce INTEGER,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create leaderboard table
CREATE TABLE IF NOT EXISTS leaderboard (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    wallet_address VARCHAR(100) NOT NULL,
    username VARCHAR(50),
    total_won DECIMAL(20, 8) DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    win_rate DECIMAL(5, 4) DEFAULT 0,
    rank_position INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create deposits monitoring table
CREATE TABLE IF NOT EXISTS deposit_monitors (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(100) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_games_user ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard(rank_position);
CREATE INDEX IF NOT EXISTS idx_deposit_monitors_wallet ON deposit_monitors(wallet_address);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leaderboard_updated_at ON leaderboard;
CREATE TRIGGER update_leaderboard_updated_at BEFORE UPDATE ON leaderboard FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial admin data if needed
-- INSERT INTO users (wallet_address, username, balance) VALUES ('admin_wallet', 'admin', 0) ON CONFLICT DO NOTHING;

COMMIT;
EOF

echo -e "${GREEN}✅ Database migration script created: migrate-production.sql${NC}"
echo ""

# Step 5: PM2 ecosystem file
echo -e "${BLUE}5️⃣ Creating PM2 ecosystem configuration...${NC}"

cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'moonyetis-slots',
    script: 'server.js',
    cwd: '/var/www/moonyetis-slots',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/moonyetis-slots/error.log',
    out_file: '/var/log/moonyetis-slots/access.log',
    log_file: '/var/log/moonyetis-slots/app.log',
    merge_logs: true,
    time: true,
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=1024',
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s',
    kill_timeout: 5000,
    listen_timeout: 10000,
    watch: false,
    ignore_watch: [
      'node_modules',
      'logs',
      '*.log'
    ],
    env_file: '.env.production'
  }]
};
EOF

echo -e "${GREEN}✅ PM2 ecosystem configuration created${NC}"
echo ""

# Step 6: Nginx configuration
echo -e "${BLUE}6️⃣ Creating Nginx configuration...${NC}"

cat > nginx-moonyetis.conf << EOF
# MoonYetis Slots Nginx Configuration

upstream moonyetis_backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

# Rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=100r/m;
limit_req_zone \$binary_remote_addr zone=game:10m rate=200r/m;

server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL Configuration (will be managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL Security Headers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate no_last_modified no_etag auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
    
    # Static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /var/www/moonyetis-slots/frontend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Frontend
    location / {
        root /var/www/moonyetis-slots/frontend;
        try_files \$uri \$uri/ /index.html;
        index index.html;
    }
    
    # API endpoints with rate limiting
    location /api/ {
        limit_req zone=api burst=50 nodelay;
        
        proxy_pass http://moonyetis_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 30s;
        proxy_connect_timeout 10s;
    }
    
    # Game endpoints with higher rate limit
    location /api/game/ {
        limit_req zone=game burst=100 nodelay;
        
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
    
    # WebSocket support
    location /socket.io/ {
        proxy_pass http://moonyetis_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Health check (no rate limiting)
    location /api/health {
        proxy_pass http://moonyetis_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        access_log off;
    }
    
    # Block access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ /(\.env|package\.json|server\.js|ecosystem\.config\.js)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

echo -e "${GREEN}✅ Nginx configuration created: nginx-moonyetis.conf${NC}"
echo ""

# Step 7: SSL setup script
echo -e "${BLUE}7️⃣ Creating SSL setup script...${NC}"

cat > setup-ssl.sh << EOF
#!/bin/bash

# Setup SSL certificates with Let's Encrypt
echo "🔐 Setting up SSL certificates..."

# Install Nginx configuration
sudo cp nginx-moonyetis.conf /etc/nginx/sites-available/moonyetis-slots
sudo ln -sf /etc/nginx/sites-available/moonyetis-slots /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

if [ \$? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    sudo systemctl reload nginx
else
    echo "❌ Nginx configuration error"
    exit 1
fi

# Obtain SSL certificate
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Setup auto-renewal
sudo crontab -l | grep -q certbot || (sudo crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | sudo crontab -

echo "✅ SSL certificates configured successfully"
EOF

chmod +x setup-ssl.sh

echo -e "${GREEN}✅ SSL setup script created: setup-ssl.sh${NC}"
echo ""

# Step 8: Deployment instructions
echo -e "${BLUE}8️⃣ Creating deployment instructions...${NC}"

cat > DEPLOYMENT_INSTRUCTIONS.md << EOF
# 🚀 MoonYetis Slots - Production Deployment Instructions

## 📋 Prerequisites

1. **Server Requirements:**
   - Ubuntu 20.04+ or similar Linux distribution
   - Minimum 2GB RAM, 2 CPU cores
   - 20GB+ available disk space
   - Root or sudo access

2. **Domain Requirements:**
   - Domain name pointing to your server IP
   - DNS A records configured for domain and www subdomain

## 🔧 Deployment Steps

### Step 1: Server Setup

1. Upload and run the server setup script:
\`\`\`bash
scp server-setup.sh $SERVER_USER@$SERVER_HOST:~/
ssh $SERVER_USER@$SERVER_HOST
chmod +x server-setup.sh
./server-setup.sh
\`\`\`

### Step 2: Upload Application

1. Upload the application package:
\`\`\`bash
scp $PACKAGE_NAME $SERVER_USER@$SERVER_HOST:~/
\`\`\`

2. Extract and setup the application:
\`\`\`bash
ssh $SERVER_USER@$SERVER_HOST
cd /var/www/
sudo tar -xzf ~/$PACKAGE_NAME
sudo mv $APP_NAME moonyetis-slots
sudo chown -R \$USER:\$USER moonyetis-slots
cd moonyetis-slots
npm install --production
\`\`\`

### Step 3: Database Setup

1. Run database migration:
\`\`\`bash
sudo -u postgres psql moonyetis_slots < migrate-production.sql
\`\`\`

### Step 4: Environment Configuration

1. Configure environment variables:
\`\`\`bash
# Edit .env.production with your specific values
nano .env.production

# Set proper permissions
chmod 600 .env.production
\`\`\`

### Step 5: Application Startup

1. Create log directory:
\`\`\`bash
sudo mkdir -p /var/log/moonyetis-slots
sudo chown \$USER:\$USER /var/log/moonyetis-slots
\`\`\`

2. Start application with PM2:
\`\`\`bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
\`\`\`

### Step 6: Nginx and SSL Setup

1. Setup Nginx and SSL:
\`\`\`bash
chmod +x setup-ssl.sh
sudo ./setup-ssl.sh
\`\`\`

### Step 7: Verification

1. Check application status:
\`\`\`bash
pm2 status
curl https://$DOMAIN/api/health
\`\`\`

2. Monitor logs:
\`\`\`bash
pm2 logs moonyetis-slots
tail -f /var/log/moonyetis-slots/app.log
\`\`\`

## 🔄 Maintenance Commands

### Application Management
\`\`\`bash
# Restart application
pm2 restart moonyetis-slots

# View logs
pm2 logs moonyetis-slots

# Monitor resources
pm2 monit

# Reload with zero downtime
pm2 reload moonyetis-slots
\`\`\`

### Database Backup
\`\`\`bash
# Create backup
sudo -u postgres pg_dump moonyetis_slots > backup_\$(date +%Y%m%d_%H%M%S).sql

# Restore backup
sudo -u postgres psql moonyetis_slots < backup_file.sql
\`\`\`

### SSL Certificate Renewal
\`\`\`bash
# Manual renewal (auto-renewal is configured)
sudo certbot renew
sudo systemctl reload nginx
\`\`\`

## 🚨 Troubleshooting

### Common Issues

1. **Application won't start:**
   - Check logs: \`pm2 logs moonyetis-slots\`
   - Verify environment variables in .env.production
   - Check database connection

2. **SSL certificate issues:**
   - Verify domain DNS settings
   - Check firewall (ports 80, 443 should be open)
   - Run: \`sudo certbot certificates\`

3. **Database connection issues:**
   - Check PostgreSQL status: \`sudo systemctl status postgresql\`
   - Verify database credentials
   - Test connection: \`psql -h localhost -U moonyetis_user -d moonyetis_slots\`

### Security Checklist

- [ ] Firewall configured (UFW or iptables)
- [ ] SSH key-based authentication enabled
- [ ] Regular security updates scheduled
- [ ] Database backups automated
- [ ] SSL certificates auto-renewal working
- [ ] Application logs monitoring setup
- [ ] Resource monitoring (CPU, RAM, disk) setup

## 📞 Support

For deployment support, check:
1. Application logs: \`pm2 logs moonyetis-slots\`
2. Nginx logs: \`sudo tail -f /var/log/nginx/error.log\`
3. System logs: \`sudo journalctl -u nginx -f\`

---

🎰 **MoonYetis Slots** - Ready for Production!
EOF

echo -e "${GREEN}✅ Deployment instructions created: DEPLOYMENT_INSTRUCTIONS.md${NC}"
echo ""

# Step 9: Create monitoring script
echo -e "${BLUE}9️⃣ Creating monitoring script...${NC}"

cat > monitor-production.sh << 'EOF'
#!/bin/bash

# MoonYetis Slots Production Monitoring Script

echo "🔍 MoonYetis Slots - Production Health Check"
echo "==========================================="

# Check application status
echo "📱 Application Status:"
pm2 jlist | jq -r '.[] | select(.name=="moonyetis-slots") | "  Status: \(.pm2_env.status) | CPU: \(.monit.cpu)% | Memory: \(.monit.memory/1024/1024 | floor)MB"'

# Check database connection
echo ""
echo "🗄️  Database Status:"
if sudo -u postgres psql -d moonyetis_slots -c "SELECT 1;" > /dev/null 2>&1; then
    echo "  ✅ Database connection: OK"
else
    echo "  ❌ Database connection: FAILED"
fi

# Check disk space
echo ""
echo "💾 Disk Usage:"
df -h / | tail -1 | awk '{print "  Root: " $3 "/" $2 " (" $5 " used)"}'

# Check memory usage
echo ""
echo "🧠 Memory Usage:"
free -h | grep "^Mem:" | awk '{print "  Memory: " $3 "/" $2 " (" int($3/$2*100) "% used)"}'

# Check SSL certificate expiry
echo ""
echo "🔐 SSL Certificate:"
if command -v openssl >/dev/null 2>&1; then
    EXPIRY=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
    echo "  Expires: $EXPIRY"
else
    echo "  SSL check unavailable"
fi

# Check recent errors
echo ""
echo "⚠️  Recent Errors (last 50 lines):"
ERROR_COUNT=$(tail -50 /var/log/moonyetis-slots/error.log 2>/dev/null | wc -l)
if [ "$ERROR_COUNT" -gt 0 ]; then
    echo "  Found $ERROR_COUNT error entries in last 50 lines"
    tail -5 /var/log/moonyetis-slots/error.log 2>/dev/null | head -3
else
    echo "  ✅ No recent errors found"
fi

# API health check
echo ""
echo "🌐 API Health Check:"
if curl -s https://$DOMAIN/api/health >/dev/null 2>&1; then
    echo "  ✅ API responding normally"
else
    echo "  ❌ API not responding"
fi

echo ""
echo "📊 For detailed logs run:"
echo "  pm2 logs moonyetis-slots"
echo "  tail -f /var/log/moonyetis-slots/app.log"
EOF

chmod +x monitor-production.sh

echo -e "${GREEN}✅ Monitoring script created: monitor-production.sh${NC}"
echo ""

# Step 10: Final summary
echo -e "${PURPLE}📋 DEPLOYMENT PACKAGE SUMMARY${NC}"
echo -e "${CYAN}================================${NC}"
echo ""
echo -e "${GREEN}✅ Application package:${NC} $PACKAGE_NAME"
echo -e "${GREEN}✅ Server setup script:${NC} server-setup.sh"
echo -e "${GREEN}✅ Database migration:${NC} migrate-production.sql"
echo -e "${GREEN}✅ PM2 configuration:${NC} ecosystem.config.js"
echo -e "${GREEN}✅ Nginx configuration:${NC} nginx-moonyetis.conf"
echo -e "${GREEN}✅ SSL setup script:${NC} setup-ssl.sh"
echo -e "${GREEN}✅ Deployment instructions:${NC} DEPLOYMENT_INSTRUCTIONS.md"
echo -e "${GREEN}✅ Monitoring script:${NC} monitor-production.sh"
echo ""

echo -e "${YELLOW}🚀 NEXT STEPS:${NC}"
echo "1. Upload files to your server"
echo "2. Run server-setup.sh on the server"
echo "3. Follow DEPLOYMENT_INSTRUCTIONS.md"
echo "4. Configure your domain DNS"
echo "5. Run setup-ssl.sh for HTTPS"
echo ""

echo -e "${BLUE}🔗 Quick Deploy Commands:${NC}"
echo "# Upload to server:"
echo "scp $PACKAGE_NAME server-setup.sh DEPLOYMENT_INSTRUCTIONS.md $SERVER_USER@$SERVER_HOST:~/"
echo ""
echo "# SSH to server and run:"
echo "ssh $SERVER_USER@$SERVER_HOST"
echo "chmod +x server-setup.sh && ./server-setup.sh"
echo ""

echo -e "${CYAN}🎰 ============================================${NC}"
echo -e "${GREEN}✅ Production deployment package ready!${NC}"
echo -e "${CYAN}🎰 ============================================${NC}"