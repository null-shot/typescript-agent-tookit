#!/usr/bin/env node

// Test script to verify the screenshot tool works with fixed Puppeteer
import fetch from 'node-fetch';

async function testScreenshot() {
  console.log('🧪 Testing screenshot tool with fixed Puppeteer...');
  
  try {
    const response = await fetch('http://127.0.0.1:8787/sse/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'screenshot',
          arguments: {
            url: 'https://httpbin.org/html',
            format: 'png'
          }
        }
      })
    });

    const result = await response.json();
    console.log('📸 Screenshot result:', JSON.stringify(result, null, 2));
    
    if (result.result && result.result.success) {
      console.log('✅ Screenshot tool executed successfully!');
      
      // Check if we got a real screenshot (should be much larger than mock)
      if (result.result.screenshot && result.result.screenshot.length > 1000) {
        console.log(`🎯 Got REAL screenshot! Base64 length: ${result.result.screenshot.length} characters`);
        console.log('📝 First 100 characters:', result.result.screenshot.substring(0, 100) + '...');
      } else {
        console.log('⚠️ Screenshot seems to be mock/small. Length:', result.result.screenshot?.length || 0);
      }
    } else {
      console.log('❌ Screenshot failed:', result.error || result.result);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testScreenshot();
