#!/bin/bash

# MoonYetis Backend Deployment Script
# Run this on VPS 168.231.124.18 as root

set -e

VPS_IP="168.231.124.18"
BACKEND_PATH="/var/www/html/moonyetis-backend"

echo "=== MoonYetis Backend Deployment ==="

# 1. Update system packages
echo "1. Updating system packages..."
apt update && apt upgrade -y

# 2. Install required packages
echo "2. Installing required packages..."
apt install -y nodejs npm postgresql postgresql-contrib nginx certbot python3-certbot-nginx git curl

# 3. Create backend directory
echo "3. Setting up backend directory..."
mkdir -p $BACKEND_PATH
cd $BACKEND_PATH

# 4. Fix PostgreSQL authentication (run the fix script)
echo "4. Fixing PostgreSQL authentication..."
chmod +x fix_postgresql.sh
./fix_postgresql.sh

# 5. Initialize database schema
echo "5. Initializing database schema..."
export PGPASSWORD='MoonYetis2024!'
psql -h localhost -U moonyetis_user -d moonyetis_slots -f init_database.sql

# 6. Set up environment configuration
echo "6. Setting up environment configuration..."
cp .env.production .env

# 7. Install Node.js dependencies
echo "7. Installing Node.js dependencies..."
npm install

# 8. Create systemd service
echo "8. Creating systemd service..."
cat > /etc/systemd/system/moonyetis-backend.service << 'EOF'
[Unit]
Description=MoonYetis Backend API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/html/moonyetis-backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=moonyetis-backend

[Install]
WantedBy=multi-user.target
EOF

# 9. Set up nginx configuration
echo "9. Setting up nginx configuration..."
cat > /etc/nginx/sites-available/moonyetis-backend << EOF
server {
    listen 80;
    server_name $VPS_IP;

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

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable nginx site
ln -sf /etc/nginx/sites-available/moonyetis-backend /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# 10. Set proper permissions
echo "10. Setting proper permissions..."
chown -R www-data:www-data $BACKEND_PATH
chmod -R 755 $BACKEND_PATH

# 11. Start services
echo "11. Starting services..."
systemctl daemon-reload
systemctl enable moonyetis-backend
systemctl start moonyetis-backend
systemctl enable nginx
systemctl restart nginx

# 12. Test everything
echo "12. Testing deployment..."
sleep 5

# Test PostgreSQL connection
export PGPASSWORD='MoonYetis2024!'
psql -h localhost -U moonyetis_user -d moonyetis_slots -c "SELECT 'PostgreSQL connection successful' as status;"

# Test backend service
systemctl status moonyetis-backend --no-pager

# Test HTTP endpoint
curl -f http://localhost:3000/api/health || {
    echo "ERROR: Backend health check failed!"
    systemctl status moonyetis-backend --no-pager
    journalctl -u moonyetis-backend --no-pager -n 20
    exit 1
}

echo "=== Deployment Complete ==="
echo "✅ MoonYetis backend deployed successfully!"
echo ""
echo "🌐 Frontend URL: http://$VPS_IP"
echo "📊 Health Check: http://$VPS_IP/api/health"
echo "⛓️  Blockchain API: http://$VPS_IP/api/blockchain"
echo ""
echo "📝 Service Management Commands:"
echo "   systemctl status moonyetis-backend"
echo "   systemctl restart moonyetis-backend" 
echo "   journalctl -u moonyetis-backend -f"
echo ""
echo "🗄️  Database Access:"
echo "   psql -h localhost -U moonyetis_user -d moonyetis_slots"
echo ""
echo "🔧 Configuration Files:"
echo "   Backend: $BACKEND_PATH"
echo "   Environment: $BACKEND_PATH/.env"
echo "   Nginx: /etc/nginx/sites-available/moonyetis-backend"
echo "   Service: /etc/systemd/system/moonyetis-backend.service"
echo ""