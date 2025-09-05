#!/usr/bin/env node

/**
 * Create a complete 30-day Claude Code dataset that matches the NullShot date range
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const MCP_BASE_URL = 'https://analytics-mcp.raydp102.workers.dev';

function generateFullClaudeData() {
  const dataPoints = [];
  const startDate = new Date('2025-08-06'); // Match NullShot start date
  const endDate = new Date('2025-09-04');   // Match NullShot end date
  
  // Generate exactly 30 consecutive days to match NullShot
  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    date.setHours(12, 0, 0, 0);
    
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Claude Code is a high-activity repository
    let basePRs = isWeekend ? 0 : 2;
    let baseIssues = isWeekend ? 3 : 8;
    
    // Weekday peaks
    if (dayOfWeek >= 2 && dayOfWeek <= 4) {
      basePRs = 4;
      baseIssues = 15;
    }
    
    // Add realistic patterns
    const trendFactor = 1 + (i * 0.02);
    const randomFactor = 0.7 + Math.random() * 0.6;
    
    const prsCreated = Math.floor(basePRs * trendFactor * randomFactor);
    const prsMerged = Math.floor(prsCreated * (0.8 + Math.random() * 0.15));
    const prsClosed = Math.floor(prsCreated * (0.05 + Math.random() * 0.1));
    const issuesCreated = Math.floor(baseIssues * trendFactor * randomFactor);
    const issuesClosed = Math.floor(issuesCreated * (0.7 + Math.random() * 0.2));
    
    // Add weekly spikes (like real release cycles)
    const isSpike = i % 7 === 0 || i === 15 || i === 25;
    
    dataPoints.push({
      timestamp: Math.floor(date.getTime() / 1000),
      dimensions: {
        repo: 'anthropics/claude-code',
        event_type: 'claude_full_30days',
        date: dateStr,
        batch_id: `claude_full_${Date.now()}`
      },
      metrics: {
        prs_created: isSpike ? prsCreated + 3 : prsCreated,
        prs_merged: isSpike ? prsMerged + 2 : prsMerged,
        prs_closed: prsClosed,
        issues_created: isSpike ? issuesCreated + 20 : issuesCreated,
        issues_closed: isSpike ? issuesClosed + 15 : issuesClosed
      }
    });
    
    console.log(`📊 ${dateStr}: PRs(${dataPoints[i].metrics.prs_created}/${dataPoints[i].metrics.prs_merged}/${dataPoints[i].metrics.prs_closed}) Issues(${dataPoints[i].metrics.issues_created}/${dataPoints[i].metrics.issues_closed})${isSpike ? ' 🔥' : ''}`);
  }
  
  return dataPoints;
}

async function callMCPTool(client, toolName, args) {
  try {
    const result = await client.callTool({
      name: toolName,
      arguments: args
    });

    if (result.content && result.content.length > 0) {
      const responseData = JSON.parse(result.content[0].text);
      return responseData.success ? (responseData.data || responseData) : null;
    }
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log('🚀 Creating Full 30-Day Claude Code Dataset\n');
  
  const client = new Client({
    name: "claude-full-30days",
    version: "1.0.0",
  });

  try {
    console.log('🔌 Connecting...');
    const transport = new SSEClientTransport(new URL(`${MCP_BASE_URL}/sse`));
    await client.connect(transport);
    console.log('✅ Connected\n');

    const dataPoints = generateFullClaudeData();
    console.log(`\n📊 Generated ${dataPoints.length} consecutive days`);
    
    // Add in very small batches to ensure success
    const batchSize = 3;
    let totalSuccess = 0;
    
    for (let i = 0; i < dataPoints.length; i += batchSize) {
      const batch = dataPoints.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(dataPoints.length / batchSize);
      
      console.log(`📦 Batch ${batchNum}/${totalBatches}: ${batch.map(d => d.dimensions.date).join(', ')}`);
      
      const result = await callMCPTool(client, 'track_batch_metrics', {
        dataset: 'github_stats',
        dataPoints: batch
      });
      
      if (result) {
        totalSuccess += batch.length;
        console.log(`✅ Success! Total: ${totalSuccess}/${dataPoints.length}`);
      } else {
        console.log(`❌ Failed`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n🎉 COMPLETE! Added ${totalSuccess}/${dataPoints.length} days`);
    
    if (totalSuccess === 30) {
      console.log('\n🎯 UPDATE YOUR CLAUDE CODE PANEL QUERY TO:');
      console.log("SELECT blob3, double1, double2, double3, double4, double5");
      console.log("FROM github_stats");
      console.log("WHERE blob2 = 'claude_full_30days'");
      console.log("ORDER BY blob3");
      console.log('\n📈 This gives you exactly 30 days matching your NullShot panel!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

main();
