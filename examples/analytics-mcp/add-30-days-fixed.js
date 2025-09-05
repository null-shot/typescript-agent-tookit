#!/usr/bin/env node

/**
 * Add 30 days of timestamped PR data using proper MCP client
 * This script uses the MCP SDK to properly establish a session and call tools
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const MCP_BASE_URL = 'https://analytics-mcp.raydp102.workers.dev';

// Generate 30 days of realistic PR data
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
        console.log(`✅ ${toolName} succeeded:`, responseData.data.message || 'Success');
        return responseData.data;
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
  console.log('🚀 Adding 30 Days of PR Data via MCP Client\n');
  
  // Create MCP client
  const client = new Client({
    name: "analytics-data-loader",
    version: "1.0.0",
  });

  try {
    // Create transport and connect
    console.log('🔌 Connecting to MCP server...');
    const transport = new SSEClientTransport(new URL(`${MCP_BASE_URL}/sse`));
    await client.connect(transport);
    console.log('✅ Connected to MCP server');

    // Verify connection by listing tools
    const tools = await client.listTools();
    console.log(`📋 Available tools: ${tools.tools.map(t => t.name).join(', ')}`);

    const allData = generate30DaysData();
    console.log(`📊 Generated ${allData.length} days of data`);
    console.log('📅 Range:', allData[0].dimensions.date, 'to', allData[allData.length-1].dimensions.date);
    
    // Add data in batches of 5 to avoid timeouts
    const batchSize = 5;
    let totalSuccess = 0;
    
    for (let i = 0; i < allData.length; i += batchSize) {
      const batch = allData.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(allData.length / batchSize);
      
      console.log(`\n📦 Batch ${batchNum}/${totalBatches}: Adding ${batch.length} days (${batch[0].dimensions.date} to ${batch[batch.length-1].dimensions.date})...`);
      
      const result = await callMCPTool(client, 'track_batch_metrics', {
        dataset: 'github_stats',
        dataPoints: batch
      });
      
      if (result) {
        totalSuccess += batch.length;
        console.log(`✅ Batch ${batchNum} successful! Running total: ${totalSuccess}/${allData.length}`);
      } else {
        console.log(`❌ Batch ${batchNum} failed. Continuing...`);
      }
      
      // Small delay between batches
      if (i + batchSize < allData.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n🎉 COMPLETE! Successfully added ${totalSuccess}/${allData.length} days of data`);
    
    if (totalSuccess > 0) {
      console.log('\n📊 Now test your Grafana query:');
      console.log('SELECT timestamp, double1 as prs_created, double2 as prs_merged, double3 as prs_closed');
      console.log('FROM github_stats WHERE blob2 = \'daily_pr_stats\' ORDER BY timestamp');
      console.log('\n🎯 Expected: Time series chart with 3 lines showing PR trends over 30 days!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Clean up
    console.log('🔌 Closing MCP connection...');
    await client.close();
    console.log('✅ Connection closed');
  }
}

main();
