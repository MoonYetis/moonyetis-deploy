#!/bin/bash
# 🚀 MoonYetis Slots VPS Deployment Script
echo "🎰 Deploying MoonYetis Slots Ultra-Accessible Casino..."
npm install --production
pm2 stop moonyetis-slots 2>/dev/null || true
pm2 start server.js --name moonyetis-slots
pm2 save
echo "✅ Deployed! Access: http://localhost:3000"