#!/usr/bin/env node

/**
 * Add 30 days of PR data with proper timestamps for real time series in Grafana
 */

const MCP_URL = 'https://analytics-mcp.raydp102.workers.dev/sse/message';

async function callMCPTool(toolName, args) {
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
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ ${toolName} succeeded`);
      return result.data;
    } else {
      console.log(`❌ ${toolName} failed:`, result.error || 'Unknown error');
      return null;
    }
  } catch (error) {
    console.log(`❌ ${toolName} error:`, error.message);
    return null;
  }
}

function generateTimestampedPRData() {
  const dataPoints = [];
  const now = new Date();
  
  console.log('📅 Generating data from', new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 'to', now.toISOString().split('T')[0]);
  
  // Generate data for last 30 days
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(12, 0, 0, 0); // Set to noon for consistency
    
    // Create realistic patterns based on day of week
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Realistic PR activity patterns
    let baseActivity = 2; // Base activity
    if (!isWeekend) {
      if (dayOfWeek === 1) baseActivity = 4; // Monday - moderate
      else if (dayOfWeek >= 2 && dayOfWeek <= 4) baseActivity = 7; // Tue-Thu - peak
      else baseActivity = 3; // Friday - lower
    }
    
    // Add trend and randomness
    const trendFactor = 1 + (29 - i) * 0.015; // Slight upward trend over time
    const randomFactor = 0.6 + Math.random() * 0.8; // 0.6 to 1.4 multiplier
    
    const created = Math.max(0, Math.floor(baseActivity * trendFactor * randomFactor));
    const merged = Math.max(0, Math.floor(created * (0.5 + Math.random() * 0.4))); // 50-90% merge rate
    const closed = Math.max(0, Math.floor(created * (0.02 + Math.random() * 0.08))); // 2-10% close rate
    
    dataPoints.push({
      timestamp: Math.floor(date.getTime() / 1000), // Unix timestamp for Analytics Engine
      dimensions: {
        repo: 'null-shot/typescript-agent-framework',
        event_type: 'daily_pr_stats',
        date: date.toISOString().split('T')[0], // YYYY-MM-DD format
        day_of_week: date.toLocaleDateString('en-US', { weekday: 'long' }),
        is_weekend: isWeekend ? 'true' : 'false'
      },
      metrics: {
        prs_created: created,
        prs_merged: merged,
        prs_closed: closed,
        prs_net_change: created - merged - closed
      },
      metadata: {
        week_number: Math.ceil((29 - i + 1) / 7),
        month: date.toLocaleDateString('en-US', { month: 'long' }),
        generated_at: new Date().toISOString()
      }
    });
  }
  
  return dataPoints;
}

async function main() {
  console.log('🚀 Adding 30 Days of Timestamped PR Data for Real Trends!\n');
  
  // Generate realistic daily PR data
  const dailyData = generateTimestampedPRData();
  
  console.log(`\n📊 Generated ${dailyData.length} days of PR activity data`);
  console.log('📈 Sample recent day:', {
    date: dailyData[dailyData.length - 1].dimensions.date,
    created: dailyData[dailyData.length - 1].metrics.prs_created,
    merged: dailyData[dailyData.length - 1].metrics.prs_merged,
    closed: dailyData[dailyData.length - 1].metrics.prs_closed
  });
  
  console.log('📈 Sample older day:', {
    date: dailyData[0].dimensions.date,
    created: dailyData[0].metrics.prs_created,
    merged: dailyData[0].metrics.prs_merged,
    closed: dailyData[0].metrics.prs_closed
  });
  
  // Add the data in batches (Analytics Engine works better with smaller batches)
  const batchSize = 10;
  let successCount = 0;
  
  for (let i = 0; i < dailyData.length; i += batchSize) {
    const batch = dailyData.slice(i, i + batchSize);
    console.log(`\n📦 Adding batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(dailyData.length/batchSize)} (${batch.length} days)...`);
    
    const result = await callMCPTool('track_batch_metrics', {
      dataset: 'github_stats',
      dataPoints: batch
    });
    
    if (result) {
      successCount += batch.length;
      console.log(`✅ Batch successful! Total added: ${successCount}/${dailyData.length}`);
    } else {
      console.log(`❌ Batch failed. Continuing with next batch...`);
    }
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  if (successCount > 0) {
    console.log(`\n🎉 SUCCESS! Added ${successCount} days of timestamped PR data!`);
    console.log('\n📊 Now use this REAL TIME SERIES query in Grafana:');
    console.log('```sql');
    console.log('SELECT ');
    console.log('  timestamp,');
    console.log('  double1 as prs_created,');
    console.log('  double2 as prs_merged,');
    console.log('  double3 as prs_closed');
    console.log('FROM github_stats ');
    console.log('WHERE blob2 = \'daily_pr_stats\'');
    console.log('ORDER BY timestamp');
    console.log('```');
    console.log('\n🎯 Grafana Configuration:');
    console.log('1. Query: Use the SQL above');
    console.log('2. Format As: "Time series"');
    console.log('3. Visualization: "Time series" (line chart)');
    console.log('4. X-axis: Will automatically use timestamp');
    console.log('5. Y-axis: Will show prs_created, prs_merged, prs_closed as separate series');
    console.log('\n📈 You should now see a REAL trend over 30 days!');
  } else {
    console.log('\n❌ Failed to add any data. Make sure MCP Inspector is running:');
    console.log('1. Open: http://localhost:3000 (MCP Inspector)');
    console.log('2. Connect to: https://analytics-mcp.raydp102.workers.dev/sse');
    console.log('3. Test with list_datasets tool first');
  }
}

main();
