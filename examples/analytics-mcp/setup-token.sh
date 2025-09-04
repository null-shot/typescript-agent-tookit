#!/bin/bash

echo "🔑 Setting up Cloudflare Analytics Engine API Token"
echo "=================================================="
echo ""
echo "Your Account ID is already set: 59084df56e21d828dcbd5811f81c7754"
echo ""
echo "Now you need to create an API token:"
echo "1. Go to: https://dash.cloudflare.com/profile/api-tokens"
echo "2. Click 'Create Token' → 'Create Custom Token'"
echo "3. Set permissions: Account | Account Analytics | Read"
echo "4. Include your account in Account Resources"
echo "5. Copy the token"
echo ""
echo "Then choose one of these options:"
echo ""
echo "OPTION A: Set as environment variable (for testing)"
echo "export CLOUDFLARE_API_TOKEN='your-token-here'"
echo ""
echo "OPTION B: Set as Wrangler secret (for production)"
echo "wrangler secret put CLOUDFLARE_API_TOKEN"
echo ""
echo "OPTION C: Test the API directly first"
echo "node test-sql-api.js"
echo ""
read -p "Press Enter after you've created your API token..."

echo ""
echo "🧪 Testing API connection..."

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ CLOUDFLARE_API_TOKEN not set as environment variable"
    echo "Either set it with: export CLOUDFLARE_API_TOKEN='your-token'"
    echo "Or use: wrangler secret put CLOUDFLARE_API_TOKEN"
else
    echo "✅ CLOUDFLARE_API_TOKEN is set"
    echo "🧪 Testing API..."
    node test-sql-api.js
fi
