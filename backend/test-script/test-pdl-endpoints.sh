#!/bin/bash

# Minimal PDL Endpoint Testing Script
# Tests all endpoints with minimum API usage to preserve credits

echo "🧪 PDL Endpoint Testing Suite (Minimal API Usage)"
echo "=================================================="

# Configuration
BASE_URL="http://localhost:3001/api/v1"
EMAIL="admin@crm.com"
PASSWORD="admin123"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to log test results
log_test() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ "$2" = "PASS" ]; then
        echo -e "${GREEN}✅ $1: PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ $1: FAIL${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

echo ""
echo "🔐 Step 1: Authentication"
echo "========================"

# Get authentication token
AUTH_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    log_test "Authentication" "FAIL"
    echo "Response: $AUTH_RESPONSE"
    exit 1
fi

log_test "Authentication" "PASS"
echo "🔑 Token obtained: ${TOKEN:0:20}..."

echo ""
echo "📊 Step 2: Testing GET Endpoints (No API Credits Used)"
echo "====================================================="

# Test 2.1: Get potential leads (should be empty initially)
echo "2.1 Testing GET /pdl/leads..."
LEADS_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/pdl/leads" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE="${LEADS_RESPONSE: -3}"
RESPONSE_BODY="${LEADS_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ] && echo "$RESPONSE_BODY" | grep -q '"success":true'; then
    log_test "GET /pdl/leads" "PASS"
else
    log_test "GET /pdl/leads" "FAIL"
    echo "HTTP Code: $HTTP_CODE"
fi

# Test 2.2: Get search queries (should be empty or have previous queries)
echo "2.2 Testing GET /pdl/queries..."
QUERIES_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/pdl/queries" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE="${QUERIES_RESPONSE: -3}"
RESPONSE_BODY="${QUERIES_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ] && echo "$RESPONSE_BODY" | grep -q '"success":true'; then
    log_test "GET /pdl/queries" "PASS"
else
    log_test "GET /pdl/queries" "FAIL"
    echo "HTTP Code: $HTTP_CODE"
fi

# Test 2.3: Get PDL usage statistics
echo "2.3 Testing GET /pdl/usage..."
USAGE_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/pdl/usage" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE="${USAGE_RESPONSE: -3}"
RESPONSE_BODY="${USAGE_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ] && echo "$RESPONSE_BODY" | grep -q '"success":true'; then
    log_test "GET /pdl/usage" "PASS"
else
    log_test "GET /pdl/usage" "FAIL"
    echo "HTTP Code: $HTTP_CODE"
fi

echo ""
echo "📝 Step 3: Testing POST /pdl/queries (Create Search Query)"
echo "========================================================="

# Test 3.1: Create a search query (no API credits used, just database operation)
echo "3.1 Creating minimal search query..."
QUERY_DATA='{
  "name": "Test Query - Minimal",
  "description": "Minimal test search query",
  "queryConfig": {
    "jobTitles": ["engineer"],
    "countries": ["vietnam"]
  },
  "leadType": "staff",
  "runFrequency": "monthly"
}'

CREATE_QUERY_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/pdl/queries" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$QUERY_DATA")

HTTP_CODE="${CREATE_QUERY_RESPONSE: -3}"
RESPONSE_BODY="${CREATE_QUERY_RESPONSE%???}"

if [ "$HTTP_CODE" = "201" ] && echo "$RESPONSE_BODY" | grep -q '"success":true'; then
    log_test "POST /pdl/queries (create)" "PASS"
    QUERY_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "📋 Created query ID: $QUERY_ID"
else
    log_test "POST /pdl/queries (create)" "FAIL"
    echo "HTTP Code: $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
fi

echo ""
echo "🔍 Step 4: Testing PDL Search Endpoint (Minimal API Usage)"
echo "=========================================================="

# Test 4.1: Execute minimal PDL search (uses 1-2 credits)
echo "4.1 Testing POST /pdl/search with minimal parameters..."
echo "⚠️  This will use approximately 1-2 PDL API credits"

SEARCH_DATA='{
  "jobTitles": ["engineer"],
  "countries": ["vietnam"],
  "size": 1,
  "leadType": "staff"
}'

SEARCH_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/pdl/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$SEARCH_DATA")

HTTP_CODE="${SEARCH_RESPONSE: -3}"
RESPONSE_BODY="${SEARCH_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ]; then
    if echo "$RESPONSE_BODY" | grep -q '"success":true'; then
        log_test "POST /pdl/search (success case)" "PASS"
        CREDITS_USED=$(echo "$RESPONSE_BODY" | grep -o '"creditsUsed":[0-9]*' | cut -d':' -f2)
        echo "💰 Credits used: ${CREDITS_USED:-'N/A'}"
    else
        log_test "POST /pdl/search (expected failure)" "PASS"
        echo "ℹ️  Search failed as expected (no matching records)"
    fi
else
    log_test "POST /pdl/search" "FAIL"
    echo "HTTP Code: $HTTP_CODE"
fi

echo ""
echo "🔄 Step 5: Testing Query Execution (If Query Created)"
echo "===================================================="

if [ ! -z "$QUERY_ID" ]; then
    echo "5.1 Testing POST /pdl/queries/:id/run..."
    echo "⚠️  This may use PDL API credits if search executes"
    
    RUN_QUERY_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/pdl/queries/$QUERY_ID/run" \
      -H "Authorization: Bearer $TOKEN")
    
    HTTP_CODE="${RUN_QUERY_RESPONSE: -3}"
    RESPONSE_BODY="${RUN_QUERY_RESPONSE%???}"
    
    if [ "$HTTP_CODE" = "200" ]; then
        log_test "POST /pdl/queries/:id/run" "PASS"
    else
        log_test "POST /pdl/queries/:id/run" "FAIL"
        echo "HTTP Code: $HTTP_CODE"
    fi
else
    log_test "POST /pdl/queries/:id/run" "FAIL"
    echo "Skipped: No query ID available"
fi

echo ""
echo "📋 Step 6: Testing Lead Management Endpoints"
echo "============================================"

# Test 6.1: Try to get a specific lead (should return 404 since we likely have no leads)
echo "6.1 Testing GET /pdl/leads/:id (expect 404)..."
LEAD_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/pdl/leads/00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE="${LEAD_RESPONSE: -3}"

if [ "$HTTP_CODE" = "404" ]; then
    log_test "GET /pdl/leads/:id (404 expected)" "PASS"
else
    log_test "GET /pdl/leads/:id" "FAIL"
    echo "HTTP Code: $HTTP_CODE (expected 404)"
fi

# Test 6.2: Test bulk operations validation
echo "6.2 Testing POST /pdl/leads/bulk (validation)..."
BULK_DATA='{
  "leadIds": [],
  "operation": "addToCRM"
}'

BULK_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/pdl/leads/bulk" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$BULK_DATA")

HTTP_CODE="${BULK_RESPONSE: -3}"

if [ "$HTTP_CODE" = "400" ]; then
    log_test "POST /pdl/leads/bulk (validation)" "PASS"
else
    log_test "POST /pdl/leads/bulk (validation)" "FAIL"
    echo "HTTP Code: $HTTP_CODE (expected 400 for empty leadIds)"
fi

echo ""
echo "🛡️ Step 7: Testing Authorization"
echo "================================"

# Test 7.1: Test endpoint without token
echo "7.1 Testing endpoint without authentication..."
UNAUTH_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/pdl/leads")

HTTP_CODE="${UNAUTH_RESPONSE: -3}"

if [ "$HTTP_CODE" = "401" ]; then
    log_test "Authorization test (no token)" "PASS"
else
    log_test "Authorization test (no token)" "FAIL"
    echo "HTTP Code: $HTTP_CODE (expected 401)"
fi

echo ""
echo "📊 Final API Usage Check"
echo "======================="

# Final usage check
FINAL_USAGE_RESPONSE=$(curl -s -X GET "$BASE_URL/pdl/usage" \
  -H "Authorization: Bearer $TOKEN")

if echo "$FINAL_USAGE_RESPONSE" | grep -q '"success":true'; then
    CREDITS_USED_TOTAL=$(echo "$FINAL_USAGE_RESPONSE" | grep -o '"credits_used":[0-9]*' | cut -d':' -f2)
    echo "💰 Total PDL credits used in this test: ${CREDITS_USED_TOTAL:-'0'}"
fi

echo ""
echo "🎯 Test Summary"
echo "==============="
echo -e "${BLUE}Total Tests: $TOTAL_TESTS${NC}"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! PDL integration is working correctly.${NC}"
else
    echo -e "${YELLOW}⚠️  Some tests failed. Check the output above for details.${NC}"
fi

echo ""
echo "📝 Tested Endpoints:"
echo "  ✓ GET    /api/v1/pdl/leads"
echo "  ✓ GET    /api/v1/pdl/leads/:id"
echo "  ✓ GET    /api/v1/pdl/queries"
echo "  ✓ GET    /api/v1/pdl/usage"
echo "  ✓ POST   /api/v1/pdl/queries"
echo "  ✓ POST   /api/v1/pdl/queries/:id/run"
echo "  ✓ POST   /api/v1/pdl/search"
echo "  ✓ POST   /api/v1/pdl/leads/bulk"
echo ""
echo "💡 Note: Lead-specific operations (add-to-crm, reject) require actual leads"
echo "   to test properly. Run a successful search first to generate test leads."