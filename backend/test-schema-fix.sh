#!/bin/bash

# Test script to verify opportunities endpoints after schema fixes
echo "=== Testing Opportunities Endpoints After Schema Fix ==="

# Base URL and auth token
BASE_URL="http://localhost:3001/api/v1"
AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjdjNTQ4NmI2LWNiYjQtNDczYS1hZTY5LTFlYjYxZTg0ODZmNSIsImVtYWlsIjoiYWRtaW5AY3JtLmNvbSIsInJvbGUiOiJhZG1pbiIsImZpcnN0TmFtZSI6IkFkbWluIiwibGFzdE5hbWUiOiJVc2VyIiwiaWF0IjoxNzYyOTM4Mjk5LCJleHAiOjE3NjI5NDE4OTl9.lRyzcIplG8-p4FY7MmsZf5svURGCOAlxSGCtsunNwXE"

echo "1. Testing GET /opportunities..."
curl -X GET "$BASE_URL/opportunities" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n2. Testing POST /opportunities (create new opportunity)..."
curl -X POST "$BASE_URL/opportunities" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Opportunity",
    "companyId": "3a3328f3-8379-47c8-b8aa-9103f1bca148",
    "contactId": "d5c711ab-3854-4a5b-adad-82d6f85c2b75",
    "stageId": "e988b229-30e3-4d78-901d-584cacf1e3c2",
    "value": 50000,
    "currency": "USD",
    "description": "Test opportunity for schema validation"
  }' | jq '.'

echo -e "\n3. Testing DELETE /pipeline-stages (should now work)..."
curl -X DELETE "$BASE_URL/pipeline-stages/2e35f6cd-c5e3-445c-bb50-bedb30814f3f" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n4. Testing Analytics Dashboard..."
curl -X GET "$BASE_URL/analytics/dashboard" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n=== Test Complete ==="