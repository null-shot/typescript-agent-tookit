#!/usr/bin/env node

/**
 * Add metrics automatically using individual track_metric calls
 */

const MCP_URL = 'https://analytics-mcp.raydp102.workers.dev/sse/message';

async function callMCPTool(toolName, args) {
  console.log(`📡 ${toolName}: ${args.dimensions?.date || 'unknown date'}`);
  
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
      console.log(`   ✅ Success: ${args.metrics.prs_created} created, ${args.metrics.prs_merged} merged`);
      return true;
    } else {
      console.log(`   ❌ Failed: ${result.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

// 30 days of realistic PR data
const prData = [
  { date: '2025-08-06', timestamp: 1754455182, created: 3, merged: 2, closed: 0 },
  { date: '2025-08-07', timestamp: 1754541582, created: 5, merged: 3, closed: 1 },
  { date: '2025-08-08', timestamp: 1754628082, created: 7, merged: 4, closed: 0 },
  { date: '2025-08-09', timestamp: 1754714482, created: 2, merged: 1, closed: 0 },
  { date: '2025-08-10', timestamp: 1754800882, created: 1, merged: 1, closed: 0 },
  { date: '2025-08-11', timestamp: 1754887282, created: 6, merged: 4, closed: 1 },
  { date: '2025-08-12', timestamp: 1754973682, created: 8, merged: 5, closed: 0 },
  { date: '2025-08-13', timestamp: 1755060082, created: 9, merged: 6, closed: 1 },
  { date: '2025-08-14', timestamp: 1755146482, created: 7, merged: 5, closed: 0 },
  { date: '2025-08-15', timestamp: 1755232882, created: 4, merged: 3, closed: 1 },
  { date: '2025-08-16', timestamp: 1755319282, created: 2, merged: 1, closed: 0 },
  { date: '2025-08-17', timestamp: 1755405682, created: 1, merged: 0, closed: 0 },
  { date: '2025-08-18', timestamp: 1755492082, created: 5, merged: 3, closed: 0 },
  { date: '2025-08-19', timestamp: 1755578482, created: 8, merged: 6, closed: 1 },
  { date: '2025-08-20', timestamp: 1755664882, created: 10, merged: 7, closed: 0 },
  { date: '2025-08-21', timestamp: 1755751282, created: 11, merged: 8, closed: 1 },
  { date: '2025-08-22', timestamp: 1755837682, created: 6, merged: 4, closed: 0 },
  { date: '2025-08-23', timestamp: 1755924082, created: 3, merged: 2, closed: 0 },
  { date: '2025-08-24', timestamp: 1756010482, created: 2, merged: 1, closed: 0 },
  { date: '2025-08-25', timestamp: 1756096882, created: 7, merged: 5, closed: 1 },
  { date: '2025-08-26', timestamp: 1756183282, created: 9, merged: 6, closed: 0 },
  { date: '2025-08-27', timestamp: 1756269682, created: 12, merged: 9, closed: 1 },
  { date: '2025-08-28', timestamp: 1756356082, created: 8, merged: 6, closed: 0 },
  { date: '2025-08-29', timestamp: 1756442482, created: 5, merged: 4, closed: 1 },
  { date: '2025-08-30', timestamp: 1756528882, created: 3, merged: 2, closed: 0 },
  { date: '2025-08-31', timestamp: 1756615282, created: 1, merged: 1, closed: 0 },
  { date: '2025-09-01', timestamp: 1756701682, created: 6, merged: 4, closed: 0 },
  { date: '2025-09-02', timestamp: 1756788082, created: 10, merged: 7, closed: 1 },
  { date: '2025-09-03', timestamp: 1756874482, created: 13, merged: 10, closed: 0 },
  { date: '2025-09-04', timestamp: 1756960882, created: 15, merged: 11, closed: 1 }
];

async function main() {
  console.log('🚀 Adding 30 Days of PR Metrics Automatically\n');
  console.log(`📊 Will add ${prData.length} individual data points using track_metric\n`);
  
  let successCount = 0;
  
  for (let i = 0; i < prData.length; i++) {
    const data = prData[i];
    
    const success = await callMCPTool('track_metric', {
      dataset: 'github_stats',
      timestamp: data.timestamp,
      dimensions: {
        repo: 'null-shot/typescript-agent-framework',
        event_type: 'daily_pr_stats',
        date: data.date
      },
      metrics: {
        prs_created: data.created,
        prs_merged: data.merged,
        prs_closed: data.closed
      }
    });
    
    if (success) {
      successCount++;
    }
    
    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Progress update every 5 entries
    if ((i + 1) % 5 === 0) {
      console.log(`   📈 Progress: ${successCount}/${i + 1} successful (${Math.round(successCount/(i+1)*100)}%)\n`);
    }
  }
  
  console.log(`\n🎉 COMPLETE! Successfully added ${successCount}/${prData.length} data points`);
  
  if (successCount > 0) {
    console.log('\n📊 Now test your Grafana query:');
    console.log('SELECT timestamp, double1 as prs_created, double2 as prs_merged, double3 as prs_closed');
    console.log('FROM github_stats WHERE blob2 = \'daily_pr_stats\' ORDER BY timestamp');
    console.log(`\n🎯 Expected: Time series chart with ${successCount} data points showing PR trends!`);
  }
}

main();
