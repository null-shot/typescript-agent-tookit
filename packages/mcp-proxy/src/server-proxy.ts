import { Implementation } from "@modelcontextprotocol/sdk/types.js";
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpServerDO, MCP_SUBPROTOCOL } from "@xava-labs/mcp/src/mcp/server";
import { McpServerProxy } from "./mcp-server-proxy";

const REMOTE_CONTAINER_WS_ENDPOINT = "/remote-container/ws";
const CLIENT_WS_ENDPOINT = "/client/ws";

/**
 * Interface for the remote container WebSocket attachment data
 */
interface RemoteContainerAttachment {
  isRemoteContainer: boolean;
}

/**
 * Interface for the client WebSocket attachment data
 */
interface ClientAttachment {
  isClient: boolean;
}

/**
 * McpServerProxyDO extends McpServerDO to add remote container proxy capabilities.
 * It provides WebSocket endpoints for both clients and remote containers,
 * facilitating bidirectional communication between them.
 */
export class McpServerProxyDO extends McpServerDO {
 
  private mcpProxy: McpServerProxy;
  private clientConnections: Set<WebSocket> = new Set();
  
  constructor(ctx: DurableObjectState, env: any) {
    const proxy = new McpServerProxy();
    super(ctx, env, proxy);
    this.mcpProxy = proxy;
    
    // Restore proxy connection state if Durable Object was hibernated and woke up
    this.restoreProxyConnectionFromHibernation();
  }

  getImplementation(): Implementation {
    return {
      name: "McpServerProxy",
      version: "1.0.0",
    };
  }

  /**
   * Abstract method that must be implemented by subclasses to configure the server instance.
   * For proxy, we override this to do nothing since we're forwarding to remote container.
   */
  configureServer(server: McpServer): void {
    // Override to do nothing - proxy forwards to remote container
    // Subclasses can still override this if they need custom configuration
  }

  /**
   * Process a client WebSocket connection
   */
  protected processClientConnection(request: Request): Response {
    // Verify the Upgrade header is present and is WebSocket
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response('Expected Upgrade: websocket', {
        status: 426,
      });
    }

    // Create WebSocket pair
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Store marker that this is a client connection
    server.serializeAttachment({ isClient: true } as ClientAttachment);

    // Accept WebSocket with hibernation support
    this.ctx.acceptWebSocket(server);

    // Add to client connections set
    this.clientConnections.add(server);

    // Auto-initialize the client with status and server list
    this.initializeNewClient(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Initialize a newly connected client by sending status and requesting server list
   */
  private initializeNewClient(clientWs: WebSocket): void {
    // Send immediate status to the client
    const statusMessage = {
      verb: 'status',
      success: true,
      connected: this.mcpProxy.isConnected(),
      message: this.mcpProxy.isConnected() ? 'Connected to remote container' : 'Remote container not connected',
      timestamp: new Date().toISOString()
    };
    
    try {
      clientWs.send(JSON.stringify(statusMessage));
    } catch (error) {
      console.error('Failed to send status message to client:', error);
    }

    // If remote container is connected, automatically request server list
    if (this.mcpProxy.isConnected()) {
      const listRequest = {
        verb: 'list'
      };
      
      try {
        this.mcpProxy.forwardToProxy(JSON.stringify(listRequest));
      } catch (error) {
        console.error('Failed to request server list for client:', error);
      }
    } else {
      // Send empty server list if remote container not connected
      const emptyListResponse = {
        verb: 'list',
        success: true,
        data: [],
        count: 0,
        timestamp: new Date().toISOString()
      };
      
      try {
        clientWs.send(JSON.stringify(emptyListResponse));
      } catch (error) {
        console.error('Failed to send empty server list to client:', error);
      }
    }
  }

  /**
   * Restore proxy connection state after hibernation
   * When a Durable Object wakes up from hibernation, it needs to reconnect to existing WebSockets
   */
  private restoreProxyConnectionFromHibernation(): void {
    // Get all existing WebSocket connections
    const allWebSockets = this.ctx.getWebSockets();
    
    for (const ws of allWebSockets) {
      try {
        const attachment = ws.deserializeAttachment() as RemoteContainerAttachment | ClientAttachment | { sessionId: string } | null;
        
        // Look for remote container connection
        if (attachment && 'isRemoteContainer' in attachment && attachment.isRemoteContainer) {
          this.mcpProxy.setProxyConnection(ws);
          break; // Only need one remote container connection
        }
        // Track client connections
        else if (attachment && 'isClient' in attachment && attachment.isClient) {
          this.clientConnections.add(ws);
        }
      } catch (error) {
        console.error('Error restoring WebSocket connection:', error);
      }
    }
    
    // If we restored a proxy connection, broadcast the connected status to any existing clients
    if (this.mcpProxy.isConnected() && this.clientConnections.size > 0) {
      this.broadcastConnectionStatus(true, 'Remote container connection restored from hibernation');
    }
  }

  /**
   * Debug helper for troubleshooting connection issues
   * Call this method when you need detailed connection state information
   */
  public debugConnectionState(): void {
    this.mcpProxy.debugConnectionState();
  }

  /**
   * Process a remote container WebSocket connection
   */
  protected processRemoteContainerConnection(request: Request): Response {
    // Verify the Upgrade header is present and is WebSocket
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response('Expected Upgrade: websocket', {
        status: 426,
      });
    }

    // Create WebSocket pair
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Store marker that this is a remote container connection
    server.serializeAttachment({ isRemoteContainer: true } as RemoteContainerAttachment);

    // Accept WebSocket with hibernation support
    this.ctx.acceptWebSocket(server);

    // Set this as the proxy connection
    this.mcpProxy.setProxyConnection(server);
    
    // Broadcast connection status to all clients
    this.broadcastConnectionStatus(true, 'Remote container connected');

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcastToClients(message: string): void {
    for (const client of this.clientConnections) {
      try {
        client.send(message);
      } catch (error) {
        console.error('Error sending message to client:', error);
        // Remove failed client connection
        this.clientConnections.delete(client);
      }
    }
  }

  /**
   * Broadcast connection status to all clients
   */
  private broadcastConnectionStatus(connected: boolean, message: string): void {
    const statusMessage = {
      verb: 'status',
      success: true,
      connected: connected,
      message: message,
      timestamp: new Date().toISOString()
    };
    
    this.broadcastToClients(JSON.stringify(statusMessage));
  }

  /**
   * Override webSocketMessage to handle message routing between clients and remote container
   */
  override async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer): Promise<void> {
    const attachment = ws.deserializeAttachment() as RemoteContainerAttachment | ClientAttachment | { sessionId: string } | null;
    
    // Handle messages from remote container
    if (attachment && 'isRemoteContainer' in attachment && attachment.isRemoteContainer) {
      const messageStr = typeof data === 'string' ? data : new TextDecoder().decode(data);
      console.log('MCP Proxy: Received message from remote container:', messageStr.substring(0, 200) + '...');
      
      // Check if this is a system message (shutdown notification, etc.)
      let isAdminMessage = false;
      try {
        const messageData = JSON.parse(messageStr);
        
        // Check for admin/management messages that should only go to web clients
        if (messageData.verb || messageData.type) {
          isAdminMessage = true;
          
          switch (messageData.type || messageData.verb) {
            case 'client_ready':
              // Remote container client ready
              break;
            case 'client_shutdown':
              // Notify clients about container shutdown
              this.broadcastConnectionStatus(false, 'Remote container shutting down gracefully');
              // Don't broadcast the raw shutdown message to clients
              return;
            case 'add':
            case 'remove':
            case 'list':
            case 'status':
              // These are admin commands - only broadcast to web clients
              break;
            default:
              // Unknown admin message type, still treat as admin
              break;
          }
        }
        // Check for JSON-RPC messages (these should go to MCP transports)
        else if (messageData.jsonrpc || messageData.id !== undefined || messageData.method || messageData.result !== undefined || messageData.error !== undefined) {
          isAdminMessage = false; // This is an MCP protocol message
        }
      } catch (error) {
        // If we can't parse it, assume it might be an MCP message
        console.warn('Could not parse message from remote container:', error);
        isAdminMessage = false;
      }
      
      // Forward to MCP transport only if it's NOT an admin message
      if (!isAdminMessage) {
        this.mcpProxy.handleProxyMessage(data);
      }
      
      // Always broadcast admin messages to web clients
      // For MCP messages, broadcast only if there are web clients interested
      if (isAdminMessage || this.clientConnections.size > 0) {
        this.broadcastToClients(messageStr);
      }
    }
    // Handle messages from clients
    else if (attachment && 'isClient' in attachment && attachment.isClient) {
      const messageStr = typeof data === 'string' ? data : new TextDecoder().decode(data);
      console.log('MCP Proxy: Received message from client:', messageStr.substring(0, 200) + '...');
      
      // Check connection state before forwarding
      if (!this.mcpProxy.isConnected()) {
        // Send error response back to client
        const errorResponse = {
          verb: 'error',
          success: false,
          message: 'Remote container not connected',
          timestamp: new Date().toISOString()
        };
        
        try {
          ws.send(JSON.stringify(errorResponse));
        } catch (error) {
          console.error('Failed to send error response to client:', error);
        }
        return;
      }
      
      console.log('MCP Proxy: Forwarding client message to remote container');
      this.mcpProxy.forwardToProxy(messageStr);
    }
    else {
      console.log('MCP Proxy: Processing message via transport for MCP client connection');
      // Process the message via transport for consistency (MCP client connections)
      super.webSocketMessage(ws, data);
    }
  }

  /**
   * Override webSocketClose to handle client and remote container disconnections
   */
  override async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    const attachment = ws.deserializeAttachment() as RemoteContainerAttachment | ClientAttachment | { sessionId: string } | null;
    
    // Handle remote container disconnection
    if (attachment && 'isRemoteContainer' in attachment && attachment.isRemoteContainer) {
      this.mcpProxy.setProxyConnection(null);
      
      // Determine disconnect reason and broadcast status
      const disconnectReason = wasClean 
        ? (code === 1000 ? 'Remote container disconnected gracefully' : `Remote container closed (code: ${code})`)
        : 'Remote container disconnected unexpectedly';
      
      this.broadcastConnectionStatus(false, disconnectReason);
    }
    // Handle client disconnection
    else if (attachment && 'isClient' in attachment && attachment.isClient) {
      this.clientConnections.delete(ws);
    }
    
    // Delegate to parent for regular client handling
    return super.webSocketClose(ws, code, reason, wasClean);
  }

  /**
   * Override webSocketError to handle client and remote container errors
   */
  override async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    const attachment = ws.deserializeAttachment() as RemoteContainerAttachment | ClientAttachment | { sessionId: string } | null;
    
    console.error('WebSocket error:', error);
    
    // Handle remote container error
    if (attachment && 'isRemoteContainer' in attachment && attachment.isRemoteContainer) {
      this.mcpProxy.setProxyConnection(null);
      this.broadcastConnectionStatus(false, 'Remote container error occurred');
    }
    // Handle client error
    else if (attachment && 'isClient' in attachment && attachment.isClient) {
      this.clientConnections.delete(ws);
    }
    
    // Delegate to parent for regular client handling
    return super.webSocketError(ws, error);
  }

  /**
   * Main fetch handler - handles client and remote container WebSocket endpoints
   */
  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Process client WebSocket upgrade requests
    if (path === CLIENT_WS_ENDPOINT || path.endsWith(CLIENT_WS_ENDPOINT)) {
      return this.processClientConnection(request);
    }

    // Process remote container WebSocket upgrade requests
    if (path === REMOTE_CONTAINER_WS_ENDPOINT || path.endsWith(REMOTE_CONTAINER_WS_ENDPOINT)) {
      return this.processRemoteContainerConnection(request);
    }

    // Only delegate to parent for MCP-related endpoints
    if (path.endsWith('/ws') || path.endsWith('/sse') || path.endsWith('/message')) {
      return super.fetch(request);
    }

    // For any other paths, return 404
    return new Response(JSON.stringify({
      success: false,
      error: 'Endpoint not found',
      path: path,
      method: method,
      availableEndpoints: [CLIENT_WS_ENDPOINT, REMOTE_CONTAINER_WS_ENDPOINT, '/sse', '/ws', '/message']
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 