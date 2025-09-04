#!/usr/bin/env node

/**
 * Test script to demonstrate extract_text usage for HKO website
 * This shows the exact JSON you should use in MCP Inspector
 */

console.log('📝 HKO Text Extraction Examples for MCP Inspector');
console.log('=' .repeat(60));

console.log('\n🎯 Example 1: Extract Date and Time (Recommended)');
console.log('Copy this JSON into MCP Inspector extract_text tool:');
console.log('```json');
console.log(JSON.stringify({
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "selectors": {
    "page_title": "title",
    "main_heading": "h1, h2, .title",
    "breadcrumb": ".breadcrumb, nav a",
    "date_info": ".date, [class*='date'], time",
    "time_info": ".time, [class*='time'], [class*='clock']",
    "weather_temp": ".temperature, [class*='temp'], [class*='celsius']",
    "weather_humidity": "[class*='humid'], [class*='rh']"
  },
  "waitForSelector": "body",
  "timeout": 15000
}, null, 2));
console.log('```');

console.log('\n🎯 Example 2: Extract All Text Content');
console.log('```json');
console.log(JSON.stringify({
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "selector": "body",
  "waitForSelector": "body",
  "timeout": 10000
}, null, 2));
console.log('```');

console.log('\n🎯 Example 3: Extract Specific Elements with Fallbacks');
console.log('```json');
console.log(JSON.stringify({
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html", 
  "selectors": {
    "current_datetime": "time, .time, .date, [datetime], [class*='time'], [class*='date'], [id*='time'], [id*='date']",
    "weather_data": ".weather, [class*='weather'], [class*='temp'], .temperature",
    "page_content": "main, .content, .main-content, article"
  },
  "waitForSelector": "h1, h2, title",
  "timeout": 15000
}, null, 2));
console.log('```');

console.log('\n🎯 Example 4: Two-Step Process (Navigate + Extract)');
console.log('\nStep 1 - Navigate (use navigate tool):');
console.log('```json');
console.log(JSON.stringify({
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "waitUntil": "networkidle2",
  "timeout": 30000
}, null, 2));
console.log('```');

console.log('\nStep 2 - Extract (use extract_text tool with sessionId from step 1):');
console.log('```json');
console.log(JSON.stringify({
  "sessionId": "YOUR_SESSION_ID_FROM_STEP_1",
  "selectors": {
    "datetime": "time, .time, .date, [class*='time'], [class*='date']",
    "weather": ".weather, [class*='weather'], [class*='temp']",
    "title": "h1, h2, title"
  },
  "timeout": 10000
}, null, 2));
console.log('```');

console.log('\n🎯 Example 5: Extract Multiple Elements');
console.log('```json');
console.log(JSON.stringify({
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "selector": "p, div, span, time, [class*='time'], [class*='date']",
  "multiple": true,
  "waitForSelector": "body",
  "timeout": 15000
}, null, 2));
console.log('```');

console.log('\n📋 How to Use in MCP Inspector:');
console.log('1. Open MCP Inspector and connect to your browser-mcp worker');
console.log('2. Select "extract_text" from the tools dropdown');
console.log('3. Copy one of the JSON examples above');
console.log('4. Paste into the parameters field');
console.log('5. Click "Execute"');
console.log('6. Check the results for extracted date/time information');

console.log('\n💡 Tips:');
console.log('• Start with Example 1 (most comprehensive)');
console.log('• If no data is extracted, try Example 2 (gets all text)');
console.log('• Use browser DevTools to inspect the actual HTML structure');
console.log('• The selectors include fallbacks for different possible element types');
console.log('• Increase timeout if the page loads slowly');

console.log('\n🔍 Expected Results:');
console.log('You should get back JSON with extracted text like:');
console.log('{');
console.log('  "page_title": "Web Clock｜Hong Kong Observatory(HKO)｜Time Services",');
console.log('  "date_info": "2 Sep 2025 (Tue)",');
console.log('  "time_info": "29.5°C 79% (09:00)",');
console.log('  "weather_temp": "29.5°C",');
console.log('  "weather_humidity": "79%"');
console.log('}');

console.log('\n✨ Ready to extract HKO date and time data!');
