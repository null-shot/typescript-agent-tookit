#!/usr/bin/env node

/**
 * Test evidence: Show exactly what data exists in Analytics Engine
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const MCP_BASE_URL = 'https://analytics-mcp.raydp102.workers.dev';

async function testQuery(client, description, sql) {
  console.log(`\n🔍 ${description}`);
  console.log(`Query: ${sql}`);
  
  try {
    const result = await client.callTool({
      name: 'query_analytics',
      arguments: { sql }
    });

    const data = JSON.parse(result.content[0].text);
    if (data.success) {
      console.log(`✅ SUCCESS: Found ${data.data.data.length} rows`);
      if (data.data.data.length > 0) {
        console.log('Sample data:');
        data.data.data.slice(0, 3).forEach((row, i) => {
          console.log(`  ${i+1}. ${JSON.stringify(row)}`);
        });
      }
      return data.data.data;
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
  console.log('🧪 TEST EVIDENCE: What Data Actually Exists\n');
  
  const client = new Client({
    name: "test-evidence",
    version: "1.0.0",
  });

  try {
    console.log('🔌 Connecting to Analytics MCP server...');
    const transport = new SSEClientTransport(new URL(`${MCP_BASE_URL}/sse`));
    await client.connect(transport);
    console.log('✅ Connected');

    // Test 1: Check all blob2 values without aliases
    const test1 = await testQuery(client, 
      'Test 1: All blob2 values (event types)',
      'SELECT DISTINCT blob2 FROM github_stats'
    );

    // Test 2: Count by blob2 without using COUNT() function
    const test2 = await testQuery(client,
      'Test 2: Count rows by event type', 
      'SELECT blob2 FROM github_stats'
    );
    
    // Group the results manually
    const counts = {};
    test2.forEach(row => {
      counts[row.blob2] = (counts[row.blob2] || 0) + 1;
    });
    
    console.log('\n📊 Manual count by blob2:');
    Object.entries(counts).forEach(([eventType, count]) => {
      console.log(`  ${eventType}: ${count} rows`);
    });

    // Test 3: Check each data type
    for (const eventType of Object.keys(counts)) {
      if (eventType && eventType.includes('claude')) {
        await testQuery(client,
          `Test 3: Sample ${eventType} data`,
          `SELECT blob3, double1, double2, double3, double4, double5 FROM github_stats WHERE blob2 = "${eventType}" ORDER BY blob3 LIMIT 5`
        );
      }
    }

    // Test 4: Try aliases with different syntax
    console.log('\n🧪 Testing alias syntax options:');
    
    // Test without AS keyword
    await testQuery(client,
      'Test 4a: Aliases without AS keyword',
      'SELECT blob3 date, double1 prs_created FROM github_stats WHERE blob2 = "daily_pr_stats_clean" LIMIT 1'
    );
    
    // Test with AS keyword  
    await testQuery(client,
      'Test 4b: Aliases with AS keyword',
      'SELECT blob3 AS date, double1 AS prs_created FROM github_stats WHERE blob2 = "daily_pr_stats_clean" LIMIT 1'
    );
    
    // Test with backticks
    await testQuery(client,
      'Test 4c: Aliases with backticks',
      'SELECT blob3 `date`, double1 `prs_created` FROM github_stats WHERE blob2 = "daily_pr_stats_clean" LIMIT 1'
    );
    
    // Test with square brackets
    await testQuery(client,
      'Test 4d: Aliases with square brackets',
      'SELECT blob3 [date], double1 [prs_created] FROM github_stats WHERE blob2 = "daily_pr_stats_clean" LIMIT 1'
    );

    console.log('\n📝 EVIDENCE SUMMARY:');
    console.log('1. Data exists but may have different blob2 values than expected');
    console.log('2. Analytics Engine SQL parser has limitations with aliases');
    console.log('3. Need to use exact blob2 values found in the database');
    console.log('4. May need Grafana field overrides instead of SQL aliases');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

main();
