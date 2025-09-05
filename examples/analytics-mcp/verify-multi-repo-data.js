#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const client = new Client({ name: 'verify-multi-repo', version: '1.0.0' });
const transport = new SSEClientTransport(new URL('https://analytics-mcp.raydp102.workers.dev/sse'));

await client.connect(transport);

console.log('📊 Verifying Multi-Repository Data\n');

// Check NullShot data
console.log('🎯 Panel 1: NullShot Repository Data');
const nullshotResult = await client.callTool({
  name: 'query_analytics',
  arguments: {
    sql: 'SELECT blob5, double1, double2, double3, double4, double5 FROM github_stats WHERE blob1 = "null-shot" AND blob4 = "github_activity" ORDER BY blob5'
  }
});

const nullshotData = JSON.parse(nullshotResult.content[0].text);
if (nullshotData.success && nullshotData.data.data.length > 0) {
  console.log('Date       | PRs Created | PRs Merged | PRs Closed | Issues Created | Issues Closed');
  console.log('-----------|-------------|------------|------------|----------------|---------------');
  
  nullshotData.data.data.forEach(row => {
    console.log(`${row.blob5} | ${String(row.double1).padStart(11)} | ${String(row.double2).padStart(10)} | ${String(row.double3).padStart(10)} | ${String(row.double4).padStart(14)} | ${String(row.double5).padStart(13)}`);
  });
  console.log(`\n✅ Found ${nullshotData.data.data.length} days of null-shot data`);
} else {
  console.log('❌ No null-shot data found');
}

// Check Anthropics data
console.log('\n🎯 Panel 2: Anthropics Repository Data');
const anthropicsResult = await client.callTool({
  name: 'query_analytics',
  arguments: {
    sql: 'SELECT blob5, double1, double2, double3, double4, double5 FROM github_stats WHERE blob1 = "anthropics" AND blob4 = "github_activity" ORDER BY blob5'
  }
});

const anthropicsData = JSON.parse(anthropicsResult.content[0].text);
if (anthropicsData.success && anthropicsData.data.data.length > 0) {
  console.log('Date       | PRs Created | PRs Merged | PRs Closed | Issues Created | Issues Closed');
  console.log('-----------|-------------|------------|------------|----------------|---------------');
  
  anthropicsData.data.data.forEach(row => {
    console.log(`${row.blob5} | ${String(row.double1).padStart(11)} | ${String(row.double2).padStart(10)} | ${String(row.double3).padStart(10)} | ${String(row.double4).padStart(14)} | ${String(row.double5).padStart(13)}`);
  });
  console.log(`\n✅ Found ${anthropicsData.data.data.length} days of anthropics data`);
} else {
  console.log('❌ No anthropics data found');
}

await client.close();
