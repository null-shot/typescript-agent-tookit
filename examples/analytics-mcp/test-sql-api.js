#!/usr/bin/env node

/**
 * Test script to verify Cloudflare Analytics Engine SQL API integration
 * This tests the actual API endpoints before using them in MCP
 */

// Configuration - replace with your actual values
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';

async function testAnalyticsSQL(query) {
  if (!ACCOUNT_ID || !API_TOKEN) {
    console.error('❌ Missing credentials!');
    console.log('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN environment variables');
    console.log('Or edit this script to include your credentials');
    return null;
  }

  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/analytics_engine/sql`;
  
  console.log(`🔍 Testing query: ${query}`);
  console.log(`📡 API URL: ${apiUrl}`);
  
  try {
    const response = await fetch(apiUrl, {
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
  console.log('🚀 Testing Cloudflare Analytics Engine SQL API\n');

  // Test 1: Show tables
  console.log('='.repeat(50));
  console.log('TEST 1: Show Tables');
  console.log('='.repeat(50));
  const tables = await testAnalyticsSQL('SHOW TABLES');
  
  if (tables && Array.isArray(tables) && tables.length > 0) {
    console.log(`✅ Found ${tables.length} table(s):`);
    tables.forEach(table => {
      console.log(`  - ${table.name || table.table_name || JSON.stringify(table)}`);
    });
  } else {
    console.log('📝 No tables found yet. Write some data first using track_metric tool.');
  }

  console.log('\n');

  // Test 2: Try to query github_stats if it exists
  if (tables && tables.some(t => (t.name || t.table_name) === 'github_stats')) {
    console.log('='.repeat(50));
    console.log('TEST 2: Query github_stats');
    console.log('='.repeat(50));
    
    await testAnalyticsSQL('SELECT COUNT(*) as total_records FROM github_stats');
    console.log('\n');
    
    await testAnalyticsSQL(`
      SELECT 
        dataset,
        timestamp,
        index1,
        blob1,
        blob2,
        double1,
        double2
      FROM github_stats 
      ORDER BY timestamp DESC 
      LIMIT 5
    `);
  }

  console.log('\n🎯 Next Steps:');
  console.log('1. If tests pass: Your SQL API is working! ✅');
  console.log('2. If no tables: Use track_metric tool in MCP Inspector to write data first');
  console.log('3. If auth fails: Check your CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN');
  console.log('4. Then test query_analytics tool in MCP Inspector');
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
