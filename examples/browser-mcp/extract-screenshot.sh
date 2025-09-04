#!/bin/bash

# Extract Screenshot from D1 Database
# Usage: ./extract-screenshot.sh [screenshot_id]
# Example: ./extract-screenshot.sh 1756884576413_lin9c4

if [ -z "$1" ]; then
    echo "📸 Available Screenshots:"
    echo "========================"
    wrangler d1 execute browser-mcp-db-raydp102 --remote --command "SELECT id as screenshot_id, datetime(timestamp/1000, 'unixepoch', '+8 hours') as hkt_time, ROUND(LENGTH(screenshot)/1024.0, 1) || 'KB' as size FROM scraping_results WHERE id LIKE 'screenshot_%' ORDER BY timestamp DESC LIMIT 10;"
    echo ""
    echo "Usage: $0 [full_screenshot_id]"
    echo "Example: $0 screenshot_1756884576413_lin9c4f8f"
    exit 1
fi

FULL_ID="$1"
SCREENSHOT_ID="${FULL_ID#screenshot_}"
OUTPUT_FILE="${SCREENSHOT_ID}.txt"

echo "🔍 Extracting screenshot: $FULL_ID"
echo "📁 Output file: $OUTPUT_FILE"

# Extract clean base64 data (remove 'data:image/png;base64,' prefix)
wrangler d1 execute browser-mcp-db-raydp102 --remote --json --command "SELECT screenshot as data FROM scraping_results WHERE id = '$FULL_ID';" | jq -r '.[0].results[0].data' | cut -d',' -f2 > "$OUTPUT_FILE"

if [ -s "$OUTPUT_FILE" ]; then
    echo "✅ Base64 data extracted successfully!"
    echo "📊 File size: $(ls -lh "$OUTPUT_FILE" | awk '{print $5}')"
    echo "🔗 To view: Copy content from $OUTPUT_FILE and paste into:"
    echo "   - https://base64.guru/converter/decode/image"
    echo "   - https://www.base64-image.de/"
    echo "   - Any base64 to image decoder"
else
    echo "❌ Failed to extract screenshot data"
    echo "🔍 Check if screenshot ID exists: $SCREENSHOT_ID"
fi
