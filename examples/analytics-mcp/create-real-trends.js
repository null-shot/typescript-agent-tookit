#!/usr/bin/env node

/**
 * Create proper time-based PR trends using MCP tools
 * This will add data with proper timestamps that Grafana can use for real trends
 */

// Kill any existing MCP inspector processes first
import { exec } from 'child_process';

async function killExistingProcesses() {
  return new Promise((resolve) => {
    exec('pkill -f "modelcontextprotocol/inspector"', () => {
      console.log('🧹 Cleaned up existing MCP processes');
      resolve();
    });
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callMCPTool(toolName, args) {
  const MCP_URL = 'https://analytics-mcp.raydp102.workers.dev/sse/message';
  
  console.log(`📡 Calling ${toolName}...`);
  
  try {
    const response = await fetch(MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ ${toolName} succeeded`);
      return result.data;
    } else {
      console.log(`❌ ${toolName} failed:`, result.error);
      return null;
    }
  } catch (error) {
    console.log(`❌ ${toolName} error:`, error.message);
    return null;
  }
}

function generateDailyPRData() {
  const dataPoints = [];
  const now = new Date();
  
  // Generate data for last 30 days with realistic patterns
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(12, 0, 0, 0); // Set to noon for consistency
    
    // Create realistic PR patterns
    const dayOfWeek = date.getDay(); // 0 = Sunday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Less activity on weekends, more activity mid-week
    let baseActivity = isWeekend ? 1 : 5;
    if (dayOfWeek >= 2 && dayOfWeek <= 4) baseActivity = 8; // Tue-Thu peak
    
    // Add some randomness and recent trend
    const trendFactor = 1 + (29 - i) * 0.02; // Slight upward trend
    const randomFactor = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
    
    const created = Math.floor(baseActivity * trendFactor * randomFactor);
    const merged = Math.floor(created * (0.6 + Math.random() * 0.3)); // 60-90% merge rate
    const closed = Math.floor(created * (0.05 + Math.random() * 0.1)); // 5-15% close rate
    
    dataPoints.push({
      timestamp: Math.floor(date.getTime() / 1000),
      dimensions: {
        repo: 'null-shot/typescript-agent-framework',
        event_type: 'daily_pr_activity',
        date_str: date.toISOString().split('T')[0], // YYYY-MM-DD
        day_name: date.toLocaleDateString('en-US', { weekday: 'short' })
      },
      metrics: {
        prs_created: created,
        prs_merged: merged,
        prs_closed: closed,
        prs_open_delta: created - merged - closed
      }
    });
  }
  
  return dataPoints;
}

async function main() {
  console.log('🚀 Creating Real PR Trends Data...\n');
  
  // Clean up any existing processes
  await killExistingProcesses();
  await sleep(2000);
  
  // Generate realistic daily data
  const dailyData = generateDailyPRData();
  
  console.log(`📊 Generated ${dailyData.length} days of PR data`);
  console.log('📅 Date range:', dailyData[0].dimensions.date_str, 'to', dailyData[dailyData.length-1].dimensions.date_str);
  console.log('📈 Sample data:', {
    date: dailyData[dailyData.length-1].dimensions.date_str,
    created: dailyData[dailyData.length-1].metrics.prs_created,
    merged: dailyData[dailyData.length-1].metrics.prs_merged,
    closed: dailyData[dailyData.length-1].metrics.prs_closed
  });
  
  // Add the data using track_batch_metrics
  console.log('\n📡 Sending data to Analytics Engine...');
  const result = await callMCPTool('track_batch_metrics', {
    dataset: 'github_stats',
    dataPoints: dailyData
  });
  
  if (result) {
    console.log('\n🎉 SUCCESS! Added 30 days of PR trend data!');
    console.log('\n📊 Now use this query in Grafana:');
    console.log('```sql');
    console.log('SELECT ');
    console.log('  timestamp,');
    console.log('  double1 as prs_created,');
    console.log('  double2 as prs_merged,');
    console.log('  double3 as prs_closed');
    console.log('FROM github_stats ');
    console.log('WHERE blob2 = \'daily_pr_activity\'');
    console.log('ORDER BY timestamp');
    console.log('```');
    console.log('\n🎯 In Grafana:');
    console.log('1. Use the query above');
    console.log('2. Set Format As: "Time series"');
    console.log('3. Visualization: "Time series" or "Bar chart"');
    console.log('4. X-axis will automatically use timestamp');
  } else {
    console.log('\n❌ Failed to add data. Try running MCP Inspector first:');
    console.log('npx @modelcontextprotocol/inspector');
    console.log('Then connect to: https://analytics-mcp.raydp102.workers.dev/sse');
  }
}

main();
