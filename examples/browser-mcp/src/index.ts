import { Hono } from "hono";
import { cors } from "hono/cors";
import { BrowserManager } from "./browser-manager.js";
import { BrowserRepository } from "./repository.js";
import { createBrowserTools } from "./tools.js";
import { createBrowserResources } from "./resources.js";
import { createBrowserPrompts } from "./prompts.js";

interface Env {
  BROWSER_RENDERING: Fetcher;
  DB: D1Database;
  CACHE_BUCKET?: R2Bucket; // Optional for testing
  
  // Environment variables
  MAX_CONCURRENT_SESSIONS: string;
  SESSION_TIMEOUT_MS: string;
  CACHE_TTL_HOURS: string;
  MAX_PAGE_SIZE_MB: string;
}

const app = new Hono<{ Bindings: Env }>();

// Add CORS middleware
app.use("*", cors());

// Initialize components per request to avoid I/O context issues
async function initializeComponents(env: Env) {
  const browserManager = new BrowserManager(env);
  const repository = new BrowserRepository(env.DB, env.CACHE_BUCKET);
  await repository.initialize();
  
  const tools = createBrowserTools(browserManager, repository);
  const resources = createBrowserResources(browserManager, repository);
  const prompts = createBrowserPrompts(repository);
  
  return { browserManager, repository, tools, resources, prompts };
}

// Health check endpoint
app.get("/health", async (c) => {
  try {
    // Debug: Check what bindings are available
    console.log('Available bindings:', {
      MYBROWSER: !!c.env.MYBROWSER,
      DB: !!c.env.DB,
      CACHE_BUCKET: !!c.env.CACHE_BUCKET,
      browserType: typeof c.env.MYBROWSER
    });
    
    const { repository } = await initializeComponents(c.env);
    
    return c.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "browser-mcp-server",
      version: "1.0.0",
      healthy: true,
      sessions: 0,
      activeSessions: 0,
      cacheEnabled: !!c.env.CACHE_BUCKET,
      bindings: {
        browser: !!c.env.MYBROWSER,
        database: !!c.env.DB,
        cache: !!c.env.CACHE_BUCKET
      }
    });
  } catch (error) {
    return c.json({
      status: "error",
      timestamp: new Date().toISOString(),
      service: "browser-mcp-server",
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

// Status endpoint with detailed information
app.get("/status", async (c) => {
  try {
    const { browserManager, repository } = await initializeComponents(c.env);
    const sessions = await browserManager.listSessions();
    const activeSessions = sessions.filter(s => s.status === 'active');
    const stats = await repository.getScrapingStats();
    
    return c.json({
      service: "browser-mcp-server",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      health: {
        healthy: true,
        sessions: sessions.length,
        activeSessions: activeSessions.length,
        cacheEnabled: !!c.env.CACHE_BUCKET,
      },
      stats,
      config: {
        maxSessions: parseInt(c.env.MAX_CONCURRENT_SESSIONS || "5"),
        sessionTimeout: parseInt(c.env.SESSION_TIMEOUT_MS || "300000"),
        cacheEnabled: !!c.env.CACHE_BUCKET,
        cacheTTL: parseInt(c.env.CACHE_TTL_HOURS || "24"),
        maxPageSize: parseInt(c.env.MAX_PAGE_SIZE_MB || "10"),
      },
    });
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }, 500);
  }
});

// Maintenance endpoint
app.post("/maintenance", async (c) => {
  try {
    const { browserManager, repository } = await initializeComponents(c.env);
    
    // Clean up idle sessions
    await browserManager.cleanupIdleSessions();
    
    // Clean up expired cache
    await repository.clearExpiredCache();
    
    return c.json({
      message: "Maintenance completed successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }, 500);
  }
});

// MCP Tools endpoint
app.post("/mcp", async (c) => {
  try {
    const { tools, resources, prompts } = await initializeComponents(c.env);
    const body = await c.req.json();
    
    if (body.method === "tools/call") {
      const toolName = body.params?.name;
      const tool = tools.find(t => t.name === toolName);
      
      if (!tool) {
        return c.json({
          jsonrpc: "2.0",
          id: body.id,
          error: { code: -32601, message: `Tool ${toolName} not found` }
        });
      }
      
      const result = await tool.handler(body.params.arguments || {});
      return c.json({
        jsonrpc: "2.0",
        id: body.id,
        result
      });
    }
    
    if (body.method === "resources/read") {
      const uri = body.params?.uri;
      const resource = resources.find(r => r.uri === uri || r.uri.includes("{"));
      
      if (!resource) {
        return c.json({
          jsonrpc: "2.0",
          id: body.id,
          error: { code: -32601, message: `Resource ${uri} not found` }
        });
      }
      
      const result = await resource.handler(body.params || {});
      return c.json({
        jsonrpc: "2.0",
        id: body.id,
        result
      });
    }
    
    if (body.method === "prompts/get") {
      const promptName = body.params?.name;
      const prompt = prompts.find(p => p.name === promptName);
      
      if (!prompt) {
        return c.json({
          jsonrpc: "2.0",
          id: body.id,
          error: { code: -32601, message: `Prompt ${promptName} not found` }
        });
      }
      
      const result = await prompt.handler(body.params.arguments || {});
      return c.json({
        jsonrpc: "2.0",
        id: body.id,
        result
      });
    }
    
    if (body.method === "tools/list") {
      return c.json({
        jsonrpc: "2.0",
        id: body.id,
        result: {
          tools: tools.map(t => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema
          }))
        }
      });
    }
    
    if (body.method === "resources/list") {
      return c.json({
        jsonrpc: "2.0",
        id: body.id,
        result: {
          resources: resources.map(r => ({
            uri: r.uri,
            name: r.name,
            description: r.description,
            mimeType: r.mimeType
          }))
        }
      });
    }
    
    if (body.method === "prompts/list") {
      return c.json({
        jsonrpc: "2.0",
        id: body.id,
        result: {
          prompts: prompts.map(p => ({
            name: p.name,
            description: p.description,
            arguments: p.arguments
          }))
        }
      });
    }
    
    return c.json({
      jsonrpc: "2.0",
      id: body.id,
      error: { code: -32601, message: `Method ${body.method} not found` }
    });
    
  } catch (error) {
    console.error("MCP request error:", error);
    return c.json({
      jsonrpc: "2.0",
      id: null,
      error: { 
        code: -32603, 
        message: "Internal error",
        data: error instanceof Error ? error.message : String(error)
      }
    }, 500);
  }
});

// Simple test endpoint without browser
app.get("/test", (c) => {
  return c.json({
    message: "Browser MCP Server is working!",
    timestamp: new Date().toISOString(),
    browserRenderingEnabled: !!c.env.MYBROWSER,
    nextSteps: "Enable Browser Rendering in your Cloudflare dashboard to use browser automation features"
  });
});

// Test browser rendering directly
app.get("/test-browser", async (c) => {
  try {
    const puppeteer = await import("@cloudflare/puppeteer");
    console.log('Puppeteer imported successfully');
    
    const browser = await puppeteer.default.launch(c.env.MYBROWSER);
    console.log('Browser launched successfully');
    
    const page = await browser.newPage();
    console.log('New page created');
    
    await page.goto('https://example.com');
    console.log('Navigation completed');
    
    const title = await page.title();
    console.log('Title extracted:', title);
    
    await browser.close();
    console.log('Browser closed');
    
    return c.json({
      success: true,
      title,
      message: "Browser Rendering is working!"
    });
  } catch (error) {
    console.error('Browser test error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: "Browser Rendering test failed"
    }, 500);
  }
});

// Root endpoint with service information
app.get("/", (c) => {
  return c.json({
    service: "Browser MCP Server",
    version: "1.0.0",
    description: "Browser Rendering MCP server for web scraping and automation",
    endpoints: {
      health: "/health",
      status: "/status",
      maintenance: "/maintenance",
      mcp: "/mcp",
    },
    capabilities: [
      "Web page navigation",
      "Screenshot capture", 
      "Text and data extraction",
      "Form interaction and automation",
      "Browser session management",
      "Page content caching",
      "Extraction pattern storage",
      "Multi-page scraping",
      "JavaScript evaluation",
      "Wait conditions",
    ],
    tools: [
      "navigate",
      "screenshot",
      "extract_text", 
      "extract_links",
      "interact",
      "wait_for",
      "evaluate_js",
      "close_session",
    ],
    resources: [
      "browser://sessions",
      "browser://sessions/{sessionId}",
      "browser://results",
      "browser://results/{url}",
      "browser://cache",
      "browser://cache/{url}",
      "browser://patterns",
      "browser://patterns/{domain}",
      "browser://status",
    ],
    prompts: [
      "web_scraper",
      "automation_flow",
      "data_extractor",
    ],
  });
});

// Error handling
app.onError((err, c) => {
  console.error("Application error:", err);
  return c.json({
    error: "Internal server error",
    message: err.message,
    timestamp: new Date().toISOString(),
  }, 500);
});

// Note: Cleanup is now handled per request since we create new instances each time

export default app;