import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { env, SELF } from 'cloudflare:test';

// Define a custom message type for session messages
interface SessionMessage {
  jsonrpc: string;
  method: string;
  params: {
    sessionId: string;
  };
}

/**
 * A custom WebSocket transport for testing with Cloudflare Workers
 * that implements the Transport interface directly.
 * 
 * This is designed to work with the WebSocketTransport server implementation.
 */
export class WorkerWebSocketClientTransport implements Transport {
  private socket: WebSocket | null = null;
  private connected = false;
  private url: URL;
  public sessionId: string = ''; // Will be populated after connection
  ctx: ExecutionContext;
  
  // Transport interface implementations
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
  
  constructor(url: URL, ctx: ExecutionContext) {
    this.url = url;
    this.ctx = ctx;
    
    console.log(`Creating WebSocket transport`);
  }
  
  /**
   * Start the transport by creating a WebSocket connection
   */
  async start(): Promise<void> {
    if (this.connected) {
      return;
    }
    
    console.log(`[Debug] Creating test WebSocket connection to: ${this.url.toString()}`);
    
    try {
      // For testing in a worker environment, we need a special approach
      // Convert WebSocket URL to HTTP for the initial connection
      const fetchUrl = new URL(this.url.toString());
      fetchUrl.protocol = fetchUrl.protocol.replace('ws', 'http');
      
      // NOTE: DO NOT set sessionId - let the worker generate it
      
      console.log(`[Debug] Fetching with URL: ${fetchUrl.toString()}`);
      
      // Create a request with the WebSocket upgrade headers
      const request = new Request(fetchUrl, {
        method: 'GET',
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade',
          'Sec-WebSocket-Protocol': 'mcp',
          'Sec-WebSocket-Version': '13',
          'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==', // Dummy value for testing
        }
      });
      
      // Send the request to our worker which should return a WebSocket
      console.log(`[Debug] Sending WebSocket upgrade request to worker`);
      const response = await SELF.fetch(request);
      console.log(`[Debug] Received response: ${response.status}`);
      
      // Check if we got a WebSocket response
      if (response.status !== 101 || !response.webSocket) {
        const responseText = await response.text();
        throw new Error(`Failed to create WebSocket: ${response.status} ${response.statusText} - ${responseText}`);
      }
      
      // We now have a WebSocket from the worker
      this.socket = response.webSocket;
      this.socket.accept();
      this.connected = true;
      console.log(`[Debug] WebSocket connection established`);
      
      // Set up message handler
      this.socket.addEventListener('message', (event: MessageEvent) => {
        console.log(`[Debug] WebSocket message received: ${typeof event.data}`, event.data);
        try {
          const data = event.data as string;
          const parsedData = JSON.parse(data);
          
          // Extract sessionId from the initial session message
          // The first message from the server should be a session message with the sessionId
          if (parsedData.method === "session" && parsedData.params?.sessionId) {
            const sessionMsg = parsedData as SessionMessage;
            this.sessionId = sessionMsg.params.sessionId;
            console.log(`[Debug] Received sessionId: ${this.sessionId}`);
          }
          
          // Forward the message to the handler
          this.onmessage?.(parsedData as JSONRPCMessage);
        } catch (error) {
          console.error(`[Debug] Error parsing message:`, error);
          this.onerror?.(error instanceof Error ? error : new Error(String(error)));
        }
      });
      
      // Set up close handler
      this.socket.addEventListener('close', (event: CloseEvent) => {
        console.log(`[Debug] WebSocket closed with code ${event.code}: ${event.reason}`);
        this.connected = false;
        this.onclose?.();
      });
      
      // Set up error handler
      this.socket.addEventListener('error', (event: Event) => {
        console.error(`[Debug] WebSocket error:`, event);
        const error = new Error('WebSocket error');
        this.onerror?.(error);
      });
      
      // The server sends a "session" message immediately after connection
      console.log(`[Debug] WebSocket connection ready`);
      
    } catch (error) {
      this.connected = false;
      console.error(`[Debug] Failed to create WebSocket:`, error);
      this.onerror?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  
  /**
   * Send a message over the WebSocket
   */
  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.socket || !this.connected) {
      throw new Error('WebSocket not connected');
    }
    
    try {
      const data = JSON.stringify(message);
      console.log(`[Debug] Sending WebSocket message: ${data}`);
      this.socket.send(data);
    } catch (error) {
      console.error(`[Debug] Error sending message:`, error);
      this.onerror?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  
  /**
   * Close the WebSocket connection
   */
  async close(): Promise<void> {
    if (this.socket) {
      try {
        console.log(`[Debug] Closing WebSocket connection`);
        this.socket.close(1000, 'Normal closure');
        this.connected = false;
      } catch (error) {
        console.error('[Debug] Error closing WebSocket:', error);
      }
    }
  }
} 