#!/usr/bin/env node

/**
 * Focused demonstration of extract_text on httpbin.org/html
 * Quick demo showing key extraction capabilities
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const DEPLOYED_URL = "https://browser-mcp-server-v2.raymondcuhk.workers.dev/sse";

async function focusedDemo() {
  console.log('📚 Extract Text Demo: httpbin.org/html (Moby-Dick Passage)');
  console.log('=' .repeat(60));
  
  const client = new Client({ name: "focused-demo", version: "1.0.0" });
  
  try {
    const transport = new SSEClientTransport(new URL(DEPLOYED_URL));
    await client.connect(transport);
    console.log('✅ Connected to Browser MCP\\n');

    // Single comprehensive test
    console.log('🎯 Extracting Multiple Elements from Moby-Dick Page');
    
    const response = await client.callTool({
      name: "extract_text",
      arguments: {
        url: "https://httpbin.org/html",
        selectors: {
          title: "h1",
          story_beginning: "p:first-of-type", 
          full_content: "body"
        },
        timeout: 15000
      }
    });

    if (response.success) {
      console.log('✅ Extraction successful!\\n');
      
      console.log('📖 Book Title:');
      console.log(`   "${response.data.title}"\\n`);
      
      console.log('📝 Story Beginning (first 300 characters):');
      const beginning = String(response.data.story_beginning || '');
      console.log(`   "${beginning.substring(0, 300)}..."\\n`);
      
      console.log('📊 Full Content Stats:');
      const fullContent = String(response.data.full_content || '');
      console.log(`   • Total length: ${fullContent.length} characters`);
      console.log(`   • Word count: ~${fullContent.split(/\\s+/).length} words`);
      console.log(`   • Contains "blacksmith": ${fullContent.includes('blacksmith') ? 'Yes' : 'No'}`);
      console.log(`   • Contains "Moby-Dick": ${fullContent.includes('Moby-Dick') ? 'Yes' : 'No'}`);
      
      console.log('\\n🔍 Key Themes Found:');
      const themes = [
        'blacksmith', 'hammer', 'Perth', 'Ahab', 'mariners', 
        'voyage', 'winter', 'sorrow', 'ruin'
      ];
      themes.forEach(theme => {
        if (fullContent.toLowerCase().includes(theme.toLowerCase())) {
          console.log(`   ✓ ${theme}`);
        }
      });
      
    } else {
      console.log('❌ Extraction failed:', response.content[0].text);
    }

    await client.close();
    console.log('\\n🎉 Demo completed successfully!');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    throw error;
  }
}

focusedDemo().catch(error => {
  console.error('💥 Final error:', error.message);
  process.exit(1);
});
