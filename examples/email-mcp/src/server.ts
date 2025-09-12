import { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { McpHonoServerDO } from '@nullshot/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { EmailRepository } from './repository';
import { setupServerTools } from './tools';
import { setupServerResources } from './resources';
import { setupServerPrompts } from './prompts';
import { z } from 'zod';

export class EmailMcpServer extends McpHonoServerDO {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  getImplementation(): Implementation {
    return {
      name: 'EmailMcpServer',
      version: '1.0.0',
    };
  }

  configureServer(server: McpServer): void {
    const repository = new EmailRepository(this.ctx);
    // Initialize the database on startup
    this.ctx.blockConcurrencyWhile(async () => {
      repository.initializeDatabase();
    });

    // Wire tools/resources
    setupServerTools(server, repository, this.env);
    setupServerResources(server, repository);
    setupServerPrompts(server);
  }
}