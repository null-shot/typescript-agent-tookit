#!/usr/bin/env node

/**
 * Debug script to see raw Analytics Engine data
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const MCP_BASE_URL = 'https://analytics-mcp.raydp102.workers.dev';

async function debugRawData() {
  const client = new Client({ name: 'data-debugger', version: '1.0.0' });
  
  try {
    console.log('🔌 Connecting to MCP server...');
    const transport = new SSEClientTransport(new URL(`${MCP_BASE_URL}/sse`));
    await client.connect(transport);
    
    // Query all raw data to see the structure
    const result = await client.callTool({
      name: 'query_analytics',
      arguments: {
        sql: `SELECT * FROM github_stats ORDER BY timestamp DESC LIMIT 50`
      }
    });
    
    const responseData = JSON.parse(result.content[0].text);
    if (responseData.success) {
      const data = responseData.data.data;
      console.log(`📊 Found ${data.length} rows of raw data:\n`);
      
      console.log('Raw data structure (first 10 rows):');
      data.slice(0, 10).forEach((row, i) => {
        console.log(`${i+1}. Raw row:`, JSON.stringify(row, null, 2));
      });
      
      // Check unique blob2 values
      const blob2Values = [...new Set(data.map(row => row.blob2))];
      console.log(`\n🏷️  Unique blob2 values: ${blob2Values.join(', ')}`);
      
      // Count by blob2
      const blob2Counts = {};
      data.forEach(row => {
        blob2Counts[row.blob2] = (blob2Counts[row.blob2] || 0) + 1;
      });
      
      console.log('\n📊 Count by blob2:');
      Object.entries(blob2Counts).forEach(([key, count]) => {
        console.log(`  ${key || '(empty)'}: ${count} rows`);
      });
      
    } else {
      console.error('❌ Query failed:', responseData.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

debugRawData();
