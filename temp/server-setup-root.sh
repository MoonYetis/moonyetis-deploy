#!/bin/bash

# ===============================================
# MoonYetis Slots - Server Environment Setup (Root)
# ===============================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎰 MoonYetis Slots - Server Setup (Root)${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script must be run as root for initial setup${NC}"
    exit 1
fi

# Create deploy user for security
echo -e "${YELLOW}👤 Creating deploy user...${NC}"
if ! id "deploy" &>/dev/null; then
    useradd -m -s /bin/bash deploy
    usermod -aG sudo deploy
    echo -e "${GREEN}✅ Deploy user created${NC}"
else
    echo -e "${GREEN}✅ Deploy user already exists${NC}"
fi

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
apt update && apt upgrade -y

# Install Node.js (using NodeSource repository)
echo -e "${YELLOW}🟢 Installing Node.js...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    echo -e "${GREEN}✅ Node.js installed: $(node --version)${NC}"
else
    echo -e "${GREEN}✅ Node.js already installed: $(node --version)${NC}"
fi

# Install PostgreSQL
echo -e "${YELLOW}🐘 Installing PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
    echo -e "${GREEN}✅ PostgreSQL installed${NC}"
else
    echo -e "${GREEN}✅ PostgreSQL already installed${NC}"
fi

# Install PM2 for process management
echo -e "${YELLOW}⚙️ Installing PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    echo -e "${GREEN}✅ PM2 installed: $(pm2 --version)${NC}"
else
    echo -e "${GREEN}✅ PM2 already installed: $(pm2 --version)${NC}"
fi

# Install Nginx
echo -e "${YELLOW}🌐 Installing Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
    echo -e "${GREEN}✅ Nginx installed${NC}"
else
    echo -e "${GREEN}✅ Nginx already installed${NC}"
fi

# Install Certbot for SSL certificates
echo -e "${YELLOW}🔐 Installing Certbot...${NC}"
if ! command -v certbot &> /dev/null; then
    apt install -y certbot python3-certbot-nginx
    echo -e "${GREEN}✅ Certbot installed${NC}"
else
    echo -e "${GREEN}✅ Certbot already installed${NC}"
fi

# Install additional tools
echo -e "${YELLOW}🔧 Installing additional tools...${NC}"
apt install -y curl wget git htop ufw fail2ban

# Configure firewall
echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
echo -e "${GREEN}✅ Firewall configured${NC}"

# Create application directory
echo -e "${YELLOW}📁 Creating application directory...${NC}"
mkdir -p /var/www/moonyetis-slots
mkdir -p /var/log/moonyetis-slots
chown -R deploy:deploy /var/www/moonyetis-slots
chown -R deploy:deploy /var/log/moonyetis-slots
echo -e "${GREEN}✅ Directories created${NC}"

# Create database and user
echo -e "${YELLOW}🗄️ Setting up database...${NC}"
sudo -u postgres psql << EOSQL
-- Create database if it doesn't exist
SELECT 'CREATE DATABASE moonyetis_slots'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'moonyetis_slots')\gexec

-- Create user if it doesn't exist
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'moonyetis_user') THEN
        CREATE USER moonyetis_user WITH ENCRYPTED PASSWORD '6d14a9f3f17e0fa059903d6babe848f6';
    END IF;
END
\$\$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE moonyetis_slots TO moonyetis_user;
ALTER USER moonyetis_user CREATEDB;
EOSQL

echo -e "${GREEN}✅ Database configured${NC}"

# Configure PostgreSQL for connections
PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | grep -oP '\d+\.\d+' | head -1)
PG_CONFIG_DIR="/etc/postgresql/$PG_VERSION/main"

if [ -d "$PG_CONFIG_DIR" ]; then
    echo -e "${YELLOW}🔧 Configuring PostgreSQL for connections...${NC}"
    
    # Backup original config
    cp "$PG_CONFIG_DIR/postgresql.conf" "$PG_CONFIG_DIR/postgresql.conf.backup"
    cp "$PG_CONFIG_DIR/pg_hba.conf" "$PG_CONFIG_DIR/pg_hba.conf.backup"
    
    # Allow local connections
    sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" "$PG_CONFIG_DIR/postgresql.conf"
    
    # Restart PostgreSQL
    systemctl restart postgresql
    echo -e "${GREEN}✅ PostgreSQL configured${NC}"
fi

# Set up log rotation
echo -e "${YELLOW}📝 Setting up log rotation...${NC}"
tee /etc/logrotate.d/moonyetis-slots > /dev/null << EOF
/var/log/moonyetis-slots/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        su deploy -c "pm2 reloadLogs"
    endscript
}
EOF

echo -e "${GREEN}✅ Log rotation configured${NC}"

# Security hardening
echo -e "${YELLOW}🛡️ Applying security hardening...${NC}"

# Configure fail2ban
tee /etc/fail2ban/jail.local > /dev/null << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

systemctl restart fail2ban
echo -e "${GREEN}✅ Fail2ban configured${NC}"

# Set up automatic security updates
echo -e "${YELLOW}🔄 Configuring automatic security updates...${NC}"
apt install -y unattended-upgrades
echo 'Unattended-Upgrade::Automatic-Reboot "false";' >> /etc/apt/apt.conf.d/50unattended-upgrades

# Copy files to deploy user home
echo -e "${YELLOW}📁 Preparing files for deploy user...${NC}"
if [ -f "/root/moonyetis-slots-deploy.tar.gz" ]; then
    cp /root/moonyetis-slots-deploy.tar.gz /home/deploy/
    chown deploy:deploy /home/deploy/moonyetis-slots-deploy.tar.gz
fi

# Display system information
echo ""
echo -e "${BLUE}📊 SYSTEM INFORMATION${NC}"
echo -e "${BLUE}=====================${NC}"
echo -e "${GREEN}OS:${NC} $(lsb_release -d | cut -f2)"
echo -e "${GREEN}Kernel:${NC} $(uname -r)"
echo -e "${GREEN}Memory:${NC} $(free -h | grep '^Mem:' | awk '{print $2}')"
echo -e "${GREEN}Disk:${NC} $(df -h / | tail -1 | awk '{print $4}') available"
echo -e "${GREEN}Node.js:${NC} $(node --version)"
echo -e "${GREEN}npm:${NC} $(npm --version)"
echo -e "${GREEN}PostgreSQL:${NC} $(sudo -u postgres psql -t -c 'SELECT version();' | head -1 | awk '{print $2}')"
echo -e "${GREEN}Nginx:${NC} $(nginx -v 2>&1 | awk '{print $3}')"
echo -e "${GREEN}PM2:${NC} $(pm2 --version)"

echo ""
echo -e "${GREEN}🎉 SERVER SETUP COMPLETED SUCCESSFULLY!${NC}"
echo ""
echo -e "${YELLOW}📋 NEXT STEPS:${NC}"
echo "1. Switch to deploy user for application deployment"
echo "2. Extract and configure the application"
echo "3. Run database migrations"
echo "4. Configure domain and SSL"
echo "5. Start the application with PM2"
echo ""
echo -e "${GREEN}✅ Server is ready for MoonYetis Slots deployment!${NC}"