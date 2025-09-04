#!/usr/bin/env node

/**
 * Simple API test - you'll need to manually set your API token
 */

// REPLACE THIS WITH YOUR ACTUAL API TOKEN
const API_TOKEN = 'YOUR_API_TOKEN_HERE';

const ACCOUNT_ID = '59084df56e21d828dcbd5811f81c7754';
const API_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/analytics_engine/sql`;

async function testAPI() {
  if (API_TOKEN === 'YOUR_API_TOKEN_HERE') {
    console.log('❌ Please edit this script and set your API_TOKEN');
    console.log('You can find your token in the Cloudflare dashboard:');
    console.log('1. Go to https://dash.cloudflare.com/profile/api-tokens');
    console.log('2. Find your "Analytics MCP SQL API" token');
    console.log('3. Copy it and replace YOUR_API_TOKEN_HERE in this script');
    return;
  }

  console.log('🧪 Testing Analytics Engine SQL API...');
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'text/plain'
      },
      body: 'SELECT COUNT() FROM github_stats'
    });

    console.log(`Status: ${response.status}`);
    const result = await response.text();
    console.log('Response:', result);

    if (response.ok) {
      console.log('✅ API connection successful!');
      console.log('🎯 Ready for Grafana setup!');
    } else {
      console.log('❌ API connection failed');
      console.log('Check your API token and permissions');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();
