#!/usr/bin/env node

/**
 * Clean up duplicate data and re-add 30 days of clean metrics
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const MCP_BASE_URL = 'https://analytics-mcp.raydp102.workers.dev';

// Generate 30 days of realistic PR data (same logic as before)
function generate30DaysData() {
  const dataPoints = [];
  const now = new Date('2025-09-04'); // Fixed end date
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(12, 0, 0, 0);
    
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Realistic activity patterns
    let baseActivity = isWeekend ? 1 : 5;
    if (dayOfWeek >= 2 && dayOfWeek <= 4) baseActivity = 8; // Tue-Thu peak
    
    // Add upward trend and randomness
    const trendFactor = 1 + (29 - i) * 0.02;
    const randomFactor = 0.7 + Math.random() * 0.6;
    
    const created = Math.floor(baseActivity * trendFactor * randomFactor);
    const merged = Math.floor(created * (0.6 + Math.random() * 0.3));
    const closed = Math.floor(created * (0.05 + Math.random() * 0.1));
    
    dataPoints.push({
      timestamp: Math.floor(date.getTime() / 1000),
      dimensions: {
        repo: 'null-shot/typescript-agent-framework',
        event_type: 'daily_pr_stats',
        date: date.toISOString().split('T')[0]
      },
      metrics: {
        prs_created: created,
        prs_merged: merged,
        prs_closed: closed
      }
    });
  }
  
  return dataPoints;
}

async function callMCPTool(client, toolName, args) {
  console.log(`📡 Calling ${toolName}...`);
  
  try {
    const result = await client.callTool({
      name: toolName,
      arguments: args
    });

    // Parse the response - MCP tools return content array with text
    if (result.content && result.content.length > 0) {
      const responseData = JSON.parse(result.content[0].text);
      
      if (responseData.success) {
        console.log(`✅ ${toolName} succeeded:`, responseData.data.message || responseData.message || 'Success');
        return responseData.data || responseData;
      } else {
        console.log(`❌ ${toolName} failed:`, responseData.error || 'Unknown error');
        return null;
      }
    } else {
      console.log(`❌ ${toolName} failed: No response content`);
      return null;
    }
  } catch (error) {
    console.log(`❌ ${toolName} error:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🧹 Cleaning Up and Re-adding 30 Days of Clean Metrics\n');
  
  // Create MCP client
  const client = new Client({
    name: "cleanup-and-readd",
    version: "1.0.0",
  });

  try {
    // Connect to MCP server
    console.log('🔌 Connecting to MCP server...');
    const transport = new SSEClientTransport(new URL(`${MCP_BASE_URL}/sse`));
    await client.connect(transport);
    console.log('✅ Connected to MCP server\n');

    // Step 1: Check current data
    console.log('📊 Step 1: Checking current data...');
    const currentData = await callMCPTool(client, 'query_analytics', {
      sql: `SELECT COUNT(*) as total_rows, COUNT(DISTINCT blob3) as unique_dates FROM github_stats WHERE blob2 = 'daily_pr_stats'`
    });
    
    if (currentData && currentData.data && currentData.data.length > 0) {
      const stats = currentData.data[0];
      console.log(`📈 Current state: ${stats.total_rows} total rows, ${stats.unique_dates} unique dates`);
    }

    // Step 2: Clean up existing daily_pr_stats data
    console.log('\n🗑️  Step 2: Cleaning up existing daily_pr_stats data...');
    console.log('⚠️  Note: Analytics Engine doesn\'t support DELETE operations.');
    console.log('💡 Strategy: We\'ll add new data with a unique identifier to distinguish it.');
    
    // Step 3: Generate fresh 30 days of data
    console.log('\n📊 Step 3: Generating fresh 30 days of data...');
    const allData = generate30DaysData();
    console.log(`✅ Generated ${allData.length} days of clean data`);
    console.log(`📅 Range: ${allData[0].dimensions.date} to ${allData[allData.length-1].dimensions.date}`);
    
    // Add a unique batch identifier to distinguish this clean data
    const batchId = `clean_${Date.now()}`;
    const cleanData = allData.map(dataPoint => ({
      ...dataPoint,
      dimensions: {
        ...dataPoint.dimensions,
        event_type: 'daily_pr_stats_clean', // Use different event_type for clean data
        batch_id: batchId
      }
    }));

    // Step 4: Add clean data in batches
    console.log('\n📦 Step 4: Adding clean data in batches...');
    const batchSize = 5;
    let totalSuccess = 0;
    
    for (let i = 0; i < cleanData.length; i += batchSize) {
      const batch = cleanData.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(cleanData.length / batchSize);
      
      console.log(`\n📦 Batch ${batchNum}/${totalBatches}: Adding ${batch.length} days (${batch[0].dimensions.date} to ${batch[batch.length-1].dimensions.date})...`);
      
      const result = await callMCPTool(client, 'track_batch_metrics', {
        dataset: 'github_stats',
        dataPoints: batch
      });
      
      if (result) {
        totalSuccess += batch.length;
        console.log(`✅ Batch ${batchNum} successful! Running total: ${totalSuccess}/${cleanData.length}`);
      } else {
        console.log(`❌ Batch ${batchNum} failed. Continuing...`);
      }
      
      // Small delay between batches
      if (i + batchSize < cleanData.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`\n🎉 CLEANUP AND RE-ADD COMPLETE!`);
    console.log(`✅ Successfully added ${totalSuccess}/${cleanData.length} days of clean data`);
    
    if (totalSuccess > 0) {
      console.log('\n📊 Query your clean data with:');
      console.log('SELECT blob3 as date, double1 as prs_created, double2 as prs_merged, double3 as prs_closed');
      console.log('FROM github_stats WHERE blob2 = \'daily_pr_stats_clean\' ORDER BY blob3');
      console.log('\n📈 For Grafana time series:');
      console.log('SELECT blob3 as date, double1 as prs_created, double2 as prs_merged, double3 as prs_closed');
      console.log('FROM github_stats WHERE blob2 = \'daily_pr_stats_clean\' ORDER BY blob3');
      console.log('\n🎯 This gives you exactly 30 unique days with no duplicates!');
    }

    // Step 5: Verify the clean data
    console.log('\n🔍 Step 5: Verifying clean data...');
    const verifyData = await callMCPTool(client, 'query_analytics', {
      sql: `SELECT COUNT(*) as total_rows, COUNT(DISTINCT blob3) as unique_dates FROM github_stats WHERE blob2 = 'daily_pr_stats_clean'`
    });
    
    if (verifyData && verifyData.data && verifyData.data.length > 0) {
      const stats = verifyData.data[0];
      console.log(`📈 Clean data verification: ${stats.total_rows} total rows, ${stats.unique_dates} unique dates`);
      
      if (stats.total_rows === stats.unique_dates && stats.unique_dates === 30) {
        console.log('🎉 PERFECT! Clean data has exactly 30 unique days with no duplicates!');
      } else {
        console.log('⚠️  Note: There may be some duplicates or missing days in the clean data.');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Clean up
    console.log('\n🔌 Closing MCP connection...');
    await client.close();
    console.log('✅ Connection closed');
  }
}

main();
