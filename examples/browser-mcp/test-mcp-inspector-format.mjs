#!/usr/bin/env node

/**
 * Corrected JSON examples for MCP Inspector extract_text tool
 * These fix the -32602 error by using proper parameter structure
 */

console.log('🔧 Fixed JSON Examples for MCP Inspector extract_text Tool');
console.log('=' .repeat(65));

console.log('\n❌ The Error You Got:');
console.log('MCP error -32602: Invalid arguments - this happens when JSON structure is wrong');

console.log('\n✅ CORRECTED Examples (copy these into MCP Inspector):');

console.log('\n🎯 Example 1: Get All Page Text (Simplest - Start Here!)');
console.log('```json');
console.log(JSON.stringify({
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "selector": "body",
  "timeout": 15000
}, null, 2));
console.log('```');

console.log('\n🎯 Example 2: Get Page Title');
console.log('```json');
console.log(JSON.stringify({
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "selector": "title",
  "timeout": 15000
}, null, 2));
console.log('```');

console.log('\n🎯 Example 3: Get Time/Date Elements (Multiple)');
console.log('```json');
console.log(JSON.stringify({
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "selector": "time, .time, .date, [class*='time'], [class*='date']",
  "multiple": true,
  "timeout": 15000
}, null, 2));
console.log('```');

console.log('\n🎯 Example 4: Multiple Fields (Correct selectors format)');
console.log('```json');
console.log(JSON.stringify({
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "selectors": {
    "title": "title",
    "heading": "h1, h2",
    "datetime": "time, .time, .date",
    "weather": ".temperature, [class*='temp']"
  },
  "timeout": 15000
}, null, 2));
console.log('```');

console.log('\n🎯 Example 5: Two-Step Process (Most Reliable)');
console.log('\nStep 1 - Use navigate tool:');
console.log('```json');
console.log(JSON.stringify({
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "waitUntil": "networkidle2",
  "timeout": 30000
}, null, 2));
console.log('```');

console.log('\nStep 2 - Use extract_text tool with sessionId:');
console.log('```json');
console.log(JSON.stringify({
  "sessionId": "PUT_SESSION_ID_FROM_STEP_1_HERE",
  "selector": "body",
  "timeout": 10000
}, null, 2));
console.log('```');

console.log('\n📋 What Was Wrong:');
console.log('• timeout was being treated as part of selectors object');
console.log('• MCP Inspector expects flat parameter structure');
console.log('• All parameters must be at top level');

console.log('\n💡 Tips for MCP Inspector:');
console.log('• Start with Example 1 (gets all text)');
console.log('• Copy JSON exactly as shown above');
console.log('• Make sure all parameters are at top level');
console.log('• Use either "selector" OR "selectors", not both');
console.log('• If using selectors object, each value must be a string');

console.log('\n🚀 Recommended Order:');
console.log('1. Try Example 1 first (simplest)');
console.log('2. If that works, try Example 4 (multiple fields)');
console.log('3. Use Example 5 for most reliable results');
console.log('4. Refine selectors based on what you find');

console.log('\n✨ These examples should work without errors!');
