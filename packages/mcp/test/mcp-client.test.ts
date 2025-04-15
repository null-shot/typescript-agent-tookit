import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { WorkerSSEClientTransport } from './util/WorkerSSEClientTransport';

// Define response type for clarity
interface ToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

describe('MCP Client Connection Tests', () => {
  let client: Client;
  let ctx: ExecutionContext;

  beforeEach(async () => {
    console.log("--------- TEST STARTING ---------");
    
    // Create a new client for each test
    client = new Client({
      name: 'test-client',
      version: '1.0.0'
    });

    ctx = createExecutionContext();
    console.log("Created new MCP Client");
  });

  afterEach(async () => {
    console.log("--------- TEST ENDING ---------");
    try {
      // Close the client 
      await client.close();
      console.log("Client closed successfully");
    } catch (err) {
      console.warn('Error closing client:', err);
    }
  });

  it('should successfully connect to the mcp server', async () => {
    console.log("Starting client creation test");
    
    const transport = new WorkerSSEClientTransport(new URL('http://localhost/sse'), ctx);
    await client.connect(transport);
    
    await waitOnExecutionContext(ctx);

    
    console.log("Client creation test passed!");
  });
  
  it('should return server version matching the implementation', async () => {
    console.log("Starting server version test");
    
    const transport = new WorkerSSEClientTransport(new URL('http://localhost/sse'), ctx);
    await client.connect(transport);
    
    const serverInfo = await client.getServerVersion();
    
    // Verify that serverInfo is defined
    expect(serverInfo).not.toBeUndefined();
    
    if (serverInfo) {
      // Expected values from TestHonoServer's getImplementation method
      expect(serverInfo.name).toBe('TestMcpServer');
      expect(serverInfo.version).toBe('1.0.0');
      expect(serverInfo.vendor).toBe('Test');
    }
    
    await waitOnExecutionContext(ctx);
    
    console.log("Server version test passed!");
  });

  it('should call the echo tool and return the same message', async () => {
    console.log("Starting echo tool test");
    
    const transport = new WorkerSSEClientTransport(new URL('http://localhost/sse'), ctx);
    await client.connect(transport);
    
    // Test message to echo
    const testMessage = "Hello, world!";
    
    // Call the echo tool with our test message
    const response = await client.callTool({
      name: 'echo',
      arguments: { message: testMessage }
    }) as ToolResponse;
    
    // Verify that response has content
    expect(response).not.toBeUndefined();
    expect(Array.isArray(response.content)).toBe(true);
    expect(response.content.length).toBeGreaterThan(0);
    
    // Check the first content item is our echoed message
    const firstContent = response.content[0];
    expect(firstContent.type).toBe('text');
    expect(firstContent.text).toBe(testMessage);
    
    await waitOnExecutionContext(ctx);
    
    console.log("Echo tool test passed!");
  });
}); 