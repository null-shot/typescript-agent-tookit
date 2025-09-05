#!/usr/bin/env node

/**
 * Verify the clean data that was added
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const MCP_BASE_URL = 'https://analytics-mcp.raydp102.workers.dev';

async function verifyCleanData() {
  const client = new Client({ name: 'verify-clean-data', version: '1.0.0' });
  
  try {
    console.log('🔌 Connecting to MCP server...');
    const transport = new SSEClientTransport(new URL(`${MCP_BASE_URL}/sse`));
    await client.connect(transport);
    
    // Query the clean data
    console.log('📊 Querying clean daily_pr_stats_clean data...');
    const result = await client.callTool({
      name: 'query_analytics',
      arguments: {
        sql: `SELECT blob3, double1 as prs_created, double2 as prs_merged, double3 as prs_closed FROM github_stats WHERE blob2 = 'daily_pr_stats_clean' ORDER BY blob3`
      }
    });
    
    const responseData = JSON.parse(result.content[0].text);
    if (responseData.success) {
      const data = responseData.data.data;
      console.log(`\n✅ Found ${data.length} rows of clean daily_pr_stats_clean data:\n`);
      
      data.forEach((row, i) => {
        console.log(`${String(i+1).padStart(2)}. ${row.blob3} | Created: ${String(row.prs_created).padStart(2)} | Merged: ${String(row.prs_merged).padStart(2)} | Closed: ${String(row.prs_closed).padStart(2)}`);
      });
      
      // Check for unique dates
      const dates = data.map(row => row.blob3);
      const uniqueDates = [...new Set(dates)];
      
      console.log(`\n🔍 Analysis:`);
      console.log(`Total rows: ${data.length}`);
      console.log(`Unique dates: ${uniqueDates.length}`);
      console.log(`Date range: ${data[0].blob3} to ${data[data.length-1].blob3}`);
      
      if (data.length === uniqueDates.length && uniqueDates.length === 30) {
        console.log(`\n🎉 PERFECT! Clean data has exactly 30 unique days with no duplicates!`);
      } else if (data.length === uniqueDates.length) {
        console.log(`\n✅ Good! No duplicates found, but only ${uniqueDates.length} days instead of 30.`);
      } else {
        console.log(`\n⚠️  Found ${data.length - uniqueDates.length} duplicate entries.`);
      }
      
      // Check for any missing dates in the expected range
      const expectedStart = new Date('2025-08-06');
      const expectedEnd = new Date('2025-09-04');
      const expectedDates = [];
      for (let d = new Date(expectedStart); d <= expectedEnd; d.setDate(d.getDate() + 1)) {
        expectedDates.push(d.toISOString().split('T')[0]);
      }
      
      const missingDates = expectedDates.filter(date => !dates.includes(date));
      if (missingDates.length > 0) {
        console.log(`\n❌ Missing ${missingDates.length} dates:`);
        missingDates.slice(0, 10).forEach(date => console.log(`  ${date}`));
        if (missingDates.length > 10) {
          console.log(`  ... and ${missingDates.length - 10} more`);
        }
      } else {
        console.log(`\n✅ All 30 expected dates are present!`);
      }
      
    } else {
      console.error('❌ Query failed:', responseData.error);
    }
    
    // Also check the old messy data for comparison
    console.log('\n📊 Comparing with old messy data...');
    const oldResult = await client.callTool({
      name: 'query_analytics',
      arguments: {
        sql: `SELECT blob2, COUNT(blob3) as row_count FROM github_stats WHERE blob2 LIKE '%daily_pr_stats%' GROUP BY blob2`
      }
    });
    
    const oldResponseData = JSON.parse(oldResult.content[0].text);
    if (oldResponseData.success) {
      const oldData = oldResponseData.data.data;
      console.log('\n📈 Data comparison:');
      oldData.forEach(row => {
        console.log(`  ${row.blob2}: ${row.row_count} rows`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

verifyCleanData();
