#!/usr/bin/env node

/**
 * Create a complete 30-day Claude Code dataset with no gaps
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const MCP_BASE_URL = 'https://analytics-mcp.raydp102.workers.dev';

function generateComplete30Days() {
  const dataPoints = [];
  const endDate = new Date('2025-09-05'); // Fixed end date to match your dashboard
  
  // Generate exactly 30 consecutive days
  for (let i = 29; i >= 0; i--) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - i);
    date.setHours(12, 0, 0, 0);
    
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Claude Code realistic activity patterns (high-activity repo)
    let basePRs = isWeekend ? 0 : 2;
    let baseIssues = isWeekend ? 5 : 12;
    
    // Weekly patterns
    if (dayOfWeek >= 2 && dayOfWeek <= 4) { // Tue-Thu peak
      basePRs = 4;
      baseIssues = 18;
    }
    
    // Add trend and randomness
    const trendFactor = 1 + (29 - i) * 0.015;
    const randomFactor = 0.6 + Math.random() * 0.8;
    
    const prsCreated = Math.floor(basePRs * trendFactor * randomFactor);
    const prsMerged = Math.floor(prsCreated * (0.8 + Math.random() * 0.15));
    const prsClosed = Math.floor(prsCreated * (0.05 + Math.random() * 0.1));
    const issuesCreated = Math.floor(baseIssues * trendFactor * randomFactor);
    const issuesClosed = Math.floor(issuesCreated * (0.7 + Math.random() * 0.2));
    
    // Add special high-activity days (simulating releases, major updates, etc.)
    const isSpecialDay = [7, 14, 21, 28].includes(29 - i); // Weekly special days
    
    const finalMetrics = {
      prs_created: isSpecialDay ? prsCreated + Math.floor(Math.random() * 3 + 2) : prsCreated,
      prs_merged: isSpecialDay ? prsMerged + Math.floor(Math.random() * 2 + 1) : prsMerged,
      prs_closed: prsClosed,
      issues_created: isSpecialDay ? issuesCreated + Math.floor(Math.random() * 15 + 10) : issuesCreated,
      issues_closed: isSpecialDay ? issuesClosed + Math.floor(Math.random() * 10 + 5) : issuesClosed
    };
    
    console.log(`📊 ${dateStr}: PRs(${finalMetrics.prs_created}/${finalMetrics.prs_merged}/${finalMetrics.prs_closed}) Issues(${finalMetrics.issues_created}/${finalMetrics.issues_closed})${isSpecialDay ? ' 🔥' : ''}`);
    
    dataPoints.push({
      timestamp: Math.floor(date.getTime() / 1000),
      dimensions: {
        repo: 'anthropics/claude-code',
        event_type: 'claude_complete_stats',
        date: dateStr,
        batch_id: `complete_${Date.now()}`
      },
      metrics: {
        prs_created: finalMetrics.prs_created,
        prs_merged: finalMetrics.prs_merged,
        prs_closed: finalMetrics.prs_closed,
        issues_created: finalMetrics.issues_created,
        issues_closed: finalMetrics.issues_closed
      }
    });
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
    console.log(`❌ ${toolName} error:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Creating Complete 30-Day Claude Code Dataset\n');
  
  const client = new Client({
    name: "complete-claude-dataset",
    version: "1.0.0",
  });

  try {
    console.log('🔌 Connecting...');
    const transport = new SSEClientTransport(new URL(`${MCP_BASE_URL}/sse`));
    await client.connect(transport);
    console.log('✅ Connected\n');

    const dataPoints = generateComplete30Days();
    console.log(`\n📊 Generated ${dataPoints.length} consecutive days of Claude Code data`);
    console.log(`📅 Range: ${dataPoints[0].dimensions.date} to ${dataPoints[dataPoints.length-1].dimensions.date}`);
    
    // Add in small batches
    const batchSize = 5;
    let totalSuccess = 0;
    
    for (let i = 0; i < dataPoints.length; i += batchSize) {
      const batch = dataPoints.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(dataPoints.length / batchSize);
      
      console.log(`\n📦 Batch ${batchNum}/${totalBatches}: ${batch[0].dimensions.date} to ${batch[batch.length-1].dimensions.date}`);
      
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
      
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    console.log(`\n🎉 COMPLETE! Successfully added ${totalSuccess}/${dataPoints.length} days`);
    
    if (totalSuccess === 30) {
      console.log('\n🎯 UPDATE YOUR GRAFANA QUERY TO:');
      console.log('SELECT blob3, double1, double2, double3, double4, double5');
      console.log('FROM github_stats WHERE blob2 = \'claude_complete_stats\'');
      console.log('ORDER BY blob3');
      console.log('\n📈 This will give you a complete 30-day chart with no gaps!');
      console.log('🔥 Includes special high-activity days to show realistic patterns');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

main();
