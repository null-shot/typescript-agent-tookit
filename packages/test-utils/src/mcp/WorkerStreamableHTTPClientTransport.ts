import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { env, SELF } from 'cloudflare:test';

/**
 * WorkerStreamableHTTPClientTransport is a wrapper around the official StreamableHTTPClientTransport
 * that intercepts network requests and routes them to our Cloudflare Worker for testing.
 * 
 * This allows us to use the actual MCP client implementation against our worker
 * for realistic integration testing with the modern Streamable HTTP transport.
 */
export class WorkerStreamableHTTPClientTransport extends StreamableHTTPClientTransport {
  ctx: ExecutionContext;
  constructor(url: URL, ctx: ExecutionContext) {
    const fetchOverride: typeof fetch = async (
      fetchUrl: RequestInfo | URL,
      fetchInit: RequestInit = {}
    ) => {
      console.log(`[Debug] Fetching from: ${fetchUrl}`);
      // add auth headers
      const workerOptions = {
        ...fetchInit,
        headers: {
          ...fetchInit?.headers,
        },
      };

      // Call the original fetch with fixed options
      // Create a proper Request object with the worker options
      const request = new Request(fetchUrl.toString(), workerOptions);
      
      // Pass the Request object to the worker.fetch method
      return await SELF.fetch(request);
    };

    
    // Initialize the parent StreamableHTTPClientTransport with our custom fetch
    super(url, { fetch: fetchOverride } as any);
    this.ctx = ctx;
  }
}