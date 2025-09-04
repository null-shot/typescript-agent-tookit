#!/usr/bin/env node

/**
 * Direct test of Cloudflare Analytics Engine SQL API
 * This bypasses the MCP layer to test the raw API
 */

const ACCOUNT_ID = '59084df56e21d828dcbd5811f81c7754';
const API_TOKEN = process.env.CF_API_TOKEN || 'your-api-token-here';
const API_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/analytics_engine/sql`;

async function testAnalyticsAPI(query) {
  console.log(`🔍 Testing query: ${query}`);
  console.log(`📡 API URL: ${API_URL}`);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'text/plain'
      },
      body: query
    });

    console.log(`📊 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${errorText}`);
      return null;
    }

    const result = await response.json();
    console.log('✅ Query successful!');
    console.log('📋 Result:', JSON.stringify(result, null, 2));
    return result;

  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Testing Cloudflare Analytics Engine SQL API Direct Access\n');

  // Test 1: Show tables
  console.log('='.repeat(60));
  console.log('TEST 1: Show Tables');
  console.log('='.repeat(60));
  await testAnalyticsAPI('SHOW TABLES');

  console.log('\n');

  // Test 2: Count records with sampling
  console.log('='.repeat(60));
  console.log('TEST 2: Count Records (Sampling Aware)');
  console.log('='.repeat(60));
  await testAnalyticsAPI('SELECT SUM(_sample_interval) as total_data_points FROM github_stats');

  console.log('\n');

  // Test 3: Grafana-style time-series query
  console.log('='.repeat(60));
  console.log('TEST 3: Grafana Time-Series Query');
  console.log('='.repeat(60));
  const grafanaQuery = `
    SELECT
      intDiv(toUInt32(timestamp), 3600) * 3600 AS t,
      blob2 as metric_type,
      blob4 as week,
      SUM(_sample_interval * double1) AS prs_created,
      SUM(_sample_interval * double2) AS prs_merged,
      SUM(_sample_interval * double3) AS prs_closed
    FROM github_stats
    WHERE timestamp > NOW() - INTERVAL '7' DAY
      AND blob1 = 'pr_trends'
    GROUP BY metric_type, week, t
    ORDER BY t, week
  `;
  await testAnalyticsAPI(grafanaQuery);

  console.log('\n');

  // Test 4: Repository metrics
  console.log('='.repeat(60));
  console.log('TEST 4: Repository Snapshot Data');
  console.log('='.repeat(60));
  const repoQuery = `
    SELECT
      blob1 as repo,
      blob2 as metric_type,
      double1 as stars,
      double2 as forks,
      double3 as watchers,
      double4 as open_issues,
      timestamp
    FROM github_stats
    WHERE blob1 = 'repository_snapshot'
    ORDER BY timestamp DESC
    LIMIT 5
  `;
  await testAnalyticsAPI(repoQuery);

  console.log('\n🎯 Next Steps:');
  console.log('1. If all tests pass: Your API is ready for Grafana! ✅');
  console.log('2. Set up Grafana with Altinity ClickHouse plugin');
  console.log('3. Use the URL above and your API token');
  console.log('4. Create dashboards with the time-series queries shown');
}

// Check if API token is set
if (!process.env.CF_API_TOKEN) {
  console.log('⚠️  CF_API_TOKEN environment variable not set');
  console.log('Set it with: export CF_API_TOKEN="your-token-here"');
  console.log('Or edit this script to include your token directly');
}

main().catch(console.error);
