#!/usr/bin/env node

/**
 * Find the working SQL syntax for Analytics Engine
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const MCP_BASE_URL = 'https://analytics-mcp.raydp102.workers.dev';

async function testSyntax(client, description, sql) {
  console.log(`\n🔍 ${description}`);
  console.log(`SQL: ${sql}`);
  
  try {
    const result = await client.callTool({
      name: 'query_analytics',
      arguments: { sql }
    });

    const data = JSON.parse(result.content[0].text);
    if (data.success) {
      console.log(`✅ SUCCESS: ${data.data.data.length} rows`);
      return data.data.data;
    } else {
      console.log(`❌ FAILED: ${data.error.substring(0, 100)}...`);
      return [];
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message.substring(0, 100)}...`);
    return [];
  }
}

async function main() {
  console.log('🧪 FINDING WORKING ANALYTICS ENGINE SQL SYNTAX\n');
  
  const client = new Client({
    name: "syntax-test",
    version: "1.0.0",
  });

  try {
    console.log('🔌 Connecting...');
    const transport = new SSEClientTransport(new URL(`${MCP_BASE_URL}/sse`));
    await client.connect(transport);
    console.log('✅ Connected');

    // Test basic queries that should work
    await testSyntax(client,
      'Test 1: Basic SELECT without WHERE',
      'SELECT blob2, blob3 FROM github_stats LIMIT 5'
    );
    
    await testSyntax(client,
      'Test 2: Simple WHERE with single quotes',
      "SELECT blob2, blob3 FROM github_stats WHERE blob2 = 'daily_pr_stats_clean' LIMIT 5"
    );
    
    await testSyntax(client,
      'Test 3: Simple WHERE with double quotes',
      'SELECT blob2, blob3 FROM github_stats WHERE blob2 = "daily_pr_stats_clean" LIMIT 5'
    );
    
    await testSyntax(client,
      'Test 4: No quotes in WHERE clause',
      'SELECT blob2, blob3 FROM github_stats WHERE blob2 = daily_pr_stats_clean LIMIT 5'
    );
    
    await testSyntax(client,
      'Test 5: Simple equals without spaces',
      "SELECT blob2, blob3 FROM github_stats WHERE blob2='daily_pr_stats_clean' LIMIT 5"
    );
    
    // Test working query from your original dashboard
    await testSyntax(client,
      'Test 6: Query that works in your dashboard',
      'SELECT blob3, double1, double2, double3 FROM github_stats ORDER BY blob3 LIMIT 10'
    );

    console.log('\n🎯 SOLUTION: Analytics Engine SQL Quirks');
    console.log('The issue is likely with string literal parsing in WHERE clauses.');
    console.log('Let me create a query that definitely works...');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

main();
