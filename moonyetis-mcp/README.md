# 🎰 MoonYetis Casino MCP Server

**Model Context Protocol Server for MoonYetis Casino Crypto Gaming Platform**

Real-time monitoring, analytics, and management for your Fractal Bitcoin casino operation.

## 🚀 Features

- **🎰 Casino Statistics**: Real-time player metrics, revenue, and game analytics
- **🔗 Wallet Monitoring**: UniSat/OKX wallet activity tracking 
- **⛓️ Fractal Network**: Bitcoin network status and health monitoring
- **🪙 Token Management**: MoonYetis (MY) BRC-20 token operations
- **👤 Player Analytics**: Detailed player statistics and game history
- **🔒 Security Monitoring**: Suspicious activity detection and alerts
- **📊 System Health**: Server performance and database monitoring
- **⚡ Real-time Updates**: WebSocket connections for live data

## 📋 Prerequisites

- **Node.js** 18.0.0 or higher
- **PostgreSQL** database access
- **Fractal Bitcoin** API access (UniSat)
- **Claude Desktop** application

## 🛠️ Installation

### 1. Clone and Setup
```bash
# Navigate to the MCP directory
cd /root/moonyetis-mcp

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your actual configuration
```

### 2. Database Setup
```bash
# Run database migrations
./start.sh
```

### 3. Claude Desktop Integration

Add to your Claude Desktop configuration file:

**Linux/Mac**: `~/.config/claude-desktop/config.json`
**Windows**: `%APPDATA%\\Claude\\config.json`

```json
{
  "mcpServers": {
    "moonyetis-casino": {
      "command": "node",
      "args": ["/root/moonyetis-mcp/src/index.js"],
      "env": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## 🔧 Configuration

### Required Environment Variables

```bash
# Database
DB_HOST=168.231.124.18
DB_PORT=5432
DB_NAME=moonyetis_casino
DB_USER=postgres
DB_PASSWORD=your_password

# Fractal Bitcoin API
UNISAT_API_KEY=your_api_key
FRACTAL_NETWORK=mainnet

# Security
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
```

See `.env.example` for complete configuration options.

## 🎮 Available Tools

### Casino Operations
- `get_casino_stats` - Real-time casino metrics
- `get_leaderboard` - Player rankings and achievements
- `get_game_history` - Slot machine game logs

### Wallet & Transactions  
- `monitor_wallet_activity` - Track wallet transactions
- `monitor_deposits` - Deposit monitoring and confirmations
- `check_withdrawals` - Withdrawal processing status
- `get_token_balance` - MoonYetis token balances

### Network & Security
- `check_fractal_network` - Fractal Bitcoin network status
- `security_alerts` - Security monitoring and alerts
- `system_health` - Server performance metrics

### Player Analytics
- `get_player_stats` - Individual player analytics
- `get_player_history` - Player game history

## 🚀 Usage

### Start the Server
```bash
./start.sh
```

### Test Installation
```bash
# Test database connection
npm run test

# Check server health
node src/tools/system-health.js
```

### Example Commands in Claude

```
Get casino statistics for the last 24 hours
Monitor recent wallet activity  
Check Fractal Bitcoin network status
Get security alerts
Show player leaderboard by biggest wins
```

## 🔒 Security Features

- **Real-time Monitoring**: Detect suspicious betting patterns
- **Rate Limiting**: Prevent abuse and rapid betting
- **Transaction Validation**: Verify all blockchain transactions
- **Risk Scoring**: Automated player risk assessment
- **Alert System**: Immediate notifications for critical events

## 📊 Monitoring

### System Health Checks
- CPU, Memory, Disk usage monitoring
- Database performance tracking  
- Network connectivity status
- Application error tracking

### Casino Analytics
- Revenue and profit tracking
- Player behavior analysis
- Game performance metrics
- RTP (Return to Player) monitoring

## 🛡️ Security Alerts

The system automatically monitors for:
- High-value bets above threshold
- Rapid betting patterns
- Suspicious win rates
- Duplicate transactions
- Unusual symbol patterns

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check database credentials in .env
   # Verify PostgreSQL is running
   # Test connection manually
   ```

2. **API Rate Limits**
   ```bash
   # Configure API_RATE_LIMIT in .env
   # Check UniSat API key validity
   ```

3. **Permission Denied**
   ```bash
   chmod +x start.sh
   chown -R $USER:$USER /root/moonyetis-mcp
   ```

### Logs Location
- Error logs: `logs/error.log`
- Combined logs: `logs/combined.log`
- Console output: `./start.sh`

## 🔄 Updates

```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm install

# Restart server
./start.sh
```

## 📞 Support

- **Documentation**: Check this README and inline comments
- **Logs**: Monitor `logs/` directory for errors
- **Database**: Verify tables exist and have proper permissions
- **API Keys**: Ensure all external APIs are properly configured

## 🎯 Integration Examples

### Monitor Casino Performance
```javascript
// Get real-time statistics
await tools.get_casino_stats({ timeframe: "24h" });

// Check system health
await tools.system_health({ detailed: true });
```

### Security Monitoring
```javascript
// Check for alerts
await tools.security_alerts({ severity: "high" });

// Monitor player activity
await tools.get_player_stats({ 
  player_id: "wallet_address",
  include_history: true 
});
```

## 🏆 Casino Metrics

- **Revenue Tracking**: Real-time profit/loss monitoring
- **Player Analytics**: Comprehensive player behavior analysis  
- **Game Performance**: RTP, hit rates, and payout analysis
- **Network Health**: Fractal Bitcoin integration status
- **Security Monitoring**: Fraud detection and prevention

---

**🎰 MoonYetis Casino MCP Server v1.0.0**
*Powering next-generation crypto casino operations on Fractal Bitcoin*