import { DurableObject } from "cloudflare:workers";
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSETransport } from "./sse-transport";
import { Implementation } from "@modelcontextprotocol/sdk/types.js";

const MAXIMUM_MESSAGE_SIZE = 4 * 1024 * 1024; // 4MB
export const SSE_MESSAGE_ENDPOINT = "/sse/message";

/**
 * McpDurableServer is a Durable Object implementation of an MCP server.
 * It supports SSE connections for event streaming.
 */
export abstract class McpServerDO extends DurableObject {
  private server: McpServer;
  private sessions: Map<string, SSETransport> = new Map();
  //#transport: WebSocketTransport | null = null;
  
  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env);
    this.server = new McpServer(this.getImplementation());
    this.configureServer (this.server)
  }

  /**
   * Returns the implementation information for the MCP server.
   * Must be implemented by subclasses.
   */
  abstract getImplementation(): Implementation;

  /**  
   * Abstract method that must be implemented by subclasses to configure the server instance.
   * Called after server initialization to set up any additional server configuration, e.g., handlers of incoming RPC calls.
   */
  abstract configureServer(server: McpServer): void;


  protected processSSEConnection(request: Request) : Response {
    // Session ID must exist as it will be created at the worker level prior to forwarding to DO.
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId) {
      return new Response(`Missing sessionId parameter`, {
        status: 400,
      });
    }

    const { readable, writable } = new TransformStream();
    const transport = new SSETransport(writable.getWriter(), sessionId, new URL(SSE_MESSAGE_ENDPOINT, request.url).toString());
    this.sessions.set(sessionId, transport);
    this.server.connect(transport);

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive'
      }
    });
    
  }

  protected processMcpRequest(request: Request) {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return new Response(`Unsupported content-type: ${contentType}`, {
        status: 400,
      });
    }

    // Check if the request body is too large
    const contentLength = Number.parseInt(
      request.headers.get("content-length") || "0",
      10
    );

    if (contentLength > MAXIMUM_MESSAGE_SIZE) {
      return new Response(`Request body too large: ${contentLength} bytes`, {
        status: 400,
      });
    }

    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId) {
      return new Response(`Missing sessionId parameter`, {
        status: 400,
      });
    }

    const transport = this.sessions.get(sessionId);
    if (!transport) {
      return new Response(`Session not found`, {
        status: 404,
      });
    }

    return transport.handlePostMessage(request);
  }

 

  // /**
  //  * Handle WebSocket upgrade requests.
  //  */
  // async handleWebSocketUpgrade(request: Request): Promise<Response> {
  //   // Create a WebSocket pair
  //   const webSocketPair = new WebSocketPair();
  //   const [client, server] = Object.values(webSocketPair);

  //   // Check if the client requested the MCP subprotocol
  //   const protocols = request.headers.get('Sec-WebSocket-Protocol');
  //   const useMcpProtocol = protocols?.split(',').map(p => p.trim()).includes('mcp');
    
  //   // Accept the WebSocket with hibernation support
  //   this.ctx.acceptWebSocket(server);
    
  //   // Initialize the MCP server if not already initialized
  //   if (this.#status !== 'started') {
  //     await this.#initialize();
  //   }

  //   // Return the client end of the WebSocket
  //   const headers = new Headers();
  //   if (useMcpProtocol) {
  //     headers.set('Sec-WebSocket-Protocol', 'mcp');
  //   }

  //   return new Response(null, {
  //     status: 101,
  //     webSocket: client,
  //     headers,
  //   });
  // }

  // /**
  //  * Get the current WebSocket connection.
  //  */
  // getWebSocket(): WebSocket | null {
  //   const websockets = this.ctx.getWebSockets();
  //   if (websockets.length === 0) {
  //     return null;
  //   }
  //   return websockets[0];
  // }

  // /**
  //  * Handle MCP messages received via HTTP POST requests.
  //  */
  // async onMCPMessage(sessionId: string, request: Request): Promise<Response> {
  //   if (this.#status !== 'started') {
  //     await this.#initialize();
  //   }

  //   return this.#transport?.handleMessage(request) || 
  //     new Response('Transport not available', { status: 500 });
  // }

  // /**
  //  * Handle WebSocket messages.
  //  * This is called by the Durable Object runtime when a message is received.
  //  */
  // async webSocketMessage(ws: WebSocket, event: ArrayBuffer | string) {
  //   let message;
  //   try {
  //     // Ensure event is a string
  //     const data = typeof event === 'string' ? event : new TextDecoder().decode(event);
  //     message = JSONRPCMessageSchema.parse(JSON.parse(data));
  //   } catch (error) {
  //     this.#transport?.onerror?.(error as Error);
  //     return;
  //   }

  //   if (this.#status !== 'started') {
  //     await this.#initialize();
  //   }

  //   this.#transport?.onmessage?.(message);
  // }

  // /**
  //  * Handle WebSocket errors.
  //  */
  // async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
  //   if (this.#status !== 'started') {
  //     await this.#initialize();
  //   }
  //   this.#transport?.onerror?.(error as Error);
  // }

  // /**
  //  * Handle WebSocket close events.
  //  */
  // async webSocketClose(
  //   ws: WebSocket,
  //   code: number,
  //   reason: string,
  //   wasClean: boolean
  // ): Promise<void> {
  //   if (this.#status !== 'started') {
  //     await this.#initialize();
  //   }
  //   this.#transport?.onclose?.();
  // }
} 