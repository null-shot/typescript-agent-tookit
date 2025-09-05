#!/usr/bin/env node

/**
 * Analyze the data that was added to see what's actually in Analytics Engine
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const MCP_BASE_URL = 'https://analytics-mcp.raydp102.workers.dev';

async function queryData() {
  const client = new Client({ name: 'data-analyzer', version: '1.0.0' });
  
  try {
    console.log('🔌 Connecting to MCP server...');
    const transport = new SSEClientTransport(new URL(`${MCP_BASE_URL}/sse`));
    await client.connect(transport);
    
    // Query all daily_pr_stats data
    const result = await client.callTool({
      name: 'query_analytics',
      arguments: {
        sql: `SELECT timestamp, blob3, double1 as prs_created, double2 as prs_merged, double3 as prs_closed FROM github_stats WHERE blob2 = 'daily_pr_stats' ORDER BY blob3`
      }
    });
    
    const responseData = JSON.parse(result.content[0].text);
    if (responseData.success) {
      const data = responseData.data.data;
      console.log(`📊 Found ${data.length} rows of daily_pr_stats data:\n`);
      
      data.forEach((row, i) => {
        // Use the date from blob3 (the actual date dimension) instead of timestamp
        const date = row.blob3; // This is blob3 which contains the actual date
        console.log(`${String(i+1).padStart(2)}. ${date} | Created: ${String(row.prs_created).padStart(2)} | Merged: ${String(row.prs_merged).padStart(2)} | Closed: ${String(row.prs_closed).padStart(2)}`);
      });
      
      // Check for date gaps
      console.log(`\n🔍 Date Analysis:`);
      
      console.log(`First date: ${data[0].blob3}`);
      console.log(`Last date:  ${data[data.length-1].blob3}`);
      
      // Check for consecutive days
      const dates = data.map(row => row.blob3);
      const uniqueDates = [...new Set(dates)];
      console.log(`Unique dates: ${uniqueDates.length}`);
      console.log(`Total rows:   ${data.length}`);
      
      if (uniqueDates.length !== data.length) {
        console.log(`⚠️  WARNING: Found duplicate dates!`);
        
        // Find duplicates
        const dateCounts = {};
        dates.forEach(date => {
          dateCounts[date] = (dateCounts[date] || 0) + 1;
        });
        
        console.log(`\nDuplicate dates:`);
        Object.entries(dateCounts).forEach(([date, count]) => {
          if (count > 1) {
            console.log(`  ${date}: ${count} times`);
          }
        });
      } else {
        console.log(`✅ All dates are unique`);
      }
      
      // Check for expected date range (2025-08-06 to 2025-09-04)
      const expectedStart = new Date('2025-08-06');
      const expectedEnd = new Date('2025-09-04');
      const actualStart = new Date(data[0].blob3);
      const actualEnd = new Date(data[data.length-1].blob3);
      
      console.log(`\n📅 Expected vs Actual Range:`);
      console.log(`Expected: 2025-08-06 to 2025-09-04 (30 days)`);
      console.log(`Actual:   ${actualStart.toISOString().split('T')[0]} to ${actualEnd.toISOString().split('T')[0]} (${data.length} days)`);
      
      // Find missing dates in expected range
      const expectedDates = [];
      for (let d = new Date(expectedStart); d <= expectedEnd; d.setDate(d.getDate() + 1)) {
        expectedDates.push(d.toISOString().split('T')[0]);
      }
      
      const missingDates = expectedDates.filter(date => !dates.includes(date));
      if (missingDates.length > 0) {
        console.log(`\n❌ Missing dates (${missingDates.length}):`);
        missingDates.forEach(date => console.log(`  ${date}`));
      } else {
        console.log(`\n✅ No missing dates in expected range`);
      }
      
    } else {
      console.error('❌ Query failed:', responseData.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

queryData();
