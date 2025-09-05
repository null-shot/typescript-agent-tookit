#!/usr/bin/env node

/**
 * Complete setup verification - test all components work end-to-end
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const DEPLOYED_URL = 'https://analytics-mcp.raydp102.workers.dev';

async function testMCPConnection() {
  console.log('🔌 Testing MCP Connection...');
  
  const client = new Client({
    name: "setup-verification",
    version: "1.0.0",
  });

  try {
    const transport = new SSEClientTransport(new URL(`${DEPLOYED_URL}/sse`));
    await client.connect(transport);
    console.log('✅ MCP connection successful');
    
    // Test tools
    const tools = await client.listTools();
    console.log(`✅ Found ${tools.tools.length} MCP tools: ${tools.tools.map(t => t.name).join(', ')}`);
    
    await client.close();
    return true;
  } catch (error) {
    console.error('❌ MCP connection failed:', error.message);
    return false;
  }
}

async function testGrafanaEndpoint() {
  console.log('\n🔍 Testing Grafana HTTP Endpoint...');
  
  try {
    // Test health endpoint
    const healthResponse = await fetch(`${DEPLOYED_URL}/grafana/health`);
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ Health endpoint working:', health.status);
    } else {
      console.log('❌ Health endpoint failed:', healthResponse.status);
      return false;
    }
    
    // Test query endpoint
    const sql = encodeURIComponent("SELECT blob3, double1 FROM github_stats WHERE blob2 = 'daily_pr_stats_clean' ORDER BY blob3 LIMIT 3");
    const queryResponse = await fetch(`${DEPLOYED_URL}/grafana/query?sql=${sql}`);
    
    if (queryResponse.ok) {
      const result = await queryResponse.json();
      if (result.success && result.data.length > 0) {
        console.log(`✅ Query endpoint working: ${result.data.length} rows returned`);
        console.log('Sample data:', result.data[0]);
        return true;
      } else {
        console.log('❌ Query returned no data');
        return false;
      }
    } else {
      console.log('❌ Query endpoint failed:', queryResponse.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Grafana endpoint test failed:', error.message);
    return false;
  }
}

async function testDataAvailability() {
  console.log('\n📊 Testing Data Availability...');
  
  const client = new Client({
    name: "data-verification",
    version: "1.0.0",
  });

  try {
    const transport = new SSEClientTransport(new URL(`${DEPLOYED_URL}/sse`));
    await client.connect(transport);
    
    // Check available datasets
    const datasets = ['daily_pr_stats_clean', 'github_star_cumulative'];
    const results = {};
    
    for (const dataset of datasets) {
      const result = await client.callTool({
        name: 'query_analytics',
        arguments: {
          sql: `SELECT COUNT(*) as count FROM github_stats WHERE blob2 = '${dataset}'`
        }
      });
      
      const data = JSON.parse(result.content[0].text);
      if (data.success && data.data.data.length > 0) {
        const count = data.data.data[0]['COUNT(*)'] || data.data.data[0].count || 'unknown';
        results[dataset] = count;
        console.log(`✅ ${dataset}: ${count} rows`);
      } else {
        results[dataset] = 0;
        console.log(`❌ ${dataset}: No data`);
      }
    }
    
    await client.close();
    
    const hasData = Object.values(results).some(count => count > 0);
    if (hasData) {
      console.log('✅ Analytics data is available for dashboards');
      return true;
    } else {
      console.log('❌ No analytics data found - run data loading scripts');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Data availability test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 COMPLETE SETUP VERIFICATION\n');
  console.log('Testing all components for end-to-end functionality...\n');
  
  const tests = [
    { name: 'MCP Connection', test: testMCPConnection },
    { name: 'Grafana Endpoint', test: testGrafanaEndpoint },
    { name: 'Data Availability', test: testDataAvailability }
  ];
  
  const results = [];
  
  for (const { name, test } of tests) {
    const success = await test();
    results.push({ name, success });
  }
  
  console.log('\n📋 VERIFICATION SUMMARY:');
  console.log('='.repeat(50));
  
  let allPassed = true;
  results.forEach(({ name, success }) => {
    const status = success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${name}`);
    if (!success) allPassed = false;
  });
  
  console.log('='.repeat(50));
  
  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ Your Analytics MCP setup is ready for dashboard creation');
    console.log('✅ Users can follow the README guide successfully');
    console.log('✅ Grafana Cloud integration will work');
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. ✅ MCP Inspector: Ready for testing tools');
    console.log('2. ✅ Grafana Integration: Endpoints working');
    console.log('3. ✅ Sample Data: Available for visualization');
    console.log('4. 🔄 Resume Grafana Cloud setup with working endpoints');
    
    console.log('\n📊 GRAFANA CLOUD SETUP:');
    console.log('- Data Source URL: https://analytics-mcp.raydp102.workers.dev/grafana/query');
    console.log('- Method: GET');
    console.log('- Query Parameter: sql');
    console.log('- Example: ?sql=SELECT blob3, double1 as StarCount FROM github_stats WHERE blob2 = \'daily_pr_stats_clean\' ORDER BY blob3');
  } else {
    console.log('\n❌ SETUP ISSUES FOUND');
    console.log('Please fix the failing tests before proceeding with Grafana Cloud setup');
  }
}

main();
