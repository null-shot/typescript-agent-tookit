#!/usr/bin/env node

/**
 * Direct API test without wrangler secrets
 * Run with: node test-api-direct.js YOUR_API_TOKEN_HERE
 */

const API_TOKEN = process.argv[2];
const ACCOUNT_ID = '59084df56e21d828dcbd5811f81c7754';

if (!API_TOKEN || API_TOKEN === 'YOUR_API_TOKEN_HERE') {
  console.log('❌ Usage: node test-api-direct.js YOUR_API_TOKEN');
  console.log('');
  console.log('Get your token from: https://dash.cloudflare.com/profile/api-tokens');
  process.exit(1);
}

async function testAPI() {
  console.log('🧪 Testing Cloudflare Analytics Engine API...');
  console.log(`Account ID: ${ACCOUNT_ID}`);
  console.log(`Token (first 10 chars): ${API_TOKEN.substring(0, 10)}...`);
  console.log('');

  const tests = [
    { name: 'SHOW TABLES', query: 'SHOW TABLES' },
    { name: 'Count Records', query: 'SELECT COUNT() FROM github_stats' },
    { name: 'Sample Data', query: 'SELECT * FROM github_stats LIMIT 2' }
  ];

  for (const test of tests) {
    console.log(`🔍 Test: ${test.name}`);
    console.log(`Query: ${test.query}`);
    
    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/analytics_engine/sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'text/plain'
        },
        body: test.query
      });

      console.log(`Status: ${response.status} ${response.statusText}`);
      
      const result = await response.text();
      
      try {
        const json = JSON.parse(result);
        console.log('Response:', JSON.stringify(json, null, 2));
        
        // Analytics Engine returns data directly, not wrapped in success/error
        if (response.ok && (json.data || json.rows >= 0)) {
          console.log('✅ SUCCESS - API is working!');
        } else if (json.errors) {
          console.log('❌ FAILED');
          json.errors.forEach(err => console.log(`   Error ${err.code}: ${err.message}`));
        } else {
          console.log('✅ SUCCESS - Got valid response');
        }
      } catch (e) {
        console.log('Raw response:', result);
      }
      
    } catch (error) {
      console.log('❌ ERROR:', error.message);
    }
    
    console.log('');
  }
}

testAPI();
