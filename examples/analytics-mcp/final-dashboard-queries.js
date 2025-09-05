#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const client = new Client({ name: 'final-dashboard', version: '1.0.0' });
const transport = new SSEClientTransport(new URL('https://analytics-mcp.raydp102.workers.dev/sse'));

await client.connect(transport);

console.log('📊 Final Dashboard Queries for Multi-Repository Setup\n');

// Query all GitHub data to understand the structure
console.log('🔍 All GitHub activity data:');
const allResult = await client.callTool({
  name: 'query_analytics',
  arguments: {
    sql: 'SELECT blob1, blob2, blob3, double1, double2, double3, double4, double5 FROM github_stats WHERE blob2 = "github_daily_stats" ORDER BY blob1, blob3'
  }
});

const allData = JSON.parse(allResult.content[0].text);
if (allData.success && allData.data.data.length > 0) {
  console.log('Repository                        | Date       | PRs C | PRs M | PRs X | Issues C | Issues X');
  console.log('----------------------------------|------------|-------|-------|-------|----------|----------');
  
  allData.data.data.forEach(row => {
    console.log(`${row.blob1.padEnd(33)} | ${row.blob3} | ${String(row.double1).padStart(5)} | ${String(row.double2).padStart(5)} | ${String(row.double3).padStart(5)} | ${String(row.double4).padStart(8)} | ${String(row.double5).padStart(8)}`);
  });
  console.log(`\n✅ Found ${allData.data.data.length} data points across repositories`);
  
  // Group by repository
  const repos = [...new Set(allData.data.data.map(row => row.blob1))];
  console.log(`\n🏢 Repositories found: ${repos.join(', ')}`);
  
  console.log('\n📊 CORRECT GRAFANA QUERIES:\n');
  
  // Generate queries for each repository
  repos.forEach(repo => {
    const orgName = repo.split('/')[0];
    console.log(`🎯 Panel: ${repo}`);
    console.log(`SELECT blob3 as time, double1, double2, double3, double4, double5`);
    console.log(`FROM github_stats WHERE blob1 = '${repo}' AND blob2 = 'github_daily_stats'`);
    console.log(`ORDER BY blob3\n`);
  });
  
  console.log('📈 Legend Configuration:');
  console.log('- double1: PRs Created (Green)');
  console.log('- double2: PRs Merged (Blue)');
  console.log('- double3: PRs Closed (Orange)');
  console.log('- double4: Issues Created (Purple)');
  console.log('- double5: Issues Closed (Red)');
  
  console.log('\n🎨 Dashboard Setup:');
  console.log('1. Create separate panels for each repository');
  console.log('2. Use the queries above for each panel');
  console.log('3. Configure field overrides for proper legends');
  console.log('4. Set time field to "blob3"');
  console.log('5. Choose different color schemes for each panel');
  
} else {
  console.log('❌ No GitHub data found. Run the multi-repo collector first.');
}

await client.close();
