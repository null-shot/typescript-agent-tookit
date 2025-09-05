#!/usr/bin/env node

/**
 * Add cumulative PR data that always increases
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const MCP_BASE_URL = 'https://analytics-mcp.raydp102.workers.dev';

// Generate 30 days of cumulative PR data
function generateCumulativeData() {
  const dataPoints = [];
  const now = new Date('2025-09-04');
  
  // Running totals
  let totalCreated = 0;
  let totalMerged = 0;
  let totalClosed = 0;
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(12, 0, 0, 0);
    
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Daily activity (same logic as before)
    let baseActivity = isWeekend ? 1 : 5;
    if (dayOfWeek >= 2 && dayOfWeek <= 4) baseActivity = 8;
    
    const trendFactor = 1 + (29 - i) * 0.02;
    const randomFactor = 0.7 + Math.random() * 0.6;
    
    const dailyCreated = Math.floor(baseActivity * trendFactor * randomFactor);
    const dailyMerged = Math.floor(dailyCreated * (0.6 + Math.random() * 0.3));
    const dailyClosed = Math.floor(dailyCreated * (0.05 + Math.random() * 0.1));
    
    // Add to running totals (cumulative)
    totalCreated += dailyCreated;
    totalMerged += dailyMerged;
    totalClosed += dailyClosed;
    
    dataPoints.push({
      timestamp: Math.floor(date.getTime() / 1000),
      dimensions: {
        repo: 'null-shot/typescript-agent-framework',
        event_type: 'daily_pr_stats_cumulative',
        date: date.toISOString().split('T')[0],
        batch_id: `cumulative_${Date.now()}`
      },
      metrics: {
        prs_created_total: totalCreated,    // Always increasing
        prs_merged_total: totalMerged,      // Always increasing  
        prs_closed_total: totalClosed       // Always increasing
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

    if (result.content && result.content.length > 0) {
      const responseData = JSON.parse(result.content[0].text);
      
      if (responseData.success) {
        console.log(`✅ ${toolName} succeeded`);
        return responseData.data || responseData;
      } else {
        console.log(`❌ ${toolName} failed:`, responseData.error);
        return null;
      }
    }
  } catch (error) {
    console.log(`❌ ${toolName} error:`, error.message);
    return null;
  }
}

async function main() {
  console.log('📈 Adding Cumulative PR Data (Always Increasing)\n');
  
  const client = new Client({
    name: "add-cumulative-data",
    version: "1.0.0",
  });

  try {
    console.log('🔌 Connecting to MCP server...');
    const transport = new SSEClientTransport(new URL(`${MCP_BASE_URL}/sse`));
    await client.connect(transport);
    console.log('✅ Connected\n');

    const cumulativeData = generateCumulativeData();
    console.log(`📊 Generated ${cumulativeData.length} days of cumulative data`);
    console.log(`📅 Range: ${cumulativeData[0].dimensions.date} to ${cumulativeData[cumulativeData.length-1].dimensions.date}`);
    
    // Show sample of what cumulative looks like
    console.log('\n📈 Sample cumulative data:');
    cumulativeData.slice(0, 5).forEach((point, i) => {
      console.log(`Day ${i+1} (${point.dimensions.date}): Created: ${point.metrics.prs_created_total}, Merged: ${point.metrics.prs_merged_total}, Closed: ${point.metrics.prs_closed_total}`);
    });
    console.log('...');
    const lastPoint = cumulativeData[cumulativeData.length-1];
    console.log(`Final totals: Created: ${lastPoint.metrics.prs_created_total}, Merged: ${lastPoint.metrics.prs_merged_total}, Closed: ${lastPoint.metrics.prs_closed_total}`);
    
    // Add in batches
    const batchSize = 5;
    let totalSuccess = 0;
    
    for (let i = 0; i < cumulativeData.length; i += batchSize) {
      const batch = cumulativeData.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(cumulativeData.length / batchSize);
      
      console.log(`\n📦 Batch ${batchNum}/${totalBatches}: Adding ${batch.length} days...`);
      
      const result = await callMCPTool(client, 'track_batch_metrics', {
        dataset: 'github_stats',
        dataPoints: batch
      });
      
      if (result) {
        totalSuccess += batch.length;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n🎉 Added ${totalSuccess}/${cumulativeData.length} days of cumulative data`);
    
    if (totalSuccess > 0) {
      console.log('\n📊 Query cumulative data with:');
      console.log('SELECT blob3, double1, double2, double3');
      console.log('FROM github_stats WHERE blob2 = \'daily_pr_stats_cumulative\'');
      console.log('ORDER BY blob3');
      console.log('\n📈 This will show always-increasing trend lines!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

main();
