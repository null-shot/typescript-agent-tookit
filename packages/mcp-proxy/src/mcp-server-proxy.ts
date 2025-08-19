import { JSONRPCMessage, Implementation } from '@modelcontextprotocol/sdk/types.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { IMcpServer } from '@xava-labs/mcp/src/mcp/mcp-server-interface';

/**
 * Simple MCP Server Proxy that acts like McpServer but forwards messages to a remote container
 * This implements the minimal IMcpServer interface used by McpServerDO
 * 
 * CONNECTION STATE MANAGEMENT:
 * - isConnected() is the SINGLE SOURCE OF TRUTH for connection state checks
 * - Handles hibernated WebSocket connections properly for Cloudflare Workers
 * - All methods should use isConnected() rather than manual connection checks
 */
export class McpServerProxy implements IMcpServer {
  private proxyConnection: WebSocket | null = null;
  private connectedTransport: Transport | null = null;
  private isProxyConnected = false;
  private lastConnectionTime: number = 0;

  constructor() {
  }

  /**
   * Set the proxy connection to the remote container
   */
  public setProxyConnection(webSocket: WebSocket | null): void {
    if (!webSocket) {
      this.proxyConnection = null;
      this.isProxyConnected = false;
      return;
    }

    this.proxyConnection = webSocket;
    this.isProxyConnected = true;
    this.lastConnectionTime = Date.now();
    
    // Add listeners to track connection state
    webSocket.addEventListener('close', () => {
      this.isProxyConnected = false;
      this.proxyConnection = null;
    });
    
    webSocket.addEventListener('error', () => {
      this.isProxyConnected = false;
    });    
  }

  /**
   * Check if the proxy is currently connected - Single Source of Truth for connection state
   * 
   * IMPORTANT: This is the single source of truth for connection state!
   * All other methods should use this method rather than checking connection state manually.
   * Properly handles hibernated WebSocket connections in Cloudflare Workers.
   */
  public isConnected(): boolean {
    const hasConnection = this.proxyConnection !== null;
    const isMarkedConnected = this.isProxyConnected;
    const readyState = this.proxyConnection?.readyState;
    
    // For hibernated WebSockets in Cloudflare Workers, readyState might not be reliable
    // So we'll primarily rely on our internal tracking, but also check for obviously closed states
    if (this.proxyConnection && (readyState === 3 || readyState === 2) && this.isProxyConnected) {
      this.isProxyConnected = false;
    }
    
    // Consider connected if we have a connection object and it's marked as connected
    // and not in a definitely closed state
    const actuallyConnected = hasConnection && isMarkedConnected && readyState !== 3;
    
    return actuallyConnected;
  }

  /**
   * Debug helper to force-log detailed connection state
   * Useful for troubleshooting connection issues
   */
  public debugConnectionState(): void {
    const hasConnection = this.proxyConnection !== null;
    const isMarkedConnected = this.isProxyConnected;
    const readyState = this.proxyConnection?.readyState;
    const timeSinceConnection = Date.now() - this.lastConnectionTime;
    
    console.log('DEBUG - Connection state:', {
      hasConnection,
      readyState: readyState === 0 ? 'CONNECTING' : 
                  readyState === 1 ? 'OPEN' : 
                  readyState === 2 ? 'CLOSING' : 
                  readyState === 3 ? 'CLOSED' : 'UNKNOWN',
      isConnected: this.isConnected()
    });
  }

  /**
   * Handle messages from the remote container
   */
  public handleProxyMessage(data: string | ArrayBuffer): void {
    try {
      // Handle both string and ArrayBuffer data
      const messageStr = typeof data === 'string' ? data : new TextDecoder().decode(data);
      console.log('McpServerProxy: Received message from remote container');
      
      const message = JSON.parse(messageStr) as JSONRPCMessage;
      
      // Forward the message to the connected transport
      if (this.connectedTransport) {
        console.log('McpServerProxy: Forwarding message to MCP transport');
        this.connectedTransport.send?.(message).catch((error: unknown) => {
          console.error('Error forwarding message to transport:', error);
        });
      } else {
        console.log('McpServerProxy: No MCP transport connected (this is normal if no MCP clients are connected)');
      }
    } catch (error) {
      console.error('Error parsing proxy message:', error);
    }
  }

  /**
   * This is the key method that McpServerDO calls to connect transports
   * We mimic the McpServer.connect() behavior but add our proxy logic
   */
  async connect(transport: Transport): Promise<void> {
    console.log('McpServerProxy: Connecting transport');
    
    // Set the new transport as the active one
    this.connectedTransport = transport;
    
    try {
      console.log('McpServerProxy: Starting transport...');
      await this.connectedTransport.start();
      console.log('McpServerProxy: Transport started successfully');
    } catch (error) {
      console.error('Failed to start transport:', error);
      throw error;
    }
    
    console.log('McpServerProxy: Setting up transport handlers');
    
    transport.onmessage = (message: JSONRPCMessage) => {
      console.log('McpServerProxy: Transport received message');
      this.forwardToProxy(JSON.stringify(message));
    };
    
    // Add error handling for the transport
    transport.onerror = (error: unknown) => {
      console.error('Transport error:', error);
    };
    
    transport.onclose = () => {
      console.log('McpServerProxy: Transport closed');
      this.connectedTransport = null;
    };
    
    console.log('McpServerProxy: Transport connection completed');
  }

  /**
   * Forward a message to the remote proxy
   */
  public forwardToProxy(data: string | ArrayBuffer): void {
    // Use the single source of truth for connection checking
    const isConnected = this.isConnected();
    
    console.log('McpServerProxy: Attempting to forward message to remote container, connected:', isConnected);
    
    if (isConnected && this.proxyConnection) {
      try {
        const messageStr = typeof data === 'string' ? data : new TextDecoder().decode(data);
        console.log('McpServerProxy: Sending message to remote container');
        this.proxyConnection.send(data);
      } catch (error) {
        console.error('Error sending message to proxy:', error);
        // If sending fails, update our connection state
        this.isProxyConnected = false;
      }
    } else {
      console.warn('McpServerProxy: Cannot forward message - not connected to remote container');
    }
  }
} 