import { McpHonoServerDO } from "@nullshot/mcp";
import { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BrowserManager } from "./browser-manager.js";
import { MockBrowserManager } from "./mock-browser-manager.js";
import { BrowserRepository } from "./repository.js";
import { setupBrowserTools } from "./tools.js";
import { setupBrowserResources } from "./resources.js";
import { setupBrowserPrompts } from "./prompts.js";

export class BrowserMcpServer extends McpHonoServerDO<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  getImplementation(): Implementation {
    return {
      name: "browser-mcp-server", 
      version: "1.0.0",
    };
  }

  configureServer(server: McpServer): void {
    // Create components in configureServer method
    // Use mock browser manager when Browser Rendering isn't available (like in tests)
    let browserManager;
    try {
      browserManager = new BrowserManager(this.env);
    } catch (error) {
      console.log('Using mock browser manager for testing');
      browserManager = new MockBrowserManager(this.env) as any;
    }
    const repository = new BrowserRepository(this.env.DB, this.env.CACHE_BUCKET);
    
    // Initialize the database on startup
    this.ctx.blockConcurrencyWhile(async () => {
      await repository.initialize();
    });

    // Set up tools, resources, and prompts using the same pattern as crud-mcp
    setupBrowserTools(server, browserManager, repository);
    setupBrowserResources(server, browserManager, repository);
    setupBrowserPrompts(server, repository);

    console.log("Browser MCP server configured successfully");
  }
}