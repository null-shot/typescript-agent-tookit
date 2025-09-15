import { BrowserMcpServer, BrowserMcpServerSqlV2 } from './server.js';

interface Env {
  MYBROWSER: Fetcher; // Browser Rendering binding
  CACHE_BUCKET?: R2Bucket; // Optional for testing
  BROWSER_MCP_SERVER: DurableObjectNamespace<BrowserMcpServerSqlV2>;
  
  // Environment variables
  MAX_CONCURRENT_SESSIONS: string;
  SESSION_TIMEOUT_MS: string;
  CACHE_TTL_HOURS: string;
  MAX_PAGE_SIZE_MB: string;
}

// Export both classes for Durable Object binding
export { BrowserMcpServer, BrowserMcpServerSqlV2 };

// Worker entrypoint for handling incoming requests
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const sessionIdStr = url.searchParams.get('sessionId');
    const id = sessionIdStr
      ? env.BROWSER_MCP_SERVER.idFromString(sessionIdStr)
      : env.BROWSER_MCP_SERVER.newUniqueId();

    console.log(`Fetching sessionId: ${sessionIdStr} with id: ${id}`);
    
    url.searchParams.set('sessionId', id.toString());

    return env.BROWSER_MCP_SERVER.get(id).fetch(new Request(
      url.toString(),
      request
    ));
  }
};