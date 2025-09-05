#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const client = new Client({ name: 'check-all-data', version: '1.0.0' });
const transport = new SSEClientTransport(new URL('https://analytics-mcp.raydp102.workers.dev/sse'));

await client.connect(transport);

console.log('🔍 Checking all available data in Analytics Engine...\n');

// Check what blob2 values exist
const allResult = await client.callTool({
  name: 'query_analytics',
  arguments: {
    sql: 'SELECT blob2, COUNT() FROM github_stats GROUP BY blob2'
  }
});

const allData = JSON.parse(allResult.content[0].text);
if (allData.success) {
  console.log('📊 Available data types (blob2 values):');
  allData.data.data.forEach(row => {
    console.log(`- ${row.blob2}: ${row['COUNT()']} rows`);
  });
  
  // Check each data type
  for (const row of allData.data.data) {
    const blob2Value = row.blob2;
    console.log(`\n🔍 Sample data for blob2 = '${blob2Value}':`);
    
    const sampleResult = await client.callTool({
      name: 'query_analytics',
      arguments: {
        sql: `SELECT blob3, double1, double2, double3, double4, double5 FROM github_stats WHERE blob2 = "${blob2Value}" ORDER BY blob3 LIMIT 5`
      }
    });
    
    const sampleData = JSON.parse(sampleResult.content[0].text);
    if (sampleData.success && sampleData.data.data.length > 0) {
      sampleData.data.data.forEach(dataRow => {
        console.log(`  ${dataRow.blob3}: ${dataRow.double1}/${dataRow.double2}/${dataRow.double3}/${dataRow.double4}/${dataRow.double5}`);
      });
    } else {
      console.log('  No data found');
    }
  }
} else {
  console.log('❌ Failed to query data types');
}

await client.close();
