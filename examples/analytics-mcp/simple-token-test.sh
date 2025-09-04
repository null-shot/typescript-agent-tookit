#!/bin/bash

echo "🔍 Diagnosing API Token Issues"
echo "================================"

# Check current wrangler version
echo "1. Checking Wrangler version:"
wrangler --version

echo ""
echo "2. Checking current secrets:"
wrangler secret list 2>&1 || echo "Failed to list secrets"

echo ""
echo "3. Let's try a different approach to set the token:"
echo "Please paste your API token (it will be hidden):"
read -s API_TOKEN

if [ -z "$API_TOKEN" ]; then
    echo "❌ No token provided"
    exit 1
fi

echo ""
echo "4. Testing token format (first 10 chars): ${API_TOKEN:0:10}..."

echo ""
echo "5. Setting token using echo method:"
echo "$API_TOKEN" | wrangler secret put CF_API_TOKEN 2>&1

echo ""
echo "6. Testing API directly:"
curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/59084df56e21d828dcbd5811f81c7754/analytics_engine/sql" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: text/plain" \
  -d "SHOW TABLES" | head -200

echo ""
echo "Done!"
