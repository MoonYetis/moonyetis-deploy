# 🎰 MoonYetis Backend - Complete Crypto Gaming Platform

> Revolutionary slot machine backend API built for Fractal Bitcoin integration

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

## 🚀 Quick Start (3 Commands)

```bash
# 1. Clone this repository
git clone https://github.com/MoonYetis/moonyetis-backend.git
cd moonyetis-backend

# 2. Run quick setup
./quick-start.sh

# 3. Open your browser
open http://localhost:3000
```

## ✨ What You Get

### 🎮 Complete Gaming Backend
- **Slot Machine API**: 5x3 reels, 25 paylines, realistic RTP
- **WebSocket Support**: Real-time game updates
- **Demo Mode**: Fully functional without wallet connection
- **Health Monitoring**: API status and metrics endpoints

### 💰 Crypto Ready
- **Fractal Bitcoin Integration**: Ready for real transactions
- **Wallet Management**: Hot/cold storage architecture
- **Security**: JWT authentication, rate limiting, audit logs
- **Scalable**: Docker containerization and database ready

### 🏗️ Professional Architecture
- **Express.js API**: RESTful endpoints
- **WebSocket Server**: Real-time communication
- **PostgreSQL Ready**: Database models and migrations
- **Redis Support**: Session management and caching
- **Docker Compose**: One-command deployment

## 📊 API Endpoints

### Core Endpoints
```
GET  /api/health          # System health check
GET  /api/metrics         # Performance metrics
POST /api/game/spin       # Process slot machine spin
```

### Game Features
- **Demo Spins**: No wallet required for testing
- **Win Calculation**: Server-side game logic
- **Random Results**: Fair and unpredictable outcomes
- **WebSocket Events**: Real-time game updates

## 🛠️ Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **API Server** | Node.js + Express | Backend logic and routing |
| **Database** | PostgreSQL | Data persistence |
| **Cache** | Redis | Session storage |
| **WebSockets** | ws library | Real-time communication |
| **Frontend** | HTML5 + JavaScript | Game interface |
| **DevOps** | Docker + Compose | Containerization |

## 🎮 Frontend Demo

The repository includes a **complete slot machine frontend** at `/frontend/index.html`:

- 🎰 **Interactive Slot Machine**: Visual 5x3 reel layout
- 🎲 **Real Spins**: Connects to backend API
- 🔗 **WebSocket Integration**: Real-time updates
- 📱 **Responsive Design**: Works on all devices
- 🎨 **Space Theme**: Beautiful MoonYetis styling

## 🔧 Development Setup

### Prerequisites
- Node.js 18+
- Docker & Docker Compose (optional)
- Git

### Installation
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start database services (optional)
docker-compose up -d

# Start development server
npm run dev
```

### Environment Configuration
Edit `.env` file:
```bash
# Basic setup
NODE_ENV=development
PORT=3000

# Database (optional)
DATABASE_URL=postgresql://moonyetis:dev_password_123@localhost:5432/moonyetis_dev

# Fractal Bitcoin (for production)
FRACTAL_RPC_URL=your_fractal_node_url
```

## 🐳 Docker Deployment

### Quick Start with Docker
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Services Included
- **PostgreSQL**: Database server
- **Redis**: Cache server  
- **PgAdmin**: Database management UI

## 🧪 Testing

```bash
# Run all tests
npm test

# Test specific endpoints
curl http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/game/spin -H "Content-Type: application/json" -d '{"betAmount":10,"activeLines":25}'
```

## 📊 Monitoring

### Health Checks
- **API Health**: `GET /api/health`
- **System Metrics**: `GET /api/metrics`
- **WebSocket Status**: Connection count in health response

### Admin Access
- **PgAdmin**: http://localhost:8081 (admin@moonyetis.com / admin123)
- **Logs**: `npm run logs`
- **Docker Status**: `docker-compose ps`

## 🔒 Security Features

- **Rate Limiting**: API protection against abuse
- **CORS Configuration**: Secure cross-origin requests
- **Helmet Security**: HTTP security headers
- **Input Validation**: Request sanitization
- **WebSocket Security**: Connection validation

## 🎯 Game Mechanics

### Slot Machine Features
- **Symbols**: 8 space-themed symbols (🏔️🚀🌙🪙⭐🪐👽🛸)
- **Paylines**: 25 configurable winning lines
- **RTP**: Configurable return to player
- **Random Results**: Cryptographically fair spins
- **Win Calculation**: Server-side validation

### API Integration
```javascript
// Example spin request
const response = await fetch('/api/game/spin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        betAmount: 10,
        activeLines: 25
    })
});

const result = await response.json();
// Returns: { success: true, spin: { reels, winAmount, ... } }
```

## 🚀 Production Deployment

### Environment Variables
```bash
NODE_ENV=production
DATABASE_URL=your_production_database_url
JWT_SECRET=your_super_secure_secret
FRACTAL_RPC_URL=your_fractal_bitcoin_node
```

### Docker Production
```bash
# Build production image
docker build -t moonyetis-backend:latest .

# Run with production config
docker-compose -f docker-compose.prod.yml up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/MoonYetis/moonyetis-backend/issues)
- **Documentation**: Check the `/docs` folder
- **Community**: Join our Discord for support

## 🎯 Roadmap

- [x] Core slot machine API
- [x] WebSocket integration
- [x] Frontend demo
- [x] Docker containerization
- [ ] Full Fractal Bitcoin integration
- [ ] User authentication system
- [ ] Advanced game features
- [ ] Mobile app support

---

**🌙 To the moon with crypto gaming! 🚀**

*Built with ❤️ by the MoonYetis community*

### Quick Commands

```bash
# Development
npm run dev          # Start development server
npm test            # Run tests
npm run logs        # View logs

# Docker
docker-compose up -d    # Start services
docker-compose down     # Stop services

# Production
npm start           # Start production server
```

**Happy gaming! 🎰**
