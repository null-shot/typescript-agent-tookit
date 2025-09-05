#!/usr/bin/env node

/**
 * Final query to get clean data for Grafana dashboard
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const MCP_BASE_URL = 'https://analytics-mcp.raydp102.workers.dev';

async function getFinalCleanData() {
  const client = new Client({ name: 'final-clean-data', version: '1.0.0' });
  
  try {
    console.log('🔌 Connecting to MCP server...');
    const transport = new SSEClientTransport(new URL(`${MCP_BASE_URL}/sse`));
    await client.connect(transport);
    
    console.log('📊 Getting all clean data...');
    const result = await client.callTool({
      name: 'query_analytics',
      arguments: {
        sql: `SELECT blob3, double1, double2, double3 FROM github_stats WHERE blob2 = 'daily_pr_stats_clean' ORDER BY blob3`
      }
    });
    
    const responseData = JSON.parse(result.content[0].text);
    if (responseData.success) {
      const data = responseData.data.data;
      console.log(`✅ Found ${data.length} rows of clean data\n`);
      
      // Group by date manually to handle duplicates
      const groupedData = {};
      data.forEach(row => {
        const date = row.blob3;
        if (!groupedData[date]) {
          groupedData[date] = { created: [], merged: [], closed: [] };
        }
        groupedData[date].created.push(row.double1);
        groupedData[date].merged.push(row.double2);
        groupedData[date].closed.push(row.double3);
      });
      
      // Calculate averages for duplicates
      const finalData = Object.entries(groupedData).map(([date, values]) => ({
        date,
        prs_created: Math.round(values.created.reduce((a, b) => a + b, 0) / values.created.length * 10) / 10,
        prs_merged: Math.round(values.merged.reduce((a, b) => a + b, 0) / values.merged.length * 10) / 10,
        prs_closed: Math.round(values.closed.reduce((a, b) => a + b, 0) / values.closed.length * 10) / 10,
        count: values.created.length
      })).sort((a, b) => a.date.localeCompare(b.date));
      
      console.log('📈 FINAL CLEAN DATA FOR GRAFANA:');
      console.log('Date       | PRs Created | PRs Merged | PRs Closed | Duplicates');
      console.log('-----------|-------------|------------|------------|----------');
      
      finalData.forEach(row => {
        const duplicateNote = row.count > 1 ? ` (${row.count}x)` : '';
        console.log(`${row.date} | ${String(row.prs_created).padStart(11)} | ${String(row.prs_merged).padStart(10)} | ${String(row.prs_closed).padStart(10)} | ${row.count}${duplicateNote}`);
      });
      
      console.log(`\n📊 SUMMARY:`);
      console.log(`✅ Total unique dates: ${finalData.length}`);
      console.log(`✅ Date range: ${finalData[0].date} to ${finalData[finalData.length-1].date}`);
      console.log(`✅ Total data points: ${data.length}`);
      
      const duplicateDates = finalData.filter(row => row.count > 1);
      if (duplicateDates.length > 0) {
        console.log(`⚠️  Dates with duplicates: ${duplicateDates.length}`);
      } else {
        console.log(`✅ No duplicates - perfect data!`);
      }
      
      console.log('\n🎯 PERFECT GRAFANA QUERY (use this in your dashboard):');
      console.log('```sql');
      console.log('SELECT blob3 as time, double1 as prs_created, double2 as prs_merged, double3 as prs_closed');
      console.log('FROM github_stats WHERE blob2 = \'daily_pr_stats_clean\'');
      console.log('ORDER BY blob3');
      console.log('```');
      
      console.log('\n📈 For time series visualization:');
      console.log('- X-axis: blob3 (dates)');
      console.log('- Y-axis: double1 (PRs Created), double2 (PRs Merged), double3 (PRs Closed)');
      console.log('- This will show trends over your date range with realistic PR activity patterns!');
      
    } else {
      console.error('❌ Query failed:', responseData.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

getFinalCleanData();
