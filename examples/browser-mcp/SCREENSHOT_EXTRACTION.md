# Screenshot Extraction Guide

This guide helps you extract screenshots from MCP Inspector browser results for easy viewing.

## 📋 **Step-by-Step Instructions:**

### **1. Save Browser Results from MCP Inspector**
1. Open MCP Inspector and connect to your browser MCP server
2. Go to **Resources** tab → **browser://results**
3. Copy the entire JSON content
4. Save it as `test/browser.results` (or any filename you prefer)

### **2. Run the Extraction Script**
```bash
# Make sure you're in the browser-mcp directory
cd examples/browser-mcp

# Run with default file (test/browser.results)
python extract-screenshots.py

# Or specify a custom file
python extract-screenshots.py my-results.json
```

### **3. View Your Screenshots**
The script creates an `extracted_screenshots/` directory with files like:
```
extracted_screenshots/
├── screenshot_01_20250902_014523_www.hko.gov.hk.txt
├── screenshot_02_20250902_014601_httpbin.org.txt
└── screenshot_03_20250902_014712_example.com.txt
```

### **4. Copy Base64 Data**
1. Open any `.txt` file in your text editor
2. **Ctrl+A** (Select All) to select the complete base64 string
3. **Ctrl+C** to copy
4. Paste into a base64 decoder like:
   - https://base64.guru/converter/decode/image
   - https://www.base64decode.org/
   - Or use the `view-screenshot.html` file in this directory

## 🎯 **Features:**
- ✅ **Extracts all screenshots** from browser results
- ✅ **Readable filenames** with timestamp and domain
- ✅ **Character count** to verify real vs mock screenshots
- ✅ **Easy copying** - each screenshot in its own file
- ✅ **Handles multiple results** automatically

## 🔍 **Troubleshooting:**
- **"File not found"**: Make sure you saved the browser results JSON
- **"No screenshots found"**: Check if your results contain actual screenshot data (not mock)
- **"Invalid JSON"**: Verify you copied the complete JSON from MCP Inspector

## 💡 **Tips:**
- **Real screenshots** are typically 50,000+ characters
- **Mock screenshots** are only ~89 characters
- The script shows the size of each screenshot to help identify real vs mock data
