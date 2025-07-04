#!/bin/bash
# 🚀 MoonYetis Slots VPS Deployment Script
# ========================================

echo "🎰 MoonYetis Slots Ultra-Accessible Casino Deployment"
echo "===================================================="

# Install dependencies and start
npm install --production
pm2 stop moonyetis-slots 2>/dev/null || echo "No existing process"
pm2 start server.js --name moonyetis-slots
pm2 save

echo "🎉 MoonYetis Slots deployed!"
echo "🌐 Access: http://localhost:3000"
echo "💰 Minimum bet: $0.001 USD"