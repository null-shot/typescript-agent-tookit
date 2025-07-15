import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { env, SELF } from 'cloudflare:test';

/**
 * WorkerSSEClientTransport is a wrapper around the official SSEClientTransport
 * that intercepts network requests and routes them to our Cloudflare Worker for testing.
 * 
 * This allows us to use the actual MCP client implementation against our worker
 * for realistic integration testing.
 */
export class WorkerSSEClientTransport extends SSEClientTransport {
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

    
    // Initialize the parent SSEClientTransport with our custom fetch
    super(url, { eventSourceInit: {
      fetch: fetchOverride
    }});
    this.ctx = ctx;
  }

  /**
   * Override the send method to direct requests to our worker
   */
  async send(message: JSONRPCMessage): Promise<void> {
    console.log(`[Debug] Sending message to worker: ${JSON.stringify(message)}`);
    // Call the internal method to get the endpoint
    // @ts-ignore - Accessing private property
    const endpoint = this._endpoint;
    
    if (!endpoint) {
      throw new Error("Not connected");
    }

    try {
      // Set up headers - we would normally get these from _commonHeaders
      // but we can't access it due to it being private
      const headers = new Headers();
      headers.set("content-type", "application/json");

      const init = {
        method: "POST",
        headers,
        body: JSON.stringify(message),
      };

      console.log(`Sending message to worker: ${JSON.stringify(message)}`);
      
      // Use our worker fetch instead of regular fetch
      const request = new Request(
        endpoint.toString(),
        init,
      );
      
      const response = await SELF.fetch(request);

      if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(
          `Error POSTing to endpoint (HTTP ${response.status}): ${text}`,
        );
      }
    } catch (error) {
      this.onerror?.(error as Error);
      throw error;
    }
  }
} 