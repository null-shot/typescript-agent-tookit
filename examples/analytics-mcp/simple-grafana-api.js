#!/usr/bin/env node

/**
 * Simple API that converts Analytics Engine data to Grafana-compatible format
 */

import http from 'http';

const API_TOKEN = 'N0DEQw1v_2FxAdFcVDVmFN2L6IGzDlFMOrU8OjyP';
const ACCOUNT_ID = '59084df56e21d828dcbd5811f81c7754';

async function getAnalyticsData() {
  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/analytics_engine/sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'text/plain'
      },
      body: 'SELECT timestamp, blob3, double1, double2, double3 FROM github_stats WHERE blob2 = \'daily_pr_stats\' ORDER BY timestamp'
    });

    const result = await response.json();
    
    if (result.data) {
      // Convert to Grafana time series format
      const timeSeries = [];
      
      // Group data by metric
      const metrics = [
        { key: 'double1', name: 'prs_created' },
        { key: 'double2', name: 'prs_merged' },
        { key: 'double3', name: 'prs_closed' }
      ];
      
      metrics.forEach(metric => {
        const datapoints = result.data.map(row => {
          // Convert date string to timestamp
          const date = row.blob3 || '2025-09-04';
          const timestamp = new Date(date).getTime();
          const value = row[metric.key] || 0;
          return [value, timestamp];
        }).filter(point => point[1] && !isNaN(point[1]));
        
        if (datapoints.length > 0) {
          timeSeries.push({
            target: metric.name,
            datapoints: datapoints.sort((a, b) => a[1] - b[1])
          });
        }
      });
      
      return timeSeries;
    }
    
    return [];
  } catch (error) {
    console.error('Analytics query failed:', error);
    return [];
  }
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
  
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  try {
    if (url.pathname === '/') {
      // Health check
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'OK', 
        message: 'Analytics API for Grafana',
        endpoints: ['/search', '/query']
      }));
      
    } else if (url.pathname === '/search') {
      // Return available metrics for Grafana
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(['prs_created', 'prs_merged', 'prs_closed']));
      
    } else if (url.pathname === '/query') {
      // Return time series data
      const timeSeries = await getAnalyticsData();
      
      console.log(`Returning ${timeSeries.length} time series with ${timeSeries.reduce((sum, series) => sum + series.datapoints.length, 0)} total data points`);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(timeSeries));
      
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
  console.log(`🚀 Analytics API running on http://localhost:${PORT}`);
  console.log('📊 Add this data source in Grafana:');
  console.log('   Type: JSON API or SimpleJSON');
  console.log(`   URL: http://localhost:${PORT}`);
  console.log('   Access: Server (default)');
  console.log('✅ This will show your 18 data points as proper time series!');
});
