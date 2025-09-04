#!/usr/bin/env node

/**
 * Smart batch upload with smaller batches and better error handling
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
    return { success: false, error: error.message };
  }
}

// 30 days of clean PR data with proper Unix timestamps
const allPRData = [
  { date: '2025-08-06', timestamp: 1722945600, created: 3, merged: 2, closed: 0 },
  { date: '2025-08-07', timestamp: 1723032000, created: 5, merged: 3, closed: 1 },
  { date: '2025-08-08', timestamp: 1723118400, created: 7, merged: 4, closed: 0 },
  { date: '2025-08-09', timestamp: 1723204800, created: 2, merged: 1, closed: 0 },
  { date: '2025-08-10', timestamp: 1723291200, created: 1, merged: 1, closed: 0 },
  { date: '2025-08-11', timestamp: 1723377600, created: 6, merged: 4, closed: 1 },
  { date: '2025-08-12', timestamp: 1723464000, created: 8, merged: 5, closed: 0 },
  { date: '2025-08-13', timestamp: 1723550400, created: 9, merged: 6, closed: 1 },
  { date: '2025-08-14', timestamp: 1723636800, created: 7, merged: 5, closed: 0 },
  { date: '2025-08-15', timestamp: 1723723200, created: 4, merged: 3, closed: 1 },
  { date: '2025-08-16', timestamp: 1723809600, created: 2, merged: 1, closed: 0 },
  { date: '2025-08-17', timestamp: 1723896000, created: 1, merged: 0, closed: 0 },
  { date: '2025-08-18', timestamp: 1723982400, created: 5, merged: 3, closed: 0 },
  { date: '2025-08-19', timestamp: 1724068800, created: 8, merged: 6, closed: 1 },
  { date: '2025-08-20', timestamp: 1724155200, created: 10, merged: 7, closed: 0 },
  { date: '2025-08-21', timestamp: 1724241600, created: 11, merged: 8, closed: 1 },
  { date: '2025-08-22', timestamp: 1724328000, created: 6, merged: 4, closed: 0 },
  { date: '2025-08-23', timestamp: 1724414400, created: 3, merged: 2, closed: 0 },
  { date: '2025-08-24', timestamp: 1724500800, created: 2, merged: 1, closed: 0 },
  { date: '2025-08-25', timestamp: 1724587200, created: 7, merged: 5, closed: 1 },
  { date: '2025-08-26', timestamp: 1724673600, created: 9, merged: 6, closed: 0 },
  { date: '2025-08-27', timestamp: 1724760000, created: 12, merged: 9, closed: 1 },
  { date: '2025-08-28', timestamp: 1724846400, created: 8, merged: 6, closed: 0 },
  { date: '2025-08-29', timestamp: 1724932800, created: 5, merged: 4, closed: 1 },
  { date: '2025-08-30', timestamp: 1725019200, created: 3, merged: 2, closed: 0 },
  { date: '2025-08-31', timestamp: 1725105600, created: 1, merged: 1, closed: 0 },
  { date: '2025-09-01', timestamp: 1725192000, created: 6, merged: 4, closed: 0 },
  { date: '2025-09-02', timestamp: 1725278400, created: 10, merged: 7, closed: 1 },
  { date: '2025-09-03', timestamp: 1725364800, created: 13, merged: 10, closed: 0 },
  { date: '2025-09-04', timestamp: 1725451200, created: 15, merged: 11, closed: 1 }
];

function createDataPoint(data) {
  return {
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
  };
}

async function testBatchSizes() {
  console.log('🧪 TESTING OPTIMAL BATCH SIZE FOR 30 DAYS OF DATA\n');
  
  const batchSizes = [3, 5, 10]; // Test different batch sizes
  
  for (const batchSize of batchSizes) {
    console.log(`\n📦 Testing batch size: ${batchSize}`);
    
    // Take first few items for testing
    const testData = allPRData.slice(0, batchSize).map(createDataPoint);
    
    console.log(`   📅 Date range: ${testData[0].dimensions.date} to ${testData[testData.length-1].dimensions.date}`);
    
    const result = await callMCPTool('track_batch_metrics', {
      dataset: 'github_stats',
      dataPoints: testData
    });
    
    if (result.success) {
      console.log(`   ✅ SUCCESS with batch size ${batchSize}!`);
      console.log(`   📊 Message: ${result.data?.message || 'Data added successfully'}`);
      return batchSize; // Return the working batch size
    } else {
      console.log(`   ❌ FAILED with batch size ${batchSize}`);
      console.log(`   📝 Error: ${result.error}`);
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return null; // No batch size worked
}

async function uploadAllData(optimalBatchSize) {
  console.log(`\n🚀 UPLOADING ALL 30 DAYS WITH BATCH SIZE: ${optimalBatchSize}\n`);
  
  let totalSuccess = 0;
  let totalFailed = 0;
  
  for (let i = 0; i < allPRData.length; i += optimalBatchSize) {
    const batch = allPRData.slice(i, i + optimalBatchSize);
    const dataPoints = batch.map(createDataPoint);
    
    const batchNum = Math.floor(i / optimalBatchSize) + 1;
    const totalBatches = Math.ceil(allPRData.length / optimalBatchSize);
    
    console.log(`📦 Batch ${batchNum}/${totalBatches}: ${batch[0].date} to ${batch[batch.length-1].date} (${batch.length} days)`);
    
    const result = await callMCPTool('track_batch_metrics', {
      dataset: 'github_stats',
      dataPoints: dataPoints
    });
    
    if (result.success) {
      console.log(`   ✅ Success! Added ${batch.length} days`);
      totalSuccess += batch.length;
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
      totalFailed += batch.length;
    }
    
    // Progress update
    const processed = Math.min(i + optimalBatchSize, allPRData.length);
    console.log(`   📊 Progress: ${totalSuccess}/${processed} successful (${Math.round(totalSuccess/processed*100)}%)\n`);
    
    // Delay between batches to avoid overwhelming the system
    if (i + optimalBatchSize < allPRData.length) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  
  return { totalSuccess, totalFailed };
}

async function main() {
  console.log('🎯 SMART BATCH UPLOAD: 30 DAYS OF PR DATA');
  console.log('==========================================\n');
  
  // Step 1: Test what batch size works
  const optimalBatchSize = await testBatchSizes();
  
  if (!optimalBatchSize) {
    console.log('\n❌ No batch size worked. Possible issues:');
    console.log('   • MCP session expired - restart MCP Inspector');
    console.log('   • Network connectivity issues');
    console.log('   • Analytics Engine service issues');
    return;
  }
  
  // Step 2: Upload all data with the working batch size
  const { totalSuccess, totalFailed } = await uploadAllData(optimalBatchSize);
  
  // Step 3: Final summary
  console.log('\n🎉 UPLOAD COMPLETE!');
  console.log('==================');
  console.log(`✅ Successfully uploaded: ${totalSuccess}/30 days`);
  console.log(`❌ Failed uploads: ${totalFailed}/30 days`);
  console.log(`📊 Success rate: ${Math.round(totalSuccess/30*100)}%`);
  
  if (totalSuccess > 0) {
    console.log('\n📊 GRAFANA QUERY:');
    console.log('SELECT timestamp, double1 as prs_created, double2 as prs_merged, double3 as prs_closed');
    console.log('FROM github_stats WHERE blob2 = \'daily_pr_stats\' ORDER BY timestamp');
    console.log('\n🎯 Change visualization to "Time series" to see the trend!');
  }
}

main();
