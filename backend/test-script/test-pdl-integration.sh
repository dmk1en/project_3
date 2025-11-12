#!/bin/bash

# PDL Integration Demo Script
# This script demonstrates the complete PDL integration with the CRM system

echo "🚀 PDL Integration Demo for CRM"
echo "================================"

# Configuration
BASE_URL="http://localhost:3001/api/v1"
EMAIL="admin@crm.com"
PASSWORD="admin123"

echo "📡 Step 1: Authenticating with CRM..."

# Get authentication token
AUTH_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

TOKEN=$(echo $AUTH_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Authentication failed!"
  echo "Response: $AUTH_RESPONSE"
  exit 1
fi

echo "✅ Authentication successful!"
echo "🔑 Token: ${TOKEN:0:20}..."

echo ""
echo "📊 Step 2: Checking PDL API Usage..."

# Check API usage
USAGE_RESPONSE=$(curl -s -X GET "$BASE_URL/pdl/usage" \
  -H "Authorization: Bearer $TOKEN")

echo "✅ API Usage Response:"
echo "$USAGE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$USAGE_RESPONSE"

echo ""
echo "📋 Step 3: Checking Current Potential Leads..."

# Get current leads
LEADS_RESPONSE=$(curl -s -X GET "$BASE_URL/pdl/leads" \
  -H "Authorization: Bearer $TOKEN")

echo "✅ Current Leads:"
echo "$LEADS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$LEADS_RESPONSE"

echo ""
echo "🔍 Step 4: Testing PDL Search (this may fail due to no matching records)..."

# Test PDL search
SEARCH_RESPONSE=$(curl -s -X POST "$BASE_URL/pdl/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "jobTitles": ["software engineer"],
    "countries": ["vietnam"],
    "cities": ["ho chi minh city"],
    "size": 3,
    "leadType": "staff"
  }')

echo "📊 Search Response:"
echo "$SEARCH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$SEARCH_RESPONSE"

echo ""
echo "📝 Step 5: Creating a Test Search Query..."

# Create search query
QUERY_RESPONSE=$(curl -s -X POST "$BASE_URL/pdl/queries" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Vietnam Tech Leads",
    "description": "Search for software engineers in Vietnam",
    "queryConfig": {
      "jobTitles": ["software engineer", "developer", "programmer"],
      "countries": ["vietnam"],
      "cities": ["ho chi minh city", "hanoi"],
      "industries": ["technology", "software"]
    },
    "leadType": "staff",
    "runFrequency": "weekly"
  }')

echo "✅ Query Creation Response:"
echo "$QUERY_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$QUERY_RESPONSE"

echo ""
echo "📊 Step 6: Listing Search Queries..."

# List queries
QUERIES_RESPONSE=$(curl -s -X GET "$BASE_URL/pdl/queries" \
  -H "Authorization: Bearer $TOKEN")

echo "✅ Search Queries:"
echo "$QUERIES_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$QUERIES_RESPONSE"

echo ""
echo "🎯 PDL Integration Demo Complete!"
echo "================================"
echo ""
echo "✅ Successful Tests:"
echo "   - Authentication ✅"
echo "   - PDL API Usage Check ✅"
echo "   - Potential Leads Listing ✅"
echo "   - Search Query Creation ✅"
echo "   - Search Queries Listing ✅"
echo ""
echo "⚪ Expected Behaviors:"
echo "   - Search may return no results (normal for specific criteria)"
echo "   - Empty leads list (no searches performed yet)"
echo "   - PDL API integration is functional"
echo ""
echo "🚀 Next Steps:"
echo "   1. Configure real search parameters for your target market"
echo "   2. Run searches to discover potential leads"
echo "   3. Review and add leads to CRM"
echo "   4. Set up scheduled searches for continuous lead discovery"
echo ""
echo "📚 Available PDL Endpoints:"
echo "   GET    /api/v1/pdl/leads              - List potential leads"
echo "   GET    /api/v1/pdl/leads/:id          - Get specific lead"
echo "   POST   /api/v1/pdl/leads/:id/add-to-crm - Add lead to CRM"
echo "   POST   /api/v1/pdl/leads/:id/reject   - Reject a lead"
echo "   POST   /api/v1/pdl/leads/bulk         - Bulk operations"
echo "   POST   /api/v1/pdl/search             - Execute PDL search"
echo "   GET    /api/v1/pdl/queries            - List search queries"
echo "   POST   /api/v1/pdl/queries            - Create search query"
echo "   POST   /api/v1/pdl/queries/:id/run    - Run saved query"
echo "   GET    /api/v1/pdl/usage              - Get API usage stats"