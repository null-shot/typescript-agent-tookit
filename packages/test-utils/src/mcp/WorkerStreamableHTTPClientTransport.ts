import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { env, SELF } from "cloudflare:test";

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
      fetchInit: RequestInit = {},
    ) => {
      console.log(`[Debug] Fetching from: ${fetchUrl}`);
      // add auth headers
      const workerOptions = {
        ...fetchInit,
        headers: {
          ...fetchInit?.headers,
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
      };

      // Call the original fetch with fixed options
      // Create a proper Request object with the worker options
      const request = new Request(fetchUrl.toString(), workerOptions);

      // Pass the Request object to the worker.fetch method
      return await SELF.fetch(request);
    };

    // Initialize the parent StreamableHTTPClientTransport with our custom fetch
    super(url, { fetch: fetchOverride });
    this.ctx = ctx;
  }

  /**
   * Override the send method to direct requests to our worker
   */
  async send(message: JSONRPCMessage): Promise<void> {
    console.log(
      `[Debug] Sending message to worker: ${JSON.stringify(message)}`,
    );
    // Call the internal method to get the endpoint
    // @ts-ignore
    const endpoint = this._url;

    if (!endpoint) {
      throw new Error("Not connected");
    }

    try {
      // Set up headers - we would normally get these from _commonHeaders
      // but we can't access it due to it being private
      const headers = new Headers();
      headers.set("content-type", "application/json");
      headers.set("accept", "application/json, text/event-stream");

      const init = {
        method: "POST",
        headers,
        body: JSON.stringify(message),
      };

      console.log(`Sending message to worker: ${JSON.stringify(message)}`);

      // Use our worker fetch instead of regular fetch
      const request = new Request(endpoint.toString(), init);

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
