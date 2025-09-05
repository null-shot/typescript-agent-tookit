#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const client = new Client({ name: 'verify-individual', version: '1.0.0' });
const transport = new SSEClientTransport(new URL('https://analytics-mcp.raydp102.workers.dev/sse'));

await client.connect(transport);

console.log('🔍 VERIFYING INDIVIDUAL STAR DATA\n');

const result = await client.callTool({
  name: 'query_analytics',
  arguments: {
    sql: "SELECT blob3, double1, double2, double3, double4 FROM github_stats WHERE blob2 = 'anthropic_stars_individual' ORDER BY blob3"
  }
});

const data = JSON.parse(result.content[0].text);
if (data.success) {
  console.log(`✅ Found ${data.data.data.length} rows of individual star data!`);
  
  if (data.data.data.length > 0) {
    console.log('\nFirst 10 days:');
    console.log('Date       | Star Count | Daily Growth | Forks | Watchers');
    console.log('-----------|------------|--------------|-------|----------');
    
    data.data.data.slice(0, 10).forEach(row => {
      console.log(`${row.blob3} | ${String(row.double1).padStart(10)} | ${String(row.double2).padStart(12)} | ${String(row.double3).padStart(5)} | ${String(row.double4).padStart(8)}`);
    });
    
    if (data.data.data.length > 10) {
      console.log('\nLast 5 days:');
      data.data.data.slice(-5).forEach(row => {
        console.log(`${row.blob3} | ${String(row.double1).padStart(10)} | ${String(row.double2).padStart(12)} | ${String(row.double3).padStart(5)} | ${String(row.double4).padStart(8)}`);
      });
    }
    
    // Verify always increasing
    let isAlwaysIncreasing = true;
    for (let i = 1; i < data.data.data.length; i++) {
      if (data.data.data[i].double1 < data.data.data[i-1].double1) {
        isAlwaysIncreasing = false;
        console.log(`❌ Decrease found: ${data.data.data[i-1].blob3} (${data.data.data[i-1].double1}) → ${data.data.data[i].blob3} (${data.data.data[i].double1})`);
      }
    }
    
    if (isAlwaysIncreasing) {
      console.log('\n✅ PERFECT! Star count always increases (cumulative behavior)');
    } else {
      console.log('\n❌ WARNING: Found decreases in star count');
    }
    
    console.log(`\n📊 Coverage: ${data.data.data.length} days from ${data.data.data[0].blob3} to ${data.data.data[data.data.data.length-1].blob3}`);
    
    if (data.data.data.length === 30) {
      console.log('\n🎉 PERFECT! Complete 30-day dataset!');
    } else {
      console.log(`\n⚠️  Expected 30 days, got ${data.data.data.length} days`);
    }
    
    console.log('\n🎯 UPDATE YOUR GRAFANA QUERY TO:');
    console.log('SELECT');
    console.log('    blob3,');
    console.log('    double1 as StarCount,');
    console.log('    double2 as DailyGrowth,');
    console.log('    double3 as ForkCount,');
    console.log('    double4 as Watchers');
    console.log('FROM github_stats');
    console.log("WHERE blob2 = 'anthropic_stars_individual'");
    console.log('ORDER BY blob3');
    
  } else {
    console.log('❌ No individual star data found');
    console.log('Individual calls may not have worked properly');
  }
} else {
  console.log('❌ Query failed:', data.error);
}

await client.close();
