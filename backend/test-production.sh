#!/bin/bash

# Test script for production endpoints

HOST="${1:-moonyetis.io}"
STORE_PORT="${2:-3002}"
WALLET_PORT="${3:-3001}"

echo "🧪 Testing MoonYetis Production Endpoints"
echo "========================================"
echo "Host: $HOST"
echo "Store Port: $STORE_PORT"
echo "Wallet Port: $WALLET_PORT"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test function
test_endpoint() {
    local name=$1
    local url=$2
    local expected=$3
    
    echo -n "Testing $name... "
    
    response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected" ]; then
        echo -e "${GREEN}✓${NC} (HTTP $http_code)"
        if [ "$VERBOSE" = "true" ]; then
            echo "Response: $body" | head -n 3
            echo ""
        fi
    else
        echo -e "${RED}✗${NC} (HTTP $http_code, expected $expected)"
        if [ "$VERBOSE" = "true" ]; then
            echo "Response: $body"
            echo ""
        fi
    fi
}

# Store API Tests
echo "📦 Store API Tests"
echo "------------------"
test_endpoint "Store Health" "http://$HOST:$STORE_PORT/api/store/health" "200"
test_endpoint "Store Prices" "http://$HOST:$STORE_PORT/api/store/prices" "200"
test_endpoint "Store Products" "http://$HOST:$STORE_PORT/api/store/products" "200"
test_endpoint "Monitor Status" "http://$HOST:$STORE_PORT/api/store/monitor-status" "200"
test_endpoint "Market Stats" "http://$HOST:$STORE_PORT/api/store/market-stats" "200"

echo ""

# Wallet API Tests
echo "💳 Wallet API Tests"
echo "-------------------"
test_endpoint "Wallet Addresses" "http://$HOST:$WALLET_PORT/api/deposit/addresses" "200"

echo ""

# Performance Tests
echo "⚡ Performance Tests"
echo "-------------------"
echo -n "Store API Response Time: "
time=$(curl -o /dev/null -s -w '%{time_total}' "http://$HOST:$STORE_PORT/api/store/health")
echo "${time}s"

echo -n "Price Update Response Time: "
time=$(curl -o /dev/null -s -w '%{time_total}' "http://$HOST:$STORE_PORT/api/store/prices")
echo "${time}s"

echo ""

# Advanced Tests (if verbose)
if [ "$VERBOSE" = "true" ]; then
    echo "🔍 Detailed Tests"
    echo "-----------------"
    
    echo "Checking price structure..."
    curl -s "http://$HOST:$STORE_PORT/api/store/prices" | grep -q '"fb"' && echo -e "${GREEN}✓${NC} FB price found" || echo -e "${RED}✗${NC} FB price missing"
    curl -s "http://$HOST:$STORE_PORT/api/store/prices" | grep -q '"my"' && echo -e "${GREEN}✓${NC} MY price found" || echo -e "${RED}✗${NC} MY price missing"
    
    echo ""
    echo "Checking monitor status..."
    monitor_status=$(curl -s "http://$HOST:$STORE_PORT/api/store/monitor-status")
    monitoring=$(echo "$monitor_status" | grep -o '"monitoring":[^,}]*' | cut -d':' -f2)
    if [ "$monitoring" = "true" ]; then
        echo -e "${GREEN}✓${NC} Transaction monitor is active"
    else
        echo -e "${YELLOW}!${NC} Transaction monitor is not active"
    fi
fi

echo ""
echo "🏁 Test Summary"
echo "---------------"
echo "Run with VERBOSE=true for detailed output"
echo "Example: VERBOSE=true ./test-production.sh"
echo ""
echo "To test specific host/ports:"
echo "./test-production.sh <host> <store_port> <wallet_port>"