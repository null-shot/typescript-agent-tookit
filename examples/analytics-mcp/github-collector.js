#!/usr/bin/env node

/**
 * GitHub Statistics Collector for Analytics MCP
 * 
 * This script demonstrates the real value of Analytics Engine by:
 * 1. Fetching live GitHub repository statistics
 * 2. Sending them to our Analytics MCP server
 * 3. Building a time-series dataset for analysis
 */

const ANALYTICS_MCP_URL = 'https://analytics-mcp.raydp102.workers.dev';
const GITHUB_REPO = 'null-shot/typescript-agent-framework';

function analyzePRTrends(allPRs, fourWeeksAgo, twoWeeksAgo, oneWeekAgo, now) {
  const trends = {
    week1: { created: 0, merged: 0, closed: 0 }, // 4 weeks ago
    week2: { created: 0, merged: 0, closed: 0 }, // 3 weeks ago  
    week3: { created: 0, merged: 0, closed: 0 }, // 2 weeks ago
    week4: { created: 0, merged: 0, closed: 0 }, // last week
    current: { open: 0, draft: 0, total: 0 }
  };

  allPRs.forEach(pr => {
    const createdDate = new Date(pr.created_at);
    const closedDate = pr.closed_at ? new Date(pr.closed_at) : null;
    const mergedDate = pr.merged_at ? new Date(pr.merged_at) : null;

    // Count PRs created in each week
    if (createdDate >= fourWeeksAgo && createdDate < fourWeeksAgo.getTime() + (7 * 24 * 60 * 60 * 1000)) {
      trends.week1.created++;
    } else if (createdDate >= twoWeeksAgo.getTime() - (7 * 24 * 60 * 60 * 1000) && createdDate < twoWeeksAgo) {
      trends.week2.created++;
    } else if (createdDate >= twoWeeksAgo && createdDate < oneWeekAgo) {
      trends.week3.created++;
    } else if (createdDate >= oneWeekAgo && createdDate < now) {
      trends.week4.created++;
    }

    // Count PRs merged/closed in each week
    if (mergedDate) {
      if (mergedDate >= fourWeeksAgo && mergedDate < fourWeeksAgo.getTime() + (7 * 24 * 60 * 60 * 1000)) {
        trends.week1.merged++;
      } else if (mergedDate >= twoWeeksAgo.getTime() - (7 * 24 * 60 * 60 * 1000) && mergedDate < twoWeeksAgo) {
        trends.week2.merged++;
      } else if (mergedDate >= twoWeeksAgo && mergedDate < oneWeekAgo) {
        trends.week3.merged++;
      } else if (mergedDate >= oneWeekAgo && mergedDate < now) {
        trends.week4.merged++;
      }
    } else if (closedDate) {
      if (closedDate >= fourWeeksAgo && closedDate < fourWeeksAgo.getTime() + (7 * 24 * 60 * 60 * 1000)) {
        trends.week1.closed++;
      } else if (closedDate >= twoWeeksAgo.getTime() - (7 * 24 * 60 * 60 * 1000) && closedDate < twoWeeksAgo) {
        trends.week2.closed++;
      } else if (closedDate >= twoWeeksAgo && closedDate < oneWeekAgo) {
        trends.week3.closed++;
      } else if (closedDate >= oneWeekAgo && closedDate < now) {
        trends.week4.closed++;
      }
    }

    // Count current state
    if (pr.state === 'open') {
      trends.current.open++;
      if (pr.draft) {
        trends.current.draft++;
      }
    }
    trends.current.total++;
  });

  return trends;
}

async function fetchGitHubStats() {
  try {
    // Fetch repository data from GitHub API
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`);
    const repo = await response.json();
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${repo.message}`);
    }

    // Calculate date ranges for 4-week trend analysis
    const now = new Date();
    const fourWeeksAgo = new Date(now.getTime() - (28 * 24 * 60 * 60 * 1000));
    const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
    const oneWeekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

    // Fetch detailed PR data for trend analysis
    const [
      contributorsResponse,
      allPRsResponse,
      recentPRsResponse,
      openPRsResponse,
      closedPRsResponse
    ] = await Promise.all([
      fetch(`https://api.github.com/repos/${GITHUB_REPO}/contributors?per_page=100`),
      fetch(`https://api.github.com/repos/${GITHUB_REPO}/pulls?state=all&per_page=100&sort=created&direction=desc`),
      fetch(`https://api.github.com/repos/${GITHUB_REPO}/pulls?state=all&per_page=100&sort=updated&direction=desc`),
      fetch(`https://api.github.com/repos/${GITHUB_REPO}/pulls?state=open&per_page=100`),
      fetch(`https://api.github.com/repos/${GITHUB_REPO}/pulls?state=closed&per_page=100&sort=updated&direction=desc`)
    ]);

    const contributors = await contributorsResponse.json();
    const allPRs = await allPRsResponse.json();
    const openPRs = await openPRsResponse.json();
    const closedPRs = await closedPRsResponse.json();

    // Analyze PR trends over 4 weeks
    const prTrends = analyzePRTrends(allPRs, fourWeeksAgo, twoWeeksAgo, oneWeekAgo, now);
    
    return {
      // Repository metrics
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      watchers: repo.watchers_count,
      open_issues: repo.open_issues_count,
      
      // Repository info
      size_kb: repo.size,
      language: repo.language,
      created_at: repo.created_at,
      updated_at: repo.updated_at,
      
      // Community metrics
      contributors_count: contributors.length,
      network_count: repo.network_count,
      subscribers_count: repo.subscribers_count,
      
      // Pull Request metrics
      prs_open: openPRs.length,
      prs_total: allPRs.length,
      prs_merged_total: allPRs.filter(pr => pr.merged_at).length,
      
      // PR Trends (4-week analysis)
      pr_trends: prTrends,
      
      // Metadata
      default_branch: repo.default_branch,
      has_issues: repo.has_issues,
      has_projects: repo.has_projects,
      has_wiki: repo.has_wiki
    };
  } catch (error) {
    console.error('Error fetching GitHub stats:', error);
    throw error;
  }
}

async function sendToAnalyticsMCP(data) {
  const today = new Date().toISOString().split('T')[0];
  
  // Main repository snapshot
  const repoPayload = {
    dataset: 'github_stats',
    dimensions: {
      repo: GITHUB_REPO,
      metric_type: 'repository_snapshot',
      date: today,
      language: data.language || 'TypeScript',
      branch: data.default_branch
    },
    metrics: {
      stars: data.stars,
      forks: data.forks,
      watchers: data.watchers,
      open_issues: data.open_issues,
      size_kb: data.size_kb,
      contributors_count: data.contributors_count,
      network_count: data.network_count,
      subscribers_count: data.subscribers_count,
      prs_open: data.prs_open,
      prs_total: data.prs_total,
      prs_merged_total: data.prs_merged_total
    }
  };

  // PR Trend data points (4 separate data points for weekly trends)
  const prTrendPayloads = [
    {
      dataset: 'github_stats',
      dimensions: {
        repo: GITHUB_REPO,
        metric_type: 'pr_trends',
        date: today,
        week: 'week_4_ago'
      },
      metrics: {
        prs_created: data.pr_trends.week1.created,
        prs_merged: data.pr_trends.week1.merged,
        prs_closed: data.pr_trends.week1.closed
      }
    },
    {
      dataset: 'github_stats',
      dimensions: {
        repo: GITHUB_REPO,
        metric_type: 'pr_trends',
        date: today,
        week: 'week_3_ago'
      },
      metrics: {
        prs_created: data.pr_trends.week2.created,
        prs_merged: data.pr_trends.week2.merged,
        prs_closed: data.pr_trends.week2.closed
      }
    },
    {
      dataset: 'github_stats',
      dimensions: {
        repo: GITHUB_REPO,
        metric_type: 'pr_trends',
        date: today,
        week: 'week_2_ago'
      },
      metrics: {
        prs_created: data.pr_trends.week3.created,
        prs_merged: data.pr_trends.week3.merged,
        prs_closed: data.pr_trends.week3.closed
      }
    },
    {
      dataset: 'github_stats',
      dimensions: {
        repo: GITHUB_REPO,
        metric_type: 'pr_trends',
        date: today,
        week: 'last_week'
      },
      metrics: {
        prs_created: data.pr_trends.week4.created,
        prs_merged: data.pr_trends.week4.merged,
        prs_closed: data.pr_trends.week4.closed
      }
    }
  ];

  console.log('📊 Sending GitHub stats to Analytics MCP...');
  console.log('\n🏢 Repository Snapshot:');
  console.log(JSON.stringify(repoPayload, null, 2));
  
  console.log('\n📈 PR Trends (4 weeks):');
  prTrendPayloads.forEach((payload, index) => {
    console.log(`\nWeek ${index + 1} (${payload.dimensions.week}):`);
    console.log(JSON.stringify(payload, null, 2));
  });
  
  console.log('\n✅ Data ready to send to Analytics MCP!');
  console.log('📈 Use track_batch_metrics tool with all payloads for efficient bulk insert');
  
  return {
    repository: repoPayload,
    prTrends: prTrendPayloads,
    batchPayload: {
      dataset: 'github_stats',
      dataPoints: [repoPayload, ...prTrendPayloads].map(p => ({
        dimensions: p.dimensions,
        metrics: p.metrics,
        timestamp: Date.now()
      }))
    }
  };
}

async function main() {
  console.log(`🔍 Fetching GitHub statistics for ${GITHUB_REPO}...`);
  
  try {
    const stats = await fetchGitHubStats();
    console.log('📊 GitHub Repository Statistics:');
    console.log(`⭐ Stars: ${stats.stars}`);
    console.log(`🍴 Forks: ${stats.forks}`);
    console.log(`👀 Watchers: ${stats.watchers}`);
    console.log(`🐛 Open Issues: ${stats.open_issues}`);
    console.log(`👥 Contributors: ${stats.contributors_count}`);
    console.log(`📦 Size: ${stats.size_kb} KB`);
    console.log(`🔗 Network: ${stats.network_count}`);
    console.log('');
    
    console.log('🔄 Pull Request Statistics:');
    console.log(`📝 Open PRs: ${stats.prs_open}`);
    console.log(`📊 Total PRs: ${stats.prs_total}`);
    console.log(`✅ Merged PRs: ${stats.prs_merged_total}`);
    console.log('');
    
    console.log('📈 PR Trends (Last 4 Weeks):');
    console.log(`Week 4 ago: ${stats.pr_trends.week1.created} created, ${stats.pr_trends.week1.merged} merged, ${stats.pr_trends.week1.closed} closed`);
    console.log(`Week 3 ago: ${stats.pr_trends.week2.created} created, ${stats.pr_trends.week2.merged} merged, ${stats.pr_trends.week2.closed} closed`);
    console.log(`Week 2 ago: ${stats.pr_trends.week3.created} created, ${stats.pr_trends.week3.merged} merged, ${stats.pr_trends.week3.closed} closed`);
    console.log(`Last week:  ${stats.pr_trends.week4.created} created, ${stats.pr_trends.week4.merged} merged, ${stats.pr_trends.week4.closed} closed`);
    console.log(`Currently:  ${stats.pr_trends.current.open} open (${stats.pr_trends.current.draft} drafts)`);
    console.log('');
    
    const payload = await sendToAnalyticsMCP(stats);
    
    console.log('🎯 Next Steps:');
    console.log('1. Copy the payload above');
    console.log('2. Use track_metric tool in MCP Inspector');
    console.log('3. Run this script daily to build time-series data');
    console.log('4. Analyze trends over time!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
