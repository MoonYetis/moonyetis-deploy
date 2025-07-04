#!/bin/bash

# MoonYetis Apache Bench Load Testing Suite
# This script runs comprehensive load tests on all critical endpoints

set -e

BASE_URL="http://localhost:3000"
RESULTS_DIR="./test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 MoonYetis Load Testing Suite${NC}"
echo -e "${BLUE}================================${NC}"
echo "Timestamp: $TIMESTAMP"
echo "Target: $BASE_URL"
echo ""

# Create results directory
mkdir -p "$RESULTS_DIR"

# Function to run ab test and save results
run_ab_test() {
    local endpoint=$1
    local requests=$2
    local concurrency=$3
    local test_name=$4
    local method=${5:-GET}
    local post_data=${6:-""}
    
    echo -e "${YELLOW}Testing: $test_name${NC}"
    echo "  Endpoint: $endpoint"
    echo "  Requests: $requests"
    echo "  Concurrency: $concurrency"
    echo "  Method: $method"
    
    local output_file="$RESULTS_DIR/${test_name}_${TIMESTAMP}.txt"
    local csv_file="$RESULTS_DIR/${test_name}_${TIMESTAMP}.csv"
    
    if [ "$method" = "POST" ]; then
        echo "$post_data" > /tmp/post_data.json
        ab -n $requests -c $concurrency -T 'application/json' -p /tmp/post_data.json -g "$csv_file" "$BASE_URL$endpoint" > "$output_file" 2>&1
        rm /tmp/post_data.json
    else
        ab -n $requests -c $concurrency -g "$csv_file" "$BASE_URL$endpoint" > "$output_file" 2>&1
    fi
    
    # Extract key metrics
    local rps=$(grep "Requests per second" "$output_file" | awk '{print $4}')
    local mean_time=$(grep "Time per request.*mean" "$output_file" | head -1 | awk '{print $4}')
    local failed=$(grep "Failed requests" "$output_file" | awk '{print $3}')
    
    echo -e "  ${GREEN}Results: $rps req/sec, ${mean_time}ms avg, $failed failed${NC}"
    echo ""
    
    # Check for failures
    if [ "$failed" != "0" ]; then
        echo -e "  ${RED}⚠️ WARNING: $failed requests failed${NC}"
    fi
}

# Function to check if server is running
check_server() {
    echo -e "${BLUE}Checking server availability...${NC}"
    
    if curl -s "$BASE_URL/api/monitoring/health" > /dev/null; then
        echo -e "${GREEN}✅ Server is running${NC}"
    else
        echo -e "${RED}❌ Server is not responding. Please start the server first.${NC}"
        echo "Run: npm start"
        exit 1
    fi
    echo ""
}

# Function to run basic performance baseline
run_baseline_tests() {
    echo -e "${BLUE}📊 Running Baseline Tests${NC}"
    echo -e "${BLUE}========================${NC}"
    
    # Health check - should be very fast
    run_ab_test "/api/monitoring/health" 1000 10 "health_check_baseline"
    
    # Static content
    run_ab_test "/" 1000 20 "homepage_baseline"
    
    # Basic API endpoint
    run_ab_test "/api/leaderboard" 500 10 "leaderboard_baseline"
}

# Function to run load tests
run_load_tests() {
    echo -e "${BLUE}⚡ Running Load Tests${NC}"
    echo -e "${BLUE}====================${NC}"
    
    # Moderate load - typical usage
    run_ab_test "/api/monitoring/health" 5000 50 "health_check_load"
    run_ab_test "/api/blockchain/balance" 2000 25 "balance_check_load"
    run_ab_test "/api/leaderboard" 3000 30 "leaderboard_load"
    run_ab_test "/api/monitoring/metrics" 1000 20 "metrics_load"
}

# Function to run stress tests
run_stress_tests() {
    echo -e "${BLUE}🔥 Running Stress Tests${NC}"
    echo -e "${BLUE}======================${NC}"
    
    # High concurrency
    run_ab_test "/api/monitoring/health" 10000 100 "health_check_stress"
    run_ab_test "/api/blockchain/balance" 5000 75 "balance_check_stress"
    
    # Rate limiting test
    run_ab_test "/api/monitoring/metrics" 2000 50 "rate_limiting_test"
}

# Function to run API stress tests with POST data
run_api_stress_tests() {
    echo -e "${BLUE}🌐 Running API Stress Tests${NC}"
    echo -e "${BLUE}===========================${NC}"
    
    # Wallet address generation
    local wallet_data='{"network": "fractal-testnet"}'
    run_ab_test "/api/blockchain/generate-address" 1000 20 "address_generation" "POST" "$wallet_data"
    
    # Game spin simulation
    local game_data='{"bet": 10, "lines": 5}'
    run_ab_test "/api/game/spin" 500 15 "game_spin_stress" "POST" "$game_data"
}

# Function to run circuit breaker tests
run_circuit_breaker_tests() {
    echo -e "${BLUE}⚡ Testing Circuit Breakers${NC}"
    echo -e "${BLUE}===========================${NC}"
    
    # High frequency requests to trigger circuit breakers
    run_ab_test "/api/blockchain/balance" 1000 100 "circuit_breaker_trigger"
    
    # Check circuit breaker status
    sleep 5
    run_ab_test "/api/monitoring/circuit-breakers" 100 10 "circuit_breaker_status"
}

# Function to generate summary report
generate_summary() {
    echo -e "${BLUE}📋 Generating Summary Report${NC}"
    echo -e "${BLUE}============================${NC}"
    
    local summary_file="$RESULTS_DIR/summary_${TIMESTAMP}.txt"
    
    cat > "$summary_file" << EOF
MoonYetis Load Testing Summary
=============================
Timestamp: $TIMESTAMP
Target: $BASE_URL

Test Results Summary:
EOF
    
    # Process all result files
    for file in "$RESULTS_DIR"/*_${TIMESTAMP}.txt; do
        if [ -f "$file" ]; then
            local test_name=$(basename "$file" .txt | sed "s/_${TIMESTAMP}//")
            local rps=$(grep "Requests per second" "$file" | awk '{print $4}' || echo "N/A")
            local mean_time=$(grep "Time per request.*mean" "$file" | head -1 | awk '{print $4}' || echo "N/A")
            local failed=$(grep "Failed requests" "$file" | awk '{print $3}' || echo "N/A")
            
            echo "  $test_name: $rps req/sec, ${mean_time}ms avg, $failed failed" >> "$summary_file"
        fi
    done
    
    cat >> "$summary_file" << EOF

Test Files Location: $RESULTS_DIR/
CSV Data Available: Yes (for graphing)

Recommendations:
- Check for any failed requests (should be 0)
- Response times should be < 1000ms for most endpoints
- Rate limiting should kick in around configured thresholds
- Circuit breakers should activate under extreme load

Next Steps:
1. Analyze CSV files for detailed timing data
2. Check server logs for errors during testing
3. Monitor system resources during tests
4. Adjust thresholds based on results
EOF
    
    echo -e "${GREEN}✅ Summary report generated: $summary_file${NC}"
    echo ""
    
    # Display summary
    cat "$summary_file"
}

# Main execution
main() {
    # Parse command line arguments
    local test_type=${1:-"all"}
    
    case $test_type in
        "baseline")
            check_server
            run_baseline_tests
            ;;
        "load")
            check_server
            run_load_tests
            ;;
        "stress")
            check_server
            run_stress_tests
            ;;
        "api")
            check_server
            run_api_stress_tests
            ;;
        "circuit")
            check_server
            run_circuit_breaker_tests
            ;;
        "all")
            check_server
            run_baseline_tests
            run_load_tests
            run_stress_tests
            run_api_stress_tests
            run_circuit_breaker_tests
            ;;
        *)
            echo "Usage: $0 [baseline|load|stress|api|circuit|all]"
            echo ""
            echo "  baseline  - Basic performance tests"
            echo "  load      - Normal load testing"
            echo "  stress    - High load stress testing"
            echo "  api       - API-specific stress tests"
            echo "  circuit   - Circuit breaker testing"
            echo "  all       - Run all test suites (default)"
            exit 1
            ;;
    esac
    
    generate_summary
    
    echo -e "${GREEN}🎉 Load testing completed!${NC}"
    echo -e "${GREEN}Results saved to: $RESULTS_DIR/${NC}"
}

# Execute main function with arguments
main "$@"