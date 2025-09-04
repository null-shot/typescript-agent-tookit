#!/usr/bin/env node

/**
 * End-to-End Test for Analytics MCP
 * Tests the complete workflow: write data → query data → list datasets
 */

const MCP_SERVER_URL = 'https://analytics-mcp.raydp102.workers.dev';

// Test data - GitHub PR trends from our collector
const testData = {
  repository: {
    dataset: "github_stats",
    dimensions: {
      repo: "null-shot/typescript-agent-framework",
      metric_type: "repository_snapshot",
      date: "2025-09-04",
      language: "TypeScript",
      branch: "main"
    },
    metrics: {
      stars: 5,
      forks: 4,
      watchers: 5,
      open_issues: 40,
      size_kb: 1700,
      contributors_count: 5,
      network_count: 4,
      subscribers_count: 0,
      prs_open: 3,
      prs_total: 43,
      prs_merged_total: 34
    }
  },
  prTrends: [
    {
      dataset: "github_stats",
      dimensions: {
        repo: "null-shot/typescript-agent-framework",
        metric_type: "pr_trends",
        date: "2025-09-04",
        week: "week_4_ago"
      },
      metrics: {
        prs_created: 0,
        prs_merged: 1,
        prs_closed: 0
      }
    },
    {
      dataset: "github_stats",
      dimensions: {
        repo: "null-shot/typescript-agent-framework",
        metric_type: "pr_trends",
        date: "2025-09-04",
        week: "week_3_ago"
      },
      metrics: {
        prs_created: 4,
        prs_merged: 5,
        prs_closed: 0
      }
    },
    {
      dataset: "github_stats",
      dimensions: {
        repo: "null-shot/typescript-agent-framework",
        metric_type: "pr_trends",
        date: "2025-09-04",
        week: "week_2_ago"
      },
      metrics: {
        prs_created: 13,
        prs_merged: 8,
        prs_closed: 4
      }
    },
    {
      dataset: "github_stats",
      dimensions: {
        repo: "null-shot/typescript-agent-framework",
        metric_type: "pr_trends",
        date: "2025-09-04",
        week: "last_week"
      },
      metrics: {
        prs_created: 7,
        prs_merged: 6,
        prs_closed: 0
      }
    }
  ]
};

async function callMCPTool(toolName, args) {
  console.log(`\n🔧 Calling tool: ${toolName}`);
  console.log(`📋 Args:`, JSON.stringify(args, null, 2));
  
  try {
    const response = await fetch(`${MCP_SERVER_URL}/tools/${toolName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP ${response.status}: ${errorText}`);
      return null;
    }

    const result = await response.json();
    console.log(`✅ Result:`, JSON.stringify(result, null, 2));
    return result;

  } catch (error) {
    console.error(`❌ Error calling ${toolName}:`, error.message);
    return null;
  }
}

async function testEndToEnd() {
  console.log('🚀 Analytics MCP End-to-End Test');
  console.log('='.repeat(50));
  
  // Step 1: List datasets (should be empty initially)
  console.log('\n📊 STEP 1: List datasets (before writing data)');
  console.log('='.repeat(30));
  const initialDatasets = await callMCPTool('list_datasets', {});
  
  // Step 2: Write batch data
  console.log('\n📝 STEP 2: Write batch PR trend data');
  console.log('='.repeat(30));
  const batchPayload = {
    dataset: 'github_stats',
    dataPoints: [
      {
        dimensions: testData.repository.dimensions,
        metrics: testData.repository.metrics,
        timestamp: Date.now()
      },
      ...testData.prTrends.map(trend => ({
        dimensions: trend.dimensions,
        metrics: trend.metrics,
        timestamp: Date.now()
      }))
    ]
  };
  
  const writeResult = await callMCPTool('track_batch_metrics', batchPayload);
  
  if (!writeResult) {
    console.error('❌ Failed to write data. Stopping test.');
    return;
  }
  
  // Step 3: List datasets (should show github_stats now)
  console.log('\n📊 STEP 3: List datasets (after writing data)');
  console.log('='.repeat(30));
  const updatedDatasets = await callMCPTool('list_datasets', {});
  
  // Step 4: Query the data back
  console.log('\n🔍 STEP 4: Query data with SHOW TABLES');
  console.log('='.repeat(30));
  const showTables = await callMCPTool('query_analytics', {
    sql: 'SHOW TABLES'
  });
  
  // Step 5: Count records
  console.log('\n🔢 STEP 5: Count records in github_stats');
  console.log('='.repeat(30));
  const countRecords = await callMCPTool('query_analytics', {
    sql: 'SELECT COUNT(*) as total_records FROM github_stats'
  });
  
  // Step 6: Query PR trends specifically
  console.log('\n📈 STEP 6: Query PR trends data');
  console.log('='.repeat(30));
  const prTrendsQuery = await callMCPTool('query_analytics', {
    sql: `
      SELECT 
        dataset,
        index1 as repo,
        blob1 as metric_type,
        blob2 as week,
        double1 as prs_created,
        double2 as prs_merged,
        double3 as prs_closed,
        timestamp
      FROM github_stats 
      WHERE blob1 = 'pr_trends'
      ORDER BY timestamp DESC
      LIMIT 10
    `
  });
  
  // Step 7: Query repository snapshot
  console.log('\n🏢 STEP 7: Query repository snapshot');
  console.log('='.repeat(30));
  const repoQuery = await callMCPTool('query_analytics', {
    sql: `
      SELECT 
        dataset,
        index1 as repo,
        blob1 as metric_type,
        double1 as stars,
        double2 as forks,
        double3 as watchers,
        double4 as open_issues,
        timestamp
      FROM github_stats 
      WHERE blob1 = 'repository_snapshot'
      ORDER BY timestamp DESC
      LIMIT 5
    `
  });
  
  // Summary
  console.log('\n🎯 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Data written: ${writeResult ? 'SUCCESS' : 'FAILED'}`);
  console.log(`✅ Datasets listed: ${updatedDatasets ? 'SUCCESS' : 'FAILED'}`);
  console.log(`✅ Tables shown: ${showTables ? 'SUCCESS' : 'FAILED'}`);
  console.log(`✅ Records counted: ${countRecords ? 'SUCCESS' : 'FAILED'}`);
  console.log(`✅ PR trends queried: ${prTrendsQuery ? 'SUCCESS' : 'FAILED'}`);
  console.log(`✅ Repository queried: ${repoQuery ? 'SUCCESS' : 'FAILED'}`);
  
  if (countRecords && countRecords.data && countRecords.data.length > 0) {
    const recordCount = countRecords.data[0].total_records;
    console.log(`\n📊 Total records in database: ${recordCount}`);
  }
  
  console.log('\n🎉 End-to-End test completed!');
  console.log('📋 You can now use MCP Inspector to interact with this data:');
  console.log('   • Use list_datasets tool');
  console.log('   • Use query_analytics tool with custom SQL');
  console.log('   • Use track_metric tool to add more data');
}

// Run the test
testEndToEnd().catch(console.error);
