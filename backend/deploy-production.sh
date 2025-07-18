#!/bin/bash

echo "🚀 MoonYetis Production Deployment Script"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root or with sudo"
   exit 1
fi

# Update system packages
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    print_status "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2 globally..."
    npm install -g pm2
fi

# Navigate to project directory
PROJECT_DIR="/var/www/moonyetis-backend"
print_status "Setting up project directory: $PROJECT_DIR"

# Create project directory if it doesn't exist
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# Clone or update repository
if [ -d ".git" ]; then
    print_status "Updating existing repository..."
    git pull origin main
else
    print_status "Cloning repository..."
    git clone https://github.com/osmanmarin/moonyetis-deploy.git .
fi

# Navigate to backend directory
cd backend

# Install dependencies
print_status "Installing production dependencies..."
npm install --production

# Create logs directory
mkdir -p logs

# Copy environment file
if [ ! -f ".env" ]; then
    print_warning "No .env file found. Please create one based on .env.example"
    cp .env.example .env
    print_warning "Please edit .env file with your production values"
fi

# Set proper permissions
print_status "Setting file permissions..."
chown -R www-data:www-data $PROJECT_DIR
chmod -R 755 $PROJECT_DIR

# Stop existing PM2 processes
print_status "Stopping existing PM2 processes..."
pm2 stop ecosystem.config.js 2>/dev/null || true
pm2 delete ecosystem.config.js 2>/dev/null || true

# Start the application with PM2
print_status "Starting application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
print_status "Saving PM2 configuration..."
pm2 save

# Setup PM2 to start on boot
print_status "Setting up PM2 startup..."
pm2 startup systemd -u www-data --hp /var/www

# Setup UFW firewall
print_status "Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3002/tcp
ufw --force enable

# Setup Nginx reverse proxy
print_status "Setting up Nginx reverse proxy..."
apt install -y nginx

# Create Nginx configuration
cat > /etc/nginx/sites-available/moonyetis-api << 'EOF'
server {
    listen 80;
    server_name moonyetis.io api.moonyetis.io;

    location /api/ {
        proxy_pass http://localhost:3002/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        root /var/www/moonyetis-frontend;
        index index.html;
        try_files $uri $uri/ =404;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/moonyetis-api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
systemctl enable nginx

print_status "✅ Deployment completed successfully!"
print_status "🏪 Store API is running on: http://moonyetis.io:3002"
print_status "🌐 Frontend will be served on: http://moonyetis.io"
print_status ""
print_status "To check the status:"
print_status "  pm2 status"
print_status "  pm2 logs moonyetis-store"
print_status ""
print_status "To restart the service:"
print_status "  pm2 restart moonyetis-store"