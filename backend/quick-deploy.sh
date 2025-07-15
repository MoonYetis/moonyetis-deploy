#!/bin/bash

# Quick Deploy Script for MoonYetis Store V2
# Copy and paste this entire script into your server

echo "🚀 MoonYetis Quick Deploy Script"
echo "================================"
echo ""

# Create directories
echo "📁 Creating directories..."
mkdir -p /root/moonyetis-deploy/backend/services
mkdir -p /root/moonyetis-deploy/backend/logs
cd /root/moonyetis-deploy/backend

# Create .env file
echo "🔐 Creating .env configuration..."
cat > .env << 'EOF'
# MoonYetis Store Configuration

# Server Configuration
NODE_ENV=production
STORE_PORT=3002
HD_WALLET_PORT=3001

# UniSat API Configuration
UNISAT_API_KEY=fc77d31a8981cb27425b73f93d2d2354c81d2e3c429137bbfc19d55d7a0dfe12
UNISAT_API_URL=https://open-api.unisat.io

# Payment Configuration
PAYMENT_ADDRESS=bc1pnhnqmuhx9xtqd8naa9wa60ur2n5fv9emjpcethzdwn8kzkx4gv4sf7xkr5
MIN_CONFIRMATIONS=1

# Webhook Security
WEBHOOK_SECRET=f9c1dd497c6de1f0029a44836058bea516c816d39602f89962f4827ede894f05

# Logging
LOG_LEVEL=info
LOG_FILE=moonyetis-store.log

# Price Update Interval (milliseconds)
PRICE_UPDATE_INTERVAL=60000

# Transaction Monitoring
TRANSACTION_CHECK_INTERVAL=30000

# Admin Key
ADMIN_KEY=8e281e16fa6b349d33f30b9da3e90884202c69036de1f7823d4a5143174c7ee2
EOF

# Set permissions
chmod 600 .env

echo "✅ Configuration created"
echo ""
echo "📦 Installing dependencies..."
npm install --production

echo ""
echo "🔧 Installing PM2..."
npm install -g pm2

echo ""
echo "📝 Creating PM2 configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'moonyetis-wallet',
      script: './hd-wallet-server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/wallet-error.log',
      out_file: './logs/wallet-out.log',
      log_file: './logs/wallet-combined.log',
      time: true
    },
    {
      name: 'moonyetis-store',
      script: './store-server-v2.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        STORE_PORT: 3002
      },
      error_file: './logs/store-error.log',
      out_file: './logs/store-out.log',
      log_file: './logs/store-combined.log',
      time: true
    }
  ]
};
EOF

echo ""
echo "🚀 Starting services with PM2..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js

echo ""
echo "💾 Saving PM2 configuration..."
pm2 save

echo ""
echo "🔄 Setting up auto-start on boot..."
pm2 startup systemd -u root --hp /root

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Status:"
pm2 status

echo ""
echo "🧪 Testing endpoints..."
sleep 5

# Test store health
echo -n "Store API: "
curl -s http://localhost:3002/api/store/health > /dev/null 2>&1 && echo "✅ Working" || echo "❌ Not responding"

# Test wallet API
echo -n "Wallet API: "
curl -s http://localhost:3001/api/deposit/addresses > /dev/null 2>&1 && echo "✅ Working" || echo "❌ Not responding"

echo ""
echo "📝 Useful commands:"
echo "  pm2 status    - View service status"
echo "  pm2 logs      - View logs"
echo "  pm2 restart all - Restart services"
echo "  pm2 monit     - Real-time monitoring"
echo ""
echo "🌐 Your APIs are available at:"
echo "  Store API: http://168.231.124.18:3002"
echo "  Wallet API: http://168.231.124.18:3001"
echo ""
echo "🔒 Security reminder:"
echo "  - Your webhook secret and admin key are configured"
echo "  - Make sure ports 3001 and 3002 are open in firewall"
echo "  - Monitor logs for the first 24 hours"