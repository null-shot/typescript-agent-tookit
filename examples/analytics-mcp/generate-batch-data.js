#!/usr/bin/env node

/**
 * Generate batch test data for Analytics MCP using REAL GitHub API data
 * Collects actual repository statistics and creates 30 days of data split into batches
 */

import fs from 'fs';

// Configuration
const CONFIG = {
  batchSize: 10,
  daysBack: 30
};

function getStartDate(daysBack = 30) {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - daysBack);
  return startDate;
}

// GitHub API functions
async function fetchGitHubRepoStats(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  
  console.log(`🔍 Fetching real data for ${owner}/${repo}...`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Analytics-MCP-Batch-Generator/1.0',
        // Optional: Add GitHub token for higher rate limits
        ...(process.env.GITHUB_TOKEN && {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`
        })
      }
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API error for ${owner}/${repo}: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ Real data: ${data.stargazers_count} stars, ${data.forks_count} forks, ${data.open_issues_count} issues`);
    
    return {
      stars: data.stargazers_count,
      forks: data.forks_count, 
      watchers: data.watchers_count,
      open_issues: data.open_issues_count
    };
  } catch (error) {
    throw new Error(`Failed to fetch GitHub data for ${owner}/${repo}: ${error.message}`);
  }
}

async function generateDataPoints(owner, repo, days = 30) {
  // Fetch real GitHub data first
  const realStats = await fetchGitHubRepoStats(owner, repo);
  const repoName = `${owner}/${repo}`;
  
  const dataPoints = [];
  const startDate = getStartDate(days);
  
  for (let i = 0; i < days; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const dateStr = currentDate.toISOString().split('T')[0];
    
    const daysSinceStart = i;
    
    // Generate realistic daily variations based on real current stats
    // Generate realistic historical progression leading to current real values
    // Note: GitHub API only provides current snapshots, so we simulate realistic daily progression
    const avgDailyStarGrowth = Math.max(1, Math.floor(realStats.stars / 365)); // Rough daily growth
    const avgDailyForkGrowth = Math.max(0, Math.floor(realStats.forks / 365));
    const avgDailyWatcherGrowth = Math.max(0, Math.floor(realStats.watchers / 365));
    
    // Calculate historical totals by working backwards from current real values
    const starsTotal = Math.max(1, realStats.stars - ((29 - i) * avgDailyStarGrowth));
    const forksTotal = Math.max(1, realStats.forks - ((29 - i) * avgDailyForkGrowth));
    const watchersTotal = Math.max(1, realStats.watchers - ((29 - i) * avgDailyWatcherGrowth));
    
    // Simulate daily activity (PRs, issues) based on repo size
    const repoActivityLevel = Math.min(10, Math.floor(realStats.stars / 5000) + 1);
    const prsCreated = Math.floor(Math.random() * repoActivityLevel) + 1;
    const prsMerged = Math.floor(prsCreated * (0.6 + Math.random() * 0.3)); // 60-90% merge rate
    const prsClosed = prsCreated - prsMerged;
    const issuesOpened = Math.floor(Math.random() * repoActivityLevel) + 1;
    const issuesClosed = Math.floor(issuesOpened * (0.7 + Math.random() * 0.2)); // 70-90% close rate
    
    dataPoints.push({
      dimensions: {
        repo: repoName,
        event_type: 'github_real_30days',
        date: dateStr,
        batch_id: `${owner}_${repo}_batch_${Date.now()}`,
        data_source: 'github_api_with_simulated_progression'
      },
      metrics: {
        stars_total: starsTotal,
        forks_total: forksTotal,
        watchers_total: watchersTotal,
        prs_created: prsCreated,
        prs_merged: prsMerged,
        prs_closed: prsClosed,
        issues_opened: issuesOpened,
        issues_closed: issuesClosed,
        current_open_issues: realStats.open_issues
      },
      timestamp: currentDate.getTime()
    });
  }
  
  return dataPoints;
}

function splitIntoBatches(dataPoints, batchSize) {
  const batches = [];
  for (let i = 0; i < dataPoints.length; i += batchSize) {
    batches.push(dataPoints.slice(i, i + batchSize));
  }
  return batches;
}

function saveDataFiles(owner, repo, batches) {
  const repoName = `${owner}/${repo}`;
  console.log(`\n📊 Generating data for ${repoName} (real GitHub data):`);
  
  const prefix = `${owner}_${repo.replace('-', '_')}`;
  
  batches.forEach((batch, index) => {
    const filename = `${prefix}_batch_${index + 1}.json`;
    fs.writeFileSync(filename, JSON.stringify(batch, null, 2));
    console.log(`✅ ${filename}: ${batch.length} records`);
  });
  
  return { batchCount: batches.length, prefix };
}

async function main() {
  const args = process.argv.slice(2);
  const [owner, repo] = args;
  
  console.log('🚀 Analytics MCP Batch Data Generator (Real GitHub Data)');
  console.log('=========================================================');
  
  if (process.env.GITHUB_TOKEN) {
    console.log('🔑 Using GitHub token for higher rate limits');
  } else {
    console.log('⚠️  No GITHUB_TOKEN found - using anonymous requests (lower rate limits)');
  }
  
  // Validate arguments
  if (!owner || !repo) {
    console.error('❌ Usage: node generate-batch-data.js <owner> <repo>');
    console.log('\n📋 Examples:');
    console.log('   node generate-batch-data.js anthropics claude-code');
    console.log('   node generate-batch-data.js null-shot typescript-agent-framework');
    console.log('   node generate-batch-data.js facebook react');
    console.log('   node generate-batch-data.js microsoft vscode');
    process.exit(1);
  }
  
  try {
    const dataPoints = await generateDataPoints(owner, repo);
    const batches = splitIntoBatches(dataPoints, CONFIG.batchSize);
    
    const result = saveDataFiles(owner, repo, batches);
    
    console.log(`\n🎯 Generated ${dataPoints.length} data points in ${result.batchCount} batches`);
    console.log(`📁 Files: ${result.prefix}_batch_1.json to ${result.prefix}_batch_${result.batchCount}.json`);
    
    console.log('\n📋 Next steps:');
    console.log('1. Open each batch file and copy the JSON array');
    console.log('2. Use track_batch_metrics in MCP Inspector (production SSE)');
    console.log('3. Process all batches (10 records each)');
    console.log('4. Verify with query_analytics tool');
    
    console.log('\n🎉 Success! Generated batch files with real GitHub API data');
    
  } catch (error) {
    console.error(`❌ Error generating data: ${error.message}`);
    process.exit(1);
  }
}

// Run main function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateDataPoints, splitIntoBatches };
