#!/bin/bash

echo "🚀 Setting up Browser MCP on Pro Account"
echo "========================================"

# Check if API token is provided
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ Please set CLOUDFLARE_API_TOKEN environment variable"
    echo "   export CLOUDFLARE_API_TOKEN='your-pro-account-token'"
    exit 1
fi

echo "✅ API Token detected"

# Check current account
echo "📋 Checking current account..."
npx wrangler whoami

# Create new D1 database
echo "🗄️ Creating D1 database..."
npx wrangler d1 create browser-mcp-db-pro

echo "📝 Please update wrangler.jsonc with the new database ID from above"
echo "   Then run: npm run setup-pro-account-step2"

echo "✅ Step 1 complete!"
