#!/bin/bash

echo "🧪 MoonYetis Complete Local Testing"
echo "=================================="
echo ""

# Check if servers are running
echo "🔍 Checking if servers are running..."

# Check backend
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/api/store/health 2>/dev/null)
if [ "$BACKEND_STATUS" = "200" ]; then
    echo "✅ Backend server is running (localhost:3002)"
else
    echo "❌ Backend server is not running"
    echo "   Please start with: ./start-local-dev.sh"
    exit 1
fi

# Check frontend
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 2>/dev/null)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Frontend server is running (localhost:8080)"
else
    echo "❌ Frontend server is not running"
    echo "   Please start with: ./start-local-dev.sh"
    exit 1
fi

echo ""
echo "🧪 Running automated tests..."
echo ""

# Run backend tests
cd backend
node test-local.js

echo ""
echo "🌐 Frontend Manual Testing Checklist:"
echo "======================================="
echo ""
echo "Open http://localhost:8080 in your browser and verify:"
echo ""
echo "🔗 Wallet Connection:"
echo "   [ ] Wallet modal opens when clicking connect"
echo "   [ ] Simulated wallets appear in localhost"
echo "   [ ] Connection simulation works"
echo ""
echo "🏪 Store Functionality:"
echo "   [ ] Store modal opens from wallet panel"
echo "   [ ] Three packs are displayed correctly"
echo "   [ ] Prices update automatically"
echo "   [ ] Payment methods (FB/MY) are shown"
echo "   [ ] Purchase flow works without errors"
echo ""
echo "📱 UI/UX:"
echo "   [ ] All modals open and close properly"
echo "   [ ] Responsive design works"
echo "   [ ] No console errors in browser"
echo "   [ ] Smooth animations and transitions"
echo ""
echo "🔍 Developer Tools:"
echo "   [ ] Network tab shows API calls to localhost:3002"
echo "   [ ] Console shows config loaded for development"
echo "   [ ] No critical errors in browser console"
echo ""
echo "💡 Testing Commands:"
echo "   curl http://localhost:3002/api/store/health"
echo "   curl http://localhost:3002/api/store/prices"
echo "   curl http://localhost:3002/api/store/products"
echo ""
echo "📖 For detailed testing instructions, see README-LOCAL-DEV.md"