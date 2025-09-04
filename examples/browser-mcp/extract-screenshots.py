#!/usr/bin/env python3
"""
Extract screenshots from browser results JSON and save as separate text files.
Usage: python extract-screenshots.py [input_file]
"""

import json
import sys
import os
from datetime import datetime

def extract_screenshots(input_file="test/browser.results"):
    """Extract screenshots from browser results JSON file."""
    
    # Check if input file exists
    if not os.path.exists(input_file):
        print(f"❌ Error: File '{input_file}' not found")
        print("💡 Make sure you've saved the browser://results content to this file")
        return
    
    try:
        # Read the JSON file
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"📁 Reading from: {input_file}")
        
        # Handle nested structure - check if data has contents array
        if 'contents' in data and len(data['contents']) > 0:
            # Extract the text field which contains the actual browser results JSON
            browser_results_text = data['contents'][0].get('text', '{}')
            browser_results = json.loads(browser_results_text)
            recent_results = browser_results.get('recentResults', [])
        else:
            # Direct format (fallback)
            recent_results = data.get('recentResults', [])
        if not recent_results:
            print("❌ No recent results found in the JSON")
            return
        
        screenshot_count = 0
        
        # Create output directory
        output_dir = "extracted_screenshots"
        os.makedirs(output_dir, exist_ok=True)
        
        # Process each result
        for i, result in enumerate(recent_results):
            # Check if this result has a screenshot
            metadata = result.get('metadata', {})
            screenshot_data = metadata.get('screenshot', '')
            
            if screenshot_data and screenshot_data.startswith('data:image/'):
                screenshot_count += 1
                
                # Extract info for filename
                result_id = result.get('id', f'unknown_{i}')
                url = result.get('url', 'unknown_url')
                timestamp = result.get('timestamp', '')
                
                # Parse timestamp for readable format
                try:
                    dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    time_str = dt.strftime('%Y%m%d_%H%M%S')
                except:
                    time_str = 'unknown_time'
                
                # Create a clean filename
                domain = url.replace('https://', '').replace('http://', '').split('/')[0]
                domain = ''.join(c for c in domain if c.isalnum() or c in '.-_')[:30]
                
                filename = f"{output_dir}/screenshot_{screenshot_count:02d}_{time_str}_{domain}.txt"
                
                # Write the base64 data to file
                with open(filename, 'w', encoding='utf-8') as f:
                    f.write(screenshot_data)
                
                print(f"✅ Screenshot {screenshot_count}: {filename}")
                print(f"   📊 Size: {len(screenshot_data):,} characters")
                print(f"   🌐 URL: {url}")
                print(f"   📅 Time: {timestamp}")
                print()
            
            else:
                # Check if it's a navigation result
                data_type = result.get('data', {})
                if data_type.get('navigated'):
                    print(f"ℹ️  Result {i+1}: Navigation to {result.get('url', 'unknown')} (no screenshot)")
                else:
                    print(f"ℹ️  Result {i+1}: No screenshot data found")
        
        if screenshot_count == 0:
            print("❌ No screenshots found in the results")
            print("💡 Make sure the results contain screenshot data with 'data:image/' prefix")
        else:
            print(f"🎉 Successfully extracted {screenshot_count} screenshots to '{output_dir}/' directory")
            print(f"📝 You can now open each .txt file and Ctrl+A to copy the complete base64 data")
            print(f"🔗 Then paste into a base64 decoder like: https://base64.guru/converter/decode/image")
    
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing JSON: {e}")
        print("💡 Make sure the file contains valid JSON from browser://results")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

def main():
    """Main function to handle command line arguments."""
    input_file = "test/browser.results"
    
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    
    print("🔍 Screenshot Extractor for Browser MCP Results")
    print("=" * 50)
    
    extract_screenshots(input_file)

if __name__ == "__main__":
    main()
