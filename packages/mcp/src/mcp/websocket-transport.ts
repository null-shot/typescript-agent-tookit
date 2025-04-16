import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

/**
 * WebSocket Transport that connects to a Durable Object and uses hibernation
 * to efficiently handle WebSocket connections.
 * 
 * There is currently no native support for WebSocket Transport in the MCP server protocol as of 16-04-2025
 * This is a custom implementation that allows for WebSocket connections to be used with the MCP server using its native client websocket transport.
 */
export class WebSocketTransport implements Transport {
  private readonly webSocket: WebSocket;
  public readonly sessionId: string;
  private _closed = false;

  constructor(webSocket: WebSocket, sessionId: string) {
    this.webSocket = webSocket;
    this.sessionId = sessionId;
  }

  /**
   * Send a JSON-RPC message to the client
   */
  async send(message: JSONRPCMessage): Promise<void> {
    try {
      this.webSocket.send(JSON.stringify(message));
    } catch (error) {
      this.onerror?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  
  /**
   * Close the WebSocket connection
   * @param code Optional close code (defaults to 1000 - normal closure)
   * @param reason Optional reason message
   */
  async close(code?: number, reason?: string): Promise<void> {
    if (this._closed) return;
    this._closed = true;

    try {
      this.webSocket.close(code || 1000, reason || "Normal closure");
    } catch (error) {
      console.error("Error closing WebSocket:", error);
    }
    
    this.onclose?.();
  }

  /**
   * Handle an incoming message from the WebSocket
   */
  handleMessage(data: string | ArrayBuffer): void {
    try {
      // Convert ArrayBuffer to string if needed
      const messageStr = typeof data === 'string' ? data : new TextDecoder().decode(data);
      const message = JSON.parse(messageStr) as JSONRPCMessage;
      this.onmessage?.(message);
    } catch (error) {
      this.onerror?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Called when a message is received from the client
   */
  onmessage?: ((message: JSONRPCMessage) => void) | undefined;
  
  /**
   * Called when the connection is closed
   */
  onclose?: (() => void) | undefined;
  
  /**
   * Called when an error occurs
   */
  onerror?: ((error: Error) => void) | undefined;

  /**
   * Start the transport
   */
  async start(): Promise<void> {
    console.debug(`WebSocket Transport started for session: ${this.sessionId}`);
    
    try {
      // Send the session ID to the client immediately after connection
      // This is a custom message, not standard to MCP, but allowing folks using it to reconnect to the same session if desired.
      await this.send({
        jsonrpc: "2.0",
        method: "session",
        params: { sessionId: this.sessionId }
      });
    } catch (error) {
      console.error(`WebSocket Transport start error: ${error}`);
      this.onerror?.(error as Error);
    }
  }
} 