#!/usr/bin/env node

/**
 * Test script to get screenshot data from browser-mcp server
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";

// Test with WorkerSSEClientTransport if available, otherwise show manual instructions
async function testScreenshot() {
  console.log('🖼️ Testing Browser-MCP Screenshot...\n');
  
  try {
    // Try to import the transport
    const { WorkerSSEClientTransport } = await import('@nullshot/test-utils');
    
    console.log('📡 Connecting to browser-mcp server...');
    const client = new Client({
      name: "screenshot-test",
      version: "1.0.0"
    });
    
    const transport = new WorkerSSEClientTransport(new URL("http://localhost/sse"));
    await client.connect(transport);
    
    console.log('✅ Connected! Taking screenshot...');
    
    const result = await client.callTool({
      name: "screenshot",
      arguments: {
        url: "https://httpbin.org/html",
        fullPage: false,
        format: "png"
      }
    });
    
    console.log('\n🎯 SUCCESS! Screenshot taken!');
    console.log('\n📋 Copy this data to your Screenshot Viewer:');
    console.log('=' .repeat(50));
    console.log(JSON.stringify(result, null, 2));
    console.log('=' .repeat(50));
    
    await client.close();
    
  } catch (error) {
    console.log('⚠️ Direct connection failed (this is normal)');
    console.log('\n📋 Manual Instructions:');
    console.log('1. Open MCP Inspector: http://localhost:6274');
    console.log('2. Connect to: http://127.0.0.1:8787/sse');
    console.log('3. Call the screenshot tool with:');
    console.log(JSON.stringify({
      name: "screenshot", 
      arguments: {
        url: "https://httpbin.org/html",
        fullPage: false,
        format: "png"
      }
    }, null, 2));
    console.log('4. Copy the response and paste it in the Screenshot Viewer');
  }
}

testScreenshot().catch(console.error);
