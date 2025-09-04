#!/usr/bin/env node

/**
 * Extract the first line (date/weather info) from HKO clock page
 * This demonstrates our improved timing fixes working with dynamic content
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

async function extractHKODateLine() {
  console.log('🕐 HKO Clock Page - Date/Weather Line Extraction');
  console.log('=' .repeat(60));
  console.log('Target: First line with date, weather warning, and temperature');
  console.log('URL: https://www.hko.gov.hk/en/gts/time/clock_e.html\n');
  
  const client = new Client({ name: "hko-date-extractor", version: "1.0.0" });
  
  try {
    // Connect to deployed worker
    console.log('🔗 Connecting to Browser MCP...');
    const transport = new SSEClientTransport(new URL(DEPLOYED_URL));
    await withTimeout(client.connect(transport), 10000, 'Connection');
    console.log('✅ Connected successfully\n');

    // Extract with multiple strategies to find the date/weather line
    console.log('🎯 Extracting date/weather information...');
    console.log('Using improved timing (networkidle2 + wait delay)');
    
    const response = await withTimeout(
      client.callTool({
        name: "extract_text",
        arguments: {
          url: "https://www.hko.gov.hk/en/gts/time/clock_e.html",
          selectors: {
            // Try multiple selectors to find the date/weather line
            header_info: "header", 
            top_line: ".header-info, .date-info, .weather-line",
            date_section: "[class*='date'], [class*='weather'], [class*='temp']",
            page_top: "body > div:first-child, body > section:first-child",
            all_text: "body"
          },
          waitForSelector: "body", // Wait for page to load
          waitDelay: 3000, // Extra 3 seconds for dynamic content (clock, weather)
          timeout: 25000
        }
      }),
      30000,
      'HKO extraction'
    );

    if (response.success) {
      console.log('✅ Extraction successful!\n');
      
      // Look for the date/weather line in the extracted data
      const data = response.data;
      console.log('📊 Extracted data keys:', Object.keys(data));
      
      // Check each extracted section for the date/weather line
      for (const [key, content] of Object.entries(data)) {
        if (content && typeof content === 'string') {
          const text = content.trim();
          
          // Look for patterns that match the date/weather line
          if (text.includes('2025') || text.includes('Sep') || text.includes('°C') || text.includes('Tue')) {
            console.log(`\n🎯 Found in '${key}':`);
            
            // Extract lines that contain date/weather info
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            
            for (let i = 0; i < Math.min(lines.length, 10); i++) {
              const line = lines[i];
              if (line.includes('2025') || line.includes('Sep') || line.includes('°C')) {
                console.log(`📅 Line ${i + 1}: "${line}"`);
              }
            }
          }
        }
      }
      
      // Also check for the complete body text and look for our target pattern
      if (data.all_text) {
        console.log('\n🔍 Searching full page text for date/weather pattern...');
        const fullText = String(data.all_text);
        
        // Look for the specific pattern mentioned in the query
        const patterns = [
          /\d+\s+Sep\s+2025.*?°C.*?%.*?\(\d+:\d+\)/gi,
          /2\s+Sep\s+2025.*?HOT\s+WEATHER.*?33\.3°C.*?61%.*?\(16:00\)/gi,
          /\d+\s+Sep\s+2025.*?Tue.*?°C/gi
        ];
        
        for (const pattern of patterns) {
          const matches = fullText.match(pattern);
          if (matches) {
            console.log('🎯 Pattern match found:');
            matches.forEach((match, idx) => {
              console.log(`   ${idx + 1}. "${match}"`);
            });
            break;
          }
        }
        
        // Show first few lines that contain our keywords
        const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 10);
        console.log('\n📝 Lines containing date/weather keywords:');
        let found = 0;
        for (const line of lines) {
          if (found >= 5) break;
          if (line.includes('Sep 2025') || line.includes('°C') || line.includes('HOT WEATHER') || line.includes('33.3')) {
            console.log(`   • "${line}"`);
            found++;
          }
        }
      }
      
      console.log('\n📊 Session Info:');
      console.log(`   • Session ID: ${response.sessionId}`);
      console.log(`   • Final URL: ${response.url}`);
      
    } else {
      console.log('❌ Extraction failed:', response.content[0].text);
    }

    await client.close();
    console.log('\n🎉 HKO date/weather extraction completed!');
    
  } catch (error) {
    console.error('❌ Extraction failed:', error.message);
    
    if (error.message.includes('timeout')) {
      console.log('⏰ Operation timed out - this is expected for complex pages');
    }
    
    throw error;
  }
}

// Run with protection
const overallTimeout = setTimeout(() => {
  console.log('🚨 Overall timeout - force exit');
  process.exit(1);
}, 45000);

extractHKODateLine()
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
