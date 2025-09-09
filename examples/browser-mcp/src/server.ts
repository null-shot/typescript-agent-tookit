import { McpHonoServerDO } from "@nullshot/mcp";
import { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BrowserManager } from "./browser-manager.js";
import { LocalPuppeteerManager } from "./local-puppeteer-manager.js";
import { CloudflarePuppeteerManager } from "./cloudflare-puppeteer-manager.js";
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

  protected setupRoutes(app: any): void {
    // Add CORS middleware for all routes
    app.use('*', async (c: any, next: any) => {
      // Handle CORS preflight requests
      if (c.req.method === 'OPTIONS') {
        return new Response(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
            'Access-Control-Max-Age': '86400',
          },
        });
      }
      
      await next();
      
      // Add CORS headers to all responses
      c.res.headers.set('Access-Control-Allow-Origin', '*');
      c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    });

    // Call the parent implementation to setup SSE and other MCP routes
    super.setupRoutes(app);
    
    // Handle root path - process SSE requests directly for MCP Inspector
    app.get('/', (c: any) => {
      const acceptHeader = c.req.header('Accept');
      if (acceptHeader && acceptHeader.includes('text/event-stream')) {
        // This is an SSE request from the MCP Inspector
        const sessionId = crypto.randomUUID();
        const url = new URL(c.req.url);
        url.searchParams.set('sessionId', sessionId);
        
        // Create a new request with the sessionId and process it
        const newRequest = new Request(url.toString(), {
          method: 'GET',
          headers: c.req.raw.headers
        });
        
        return this.processSSEConnection(newRequest);
      }
      
      // Return server info for regular requests
      const mode = this.env.BROWSER_MODE || 'production';
      const browserType = mode === 'cloudflare_puppeteer' && this.env.MYBROWSER ? 'Cloudflare Puppeteer (unlimited testing)' :
                         mode === 'local_puppeteer' ? 'Local Puppeteer (Node.js only)' :
                         this.env.MYBROWSER ? 'Cloudflare Browser Rendering (10min daily quota)' : 
                         'Mock Browser (local development)';
      
      return c.json({
        name: "Browser Rendering MCP Server",
        version: "1.0.0",
        description: `Browser automation MCP server with ${browserType}`,
        mode: mode,
        browserType: browserType,
        unlimited: mode === 'local_puppeteer',
        endpoints: {
          sse: "/sse",
          health: "/health"
        },
        tools: ["navigate", "screenshot", "extract_text", "extract_links", "close_session"],
        resources: ["browser://sessions", "browser://status", "browser://results", "browser://cache", "browser://patterns"],
        prompts: ["web_scraper", "automation_flow", "data_extractor"],
        documentation: "https://github.com/null-shot/typescript-agent-framework/tree/main/examples/browser-mcp"
      });
    });
    
    // Add health endpoint
    app.get('/health', (c: any) => {
      return c.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "browser-mcp-server",
        version: "1.0.0"
      });
    });

    // Handle OAuth discovery endpoints that MCP Inspector looks for
    app.get('/.well-known/oauth-authorization-server', (c: any) => {
      return c.json({
        issuer: c.req.url,
        authorization_endpoint: `${c.req.url}/auth`,
        token_endpoint: `${c.req.url}/token`,
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code"],
        code_challenge_methods_supported: ["S256"]
      });
    });

    app.get('/.well-known/oauth-protected-resource', (c: any) => {
      return c.json({
        resource: c.req.url,
        authorization_servers: [`${c.req.url}/.well-known/oauth-authorization-server`]
      });
    });

    app.get('/.well-known/openid-configuration', (c: any) => {
      return c.json({
        issuer: c.req.url,
        authorization_endpoint: `${c.req.url}/auth`,
        token_endpoint: `${c.req.url}/token`,
        userinfo_endpoint: `${c.req.url}/userinfo`,
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code"],
        code_challenge_methods_supported: ["S256"]
      });
    });
  }

  async configureServer(server: McpServer): Promise<void> {
    // Environment-based browser manager selection
    const mode = this.env.BROWSER_MODE || 'production';
    let browserManager;
    let browserType = 'Unknown';
    
    try {
      if (mode === 'cloudflare_puppeteer' && this.env.MYBROWSER) {
        // Use Cloudflare Puppeteer with Browser Rendering binding for unlimited testing
        console.log('🔍 Using Cloudflare Puppeteer with Browser Rendering binding...');
        try {
          browserManager = new CloudflarePuppeteerManager(this.env);
          browserType = 'Cloudflare Puppeteer (unlimited testing)';
          console.log('🚀 Using Cloudflare Puppeteer for unlimited browser automation');
        } catch (error) {
          console.error('❌ Failed to initialize Cloudflare Puppeteer:', error);
          console.log('⚠️ Falling back to mock browser manager due to Cloudflare Puppeteer initialization error');
          browserManager = new MockBrowserManager(this.env) as any;
          browserType = 'Mock Browser (Cloudflare Puppeteer failed)';
        }
      } else if (mode === 'mock') {
        // Use mock browser manager for testing without Browser Rendering
        console.log('🔍 Using Mock Browser Manager for testing...');
        browserManager = new MockBrowserManager(this.env) as any;
        browserType = 'Mock Browser (testing mode)';
        console.log('🧪 Using Mock Browser Manager for MCP testing');
      } else if (mode === 'local_puppeteer') {
        // Try to use local Puppeteer for unlimited testing (Node.js only)
        console.log('🔍 Checking LocalPuppeteerManager availability...');
        const isLocalAvailable = await LocalPuppeteerManager.isAvailable();
        console.log('🔍 LocalPuppeteerManager.isAvailable() result:', isLocalAvailable);
        if (isLocalAvailable) {
          browserManager = new LocalPuppeteerManager(this.env);
          browserType = 'Local Puppeteer (Node.js only)';
          console.log('🚀 Using Local Puppeteer for unlimited browser automation');
        } else {
          console.log('⚠️ Local Puppeteer not available, falling back to mock');
          browserManager = new MockBrowserManager(this.env) as any;
          browserType = 'Mock Browser (Puppeteer not installed)';
        }
      } else if (this.env.MYBROWSER) {
        // Use Cloudflare Browser Rendering (production/remote)
        browserManager = new BrowserManager(this.env);
        browserType = 'Cloudflare Browser Rendering (10min daily quota)';
        console.log('☁️ Using Cloudflare Browser Rendering');
      } else {
        // Fallback to mock for local development without either
        browserManager = new MockBrowserManager(this.env) as any;
        browserType = 'Mock Browser (local development)';
        console.log('🧪 Using Mock Browser Manager for local development');
      }
    } catch (error) {
      console.log('⚠️ Falling back to mock browser manager:', error);
      browserManager = new MockBrowserManager(this.env) as any;
      browserType = 'Mock Browser (fallback)';
    }
    
    const repository = new BrowserRepository(this.ctx.storage.sql, this.env.CACHE_BUCKET);
    
    // Initialize the database on startup
    this.ctx.blockConcurrencyWhile(async () => {
      await repository.initialize();
    });

    // Set up tools, resources, and prompts using the same pattern as crud-mcp
    setupBrowserTools(server, browserManager, repository);
    setupBrowserResources(server, browserManager, repository);
    setupBrowserPrompts(server, repository);

    console.log(`✅ Browser MCP server configured successfully with ${browserType}`);
  }
}

// Create alias for SQLite-enabled version
export class BrowserMcpServerSqlV2 extends BrowserMcpServer {}