# 🚀 Deploy to Hostinger VPS

## Your VPS Details:
- **Server**: srv876195.hstgr.cloud (168.231.124.18)
- **Location**: Lithuania - Vilnius  
- **Plan**: KVM 2 (2 CPU, 8GB RAM, 100GB)
- **OS**: Ubuntu 22.04 LTS

## 🎯 Quick Deploy Commands:

### Step 1: Connect to VPS
Use **Hostinger Web Terminal** (recommended) or SSH:
```bash
# From Hostinger hPanel → VPS → Terminal
# OR
ssh root@168.231.124.18
```

### Step 2: Install Dependencies
```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Install nginx (optional)
apt-get install -y nginx
```

### Step 3: Clone and Deploy
```bash
# Clone repository
git clone https://github.com/YOUR-USERNAME/moonyetis-slots-ultra-accessible.git
cd moonyetis-slots-ultra-accessible

# Run deployment script
chmod +x deploy-vps.sh
./deploy-vps.sh
```

### Step 4: Configure Nginx (Optional)
```bash
# Create nginx config
cat > /etc/nginx/sites-available/moonyetis << 'EOF'
server {
    listen 80;
    server_name srv876195.hstgr.cloud 168.231.124.18;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/moonyetis /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
```

### Step 5: Open Firewall
```bash
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 3000  # Direct app access
ufw --force enable
```

## 🌐 Access Your Casino:

After deployment, your ultra-accessible casino will be available at:
- **Direct**: http://168.231.124.18:3000
- **With Nginx**: http://168.231.124.18
- **Hostname**: http://srv876195.hstgr.cloud

## 🎰 Features Available:
- ✅ Gambling from $0.001 USD (0.1¢)
- ✅ 6 ultra-accessible bet buttons  
- ✅ Provably Fair gaming
- ✅ Mobile optimized
- ✅ Real-time health monitoring

## 📊 Management Commands:
```bash
pm2 status                  # Check status
pm2 logs moonyetis-slots   # View logs
pm2 restart moonyetis-slots # Restart
pm2 stop moonyetis-slots   # Stop
```

## 🔧 Troubleshooting:
- **Port issues**: Check with `netstat -tlnp | grep 3000`
- **PM2 not starting**: `pm2 startup` and follow instructions
- **Connection timeout**: Verify firewall with `ufw status`

## 🎉 Success!
Your MoonYetis Slots Ultra-Accessible Casino is now live and ready for players!