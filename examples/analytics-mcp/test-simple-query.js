#!/usr/bin/env node

/**
 * Test simple queries to understand Analytics Engine SQL capabilities
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const MCP_BASE_URL = 'https://analytics-mcp.raydp102.workers.dev';

async function testQueries() {
  const client = new Client({ name: 'test-queries', version: '1.0.0' });
  
  try {
    console.log('🔌 Connecting to MCP server...');
    const transport = new SSEClientTransport(new URL(`${MCP_BASE_URL}/sse`));
    await client.connect(transport);
    
    // Test 1: Basic query without aliases
    console.log('\n📊 Test 1: Basic query without aliases...');
    try {
      const result1 = await client.callTool({
        name: 'query_analytics',
        arguments: {
          sql: `SELECT blob2, blob3, double1, double2, double3 FROM github_stats WHERE blob2 = 'daily_pr_stats_clean' LIMIT 5`
        }
      });
      
      const responseData1 = JSON.parse(result1.content[0].text);
      if (responseData1.success) {
        console.log('✅ Basic query works!');
        console.log('Sample data:', JSON.stringify(responseData1.data.data.slice(0, 2), null, 2));
      } else {
        console.log('❌ Basic query failed:', responseData1.error);
      }
    } catch (error) {
      console.log('❌ Basic query error:', error.message);
    }
    
    // Test 2: Count query
    console.log('\n📊 Test 2: Count query...');
    try {
      const result2 = await client.callTool({
        name: 'query_analytics',
        arguments: {
          sql: `SELECT blob2, COUNT() FROM github_stats WHERE blob2 = 'daily_pr_stats_clean' GROUP BY blob2`
        }
      });
      
      const responseData2 = JSON.parse(result2.content[0].text);
      if (responseData2.success) {
        console.log('✅ Count query works!');
        console.log('Count result:', responseData2.data.data);
      } else {
        console.log('❌ Count query failed:', responseData2.error);
      }
    } catch (error) {
      console.log('❌ Count query error:', error.message);
    }
    
    // Test 3: Order by query
    console.log('\n📊 Test 3: Order by blob3...');
    try {
      const result3 = await client.callTool({
        name: 'query_analytics',
        arguments: {
          sql: `SELECT blob3, double1, double2, double3 FROM github_stats WHERE blob2 = 'daily_pr_stats_clean' ORDER BY blob3 LIMIT 10`
        }
      });
      
      const responseData3 = JSON.parse(result3.content[0].text);
      if (responseData3.success) {
        console.log('✅ Order by query works!');
        console.log(`Found ${responseData3.data.data.length} rows`);
        responseData3.data.data.forEach((row, i) => {
          console.log(`${i+1}. ${row.blob3} | Created: ${row.double1} | Merged: ${row.double2} | Closed: ${row.double3}`);
        });
      } else {
        console.log('❌ Order by query failed:', responseData3.error);
      }
    } catch (error) {
      console.log('❌ Order by query error:', error.message);
    }
    
    // Test 4: Group by query for unique dates
    console.log('\n📊 Test 4: Group by for unique dates...');
    try {
      const result4 = await client.callTool({
        name: 'query_analytics',
        arguments: {
          sql: `SELECT blob3, AVG(double1), AVG(double2), AVG(double3) FROM github_stats WHERE blob2 = 'daily_pr_stats_clean' GROUP BY blob3 ORDER BY blob3`
        }
      });
      
      const responseData4 = JSON.parse(result4.content[0].text);
      if (responseData4.success) {
        console.log('✅ Group by query works!');
        console.log(`Found ${responseData4.data.data.length} unique dates`);
        responseData4.data.data.forEach((row, i) => {
          const avgCreated = Math.round(row['AVG(double1)'] * 10) / 10;
          const avgMerged = Math.round(row['AVG(double2)'] * 10) / 10;
          const avgClosed = Math.round(row['AVG(double3)'] * 10) / 10;
          console.log(`${i+1}. ${row.blob3} | Avg Created: ${avgCreated} | Avg Merged: ${avgMerged} | Avg Closed: ${avgClosed}`);
        });
        
        console.log('\n🎯 PERFECT GRAFANA QUERY:');
        console.log('SELECT blob3, AVG(double1), AVG(double2), AVG(double3)');
        console.log('FROM github_stats WHERE blob2 = \'daily_pr_stats_clean\'');
        console.log('GROUP BY blob3 ORDER BY blob3');
      } else {
        console.log('❌ Group by query failed:', responseData4.error);
      }
    } catch (error) {
      console.log('❌ Group by query error:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Connection error:', error.message);
  } finally {
    await client.close();
  }
}

testQueries();
