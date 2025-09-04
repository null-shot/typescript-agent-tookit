#!/usr/bin/env node

const API_TOKEN = 'N0DEQw1v_2FxAdFcVDVmFN2L6IGzDlFMOrU8OjyP';
const ACCOUNT_ID = '59084df56e21d828dcbd5811f81c7754';

async function testQuery(name, sql) {
  console.log(`\n🔍 ${name}`);
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

    const result = await response.text();
    
    if (response.ok) {
      try {
        const json = JSON.parse(result);
        console.log('✅ SUCCESS');
        if (json.data && json.data.length > 0) {
          console.log(`Found ${json.data.length} rows:`);
          json.data.forEach((row, i) => {
            console.log(`  ${i+1}. ${JSON.stringify(row)}`);
          });
        } else {
          console.log('No data returned');
        }
      } catch (e) {
        console.log('✅ SUCCESS (non-JSON response)');
        console.log('Response:', result.substring(0, 200));
      }
    } else {
      console.log('❌ FAILED');
      console.log('Response:', result.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
}

async function main() {
  console.log('🧪 Testing PR Trends Queries...\n');
  
  // Check what blob2 values exist
  await testQuery('Available blob2 values', 'SELECT DISTINCT blob2 FROM github_stats');
  
  // Get PR trends data
  await testQuery('PR Trends Data', 'SELECT * FROM github_stats WHERE blob2 = \'pr_trends\'');
  
  // Try a simple PR trends query for Grafana
  await testQuery('Simple PR Query', 'SELECT blob4, double1, double2, double3 FROM github_stats WHERE blob2 = \'pr_trends\'');
}

main();
