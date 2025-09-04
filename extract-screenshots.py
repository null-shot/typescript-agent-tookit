#!/usr/bin/env python3
"""
Extract base64 screenshot data from MCP Inspector browser results.

Usage:
1. In MCP Inspector, access the browser://results resource
2. Copy the JSON response and save it to a file (e.g., browser-results.json)
3. Run: python3 extract-screenshots.py browser-results.json
"""

import json
import sys
import os
from datetime import datetime

def extract_screenshots(json_file):
    """Extract screenshot data from browser results JSON."""
    
    print("🔍 Screenshot Extractor for Browser MCP Results")
    print("=" * 50)
    
    if not os.path.exists(json_file):
        print(f"❌ File not found: {json_file}")
        return
    
    print(f"📁 Reading from: {json_file}")
    
    try:
        with open(json_file, 'r') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON: {e}")
        return
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        return
    
    # Extract recent results
    recent_results = data.get('recentResults', [])
    
    if not recent_results:
        print("❌ No recent results found in the JSON")
        return
    
    print(f"📊 Found {len(recent_results)} results")
    
    screenshot_count = 0
    
    # Create output directory
    output_dir = "extracted_screenshots"
    os.makedirs(output_dir, exist_ok=True)
    
    for i, result in enumerate(recent_results):
        result_id = result.get('id', f'result_{i}')
        url = result.get('url', 'unknown_url')
        timestamp = result.get('timestamp', '')
        
        # Check if this result has screenshot data
        metadata = result.get('metadata', {})
        screenshot_data = metadata.get('screenshot', '')
        
        if screenshot_data and screenshot_data.startswith('data:image/'):
            screenshot_count += 1
            
            # Clean URL for filename
            clean_url = url.replace('https://', '').replace('http://', '').replace('/', '_').replace(':', '_')
            if len(clean_url) > 50:
                clean_url = clean_url[:50]
            
            # Create filename
            timestamp_str = timestamp.replace(':', '-').replace('T', '_').split('.')[0] if timestamp else f'screenshot_{i}'
            filename = f"{timestamp_str}_{clean_url}_{result_id}.txt"
            filepath = os.path.join(output_dir, filename)
            
            # Write screenshot data to file
            try:
                with open(filepath, 'w') as f:
                    f.write(screenshot_data)
                
                print(f"✅ Extracted screenshot {screenshot_count}: {filename}")
                print(f"   📍 URL: {url}")
                print(f"   📏 Data length: {len(screenshot_data)} characters")
                print()
                
            except Exception as e:
                print(f"❌ Error writing {filename}: {e}")
    
    if screenshot_count == 0:
        print("⚠️  No screenshots found in the results")
        print("💡 Make sure the JSON contains results with screenshot metadata")
    else:
        print(f"🎉 Successfully extracted {screenshot_count} screenshots to {output_dir}/")
        print(f"💡 You can now view these screenshots by:")
        print(f"   1. Opening view-screenshot.html in a browser")
        print(f"   2. Copying the base64 data from the .txt files")
        print(f"   3. Pasting into the viewer")

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 extract-screenshots.py <json_file>")
        print()
        print("Example:")
        print("  python3 extract-screenshots.py browser-results.json")
        print()
        print("To get the JSON file:")
        print("1. In MCP Inspector, access the browser://results resource")
        print("2. Copy the entire JSON response")
        print("3. Save it to a file (e.g., browser-results.json)")
        sys.exit(1)
    
    json_file = sys.argv[1]
    extract_screenshots(json_file)

if __name__ == "__main__":
    main()
