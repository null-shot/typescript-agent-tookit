#!/usr/bin/env node

/**
 * Create comprehensive Claude Code data with full 30 days of activity
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const MCP_BASE_URL = 'https://analytics-mcp.raydp102.workers.dev';

function generateClaudeCodeData() {
  const dataPoints = [];
  const endDate = new Date(); // Today
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 29); // 30 days ago
  
  console.log('📅 Generating Claude Code data from', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    date.setHours(12, 0, 0, 0);
    
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Claude Code is very active - realistic patterns based on actual repo activity
    let basePRs = isWeekend ? 1 : 3;
    let baseIssues = isWeekend ? 8 : 15;
    
    // Add some randomness and trends
    const randomFactor = 0.5 + Math.random();
    const trendFactor = 1 + (i * 0.01); // Slight upward trend
    
    const prsCreated = Math.floor(basePRs * randomFactor * trendFactor);
    const prsMerged = Math.floor(prsCreated * (0.7 + Math.random() * 0.2));
    const prsClosed = Math.floor(prsCreated * (0.1 + Math.random() * 0.1));
    const issuesCreated = Math.floor(baseIssues * randomFactor * trendFactor);
    const issuesClosed = Math.floor(issuesCreated * (0.6 + Math.random() * 0.3));
    
    // Add some special high-activity days (like the real Sept 4th spike)
    let specialDay = false;
    if (i === 25 || i === 20 || i === 15) { // Some random high activity days
      specialDay = true;
    }
    
    const finalMetrics = {
      prs_created: specialDay ? prsCreated + Math.floor(Math.random() * 5) : prsCreated,
      prs_merged: specialDay ? prsMerged + Math.floor(Math.random() * 3) : prsMerged,
      prs_closed: specialDay ? prsClosed + Math.floor(Math.random() * 2) : prsClosed,
      issues_created: specialDay ? issuesCreated + Math.floor(Math.random() * 20 + 10) : issuesCreated,
      issues_closed: specialDay ? issuesClosed + Math.floor(Math.random() * 15 + 5) : issuesClosed
    };
    
    console.log(`📊 ${dateStr}: PRs(${finalMetrics.prs_created}/${finalMetrics.prs_merged}/${finalMetrics.prs_closed}) Issues(${finalMetrics.issues_created}/${finalMetrics.issues_closed})${specialDay ? ' 🔥' : ''}`);
    
    dataPoints.push({
      timestamp: Math.floor(date.getTime() / 1000),
      dimensions: {
        repo: 'anthropics/claude-code',
        event_type: 'claude_code_rich_stats',
        date: dateStr,
        batch_id: `claude_rich_${Date.now()}`
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
  console.log('🚀 Creating Rich Claude Code Dataset\n');
  
  const client = new Client({
    name: "claude-rich-data",
    version: "1.0.0",
  });

  try {
    console.log('🔌 Connecting to Analytics MCP server...');
    const transport = new SSEClientTransport(new URL(`${MCP_BASE_URL}/sse`));
    await client.connect(transport);
    console.log('✅ Connected\n');

    // Generate rich Claude Code data
    const dataPoints = generateClaudeCodeData();
    
    console.log(`\n📊 Generated ${dataPoints.length} days of rich Claude Code data`);
    
    // Store in Analytics Engine
    console.log('\n💾 Storing in Analytics Engine...');
    const result = await callMCPTool(client, 'track_batch_metrics', {
      dataset: 'github_stats',
      dataPoints: dataPoints
    });
    
    if (result) {
      console.log(`\n🎉 SUCCESS! Added ${dataPoints.length} days of rich Claude Code data`);
      
      console.log('\n📊 Update your Grafana panel query to:');
      console.log('SELECT blob3, double1, double2, double3, double4, double5');
      console.log('FROM github_stats WHERE blob2 = \'claude_code_rich_stats\'');
      console.log('ORDER BY blob3');
      
      console.log('\n🎨 Field Overrides:');
      console.log('- double1 → "PRs Created" (Green)');
      console.log('- double2 → "PRs Merged" (Blue)');
      console.log('- double3 → "PRs Closed" (Orange)');
      console.log('- double4 → "Issues Created" (Purple)');
      console.log('- double5 → "Issues Closed" (Red)');
      
      console.log('\n📈 Expected result: Rich 30-day activity chart with realistic Claude Code patterns!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

main();
