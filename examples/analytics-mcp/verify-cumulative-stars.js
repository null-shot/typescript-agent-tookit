#!/usr/bin/env node

/**
 * Verify the cumulative star data was stored correctly
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const MCP_BASE_URL = 'https://analytics-mcp.raydp102.workers.dev';

async function main() {
  console.log('🔍 VERIFYING CUMULATIVE STAR DATA\n');
  
  const client = new Client({
    name: "verify-cumulative",
    version: "1.0.0",
  });

  try {
    console.log('🔌 Connecting...');
    const transport = new SSEClientTransport(new URL(`${MCP_BASE_URL}/sse`));
    await client.connect(transport);
    console.log('✅ Connected\n');

    // Check if cumulative star data exists
    console.log('📊 Checking for github_star_cumulative data...');
    const result = await client.callTool({
      name: 'query_analytics',
      arguments: {
        sql: "SELECT blob3, double1, blob5 FROM github_stats WHERE blob2 = 'github_star_cumulative' ORDER BY blob5, blob3"
      }
    });

    const data = JSON.parse(result.content[0].text);
    if (data.success && data.data.data.length > 0) {
      console.log(`✅ Found ${data.data.data.length} rows of cumulative star data!`);
      
      // Group by organization
      const nullshotData = data.data.data.filter(row => row.blob5 === 'null-shot');
      const anthropicsData = data.data.data.filter(row => row.blob5 === 'anthropics');
      
      console.log(`\n📊 NullShot data: ${nullshotData.length} rows`);
      if (nullshotData.length > 0) {
        console.log('First 5 days:');
        nullshotData.slice(0, 5).forEach(row => {
          console.log(`  ${row.blob3}: ${row.double1} stars`);
        });
        console.log('Last 5 days:');
        nullshotData.slice(-5).forEach(row => {
          console.log(`  ${row.blob3}: ${row.double1} stars`);
        });
      }
      
      console.log(`\n📊 Anthropics data: ${anthropicsData.length} rows`);
      if (anthropicsData.length > 0) {
        console.log('First 5 days:');
        anthropicsData.slice(0, 5).forEach(row => {
          console.log(`  ${row.blob3}: ${row.double1} stars`);
        });
        console.log('Last 5 days:');
        anthropicsData.slice(-5).forEach(row => {
          console.log(`  ${row.blob3}: ${row.double1} stars`);
        });
      }
      
      console.log('\n🎯 EXACT WORKING QUERIES FOR YOUR DASHBOARD:');
      
      if (nullshotData.length > 0) {
        console.log('\n📊 NullShot Star Panel Query:');
        console.log('SELECT');
        console.log('    blob3,');
        console.log('    double1 as StarCount,');
        console.log('    double2 as DailyGrowth,');
        console.log('    double3 as ForkCount,');
        console.log('    double4 as Watchers');
        console.log('FROM github_stats');
        console.log("WHERE blob2 = 'github_star_cumulative' AND blob5 = 'null-shot'");
        console.log('ORDER BY blob3');
      }
      
      if (anthropicsData.length > 0) {
        console.log('\n📊 Anthropics Star Panel Query:');
        console.log('SELECT');
        console.log('    blob3,');
        console.log('    double1 as StarCount,');
        console.log('    double2 as DailyGrowth,');
        console.log('    double3 as ForkCount,');
        console.log('    double4 as Watchers');
        console.log('FROM github_stats');
        console.log("WHERE blob2 = 'github_star_cumulative' AND blob5 = 'anthropics'");
        console.log('ORDER BY blob3');
      }
      
    } else {
      console.log('❌ No cumulative star data found!');
      console.log('The fix-star-trends.js script may not have worked properly.');
      
      // Check what star data actually exists
      console.log('\n🔍 Checking existing star data...');
      const existingResult = await client.callTool({
        name: 'query_analytics',
        arguments: {
          sql: "SELECT blob2, blob3, blob5, double1 FROM github_stats WHERE blob2 = 'github_star_trends' ORDER BY blob5, blob3 LIMIT 10"
        }
      });
      
      const existingData = JSON.parse(existingResult.content[0].text);
      if (existingData.success) {
        console.log(`Found ${existingData.data.data.length} rows of github_star_trends data:`);
        existingData.data.data.forEach(row => {
          console.log(`  ${row.blob5}/${row.blob3}: ${row.double1} stars`);
        });
        
        console.log('\n💡 Use the existing data with this query:');
        console.log('SELECT');
        console.log('    blob3,');
        console.log('    double1 as StarCount');
        console.log('FROM github_stats');
        console.log("WHERE blob2 = 'github_star_trends' AND blob5 = 'anthropics'");
        console.log('ORDER BY blob3');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

main();
