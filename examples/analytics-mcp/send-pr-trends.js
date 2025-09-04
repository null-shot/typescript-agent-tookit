#!/usr/bin/env node

/**
 * Script to send PR trend data to Analytics MCP
 * This demonstrates how to use the track_batch_metrics tool programmatically
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const GITHUB_REPO = 'null-shot/typescript-agent-framework';

// Sample PR trend data from our collector
const prTrendData = {
  repository: {
    dataset: "github_stats",
    dimensions: {
      repo: GITHUB_REPO,
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
        repo: GITHUB_REPO,
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
        repo: GITHUB_REPO,
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
        repo: GITHUB_REPO,
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
        repo: GITHUB_REPO,
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

async function sendToMCP() {
  console.log('📊 Sending PR trend data to Analytics MCP...');
  
  // Prepare batch payload
  const batchPayload = {
    dataset: 'github_stats',
    dataPoints: [
      {
        dimensions: prTrendData.repository.dimensions,
        metrics: prTrendData.repository.metrics,
        timestamp: Date.now()
      },
      ...prTrendData.prTrends.map(trend => ({
        dimensions: trend.dimensions,
        metrics: trend.metrics,
        timestamp: Date.now()
      }))
    ]
  };

  console.log('\n🎯 Batch Payload for track_batch_metrics:');
  console.log(JSON.stringify(batchPayload, null, 2));
  
  console.log('\n✅ Ready to send to MCP Inspector!');
  console.log('📋 Copy the payload above and use track_batch_metrics tool');
  
  // Also create individual payloads for manual testing
  console.log('\n📝 Individual Payloads (for track_metric tool):');
  console.log('\n1. Repository Snapshot:');
  console.log(JSON.stringify(prTrendData.repository, null, 2));
  
  prTrendData.prTrends.forEach((trend, index) => {
    console.log(`\n${index + 2}. PR Trend - ${trend.dimensions.week}:`);
    console.log(JSON.stringify(trend, null, 2));
  });

  return batchPayload;
}

async function main() {
  try {
    const payload = await sendToMCP();
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Open MCP Inspector: http://localhost:6274');
    console.log('2. Use track_batch_metrics tool with the batch payload above');
    console.log('3. Or use track_metric tool with individual payloads');
    console.log('4. Query the data with query_analytics tool');
    console.log('5. View trends in the dashboard.html');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { prTrendData, sendToMCP };
