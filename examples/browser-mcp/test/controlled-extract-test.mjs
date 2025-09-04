#!/usr/bin/env node

/**
 * Controlled Extract Text Test
 * Ensures no hanging commands with proper timeouts and error handling
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const DEPLOYED_URL = "https://browser-mcp-server-v2.raymondcuhk.workers.dev/sse";
const TIMEOUT_MS = 15000; // 15 second timeout

function withTimeout(promise, timeoutMs, operation) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

async function controlledTest() {
  console.log('🧪 Controlled Extract Text Test');
  console.log('⏰ Max timeout: 15 seconds per operation');
  
  let client = null;
  let transport = null;
  
  try {
    // Step 1: Create client with timeout
    console.log('1️⃣ Creating client...');
    client = new Client({ name: "controlled-test", version: "1.0.0" });
    
    // Step 2: Create transport with timeout  
    console.log('2️⃣ Creating transport...');
    transport = new SSEClientTransport(new URL(DEPLOYED_URL));
    
    // Step 3: Connect with timeout
    console.log('3️⃣ Connecting to server...');
    await withTimeout(
      client.connect(transport), 
      TIMEOUT_MS, 
      'Connection'
    );
    console.log('✅ Connected successfully');
    
    // Step 4: Call extract_text with timeout
    console.log('4️⃣ Calling extract_text tool...');
    const response = await withTimeout(
      client.callTool({
        name: "extract_text",
        arguments: {
          url: "https://example.com",
          selectors: {
            title: "h1",
            content: "p"
          },
          timeout: 10000 // Tool internal timeout
        }
      }),
      TIMEOUT_MS,
      'Tool call'
    );
    
    // Step 5: Validate response
    console.log('5️⃣ Processing response...');
    if (response && response.success) {
      console.log('✅ Extract successful!');
      console.log('📝 Title:', response.data?.title);
      console.log('📝 Content:', response.data?.content?.substring(0, 100) + '...');
      return { success: true, data: response.data };
    } else {
      console.log('❌ Extract failed:', response?.content?.[0]?.text);
      return { success: false, error: response?.content?.[0]?.text };
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('timed out')) {
      console.log('⏰ Operation timed out - this prevents hanging');
    }
    
    return { success: false, error: error.message };
    
  } finally {
    // Step 6: Cleanup with timeout
    console.log('6️⃣ Cleaning up...');
    
    if (client) {
      try {
        await withTimeout(
          client.close(),
          5000, // Shorter timeout for cleanup
          'Client close'
        );
        console.log('🔌 Client closed successfully');
      } catch (cleanupError) {
        console.warn('⚠️  Cleanup timeout:', cleanupError.message);
        // Force exit if cleanup hangs
        setTimeout(() => {
          console.log('🚪 Force exit due to cleanup timeout');
          process.exit(0);
        }, 1000);
      }
    }
  }
}

// Run with overall timeout
async function runControlledTest() {
  const overallTimeout = new Promise((_, reject) => 
    setTimeout(() => {
      console.log('🚨 Overall test timeout - force exit');
      process.exit(1);
    }, 20000) // 20 second overall limit
  );
  
  const testPromise = controlledTest();
  
  try {
    const result = await Promise.race([testPromise, overallTimeout]);
    console.log('🎉 Test completed within time limits');
    console.log('📊 Final result:', result);
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
  }
}

runControlledTest();
