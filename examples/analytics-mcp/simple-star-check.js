#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const client = new Client({ name: 'simple-check', version: '1.0.0' });
const transport = new SSEClientTransport(new URL('https://analytics-mcp.raydp102.workers.dev/sse'));

await client.connect(transport);

console.log('🔍 Simple Star Data Check\n');

// Check latest data
const result = await client.callTool({
  name: 'query_analytics',
  arguments: {
    sql: 'SELECT blob2, blob3, blob5, double1 FROM github_stats ORDER BY timestamp DESC LIMIT 30'
  }
});

const data = JSON.parse(result.content[0].text);
if (data.success) {
  console.log('📊 Latest 30 data points:');
  data.data.data.forEach((row, i) => {
    console.log(`${i+1}. ${row.blob2} | ${row.blob3} | ${row.blob5} | ${row.double1}`);
  });
  
  const starData = data.data.data.filter(row => row.blob2 && row.blob2.includes('star'));
  console.log(`\n⭐ Found ${starData.length} star-related entries in latest data`);
  
  if (starData.length > 0) {
    console.log('\nStar data entries:');
    starData.forEach(row => {
      console.log(`  ${row.blob3}: ${row.blob5} - ${row.double1} stars`);
    });
  }
  
  // Try to query the individual star data
  console.log('\n🔍 Trying to query anthropic_stars_individual...');
  const starResult = await client.callTool({
    name: 'query_analytics',
    arguments: {
      sql: "SELECT blob3, double1 FROM github_stats WHERE blob2 = 'anthropic_stars_individual' ORDER BY blob3 LIMIT 10"
    }
  });
  
  const starData2 = JSON.parse(starResult.content[0].text);
  if (starData2.success) {
    console.log(`✅ Individual star query works! Found ${starData2.data.data.length} rows`);
    starData2.data.data.forEach(row => {
      console.log(`  ${row.blob3}: ${row.double1} stars`);
    });
  } else {
    console.log(`❌ Individual star query failed: ${starData2.error}`);
  }
  
} else {
  console.log('❌ Latest data query failed');
}

await client.close();
