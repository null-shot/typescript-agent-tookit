#!/usr/bin/env node

/**
 * Final test with working syntax - show actual data evidence
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const MCP_BASE_URL = 'https://analytics-mcp.raydp102.workers.dev';

async function queryAndShow(client, title, sql) {
  console.log(`\n📊 ${title}`);
  console.log(`Query: ${sql}`);
  
  try {
    const result = await client.callTool({
      name: 'query_analytics',
      arguments: { sql }
    });

    const data = JSON.parse(result.content[0].text);
    if (data.success) {
      const rows = data.data.data;
      console.log(`✅ Found ${rows.length} rows`);
      
      if (rows.length > 0) {
        console.log('Data preview:');
        console.log('Date       | PRs C | PRs M | PRs X | Issues C | Issues X');
        console.log('-----------|-------|-------|-------|----------|----------');
        
        rows.slice(0, 10).forEach(row => {
          const date = row.blob3 || 'unknown';
          const d1 = row.double1 || 0;
          const d2 = row.double2 || 0; 
          const d3 = row.double3 || 0;
          const d4 = row.double4 || 0;
          const d5 = row.double5 || 0;
          console.log(`${date} | ${String(d1).padStart(5)} | ${String(d2).padStart(5)} | ${String(d3).padStart(5)} | ${String(d4).padStart(8)} | ${String(d5).padStart(8)}`);
        });
        
        if (rows.length > 10) {
          console.log(`... and ${rows.length - 10} more rows`);
        }
        
        // Check date coverage
        const dates = rows.map(r => r.blob3).filter(d => d);
        const uniqueDates = [...new Set(dates)];
        console.log(`📅 Coverage: ${uniqueDates.length} unique dates from ${dates[0]} to ${dates[dates.length-1]}`);
      }
      return rows;
    } else {
      console.log(`❌ Failed: ${data.error}`);
      return [];
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return [];
  }
}

async function main() {
  console.log('🧪 FINAL WORKING TEST - ACTUAL DATA EVIDENCE\n');
  
  const client = new Client({
    name: "final-test",
    version: "1.0.0",
  });

  try {
    console.log('🔌 Connecting...');
    const transport = new SSEClientTransport(new URL(`${MCP_BASE_URL}/sse`));
    await client.connect(transport);
    console.log('✅ Connected');

    // Test the working syntax with single quotes
    const cleanData = await queryAndShow(client,
      'NullShot Data (daily_pr_stats_clean)',
      "SELECT blob3, double1, double2, double3 FROM github_stats WHERE blob2 = 'daily_pr_stats_clean' ORDER BY blob3"
    );
    
    const claudeData = await queryAndShow(client,
      'Claude Code Data (claude_complete_stats)',
      "SELECT blob3, double1, double2, double3, double4, double5 FROM github_stats WHERE blob2 = 'claude_complete_stats' ORDER BY blob3"
    );
    
    // If claude_complete_stats doesn't have enough data, try other datasets
    if (claudeData.length < 20) {
      console.log('\n🔄 Trying alternative Claude datasets...');
      
      await queryAndShow(client,
        'Claude Code Data (claude_rich_data)',
        "SELECT blob3, double1, double2, double3, double4, double5 FROM github_stats WHERE blob2 = 'claude_rich_data' ORDER BY blob3"
      );
      
      await queryAndShow(client,
        'Claude Code Data (claude_code_rich_stats)', 
        "SELECT blob3, double1, double2, double3, double4, double5 FROM github_stats WHERE blob2 = 'claude_code_rich_stats' ORDER BY blob3"
      );
    }

    console.log('\n🎯 FINAL WORKING GRAFANA QUERIES:');
    console.log('\n📊 Panel 1: NullShot Repository');
    console.log("SELECT blob3, double1, double2, double3");
    console.log("FROM github_stats");
    console.log("WHERE blob2 = 'daily_pr_stats_clean'");
    console.log("ORDER BY blob3");
    
    console.log('\n📊 Panel 2: Claude Code Repository');
    console.log("SELECT blob3, double1, double2, double3, double4, double5");
    console.log("FROM github_stats");  
    console.log("WHERE blob2 = 'claude_complete_stats'");
    console.log("ORDER BY blob3");
    
    console.log('\n⚠️  KEY: Use SINGLE QUOTES for string literals, not double quotes!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

main();
