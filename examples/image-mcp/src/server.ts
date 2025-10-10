import { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { McpHonoServerDO } from '@nullshot/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { setupServerTools } from './tools';
import { setupServerResources } from './resources';
import { setupServerPrompts } from './prompts';
import { R2ImageBucket } from './bucket'
import { ImageRepository } from './repository'
/**
 * ImageMcpServer extends McpHonoServerDO for CRUD operations on todo items
 */
export class ImageMcpServer extends McpHonoServerDO<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  /**
   * Implementation of the required abstract method
   */
  getImplementation(): Implementation {
    return {
      name: 'ImageMcpServer',
      version: '1.0.0',
    };
  }

  /**
   * Implements the required abstract configureServer method
   * Registers CRUD tools for the MCP server
   */
  configureServer(server: McpServer): void {
    const bucket = new R2ImageBucket(this.env.IMAGE_BUCKET)
    const repo = new ImageRepository(this.ctx.storage, bucket);
    this.ctx.blockConcurrencyWhile(async () => {  
      await repo.init();
    });
    
    // Create and set up tools and resources with our repository
    setupServerTools(server, repo);
    setupServerResources(server);
    setupServerPrompts(server);
  }
} 