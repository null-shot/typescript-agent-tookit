#!/usr/bin/env node

/**
 * Test working queries without aliases and show actual data
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const MCP_BASE_URL = 'https://analytics-mcp.raydp102.workers.dev';

async function testWorkingQuery(client, description, sql) {
  console.log(`\n🔍 ${description}`);
  console.log(`SQL: ${sql}`);
  
  try {
    const result = await client.callTool({
      name: 'query_analytics',
      arguments: { sql }
    });

    const data = JSON.parse(result.content[0].text);
    if (data.success) {
      const rows = data.data.data;
      console.log(`✅ SUCCESS: ${rows.length} rows found`);
      
      if (rows.length > 0) {
        console.log('📊 Data preview:');
        rows.slice(0, 5).forEach((row, i) => {
          const date = row.blob3 || 'no-date';
          const pr_created = row.double1 || 0;
          const pr_merged = row.double2 || 0;
          const issues_created = row.double4 || 0;
          console.log(`  ${i+1}. ${date}: PRs(${pr_created}/${pr_merged}) Issues(${issues_created})`);
        });
        
        if (rows.length > 5) {
          console.log(`  ... and ${rows.length - 5} more rows`);
        }
      }
      return rows;
    } else {
      console.log(`❌ FAILED: ${data.error}`);
      return [];
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return [];
  }
}

async function main() {
  console.log('🧪 WORKING QUERIES TEST EVIDENCE\n');
  
  const client = new Client({
    name: "working-queries-test",
    version: "1.0.0",
  });

  try {
    console.log('🔌 Connecting...');
    const transport = new SSEClientTransport(new URL(`${MCP_BASE_URL}/sse`));
    await client.connect(transport);
    console.log('✅ Connected');

    // Test working queries for each dataset
    const datasets = [
      'daily_pr_stats_clean',
      'claude_complete_stats', 
      'claude_rich_data',
      'claude_code_rich_stats'
    ];
    
    for (const dataset of datasets) {
      const rows = await testWorkingQuery(client,
        `Testing ${dataset} data`,
        `SELECT blob3, double1, double2, double3, double4, double5 FROM github_stats WHERE blob2 = "${dataset}" ORDER BY blob3`
      );
      
      if (rows.length > 0) {
        const dates = rows.map(r => r.blob3).filter(d => d);
        const uniqueDates = [...new Set(dates)];
        console.log(`📅 Date range: ${dates[0]} to ${dates[dates.length-1]} (${uniqueDates.length} unique dates)`);
      }
    }

    console.log('\n🎯 RECOMMENDED GRAFANA QUERIES (NO ALIASES):');
    
    console.log('\n📊 Panel 1: NullShot Repository');
    console.log('SELECT blob3, double1, double2, double3');
    console.log('FROM github_stats');
    console.log('WHERE blob2 = "daily_pr_stats_clean"');
    console.log('ORDER BY blob3');
    
    console.log('\n📊 Panel 2: Claude Code Repository (use whichever has most data)');
    console.log('SELECT blob3, double1, double2, double3, double4, double5');
    console.log('FROM github_stats');
    console.log('WHERE blob2 = "claude_complete_stats"');
    console.log('ORDER BY blob3');
    
    console.log('\n🎨 GRAFANA FIELD OVERRIDES (since aliases don\'t work):');
    console.log('For both panels, add these field overrides:');
    console.log('- blob3 → Display name: "Date" (Time field)');
    console.log('- double1 → Display name: "PRs Created"');
    console.log('- double2 → Display name: "PRs Merged"');
    console.log('- double3 → Display name: "PRs Closed"');
    console.log('- double4 → Display name: "Issues Created" (Claude panel only)');
    console.log('- double5 → Display name: "Issues Closed" (Claude panel only)');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

main();
