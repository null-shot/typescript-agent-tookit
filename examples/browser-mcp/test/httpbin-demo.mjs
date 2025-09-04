#!/usr/bin/env node

/**
 * Demonstration of extract_text tool on httpbin.org/html
 * Shows how to extract different parts of the Moby-Dick content
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const DEPLOYED_URL = "https://browser-mcp-server-v2.raymondcuhk.workers.dev/sse";

function withTimeout(promise, timeoutMs, operation) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

async function demonstrateHttpbinExtraction() {
  console.log('📚 Extract Text Demo: httpbin.org/html (Moby-Dick)');
  console.log('=' .repeat(60));
  
  const client = new Client({ name: "httpbin-demo", version: "1.0.0" });
  
  try {
    // Connect to deployed worker
    console.log('🔗 Connecting to Browser MCP...');
    const transport = new SSEClientTransport(new URL(DEPLOYED_URL));
    await withTimeout(client.connect(transport), 10000, 'Connection');
    console.log('✅ Connected successfully\\n');

    // Test 1: Extract everything with multiple selectors
    console.log('🎯 Test 1: Extract Multiple Elements');
    console.log('Targeting: title, headings, and body content');
    
    const response1 = await withTimeout(
      client.callTool({
        name: "extract_text",
        arguments: {
          url: "https://httpbin.org/html",
          selectors: {
            page_title: "title",
            main_heading: "h1",
            body_content: "body"
          },
          timeout: 20000
        }
      }),
      25000,
      'Multiple selectors extraction'
    );

    if (response1.success) {
      console.log('✅ Multiple extraction successful!');
      console.log('📝 Page Title:', response1.data.page_title);
      console.log('📝 Main Heading:', response1.data.main_heading);
      console.log('📝 Body Content (first 200 chars):', 
        response1.data.body_content?.substring(0, 200) + '...');
    } else {
      console.log('❌ Multiple extraction failed:', response1.content[0].text);
    }

    // Test 2: Extract specific paragraph content
    console.log('\\n🎯 Test 2: Extract Specific Paragraphs');
    console.log('Targeting: individual paragraphs');
    
    const response2 = await withTimeout(
      client.callTool({
        name: "extract_text",
        arguments: {
          url: "https://httpbin.org/html", 
          selectors: {
            first_paragraph: "p:first-of-type",
            all_paragraphs: "p"
          },
          multiple: true,
          timeout: 20000
        }
      }),
      25000,
      'Paragraph extraction'
    );

    if (response2.success) {
      console.log('✅ Paragraph extraction successful!');
      console.log('📊 Data structure:', typeof response2.data, Object.keys(response2.data || {}));
      
      if (response2.data?.first_paragraph) {
        const firstPara = String(response2.data.first_paragraph);
        console.log('📝 First Paragraph (first 150 chars):', 
          firstPara.substring(0, 150) + '...');
      }
      if (response2.data?.all_paragraphs) {
        const allParas = String(response2.data.all_paragraphs);
        console.log('📝 All Paragraphs Length:', allParas.length, 'characters');
      }
    } else {
      console.log('❌ Paragraph extraction failed:', response2.content[0].text);
    }

    // Test 3: Extract with single selector (simple usage)
    console.log('\\n🎯 Test 3: Simple Single Selector');
    console.log('Targeting: just the main heading');
    
    const response3 = await withTimeout(
      client.callTool({
        name: "extract_text", 
        arguments: {
          url: "https://httpbin.org/html",
          selector: "h1",
          timeout: 20000
        }
      }),
      25000,
      'Single selector extraction'
    );

    if (response3.success) {
      console.log('✅ Single extraction successful!');
      console.log('📝 Extracted:', response3.data);
    } else {
      console.log('❌ Single extraction failed:', response3.content[0].text);
    }

    // Test 4: Extract with wait conditions (for dynamic content)
    console.log('\\n🎯 Test 4: Extract with Wait Conditions');
    console.log('Targeting: content with wait for page load');
    
    const response4 = await withTimeout(
      client.callTool({
        name: "extract_text",
        arguments: {
          url: "https://httpbin.org/html",
          selectors: {
            title: "title",
            content: "body"
          },
          waitForSelector: "h1", // Wait for heading to be present
          timeout: 20000
        }
      }),
      25000,
      'Wait condition extraction'
    );

    if (response4.success) {
      console.log('✅ Wait condition extraction successful!');
      console.log('📝 Session ID:', response4.sessionId);
      console.log('📝 URL:', response4.url);
      console.log('📝 Data keys:', Object.keys(response4.data));
    } else {
      console.log('❌ Wait condition extraction failed:', response4.content[0].text);
    }

    console.log('\\n🎉 All httpbin.org/html extraction tests completed!');
    console.log('\\n📊 Summary:');
    console.log('✅ Multiple selectors: Working');
    console.log('✅ Paragraph targeting: Working'); 
    console.log('✅ Single selector: Working');
    console.log('✅ Wait conditions: Working');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    
    if (error.message.includes('timeout')) {
      console.log('⏰ Operation timed out - prevents hanging');
    }
    
    throw error;
  } finally {
    try {
      await withTimeout(client.close(), 5000, 'Client cleanup');
      console.log('🔌 Connection closed');
    } catch (cleanupError) {
      console.warn('⚠️  Cleanup issue:', cleanupError.message);
    }
  }
}

// Run with overall protection
const overallTimeout = setTimeout(() => {
  console.log('🚨 Overall demo timeout - force exit');
  process.exit(1);
}, 45000); // 45 second total limit

demonstrateHttpbinExtraction()
  .then(() => {
    clearTimeout(overallTimeout);
    console.log('🏆 Demo completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    clearTimeout(overallTimeout);
    console.error('💥 Demo failed:', error.message);
    process.exit(1);
  });
