# MoonYetis Production Deployment Instructions

## 📋 Prerequisites

- Ubuntu 20.04+ server
- Root or sudo access
- Domain pointing to server (moonyetis.io)
- SSH access to the server

## 🚀 Quick Deployment

### Option 1: Complete Automated Deployment

```bash
# On your production server, run:
sudo bash <(curl -s https://raw.githubusercontent.com/osmanmarin/moonyetis-deploy/main/deploy-all.sh)
```

### Option 2: Manual Step-by-Step Deployment

1. **Clone the repository:**
   ```bash
   git clone https://github.com/osmanmarin/moonyetis-deploy.git
   cd moonyetis-deploy
   ```

2. **Deploy Backend:**
   ```bash
   sudo bash backend/deploy-production.sh
   ```

3. **Deploy Frontend:**
   ```bash
   sudo bash frontend/deploy-frontend.sh
   ```

## 🔧 Manual Deployment Steps

### Backend Setup

1. **Install dependencies:**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2
   sudo npm install -g pm2
   ```

2. **Setup project:**
   ```bash
   sudo mkdir -p /var/www/moonyetis-backend
   cd /var/www/moonyetis-backend
   
   # Clone repository
   sudo git clone https://github.com/osmanmarin/moonyetis-deploy.git .
   
   # Navigate to backend
   cd backend
   
   # Install dependencies
   sudo npm install --production
   
   # Create logs directory
   sudo mkdir -p logs
   
   # Setup environment
   sudo cp .env.example .env
   # Edit .env with your production values
   ```

3. **Start services:**
   ```bash
   # Start with PM2
   sudo pm2 start ecosystem.config.js
   
   # Save PM2 configuration
   sudo pm2 save
   
   # Setup startup
   sudo pm2 startup systemd
   ```

### Frontend Setup

1. **Setup Nginx:**
   ```bash
   sudo apt install -y nginx
   
   # Create site configuration
   sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/moonyetis-api
   ```

2. **Configure Nginx:**
   ```bash
   # Edit /etc/nginx/sites-available/moonyetis-api
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
   ```

3. **Deploy frontend files:**
   ```bash
   sudo mkdir -p /var/www/moonyetis-frontend
   sudo cp -r /var/www/moonyetis-backend/frontend/* /var/www/moonyetis-frontend/
   
   # Set permissions
   sudo chown -R www-data:www-data /var/www/moonyetis-frontend
   sudo chmod -R 755 /var/www/moonyetis-frontend
   
   # Enable site
   sudo ln -sf /etc/nginx/sites-available/moonyetis-api /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   
   # Test and restart Nginx
   sudo nginx -t
   sudo systemctl restart nginx
   sudo systemctl enable nginx
   ```

## 🔒 Security Setup

1. **Configure Firewall:**
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 3002/tcp
   sudo ufw --force enable
   ```

2. **SSL Certificate (recommended):**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d moonyetis.io -d api.moonyetis.io
   ```

## 📊 Monitoring & Maintenance

### Check Status
```bash
# Check PM2 status
pm2 status

# Check application logs
pm2 logs moonyetis-store

# Check Nginx status
sudo systemctl status nginx

# Check ports
sudo ss -tlnp | grep -E ':80|:443|:3002'
```

### Restart Services
```bash
# Restart application
pm2 restart moonyetis-store

# Restart Nginx
sudo systemctl restart nginx
```

### Update Application
```bash
cd /var/www/moonyetis-backend
sudo git pull origin main
cd backend
sudo npm install --production
pm2 restart moonyetis-store
```

## 🌐 Access Points

- **Website:** http://moonyetis.io
- **Store API:** http://moonyetis.io:3002
- **API via Nginx:** http://moonyetis.io/api

## 📝 Environment Variables

Edit `/var/www/moonyetis-backend/backend/.env`:

```env
NODE_ENV=production
STORE_PORT=3002
UNISAT_API_KEY=your_api_key_here
PAYMENT_ADDRESS=your_payment_address
WEBHOOK_SECRET=your_webhook_secret
ADMIN_KEY=your_admin_key
```

## 🔍 Troubleshooting

### Common Issues

1. **Port 3002 not accessible:**
   - Check firewall: `sudo ufw status`
   - Check if PM2 is running: `pm2 status`

2. **Nginx 502 Bad Gateway:**
   - Check if backend is running: `pm2 status`
   - Check Nginx configuration: `sudo nginx -t`

3. **Permission denied:**
   - Check file ownership: `ls -la /var/www/`
   - Fix permissions: `sudo chown -R www-data:www-data /var/www/`

### Logs
```bash
# Application logs
pm2 logs moonyetis-store

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# System logs
sudo journalctl -u nginx -f
```