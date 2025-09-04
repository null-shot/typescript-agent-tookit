#!/usr/bin/env node

const API_TOKEN = 'N0DEQw1v_2FxAdFcVDVmFN2L6IGzDlFMOrU8OjyP';
const ACCOUNT_ID = '59084df56e21d828dcbd5811f81c7754';

async function checkBlob2Values() {
  console.log('🔍 Checking what blob2 values exist in your data...\n');
  
  const query = 'SELECT DISTINCT blob2 FROM github_stats';
  
  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/analytics_engine/sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'text/plain'
      },
      body: query
    });

    const result = await response.json();
    
    if (result.data) {
      console.log('Available blob2 values:');
      result.data.forEach((row, index) => {
        console.log(`${index + 1}. "${row.blob2}"`);
      });
      
      console.log('\n📊 Use one of these values in your WHERE clause:');
      result.data.forEach(row => {
        console.log(`   WHERE blob2 = '${row.blob2}'`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkBlob2Values();
