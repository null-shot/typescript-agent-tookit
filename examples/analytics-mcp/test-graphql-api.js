#!/usr/bin/env node

/**
 * Test Cloudflare GraphQL API to see if it can access Analytics Engine data
 */

const API_TOKEN = 'N0DEQw1v_2FxAdFcVDVmFN2L6IGzDlFMOrU8OjyP';
const ACCOUNT_ID = '59084df56e21d828dcbd5811f81c7754';

async function testGraphQLAPI() {
  console.log('🧪 Testing Cloudflare GraphQL Analytics API...\n');
  
  // Test 1: Basic introspection
  const introspectionQuery = `
    query {
      __schema {
        types {
          name
        }
      }
    }
  `;
  
  console.log('📋 Test 1: Schema introspection');
  await runGraphQLQuery('Schema Check', introspectionQuery);
  
  // Test 2: Check available datasets
  const datasetsQuery = `
    query {
      viewer {
        accounts(filter: {accountTag: "${ACCOUNT_ID}"}) {
          analyticsEngine {
            datasets {
              name
              description
            }
          }
        }
      }
    }
  `;
  
  console.log('\n📋 Test 2: Analytics Engine datasets');
  await runGraphQLQuery('Datasets Check', datasetsQuery);
  
  // Test 3: Try to query github_stats data
  const dataQuery = `
    query {
      viewer {
        accounts(filter: {accountTag: "${ACCOUNT_ID}"}) {
          analyticsEngine {
            datasets(filter: {name: "github_stats"}) {
              name
              data(limit: 5) {
                timestamp
                dimensions
                metrics
              }
            }
          }
        }
      }
    }
  `;
  
  console.log('\n📋 Test 3: github_stats data query');
  await runGraphQLQuery('Data Query', dataQuery);
}

async function runGraphQLQuery(testName, query) {
  try {
    const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    const result = await response.json();
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (result.data) {
      console.log('✅ SUCCESS');
      console.log('Response:', JSON.stringify(result.data, null, 2));
    } else if (result.errors) {
      console.log('❌ GraphQL Errors:');
      result.errors.forEach(error => console.log(`   ${error.message}`));
    } else {
      console.log('❌ Unexpected response format');
      console.log(JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
}

testGraphQLAPI();
