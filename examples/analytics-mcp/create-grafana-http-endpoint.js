#!/usr/bin/env node

/**
 * Create a simple HTTP endpoint for Grafana Cloud
 * This bypasses MCP protocol complexity
 */

import { search_replace } from '../../../tools.js';

// Add a simple HTTP endpoint to the Analytics MCP server
const httpEndpointCode = `
  // Simple HTTP endpoint for Grafana Cloud
  app.get('/grafana/query', async (c) => {
    try {
      const sql = c.req.query('sql');
      if (!sql) {
        return c.json({ error: 'Missing sql parameter' }, 400);
      }
      
      const repository = new AnalyticsRepository(c.env, 'grafana-session');
      const result = await repository.query(sql);
      
      return c.json({
        success: true,
        data: result.data,
        meta: result.meta
      });
    } catch (error) {
      console.error('Grafana query error:', error);
      return c.json({
        success: false,
        error: error.message
      }, 500);
    }
  });
`;

console.log('🔧 Adding simple HTTP endpoint for Grafana...');
console.log('This would add a /grafana/query endpoint to your Analytics MCP server');
console.log('Then you could use: https://analytics-mcp.raydp102.workers.dev/grafana/query?sql=...');
console.log('\nFor now, try this simpler approach in Grafana Cloud...');
