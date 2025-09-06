import { Implementation } from "@modelcontextprotocol/sdk/types.js";
import { McpHonoServerDO } from '@nullshot/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { AnalyticsRepository } from './repository';
import { setupServerTools } from './tools';
import { setupServerResources } from './resources';
import { setupServerPrompts } from './prompts';
import { Env } from './schema';

export class AnalyticsMcpServer extends McpHonoServerDO {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  /**
   * Implementation of the required abstract method
   */
  getImplementation(): Implementation {
    return {
      name: "AnalyticsMcpServer",
      version: "1.0.0",
    };
  }

  /**
   * Override setupRoutes to add custom HTTP endpoints for Grafana
   */
  protected setupRoutes(app: Hono<{ Bindings: Env }>): void {
    // Call parent to setup MCP routes
    super.setupRoutes(app);
    
    // Add CORS for Grafana Cloud
    app.use('/grafana/*', cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization']
    }));
    
    // Simple HTTP endpoint for Grafana Cloud
    app.get('/grafana/query', async (c) => {
      try {
        const sql = c.req.query('sql');
        if (!sql) {
          return c.json({ error: 'Missing sql parameter' }, 400);
        }
        
        const sessionId = this.ctx.id.toString();
        const repository = new AnalyticsRepository(this.env, sessionId);
        const result = await repository.query(sql);
        
        // Format for Grafana
        return c.json({
          success: true,
          data: result.data,
          meta: result.meta
        });
      } catch (error) {
        console.error('Grafana query error:', error);
        return c.json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
      }
    });
    
    // Health check endpoint
    app.get('/grafana/health', async (c) => {
      return c.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Analytics MCP Server'
      });
    });
  }

  /**
   * Implements the required abstract configureServer method
   * Registers analytics tools, resources, and prompts for the MCP server
   */
  configureServer(server: McpServer): void {
    // Get session ID from the durable object ID
    const sessionId = this.ctx.id.toString();
    
    const repository = new AnalyticsRepository(this.env, sessionId);

    // Analytics Engine is a managed service - no initialization required
    console.log('Analytics MCP Server configured for session:', sessionId);

    // Set up tools, resources, and prompts using setup functions
    setupServerTools(server, repository);
    setupServerResources(server, repository);
    setupServerPrompts(server);
  }
}