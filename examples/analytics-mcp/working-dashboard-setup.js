#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const client = new Client({ name: 'dashboard-setup', version: '1.0.0' });
const transport = new SSEClientTransport(new URL('https://analytics-mcp.raydp102.workers.dev/sse'));

await client.connect(transport);

console.log('📊 Working Dashboard Setup for Multiple Repositories\n');

// Query GitHub data without aliases (working approach)
const result = await client.callTool({
  name: 'query_analytics',
  arguments: {
    sql: 'SELECT blob1, blob2, blob3, double1, double2, double3, double4, double5 FROM github_stats WHERE blob2 = "github_daily_stats" ORDER BY blob1, blob3'
  }
});

const data = JSON.parse(result.content[0].text);
if (data.success && data.data.data.length > 0) {
  console.log('✅ GitHub Repository Data Found!\n');
  console.log('Repository                        | Date       | PRs C | PRs M | PRs X | Issues C | Issues X');
  console.log('----------------------------------|------------|-------|-------|-------|----------|----------');
  
  data.data.data.forEach(row => {
    console.log(`${row.blob1.padEnd(33)} | ${row.blob3} | ${String(row.double1).padStart(5)} | ${String(row.double2).padStart(5)} | ${String(row.double3).padStart(5)} | ${String(row.double4).padStart(8)} | ${String(row.double5).padStart(8)}`);
  });
  
  // Group by repository
  const repos = [...new Set(data.data.data.map(row => row.blob1))];
  console.log(`\n🏢 Found ${repos.length} repositories: ${repos.join(', ')}\n`);
  
  console.log('🎯 GRAFANA DASHBOARD SETUP:\n');
  
  // Panel 1: NullShot
  const nullshotRepo = repos.find(repo => repo.includes('null-shot'));
  if (nullshotRepo) {
    console.log('📊 PANEL 1: NullShot Repository');
    console.log('Query:');
    console.log(`SELECT blob3, double1, double2, double3, double4, double5`);
    console.log(`FROM github_stats`);
    console.log(`WHERE blob1 = '${nullshotRepo}' AND blob2 = 'github_daily_stats'`);
    console.log(`ORDER BY blob3\n`);
  }
  
  // Panel 2: Anthropics  
  const anthropicsRepo = repos.find(repo => repo.includes('anthropics'));
  if (anthropicsRepo) {
    console.log('📊 PANEL 2: Anthropics Repository');
    console.log('Query:');
    console.log(`SELECT blob3, double1, double2, double3, double4, double5`);
    console.log(`FROM github_stats`);
    console.log(`WHERE blob1 = '${anthropicsRepo}' AND blob2 = 'github_daily_stats'`);
    console.log(`ORDER BY blob3\n`);
  }
  
  console.log('🎨 GRAFANA CONFIGURATION:\n');
  console.log('For each panel:');
  console.log('1. Time field: blob3');
  console.log('2. Value fields: double1, double2, double3, double4, double5');
  console.log('3. Field overrides:');
  console.log('   - double1 → "PRs Created" (Green)');
  console.log('   - double2 → "PRs Merged" (Blue)');
  console.log('   - double3 → "PRs Closed" (Orange)');
  console.log('   - double4 → "Issues Created" (Purple)');
  console.log('   - double5 → "Issues Closed" (Red)');
  console.log('4. Panel titles:');
  console.log(`   - Panel 1: "${nullshotRepo || 'NullShot'} Activity"`);
  console.log(`   - Panel 2: "${anthropicsRepo || 'Anthropics'} Activity"`);
  
  // Show sample data for each repo
  repos.forEach(repo => {
    const repoData = data.data.data.filter(row => row.blob1 === repo);
    console.log(`\n📈 ${repo} Sample Data:`);
    repoData.slice(0, 3).forEach(row => {
      console.log(`  ${row.blob3}: ${row.double1} PRs created, ${row.double4} issues created`);
    });
  });
  
} else {
  console.log('❌ No GitHub data found');
  console.log('Run: node github-multi-repo-collector.js');
}

await client.close();
