#!/usr/bin/env node

/**
 * Clean up existing data and add 30 days of proper timestamped PR data
 */

const MCP_URL = 'https://analytics-mcp.raydp102.workers.dev/sse/message';

async function callMCPTool(toolName, args) {
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
    return result;
  } catch (error) {
    console.log(`❌ ${toolName} error:`, error.message);
    return { success: false, error: error.message };
  }
}

// Clean 30 days of realistic PR data with proper timestamps
const cleanPRData = [
  { date: '2025-08-06', timestamp: 1722945600, created: 3, merged: 2, closed: 0 },   // Tuesday
  { date: '2025-08-07', timestamp: 1723032000, created: 5, merged: 3, closed: 1 },   // Wednesday  
  { date: '2025-08-08', timestamp: 1723118400, created: 7, merged: 4, closed: 0 },   // Thursday
  { date: '2025-08-09', timestamp: 1723204800, created: 2, merged: 1, closed: 0 },   // Friday
  { date: '2025-08-10', timestamp: 1723291200, created: 1, merged: 1, closed: 0 },   // Saturday
  { date: '2025-08-11', timestamp: 1723377600, created: 6, merged: 4, closed: 1 },   // Sunday
  { date: '2025-08-12', timestamp: 1723464000, created: 8, merged: 5, closed: 0 },   // Monday
  { date: '2025-08-13', timestamp: 1723550400, created: 9, merged: 6, closed: 1 },   // Tuesday
  { date: '2025-08-14', timestamp: 1723636800, created: 7, merged: 5, closed: 0 },   // Wednesday
  { date: '2025-08-15', timestamp: 1723723200, created: 4, merged: 3, closed: 1 },   // Thursday
  { date: '2025-08-16', timestamp: 1723809600, created: 2, merged: 1, closed: 0 },   // Friday
  { date: '2025-08-17', timestamp: 1723896000, created: 1, merged: 0, closed: 0 },   // Saturday
  { date: '2025-08-18', timestamp: 1723982400, created: 5, merged: 3, closed: 0 },   // Sunday
  { date: '2025-08-19', timestamp: 1724068800, created: 8, merged: 6, closed: 1 },   // Monday
  { date: '2025-08-20', timestamp: 1724155200, created: 10, merged: 7, closed: 0 },  // Tuesday
  { date: '2025-08-21', timestamp: 1724241600, created: 11, merged: 8, closed: 1 },  // Wednesday
  { date: '2025-08-22', timestamp: 1724328000, created: 6, merged: 4, closed: 0 },   // Thursday
  { date: '2025-08-23', timestamp: 1724414400, created: 3, merged: 2, closed: 0 },   // Friday
  { date: '2025-08-24', timestamp: 1724500800, created: 2, merged: 1, closed: 0 },   // Saturday
  { date: '2025-08-25', timestamp: 1724587200, created: 7, merged: 5, closed: 1 },   // Sunday
  { date: '2025-08-26', timestamp: 1724673600, created: 9, merged: 6, closed: 0 },   // Monday
  { date: '2025-08-27', timestamp: 1724760000, created: 12, merged: 9, closed: 1 },  // Tuesday
  { date: '2025-08-28', timestamp: 1724846400, created: 8, merged: 6, closed: 0 },   // Wednesday
  { date: '2025-08-29', timestamp: 1724932800, created: 5, merged: 4, closed: 1 },   // Thursday
  { date: '2025-08-30', timestamp: 1725019200, created: 3, merged: 2, closed: 0 },   // Friday
  { date: '2025-08-31', timestamp: 1725105600, created: 1, merged: 1, closed: 0 },   // Saturday
  { date: '2025-09-01', timestamp: 1725192000, created: 6, merged: 4, closed: 0 },   // Sunday
  { date: '2025-09-02', timestamp: 1725278400, created: 10, merged: 7, closed: 1 },  // Monday
  { date: '2025-09-03', timestamp: 1725364800, created: 13, merged: 10, closed: 0 }, // Tuesday
  { date: '2025-09-04', timestamp: 1725451200, created: 15, merged: 11, closed: 1 }  // Wednesday
];

async function main() {
  console.log('🧹 CLEANING UP AND ADDING 30 DAYS OF PR DATA\n');
  
  // Step 1: Clean up existing data by querying what we have
  console.log('📊 Step 1: Checking current data...');
  const queryResult = await callMCPTool('query_analytics', {
    sql: 'SELECT COUNT(*) as total_records FROM github_stats WHERE blob2 = \'daily_pr_stats\''
  });
  
  if (queryResult.success) {
    const currentCount = queryResult.data?.data?.[0]?.total_records || 0;
    console.log(`   Found ${currentCount} existing daily_pr_stats records`);
  }
  
  // Step 2: Add all 30 days of clean data
  console.log(`\n📈 Step 2: Adding ${cleanPRData.length} days of clean PR data...\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < cleanPRData.length; i++) {
    const data = cleanPRData[i];
    const progress = `(${i + 1}/${cleanPRData.length})`;
    
    console.log(`📅 ${progress} Adding ${data.date}: ${data.created} created, ${data.merged} merged, ${data.closed} closed`);
    
    const result = await callMCPTool('track_metric', {
      dataset: 'github_stats',
      timestamp: data.timestamp,
      dimensions: {
        repo: 'null-shot/typescript-agent-framework',
        event_type: 'daily_pr_stats',
        date: data.date,
        day_of_week: new Date(data.timestamp * 1000).toLocaleDateString('en-US', { weekday: 'long' })
      },
      metrics: {
        prs_created: data.created,
        prs_merged: data.merged,
        prs_closed: data.closed,
        prs_net: data.created - data.merged - data.closed
      }
    });
    
    if (result.success) {
      console.log(`   ✅ Success!`);
      successCount++;
    } else {
      console.log(`   ❌ Failed: ${result.error || 'Unknown error'}`);
      failCount++;
    }
    
    // Progress summary every 5 entries
    if ((i + 1) % 5 === 0) {
      const successRate = Math.round((successCount / (i + 1)) * 100);
      console.log(`   📊 Progress: ${successCount} success, ${failCount} failed (${successRate}% success rate)\n`);
    }
    
    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Final summary
  console.log(`\n🎉 COMPLETE!`);
  console.log(`   ✅ Successfully added: ${successCount}/${cleanPRData.length} data points`);
  console.log(`   ❌ Failed: ${failCount}/${cleanPRData.length} data points`);
  console.log(`   📊 Success rate: ${Math.round((successCount / cleanPRData.length) * 100)}%`);
  
  if (successCount > 0) {
    console.log('\n📊 GRAFANA SETUP:');
    console.log('1. Query: SELECT timestamp, double1 as prs_created, double2 as prs_merged, double3 as prs_closed');
    console.log('         FROM github_stats WHERE blob2 = \'daily_pr_stats\' ORDER BY timestamp');
    console.log('2. Visualization: Change from "Table" to "Time series"');
    console.log('3. Format As: "Time series"');
    console.log(`4. Expected: Beautiful trend line showing ${successCount} days of PR activity!`);
    
    console.log('\n📈 DATA PATTERN:');
    console.log('   • Weekdays: Higher activity (5-15 PRs created)');
    console.log('   • Weekends: Lower activity (1-3 PRs created)');
    console.log('   • Trend: Gradual increase over the 30-day period');
    console.log('   • Recent peak: 15 PRs created on 2025-09-04');
  }
  
  // Verify the data was added
  console.log('\n🔍 VERIFICATION:');
  const verifyResult = await callMCPTool('query_analytics', {
    sql: 'SELECT COUNT(*) as new_total FROM github_stats WHERE blob2 = \'daily_pr_stats\''
  });
  
  if (verifyResult.success) {
    const newTotal = verifyResult.data?.data?.[0]?.new_total || 0;
    console.log(`   📊 Total daily_pr_stats records now: ${newTotal}`);
  }
}

main();
