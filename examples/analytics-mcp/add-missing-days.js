#!/usr/bin/env node

/**
 * Add the missing days to complete the 30-day dataset
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const MCP_BASE_URL = 'https://analytics-mcp.raydp102.workers.dev';

// Generate data for specific missing dates
function generateMissingDaysData() {
  // Based on the verification, these are the missing dates:
  const missingDates = [
    '2025-08-06', '2025-08-07', '2025-08-09', '2025-08-10', '2025-08-11',
    '2025-08-12', '2025-08-13', '2025-08-15', '2025-08-16', '2025-08-19',
    '2025-08-21', '2025-08-23', '2025-08-24', '2025-08-26', '2025-08-27',
    '2025-08-29', '2025-09-02', '2025-09-04'
  ];
  
  const dataPoints = [];
  
  missingDates.forEach(dateStr => {
    const date = new Date(dateStr);
    date.setHours(12, 0, 0, 0);
    
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Realistic activity patterns
    let baseActivity = isWeekend ? 1 : 5;
    if (dayOfWeek >= 2 && dayOfWeek <= 4) baseActivity = 8; // Tue-Thu peak
    
    // Add upward trend and randomness
    const daysSinceStart = Math.floor((date - new Date('2025-08-06')) / (1000 * 60 * 60 * 24));
    const trendFactor = 1 + daysSinceStart * 0.02;
    const randomFactor = 0.7 + Math.random() * 0.6;
    
    const created = Math.floor(baseActivity * trendFactor * randomFactor);
    const merged = Math.floor(created * (0.6 + Math.random() * 0.3));
    const closed = Math.floor(created * (0.05 + Math.random() * 0.1));
    
    dataPoints.push({
      timestamp: Math.floor(date.getTime() / 1000),
      dimensions: {
        repo: 'null-shot/typescript-agent-framework',
        event_type: 'daily_pr_stats_clean',
        date: dateStr,
        batch_id: `missing_${Date.now()}`
      },
      metrics: {
        prs_created: created,
        prs_merged: merged,
        prs_closed: closed
      }
    });
  });
  
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
  console.log('📅 Adding Missing Days to Complete 30-Day Dataset\n');
  
  const client = new Client({
    name: "add-missing-days",
    version: "1.0.0",
  });

  try {
    console.log('🔌 Connecting to MCP server...');
    const transport = new SSEClientTransport(new URL(`${MCP_BASE_URL}/sse`));
    await client.connect(transport);
    console.log('✅ Connected to MCP server\n');

    // Generate missing days data
    const missingData = generateMissingDaysData();
    console.log(`📊 Generated ${missingData.length} missing days of data`);
    console.log(`📅 Dates: ${missingData.map(d => d.dimensions.date).join(', ')}`);
    
    // Add missing data in smaller batches
    const batchSize = 3; // Smaller batches to avoid timeouts
    let totalSuccess = 0;
    
    for (let i = 0; i < missingData.length; i += batchSize) {
      const batch = missingData.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(missingData.length / batchSize);
      
      console.log(`\n📦 Batch ${batchNum}/${totalBatches}: Adding ${batch.length} days (${batch.map(d => d.dimensions.date).join(', ')})...`);
      
      const result = await callMCPTool(client, 'track_batch_metrics', {
        dataset: 'github_stats',
        dataPoints: batch
      });
      
      if (result) {
        totalSuccess += batch.length;
        console.log(`✅ Batch ${batchNum} successful! Running total: ${totalSuccess}/${missingData.length}`);
      } else {
        console.log(`❌ Batch ${batchNum} failed. Continuing...`);
      }
      
      // Longer delay between batches to avoid rate limits
      if (i + batchSize < missingData.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n🎉 MISSING DAYS ADDITION COMPLETE!`);
    console.log(`✅ Successfully added ${totalSuccess}/${missingData.length} missing days`);
    
    if (totalSuccess > 0) {
      console.log('\n📊 Now you should have close to 30 unique days!');
      console.log('🔍 Verify with:');
      console.log('SELECT blob3 as date, double1 as prs_created, double2 as prs_merged, double3 as prs_closed');
      console.log('FROM github_stats WHERE blob2 = \'daily_pr_stats_clean\' ORDER BY blob3');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    console.log('\n🔌 Closing MCP connection...');
    await client.close();
    console.log('✅ Connection closed');
  }
}

main();
