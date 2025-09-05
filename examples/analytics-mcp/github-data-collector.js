#!/usr/bin/env node

/**
 * Collect real GitHub data for anthropics/claude-code repository
 * Uses GitHub API to get actual PR and issue data
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const MCP_BASE_URL = 'https://analytics-mcp.raydp102.workers.dev';
const GITHUB_API_BASE = 'https://api.github.com';

// GitHub repository to track
const REPO_OWNER = 'anthropics';
const REPO_NAME = 'claude-code';

async function fetchGitHubData(endpoint, params = {}) {
  const url = new URL(`${GITHUB_API_BASE}${endpoint}`);
  
  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  
  console.log(`🔍 Fetching: ${url.pathname}${url.search}`);
  
  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Analytics-MCP-Collector/1.0',
        // Add GitHub token if you have one for higher rate limits
        // 'Authorization': `token ${process.env.GITHUB_TOKEN}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ Fetched ${Array.isArray(data) ? data.length : 1} items`);
    return data;
  } catch (error) {
    console.error('❌ GitHub API error:', error.message);
    return null;
  }
}

async function collectDailyData(date) {
  const dateStr = date.toISOString().split('T')[0];
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = nextDay.toISOString().split('T')[0];
  
  console.log(`\n📅 Collecting data for ${dateStr}...`);
  
  // Collect PRs created that day
  const prsCreated = await fetchGitHubData(`/repos/${REPO_OWNER}/${REPO_NAME}/pulls`, {
    state: 'all',
    sort: 'created',
    direction: 'desc',
    per_page: 100
  });
  
  // Collect issues created that day  
  const issuesCreated = await fetchGitHubData(`/repos/${REPO_OWNER}/${REPO_NAME}/issues`, {
    state: 'all',
    sort: 'created', 
    direction: 'desc',
    per_page: 100
  });
  
  if (!prsCreated || !issuesCreated) {
    return null;
  }
  
  // Filter by creation date
  const dayPRsCreated = prsCreated.filter(pr => 
    pr.created_at.startsWith(dateStr)
  ).length;
  
  const dayPRsMerged = prsCreated.filter(pr => 
    pr.merged_at && pr.merged_at.startsWith(dateStr)
  ).length;
  
  const dayPRsClosed = prsCreated.filter(pr => 
    pr.closed_at && pr.closed_at.startsWith(dateStr) && !pr.merged_at
  ).length;
  
  const dayIssuesCreated = issuesCreated.filter(issue => 
    issue.created_at.startsWith(dateStr) && !issue.pull_request
  ).length;
  
  const dayIssuesClosed = issuesCreated.filter(issue => 
    issue.closed_at && issue.closed_at.startsWith(dateStr) && !issue.pull_request
  ).length;
  
  console.log(`📊 ${dateStr}: PRs(${dayPRsCreated}/${dayPRsMerged}/${dayPRsClosed}) Issues(${dayIssuesCreated}/${dayIssuesClosed})`);
  
  return {
    date: dateStr,
    timestamp: Math.floor(date.getTime() / 1000),
    dimensions: {
      repo: `${REPO_OWNER}/${REPO_NAME}`,
      event_type: 'github_daily_stats',
      date: dateStr,
      batch_id: `github_${Date.now()}`
    },
    metrics: {
      prs_created: dayPRsCreated,
      prs_merged: dayPRsMerged, 
      prs_closed: dayPRsClosed,
      issues_created: dayIssuesCreated,
      issues_closed: dayIssuesClosed
    }
  };
}

async function callMCPTool(client, toolName, args) {
  try {
    const result = await client.callTool({
      name: toolName,
      arguments: args
    });

    if (result.content && result.content.length > 0) {
      const responseData = JSON.parse(result.content[0].text);
      
      if (responseData.success) {
        console.log(`✅ ${toolName} succeeded`);
        return responseData.data || responseData;
      } else {
        console.log(`❌ ${toolName} failed:`, responseData.error);
        return null;
      }
    }
  } catch (error) {
    console.log(`❌ ${toolName} error:`, error.message);
    return null;
  }
}

async function main() {
  console.log(`🐙 Collecting Real GitHub Data for ${REPO_OWNER}/${REPO_NAME}\n`);
  
  const client = new Client({
    name: "github-data-collector",
    version: "1.0.0",
  });

  try {
    console.log('🔌 Connecting to Analytics MCP server...');
    const transport = new SSEClientTransport(new URL(`${MCP_BASE_URL}/sse`));
    await client.connect(transport);
    console.log('✅ Connected\n');

    // Collect data for the last 7 days (GitHub API is rate-limited)
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    
    console.log(`📅 Collecting data for ${days.length} days...`);
    
    const dataPoints = [];
    for (const date of days) {
      const dayData = await collectDailyData(date);
      if (dayData) {
        dataPoints.push(dayData);
      }
      
      // Rate limiting - GitHub allows 60 requests/hour without auth
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    if (dataPoints.length === 0) {
      console.log('❌ No data collected. Check GitHub API access.');
      return;
    }
    
    console.log(`\n📊 Collected ${dataPoints.length} days of real GitHub data`);
    
    // Store in Analytics Engine
    console.log('\n💾 Storing in Analytics Engine...');
    const result = await callMCPTool(client, 'track_batch_metrics', {
      dataset: 'github_stats',
      dataPoints: dataPoints.map(dp => ({
        timestamp: dp.timestamp,
        dimensions: dp.dimensions,
        metrics: dp.metrics
      }))
    });
    
    if (result) {
      console.log(`\n🎉 SUCCESS! Added ${dataPoints.length} days of real GitHub data`);
      
      console.log('\n📊 Query your real GitHub data with:');
      console.log('SELECT blob3, double1, double2, double3, double4, double5');
      console.log('FROM github_stats WHERE blob2 = \'github_daily_stats\'');
      console.log('ORDER BY blob3');
      
      console.log('\n📈 Metrics mapping:');
      console.log('- double1: PRs Created');
      console.log('- double2: PRs Merged');
      console.log('- double3: PRs Closed');
      console.log('- double4: Issues Created');
      console.log('- double5: Issues Closed');
      
      console.log(`\n🎯 Add this to Grafana for real ${REPO_OWNER}/${REPO_NAME} activity!`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

main();
