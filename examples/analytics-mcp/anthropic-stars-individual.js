#!/usr/bin/env node

/**
 * Add Anthropics star data using individual track_metric calls
 * This might work better than batch operations
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const MCP_BASE_URL = 'https://analytics-mcp.raydp102.workers.dev';

function generateAnthropicsStarData() {
  const dataPoints = [];
  const endDate = new Date('2025-09-05');
  
  // Generate complete 30 days
  let runningStars = 31600; // Starting star count
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - i);
    date.setHours(12, 0, 0, 0);
    
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Realistic daily growth for Claude Code
    const baseGrowth = isWeekend ? 15 : 35;
    const randomFactor = 0.8 + Math.random() * 0.4;
    const dailyGrowth = Math.floor(baseGrowth * randomFactor);
    
    runningStars += dailyGrowth; // Always increasing!
    
    const forkGrowth = Math.floor(dailyGrowth * 0.05);
    const runningForks = 1970 + Math.floor((29 - i) * 0.5);
    
    console.log(`📈 ${dateStr}: ${runningStars} stars (+${dailyGrowth}), ${runningForks} forks`);
    
    dataPoints.push({
      date: dateStr,
      timestamp: Math.floor(date.getTime() / 1000),
      dimensions: {
        repo: 'anthropics/claude-code',
        event_type: 'anthropic_stars_individual',
        date: dateStr,
        org: 'anthropics',
        repo_name: 'claude-code'
      },
      metrics: {
        star_count: runningStars,
        daily_star_growth: dailyGrowth,
        fork_count: runningForks,
        watcher_count: runningStars, // Watchers ~ stars for popular repos
        open_issues: Math.floor(Math.random() * 500 + 3000)
      }
    });
  }
  
  return dataPoints;
}

async function callIndividualMetric(client, dataPoint) {
  try {
    const result = await client.callTool({
      name: 'track_metric',
      arguments: {
        dataset: 'github_stats',
        dimensions: dataPoint.dimensions,
        metrics: dataPoint.metrics,
        timestamp: dataPoint.timestamp
      }
    });

    if (result.content && result.content.length > 0) {
      const responseData = JSON.parse(result.content[0].text);
      
      if (responseData.success) {
        console.log(`✅ ${dataPoint.date}: ${dataPoint.metrics.star_count} stars`);
        return true;
      } else {
        console.log(`❌ ${dataPoint.date}: ${responseData.error}`);
        return false;
      }
    }
  } catch (error) {
    console.log(`❌ ${dataPoint.date}: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('⭐ Adding Anthropics Star Data (Individual Calls)\n');
  
  const client = new Client({
    name: "anthropic-stars-individual",
    version: "1.0.0",
  });

  try {
    console.log('🔌 Connecting...');
    const transport = new SSEClientTransport(new URL(`${MCP_BASE_URL}/sse`));
    await client.connect(transport);
    console.log('✅ Connected\n');

    // Generate 30 days of star data
    const dataPoints = generateAnthropicsStarData();
    console.log(`\n📊 Generated ${dataPoints.length} days of Anthropics star data`);
    console.log(`📅 Range: ${dataPoints[0].date} to ${dataPoints[dataPoints.length-1].date}\n`);
    
    // Add each data point individually
    console.log('💾 Adding data points individually...');
    let successCount = 0;
    
    for (let i = 0; i < dataPoints.length; i++) {
      const dataPoint = dataPoints[i];
      console.log(`\n📦 ${i+1}/${dataPoints.length}: Adding ${dataPoint.date}...`);
      
      const success = await callIndividualMetric(client, dataPoint);
      if (success) {
        successCount++;
      }
      
      // Small delay between calls
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\n🎉 INDIVIDUAL CALLS COMPLETE!`);
    console.log(`✅ Successfully added ${successCount}/${dataPoints.length} individual data points`);
    
    if (successCount > 0) {
      console.log('\n📊 Query your individual star data with:');
      console.log('SELECT');
      console.log('    blob3,');
      console.log('    double1 as StarCount,');
      console.log('    double2 as DailyGrowth,');
      console.log('    double3 as ForkCount,');
      console.log('    double4 as Watchers');
      console.log('FROM github_stats');
      console.log("WHERE blob2 = 'anthropic_stars_individual'");
      console.log('ORDER BY blob3');
      
      console.log('\n🎯 This should give you all 30 days of always-increasing star data!');
      console.log('📈 Expected: Smooth upward curve from ~31,600 to ~32,600+ stars');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

main();
