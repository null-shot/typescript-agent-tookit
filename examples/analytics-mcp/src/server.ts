import { Implementation } from "@modelcontextprotocol/sdk/types.js";
import { McpHonoServerDO } from '@nullshot/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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