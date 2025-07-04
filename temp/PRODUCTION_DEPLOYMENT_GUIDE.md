# 🚀 MoonYetis Production Deployment Guide

## Complete guide for deploying MoonYetis Blockchain Slots to production with real Fractal Bitcoin mainnet integration.

---

## 📋 Pre-Deployment Checklist

### ✅ **1. Server Requirements**
- **OS:** Ubuntu 20.04 LTS or newer
- **RAM:** Minimum 8GB (16GB recommended)
- **Storage:** Minimum 100GB SSD
- **CPU:** 4+ cores
- **Network:** Static IP address and domain name

### ✅ **2. Required Accounts & Services**
- [ ] **Domain name** registered and DNS configured
- [ ] **Fractal Bitcoin API key** from UniSat or similar provider
- [ ] **Email** for Let's Encrypt SSL certificates
- [ ] **AWS S3** bucket for backups (optional but recommended)
- [ ] **Monitoring services** (Datadog, Sentry - optional)

### ✅ **3. Wallet Preparation**
- [ ] **House wallet** created with sufficient MOONYETIS tokens
- [ ] **Backup of wallet** private keys stored securely
- [ ] **Cold storage** setup for excess funds
- [ ] **Multi-signature** setup (recommended for large amounts)

---

## 🛠️ Step 1: Server Setup

### Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install additional tools
sudo apt install -y git curl jq certbot nginx

# Reboot to apply Docker group changes
sudo reboot
```

### Configure Firewall

```bash
# Configure UFW firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw reload
```

---

## 🔧 Step 2: Application Setup

### Clone Repository

```bash
# Clone the MoonYetis backend
git clone https://github.com/your-org/moonyetis-backend.git
cd moonyetis-backend

# Install dependencies
npm install
```

### Configure Environment

```bash
# Copy environment template
cp .env.production.example .env.production

# Edit configuration (use your preferred editor)
nano .env.production
```

### Required Configuration Values

```bash
# CRITICAL: Configure these values
DOMAIN=your-domain.com
EMAIL=your-email@domain.com
FRACTAL_API_KEY=your_fractal_bitcoin_api_key

# Generate secure passwords
DB_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -hex 64)
SESSION_SECRET=$(openssl rand -hex 64)

# Add to .env.production file
echo "DB_PASSWORD=$DB_PASSWORD" >> .env.production
echo "REDIS_PASSWORD=$REDIS_PASSWORD" >> .env.production
echo "JWT_SECRET=$JWT_SECRET" >> .env.production
echo "SESSION_SECRET=$SESSION_SECRET" >> .env.production
```

---

## 💰 Step 3: Wallet Configuration

### Setup House Wallet

```bash
# Generate house wallet (or use existing)
node scripts/generate-wallet.js --network=mainnet

# Secure the private keys
chmod 600 .secure/credentials.enc
chmod 700 .secure/
```

### Wallet Security Checklist

- [ ] Private keys encrypted with master key
- [ ] Master key stored securely (not on server)
- [ ] Backup of wallet stored in multiple secure locations
- [ ] Multi-signature setup for large amounts
- [ ] Cold storage for excess funds

---

## 🚀 Step 4: Automated Deployment

### Run Production Deployment

```bash
# Make deployment script executable
chmod +x scripts/production-deploy.sh

# Load environment variables
source .env.production

# Run automated deployment
./scripts/production-deploy.sh
```

### Deployment Process

The automated script will:

1. ✅ **Check Prerequisites** - Verify all requirements
2. ✅ **Setup Environment** - Install dependencies and configure
3. ✅ **SSL Certificates** - Automatic Let's Encrypt setup
4. ✅ **Database Setup** - PostgreSQL and Redis configuration
5. ✅ **Blockchain Config** - Fractal Bitcoin mainnet connection
6. ✅ **Application Deploy** - Docker containers and services
7. ✅ **Reverse Proxy** - Nginx configuration
8. ✅ **Production Tests** - Comprehensive validation
9. ✅ **Monitoring Setup** - Prometheus and Grafana
10. ✅ **Security Check** - Final hardening verification

---

## 📊 Step 5: Verification & Testing

### Health Checks

```bash
# Check application health
curl https://your-domain.com/api/monitoring/health

# Check all services
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f app
```

### Run Production Tests

```bash
# Run complete validation suite
export TEST_BASE_URL=https://your-domain.com
node tests/production-readiness/final-validation.js

# Run stress tests
node tests/production-readiness/stress-test.js
```

### Test Game Functions

```bash
# Test game API
curl -X POST https://your-domain.com/api/game/demo-spin \
  -H "Content-Type: application/json" \
  -d '{"betAmount": 10}'

# Test wallet connectivity
curl https://your-domain.com/api/wallet/house/status
```

---

## 🛡️ Step 6: Security Hardening

### SSL Certificate Verification

```bash
# Check SSL certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Verify SSL rating
curl -s "https://api.ssllabs.com/api/v3/analyze?host=your-domain.com" | jq '.status'
```

### Security Audit

```bash
# Run security hardening
node security/security-hardening.js

# Check for vulnerabilities
npm audit

# Verify file permissions
ls -la .secure/
```

---

## 📈 Step 7: Monitoring Setup

### Access Monitoring Dashboards

- **Application Health:** `https://your-domain.com/api/monitoring/health`
- **Prometheus Metrics:** `http://your-server-ip:9090`
- **Grafana Dashboard:** `http://your-server-ip:3001` (admin/admin)

### Configure Alerts

```bash
# Test alert systems
curl -X POST https://your-domain.com/api/monitoring/test-alert

# Check alert configuration
curl https://your-domain.com/api/monitoring/alerts/config
```

---

## 🎰 Step 8: Go Live!

### Final Checks Before Launch

- [ ] All tests passing
- [ ] SSL certificate valid
- [ ] House wallet funded
- [ ] Monitoring active
- [ ] Backup systems running
- [ ] Support team ready

### Launch Sequence

```bash
# 1. Final validation
node tests/production-readiness/final-validation.js

# 2. Enable production mode
curl -X POST https://your-domain.com/api/admin/enable-production

# 3. Announce launch
echo "🎉 MoonYetis is now LIVE on Fractal Bitcoin Mainnet!"
```

---

## 🚨 Emergency Procedures

### Rollback Procedure

```bash
# Stop current deployment
docker-compose -f docker-compose.production.yml down

# Restore from backup
node scripts/restore-backup.js $(date -d "1 day ago" +%Y%m%d)

# Restart services
docker-compose -f docker-compose.production.yml up -d
```

### Emergency Contacts

- **Technical Issues:** Your DevOps team
- **Security Incidents:** Security team
- **Business Issues:** Management team

---

## 📋 Post-Launch Monitoring

### First 24 Hours

Monitor these metrics closely:

```bash
# Application health
watch -n 30 "curl -s https://your-domain.com/api/monitoring/health | jq '.status'"

# House wallet balance
watch -n 300 "curl -s https://your-domain.com/api/wallet/house/balance"

# Error logs
docker-compose -f docker-compose.production.yml logs -f app | grep ERROR
```

### Daily Operations

- [ ] Check backup status
- [ ] Review error logs
- [ ] Monitor transaction volume
- [ ] Verify house wallet balance
- [ ] Check security alerts

### Weekly Operations

- [ ] Performance review
- [ ] Security update check
- [ ] Database optimization
- [ ] Backup verification
- [ ] User feedback review

---

## 🎯 Success Metrics

Track these KPIs:

### Technical Metrics
- **Uptime:** >99.9%
- **Response Time:** <500ms
- **Error Rate:** <0.1%
- **Transaction Success:** >99%

### Business Metrics
- **Daily Active Users**
- **Total Volume Played**
- **House Profit**
- **User Retention**

---

## 🛠️ Troubleshooting

### Common Issues

**Issue:** Application won't start
```bash
# Check logs
docker-compose -f docker-compose.production.yml logs app

# Check database connection
docker-compose -f docker-compose.production.yml exec postgres pg_isready
```

**Issue:** SSL certificate issues
```bash
# Renew certificate
sudo certbot renew
sudo systemctl reload nginx
```

**Issue:** High memory usage
```bash
# Check system resources
docker stats
free -h
top
```

**Issue:** Blockchain connection fails
```bash
# Test API connectivity
curl -H "Authorization: Bearer $FRACTAL_API_KEY" \
  https://fractal-api.unisat.io/v1/indexer/info
```

---

## 📞 Support & Maintenance

### Log Locations

- **Application Logs:** `logs/combined.log`
- **Docker Logs:** `docker-compose logs`
- **Nginx Logs:** `/var/log/nginx/`
- **System Logs:** `/var/log/syslog`

### Backup Locations

- **Local Backups:** `backups/`
- **S3 Backups:** Configured bucket
- **Database Dumps:** `backups/database/`

### Maintenance Schedule

- **Daily:** Automated backups
- **Weekly:** Security updates
- **Monthly:** Performance review
- **Quarterly:** Security audit

---

## 🎉 Congratulations!

You have successfully deployed MoonYetis Blockchain Slots to production!

Your casino is now live on Fractal Bitcoin mainnet with real money transactions.

**Welcome to the future of blockchain gambling!** 🎰✨

---

## 📚 Additional Resources

- [MoonYetis API Documentation](./API_DOCUMENTATION.md)
- [Security Best Practices](./SECURITY_GUIDE.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Performance Optimization](./PERFORMANCE_GUIDE.md)