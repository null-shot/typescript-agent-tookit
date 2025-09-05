#!/usr/bin/env node

/**
 * Create Claude Code data in smaller batches to avoid write failures
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const MCP_BASE_URL = 'https://analytics-mcp.raydp102.workers.dev';

function generateClaudeCodeData() {
  const dataPoints = [];
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 29);
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    date.setHours(12, 0, 0, 0);
    
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Realistic Claude Code activity patterns
    let basePRs = isWeekend ? 1 : 3;
    let baseIssues = isWeekend ? 8 : 15;
    
    const randomFactor = 0.5 + Math.random();
    const trendFactor = 1 + (i * 0.01);
    
    const prsCreated = Math.floor(basePRs * randomFactor * trendFactor);
    const prsMerged = Math.floor(prsCreated * (0.7 + Math.random() * 0.2));
    const prsClosed = Math.floor(prsCreated * (0.1 + Math.random() * 0.1));
    const issuesCreated = Math.floor(baseIssues * randomFactor * trendFactor);
    const issuesClosed = Math.floor(issuesCreated * (0.6 + Math.random() * 0.3));
    
    // Add high-activity days
    const isHighActivity = i % 7 === 0 || i === 25; // Weekly spikes + special day
    
    dataPoints.push({
      timestamp: Math.floor(date.getTime() / 1000),
      dimensions: {
        repo: 'anthropics/claude-code',
        event_type: 'claude_rich_data',
        date: dateStr,
        batch_id: `claude_${Date.now()}_${i}`
      },
      metrics: {
        prs_created: isHighActivity ? prsCreated + 2 : prsCreated,
        prs_merged: isHighActivity ? prsMerged + 1 : prsMerged,
        prs_closed: prsClosed,
        issues_created: isHighActivity ? issuesCreated + 10 : issuesCreated,
        issues_closed: isHighActivity ? issuesClosed + 5 : issuesClosed
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
  console.log('🚀 Creating Claude Code Data (Small Batches)\n');
  
  const client = new Client({
    name: "claude-small-batches",
    version: "1.0.0",
  });

  try {
    console.log('🔌 Connecting...');
    const transport = new SSEClientTransport(new URL(`${MCP_BASE_URL}/sse`));
    await client.connect(transport);
    console.log('✅ Connected\n');

    const dataPoints = generateClaudeCodeData();
    console.log(`📊 Generated ${dataPoints.length} days of data\n`);
    
    // Add in very small batches (3 days at a time)
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
      
      // Longer delay between batches
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n🎉 COMPLETE! Successfully added ${totalSuccess}/${dataPoints.length} days`);
    
    if (totalSuccess > 0) {
      console.log('\n📊 UPDATE YOUR GRAFANA QUERY TO:');
      console.log('SELECT blob3, double1, double2, double3, double4, double5');
      console.log('FROM github_stats WHERE blob2 = \'claude_rich_data\'');
      console.log('ORDER BY blob3');
      console.log('\n🎯 This should give you a full 30-day rich dataset!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

main();
