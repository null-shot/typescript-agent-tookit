#!/bin/bash

echo "🔑 Setting up your Cloudflare API Token"
echo ""
echo "Please paste your API token when prompted:"
echo "(You can get it from: https://dash.cloudflare.com/profile/api-tokens)"
echo ""

read -s -p "Enter your API token: " API_TOKEN
echo ""

if [ -z "$API_TOKEN" ]; then
    echo "❌ No token provided. Exiting."
    exit 1
fi

echo "Setting token as wrangler secret..."
echo "$API_TOKEN" | wrangler secret put CF_API_TOKEN

if [ $? -eq 0 ]; then
    echo "✅ Token set successfully!"
    echo ""
    echo "Now testing the API connection..."
    
    # Test the API
    ACCOUNT_ID="59084df56e21d828dcbd5811f81c7754"
    API_URL="https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/analytics_engine/sql"
    
    RESPONSE=$(curl -s -X POST "$API_URL" \
        -H "Authorization: Bearer $API_TOKEN" \
        -H "Content-Type: text/plain" \
        -d "SHOW TABLES")
    
    echo "API Response:"
    echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
    
    if echo "$RESPONSE" | grep -q "success.*true\|dataset.*github_stats"; then
        echo ""
        echo "🎉 SUCCESS! Your API is working!"
        echo "✅ Ready for Grafana integration!"
    else
        echo ""
        echo "⚠️  API test failed. Check the response above."
    fi
else
    echo "❌ Failed to set token. Please try again."
fi
