#!/usr/bin/env node

/**
 * Simple JSON API server for Grafana to consume Analytics Engine data
 * This bypasses the ClickHouse plugin compatibility issues
 */

import http from 'http';
import url from 'url';

const MCP_URL = 'https://analytics-mcp.raydp102.workers.dev/sse/message';

async function queryAnalyticsEngine(sql) {
  try {
    const response = await fetch(MCP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'tools/call',
        params: {
          name: 'query_analytics',
          arguments: { sql }
        }
      })
    });
    
    const result = await response.json();
    if (result.success && result.data && result.data.data) {
      return result.data.data;
    }
    return [];
  } catch (error) {
    console.error('Analytics query failed:', error);
    return [];
  }
}

function convertToGrafanaTimeSeries(data) {
  // Convert Analytics Engine data to Grafana time series format
  const series = [];
  
  if (data.length === 0) return series;
  
  // Group by metrics
  const metrics = ['double1', 'double2', 'double3'];
  const metricNames = ['prs_created', 'prs_merged', 'prs_closed'];
  
  metrics.forEach((metric, index) => {
    const datapoints = data.map(row => {
      // Use blob3 (date) as timestamp - convert to epoch
      const dateStr = row.blob3 || '2025-09-04';
      const timestamp = new Date(dateStr).getTime();
      const value = row[metric] || 0;
      return [value, timestamp];
    }).filter(point => point[0] !== undefined);
    
    if (datapoints.length > 0) {
      series.push({
        target: metricNames[index],
        datapoints: datapoints.sort((a, b) => a[1] - b[1]) // Sort by timestamp
      });
    }
  });
  
  return series;
}

const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  
  console.log(`${req.method} ${path}`);
  
  try {
    if (path === '/') {
      // Health check
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'OK', message: 'Analytics JSON API for Grafana' }));
      
    } else if (path === '/search') {
      // Return available metrics
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(['prs_created', 'prs_merged', 'prs_closed']));
      
    } else if (path === '/query') {
      // Handle Grafana query
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          // Query Analytics Engine for PR data
          const sql = 'SELECT * FROM github_stats WHERE blob2 = \'daily_pr_stats\' OR (double1 > 0 AND blob3 != \'\') ORDER BY blob3';
          const data = await queryAnalyticsEngine(sql);
          
          console.log(`Found ${data.length} records`);
          
          // Convert to Grafana format
          const timeSeries = convertToGrafanaTimeSeries(data);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(timeSeries));
          
        } catch (error) {
          console.error('Query error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
    
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Analytics JSON API running on http://localhost:${PORT}`);
  console.log('📊 Add this as a JSON data source in Grafana:');
  console.log(`   URL: http://localhost:${PORT}`);
  console.log('   Access: Server (default)');
  console.log('✅ This will bypass the ClickHouse compatibility issues!');
});
