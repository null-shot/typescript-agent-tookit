#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const client = new Client({ name: 'verify-github-data', version: '1.0.0' });
const transport = new SSEClientTransport(new URL('https://analytics-mcp.raydp102.workers.dev/sse'));

await client.connect(transport);

const result = await client.callTool({
  name: 'query_analytics',
  arguments: {
    sql: 'SELECT blob3, double1, double2, double3, double4, double5 FROM github_stats WHERE blob2 = "github_daily_stats" ORDER BY blob3'
  }
});

const data = JSON.parse(result.content[0].text);
if (data.success) {
  console.log('📊 Real GitHub Data for anthropics/claude-code:');
  console.log('Date       | PRs Created | PRs Merged | PRs Closed | Issues Created | Issues Closed');
  console.log('-----------|-------------|------------|------------|----------------|---------------');
  
  data.data.data.forEach(row => {
    console.log(`${row.blob3} | ${String(row.double1).padStart(11)} | ${String(row.double2).padStart(10)} | ${String(row.double3).padStart(10)} | ${String(row.double4).padStart(14)} | ${String(row.double5).padStart(13)}`);
  });
  
  console.log(`\n✅ Found ${data.data.data.length} days of real GitHub activity data!`);
} else {
  console.log('❌ Query failed:', data.error);
}

await client.close();
