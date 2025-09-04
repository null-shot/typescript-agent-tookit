#!/bin/bash

# Extract Links from D1 Database
# Usage: ./extract-links.sh [links_id]
# Example: ./extract-links.sh links_1756884810202_ahby5y87i

if [ -z "$1" ]; then
    echo "🔗 Available Link Extractions:"
    echo "============================="
    wrangler d1 execute browser-mcp-db-raydp102 --remote --command "SELECT id as links_id, datetime(timestamp/1000, 'unixepoch', '+8 hours') as hkt_time, ROUND(LENGTH(data)/1024.0, 1) || 'KB' as size FROM scraping_results WHERE id LIKE 'links_%' ORDER BY timestamp DESC LIMIT 10;"
    echo ""
    echo "Usage: $0 [full_links_id]"
    echo "Example: $0 links_1756884810202_ahby5y87i"
    exit 1
fi

FULL_ID="$1"
LINKS_ID="${FULL_ID#links_}"
OUTPUT_FILE="${LINKS_ID}.json"

echo "🔍 Extracting links: $FULL_ID"
echo "📁 Output file: $OUTPUT_FILE"

# Extract links data as formatted JSON
wrangler d1 execute browser-mcp-db-raydp102 --remote --json --command "SELECT data FROM scraping_results WHERE id = '$FULL_ID';" | jq -r '.[0].results[0].data' | jq '.' > "$OUTPUT_FILE"

if [ -s "$OUTPUT_FILE" ]; then
    echo "✅ Links data extracted successfully!"
    echo "📊 File size: $(ls -lh "$OUTPUT_FILE" | awk '{print $5}')"
    echo "🔗 Content: Formatted JSON with extracted links and metadata"
    echo "📖 To view: Open $OUTPUT_FILE in any text editor or JSON viewer"
else
    echo "❌ Failed to extract links data"
    echo "🔍 Check if links ID exists: $LINKS_ID"
fi
