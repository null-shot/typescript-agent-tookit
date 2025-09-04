#!/usr/bin/env node

const API_TOKEN = 'N0DEQw1v_2FxAdFcVDVmFN2L6IGzDlFMOrU8OjyP';
const ACCOUNT_ID = '59084df56e21d828dcbd5811f81c7754';

async function testQuery(queryName, sql) {
  console.log(`\n🔍 Testing: ${queryName}`);
  console.log(`Query: ${sql}`);
  
  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/analytics_engine/sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'text/plain'
      },
      body: sql
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const result = await response.text();
    
    try {
      const json = JSON.parse(result);
      console.log('Response:', JSON.stringify(json, null, 2));
      
      if (response.ok && (json.data || json.rows >= 0)) {
        console.log('✅ SUCCESS - Query works!');
        return true;
      } else {
        console.log('❌ FAILED');
        return false;
      }
    } catch (e) {
      console.log('Raw response:', result);
      return false;
    }
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 Testing Grafana Queries...');
  
  // Test the current query in Grafana
  const currentQuery = `SELECT 
  blob4 as week_period,
  double1 as prs_created,
  double2 as prs_merged,
  double3 as prs_closed
FROM github_stats 
WHERE blob2 = 'pr_trends'
ORDER BY blob4`;

  await testQuery("Current PR Trends Query", currentQuery);

  // Test repository stats query
  const repoQuery = `SELECT 
  'Stars' as Metric,
  double1 as Value
FROM github_stats 
WHERE blob2 = 'repository_snapshot'
UNION ALL
SELECT 
  'Forks' as Metric,
  double2 as Value
FROM github_stats 
WHERE blob2 = 'repository_snapshot'
UNION ALL
SELECT 
  'Issues' as Metric,
  double3 as Value
FROM github_stats 
WHERE blob2 = 'repository_snapshot'`;

  await testQuery("Repository Stats Query", repoQuery);

  // Test simple data query
  const simpleQuery = `SELECT * FROM github_stats WHERE blob2 = 'pr_trends'`;
  await testQuery("Simple PR Data Query", simpleQuery);
}

main();
