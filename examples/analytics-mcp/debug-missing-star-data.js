#!/usr/bin/env node

/**
 * Debug why only 9 star data points exist instead of 30
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const MCP_BASE_URL = 'https://analytics-mcp.raydp102.workers.dev';

async function main() {
  console.log('🔍 DEBUGGING MISSING STAR DATA\n');
  
  const client = new Client({
    name: "debug-missing-stars",
    version: "1.0.0",
  });

  try {
    console.log('🔌 Connecting...');
    const transport = new SSEClientTransport(new URL(`${MCP_BASE_URL}/sse`));
    await client.connect(transport);
    console.log('✅ Connected\n');

    // Check all star-related data
    console.log('📊 Step 1: Check ALL star-related data...');
    const allStarResult = await client.callTool({
      name: 'query_analytics',
      arguments: {
        sql: "SELECT blob2, blob3, blob5, double1 FROM github_stats WHERE blob2 LIKE '%star%' OR blob2 LIKE '%cumulative%' ORDER BY blob2, blob5, blob3"
      }
    });

    const allStarData = JSON.parse(allStarResult.content[0].text);
    if (allStarData.success) {
      console.log(`✅ Found ${allStarData.data.data.length} total star-related rows`);
      
      // Group by blob2 (event type)
      const byEventType = {};
      allStarData.data.data.forEach(row => {
        if (!byEventType[row.blob2]) byEventType[row.blob2] = [];
        byEventType[row.blob2].push(row);
      });
      
      console.log('\n📊 Star data by event type:');
      Object.entries(byEventType).forEach(([eventType, rows]) => {
        console.log(`\n🏷️  ${eventType}: ${rows.length} rows`);
        
        // Group by organization
        const byOrg = {};
        rows.forEach(row => {
          if (!byOrg[row.blob5]) byOrg[row.blob5] = [];
          byOrg[row.blob5].push(row);
        });
        
        Object.entries(byOrg).forEach(([org, orgRows]) => {
          console.log(`  ${org}: ${orgRows.length} rows`);
          if (orgRows.length > 0) {
            console.log(`    Date range: ${orgRows[0].blob3} to ${orgRows[orgRows.length-1].blob3}`);
            console.log(`    Star range: ${orgRows[0].double1} to ${orgRows[orgRows.length-1].double1}`);
          }
        });
      });
      
    } else {
      console.log('❌ No star data found');
    }

    // Check if there are any errors in the data writing
    console.log('\n📊 Step 2: Check recent raw data for clues...');
    const recentResult = await client.callTool({
      name: 'query_analytics',
      arguments: {
        sql: "SELECT blob2, blob3, blob5, timestamp FROM github_stats ORDER BY timestamp DESC LIMIT 20"
      }
    });

    const recentData = JSON.parse(recentResult.content[0].text);
    if (recentData.success) {
      console.log('Recent data writes:');
      recentData.data.data.forEach((row, i) => {
        console.log(`${i+1}. ${row.timestamp}: ${row.blob2} | ${row.blob5} | ${row.blob3}`);
      });
    }

    console.log('\n🎯 DIAGNOSIS:');
    console.log('If we only have 9 data points instead of 30, possible causes:');
    console.log('1. Analytics Engine eventual consistency (data still propagating)');
    console.log('2. Some batch writes failed silently');
    console.log('3. Data deduplication based on timestamp + dimensions');
    console.log('4. Rate limiting caused some writes to be skipped');
    
    console.log('\n💡 SOLUTION: Run a targeted script to fill missing days');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

main();
