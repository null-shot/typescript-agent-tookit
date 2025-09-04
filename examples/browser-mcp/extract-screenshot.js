#!/usr/bin/env node

/**
 * Helper script to extract base64 screenshot data from MCP Inspector response
 */

const fs = require('fs');
const readline = require('readline');

console.log('📸 MCP Inspector Screenshot Data Extractor');
console.log('');
console.log('Instructions:');
console.log('1. Copy the ENTIRE JSON response from MCP Inspector');
console.log('2. Save it to a file called "mcp-response.json"');
console.log('3. Run this script to extract the base64 data');
console.log('');

// Check if response file exists
if (!fs.existsSync('mcp-response.json')) {
    console.log('❌ mcp-response.json not found');
    console.log('');
    console.log('Please:');
    console.log('1. Copy the complete JSON response from MCP Inspector');
    console.log('2. Save it as "mcp-response.json" in this directory');
    console.log('3. Run this script again');
    process.exit(1);
}

try {
    const response = JSON.parse(fs.readFileSync('mcp-response.json', 'utf8'));
    
    // Extract screenshot data
    let screenshotData = null;
    
    if (response.result && response.result.screenshot) {
        screenshotData = response.result.screenshot;
    } else if (response.screenshot) {
        screenshotData = response.screenshot;
    } else {
        // Search in nested structure
        const searchForScreenshot = (obj) => {
            if (typeof obj === 'string' && obj.startsWith('data:image/')) {
                return obj;
            }
            if (typeof obj === 'object' && obj !== null) {
                for (const key in obj) {
                    const result = searchForScreenshot(obj[key]);
                    if (result) return result;
                }
            }
            return null;
        };
        screenshotData = searchForScreenshot(response);
    }
    
    if (screenshotData) {
        fs.writeFileSync('extracted-screenshot.txt', screenshotData);
        console.log('✅ Screenshot data extracted successfully!');
        console.log(`📊 Length: ${screenshotData.length} characters`);
        console.log('📂 Saved to: extracted-screenshot.txt');
        console.log('');
        console.log('You can now:');
        console.log('1. Open view-screenshot.html in your browser');
        console.log('2. Copy the contents of extracted-screenshot.txt');
        console.log('3. Paste and view the screenshot');
    } else {
        console.log('❌ No screenshot data found in the response');
        console.log('');
        console.log('Response structure:');
        console.log(JSON.stringify(response, null, 2));
    }
    
} catch (error) {
    console.log('❌ Error parsing JSON:', error.message);
    console.log('');
    console.log('Make sure mcp-response.json contains valid JSON');
}
