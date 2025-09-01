import { McpServerDO } from "@nullshot/mcp";
import { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BrowserManager } from "./browser-manager.js";
import { BrowserRepository } from "./repository.js";
import { createBrowserTools } from "./tools.js";
import { createBrowserResources } from "./resources.js";
import { createBrowserPrompts } from "./prompts.js";

export class BrowserMcpServer extends McpServerDO<Env> {
  private browserManager: BrowserManager;
  private repository: BrowserRepository;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.browserManager = new BrowserManager(env);
    this.repository = new BrowserRepository(env.DB, env.CACHE_BUCKET);
  }

  getImplementation(): Implementation {
    return {
      name: "browser-mcp-server",
      version: "1.0.0",
    };
  }

  configureServer(server: McpServer): void {
    // Configure tools
    const tools = createBrowserTools(this.browserManager, this.repository);
    tools.forEach(tool => {
      server.setRequestHandler({ method: "tools/call" }, async (request) => {
        if (request.params?.name === tool.name) {
          return { content: [{ type: "text", text: JSON.stringify(await tool.handler(request.params.arguments)) }] };
        }
      });
    });

    // Configure resources  
    const resources = createBrowserResources(this.browserManager, this.repository);
    resources.forEach(resource => {
      server.setRequestHandler({ method: "resources/read" }, async (request) => {
        if (request.params?.uri === resource.uri) {
          return await resource.handler(request.params);
        }
      });
    });

    // Configure prompts
    const prompts = createBrowserPrompts(this.repository);
    prompts.forEach(prompt => {
      server.setRequestHandler({ method: "prompts/get" }, async (request) => {
        if (request.params?.name === prompt.name) {
          return await prompt.handler(request.params.arguments);
        }
      });
    });
  }

  async initialize(): Promise<void> {
    try {
      // Initialize database tables
      await this.repository.initialize();
      console.log("Browser MCP server initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Browser MCP server:", error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    try {
      // Clean up idle sessions
      await this.browserManager.cleanupIdleSessions();
      
      // Clean up expired cache
      await this.repository.clearExpiredCache();
      
      // Close browser and all sessions
      await this.browserManager.cleanup();
      
      console.log("Browser MCP server cleanup completed");
    } catch (error) {
      console.error("Error during Browser MCP server cleanup:", error);
    }
  }

  // Health check method
  async healthCheck(): Promise<{
    healthy: boolean;
    sessions: number;
    activeSessions: number;
    cacheEnabled: boolean;
    errors?: string[];
  }> {
    try {
      const sessions = await this.browserManager.listSessions();
      const activeSessions = sessions.filter(s => s.status === 'active');
      const stats = await this.repository.getScrapingStats();
      
      const errors: string[] = [];
      
      // Check if we're at session limit
      if (this.browserManager.isAtSessionLimit()) {
        errors.push("At maximum concurrent session limit");
      }
      
      // Check for old idle sessions
      const now = new Date();
      const idleSessions = activeSessions.filter(s => 
        now.getTime() - s.lastActivity.getTime() > 300000 // 5 minutes
      );
      
      if (idleSessions.length > 0) {
        errors.push(`${idleSessions.length} sessions idle for >5 minutes`);
      }

      return {
        healthy: errors.length === 0,
        sessions: sessions.length,
        activeSessions: activeSessions.length,
        cacheEnabled: true,
        ...(errors.length > 0 && { errors }),
      };
    } catch (error) {
      return {
        healthy: false,
        sessions: 0,
        activeSessions: 0,
        cacheEnabled: false,
        errors: [`Health check failed: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  // Periodic maintenance
  async performMaintenance(): Promise<void> {
    try {
      console.log("Starting periodic maintenance...");
      
      // Clean up idle sessions
      await this.browserManager.cleanupIdleSessions();
      
      // Clean up expired cache
      await this.repository.clearExpiredCache();
      
      // Get stats for logging
      const sessions = await this.browserManager.listSessions();
      const stats = await this.repository.getScrapingStats();
      
      console.log(`Maintenance completed - Active sessions: ${sessions.filter(s => s.status === 'active').length}, Total results: ${stats.totalResults}`);
    } catch (error) {
      console.error("Error during maintenance:", error);
    }
  }
}
