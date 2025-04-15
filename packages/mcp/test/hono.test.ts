import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { McpHonoServerDO } from '../src/mcp/hono-server';
import { env, runInDurableObject } from 'cloudflare:test';
import { TestHonoServer } from './util/TestHonoServer';

describe('HonoMcpServerDO', () => {
  let id: DurableObjectId;
  let stub: DurableObjectStub<TestHonoServer>;
  let responseControllers: ReadableStreamDefaultController[] = [];

  beforeEach(() => {
    id = env.MCP_DURABLE_OBJECT.newUniqueId();
    stub = env.MCP_DURABLE_OBJECT.get(id) as DurableObjectStub<TestHonoServer>;
    responseControllers = [];
  });

  afterEach(async () => {
    // Clean up any active connections
    for (const controller of responseControllers) {
      try {
        controller.close();
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
    
    // Clear any sessions in the DO
    await runInDurableObject(stub, async (instance: McpHonoServerDO) => {
      // @ts-ignore - Access private field for testing purposes
      if (instance.sessions) {
        // @ts-ignore
        instance.sessions.clear();
      }
    });
  });

  describe('SSE Connection', () => {
    it('should establish SSE connection', async () => {
      const response = await stub.fetch('http://localhost/sse?sessionId=' + crypto.randomUUID());
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-transform');
      expect(response.headers.get('Connection')).toBe('keep-alive');  

      // Get the ReadableStream and its controller to close it later
      const stream = response.body;
      if (stream) {
        const reader = stream.getReader();
        reader.releaseLock(); // Release to allow consumption
      }
      
      // Manually verify the DO was created properly
      await runInDurableObject(stub, async (instance: McpHonoServerDO) => {
        expect(instance).toBeInstanceOf(McpHonoServerDO);
      });
    });

    it('should reject SSE connection without sessionId', async () => {
      const response = await stub.fetch('http://localhost/sse');
      
      expect(response.status).toBe(400);
      const responseData = await response.text();
      expect(responseData).toContain('Missing sessionId parameter');
    });

    it('should handle multiple SSE connections with different sessionIds', async () => {
      const sessionId1 = crypto.randomUUID();
      const sessionId2 = crypto.randomUUID();
      
      const response1 = await stub.fetch(`http://localhost/sse?sessionId=${sessionId1}`);
      const response2 = await stub.fetch(`http://localhost/sse?sessionId=${sessionId2}`);
      
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      
      // Verify that both sessions exist in the DO
      await runInDurableObject(stub, async (instance: McpHonoServerDO) => {
        // @ts-ignore - Access private field for testing purposes
        expect(instance.sessions.has(sessionId1)).toBe(true);
        // @ts-ignore
        expect(instance.sessions.has(sessionId2)).toBe(true);
      });
    });

    it('should handle reconnection with the same sessionId', async () => {
      const sessionId = crypto.randomUUID();
      
      // First connection
      const response1 = await stub.fetch(`http://localhost/sse?sessionId=${sessionId}`);
      expect(response1.status).toBe(200);
      
      // Second connection with same sessionId (should replace the first one)
      const response2 = await stub.fetch(`http://localhost/sse?sessionId=${sessionId}`);
      expect(response2.status).toBe(200);
      
      // Verify only one session exists in the DO
      await runInDurableObject(stub, async (instance: McpHonoServerDO) => {
        // @ts-ignore - Access private field for testing purposes
        expect(instance.sessions.has(sessionId)).toBe(true);
        // @ts-ignore
        expect(instance.sessions.size).toBe(1);
      });
    });
  });

  describe('Message Handling', () => {
    it('should handle messages with valid sessionId', async () => {
      // First establish SSE connection with a session ID
      const sessionId = crypto.randomUUID();
      const sseResponse = await stub.fetch(`http://localhost/sse?sessionId=${sessionId}`);
      expect(sseResponse.status).toBe(200);
      
      // Then send a message with the same session ID
      const response = await stub.fetch(
        `http://localhost/sse/message?sessionId=${sessionId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'test',
            id: '1'
          })
        }
      );
      
      expect(response.status).toBe(202);
    });

    it('should return 400 for missing sessionId', async () => {
      const response = await stub.fetch('http://localhost/sse/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'test',
          id: '1'
        })
      });
      
      expect(response.status).toBe(400);
      const responseData = await response.text();
      expect(responseData).toContain('Missing sessionId parameter');
    });
    
    it('should return 404 for non-existent sessionId', async () => {
      const nonExistentSessionId = crypto.randomUUID();
      
      const response = await stub.fetch(
        `http://localhost/sse/message?sessionId=${nonExistentSessionId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'test',
            id: '1'
          })
        }
      );
      
      expect(response.status).toBe(404);
      const responseData = await response.text();
      expect(responseData).toContain('Session not found');
    });
    
    it('should reject messages with invalid content-type', async () => {
      const sessionId = crypto.randomUUID();
      await stub.fetch(`http://localhost/sse?sessionId=${sessionId}`);
      
      const response = await stub.fetch(
        `http://localhost/sse/message?sessionId=${sessionId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain'
          },
          body: "This is not JSON"
        }
      );
      
      expect(response.status).toBe(400);
      const responseData = await response.text();
      expect(responseData).toContain('Unsupported content-type');
    });
    
    it('should reject overly large messages', async () => {
      const sessionId = crypto.randomUUID();
      await stub.fetch(`http://localhost/sse?sessionId=${sessionId}`);
      
      // Create a large message (5MB, which exceeds the 4MB limit)
      const largeString = 'x'.repeat(5 * 1024 * 1024);
      
      const response = await stub.fetch(
        `http://localhost/sse/message?sessionId=${sessionId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': (5 * 1024 * 1024).toString()
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'test',
            id: '1',
            params: { large: largeString }
          })
        }
      );
      
      expect(response.status).toBe(400);
      const responseData = await response.text();
      expect(responseData).toContain('Request body too large');
    });
    
    it('should handle invalid JSON in message body', async () => {
      const sessionId = crypto.randomUUID();
      await stub.fetch(`http://localhost/sse?sessionId=${sessionId}`);
      
      const response = await stub.fetch(
        `http://localhost/sse/message?sessionId=${sessionId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: '{ this is not valid JSON }'
        }
      );
      
      expect(response.status).toBe(400);
    });
  });

  describe('Session Management', () => {
    it('should handle session closure internally', async () => {
      const sessionId = crypto.randomUUID();
      const response = await stub.fetch(`http://localhost/sse?sessionId=${sessionId}`);
      expect(response.status).toBe(200);
      
      // Verify session exists
      await runInDurableObject(stub, async (instance: McpHonoServerDO) => {
        // @ts-ignore - Access private field for testing purposes
        expect(instance.sessions.has(sessionId)).toBe(true);
        
        // Directly access and verify session properties
        // @ts-ignore
        const transport = instance.sessions.get(sessionId);
        expect(transport).toBeDefined();
        if (transport) {
          expect(transport.sessionId).toBe(sessionId);
          
          // Test internal state of the transport
          // @ts-ignore - Access private field for testing
          expect(transport._closed).toBe(false);
          
          // Call close method and check internal state changed
          await transport.close();
          // @ts-ignore - Access private field for testing
          expect(transport._closed).toBe(true);
        }
      });
    });
  });

  describe('Integration Test', () => {
    it('should handle full message flow with SSE connection', async () => {
      // First establish SSE connection with a session ID
      const sessionId = crypto.randomUUID();
      const sseResponse = await stub.fetch(`http://localhost/sse?sessionId=${sessionId}`);
      expect(sseResponse.status).toBe(200);

      // Then send a message with the same session ID
      const messageResponse = await stub.fetch(
        `http://localhost/sse/message?sessionId=${sessionId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'test',
            id: '1'
          })
        }
      );
      
      expect(messageResponse.status).toBe(202);
    });
    
    it('should handle multiple messages to the same session', async () => {
      const sessionId = crypto.randomUUID();
      await stub.fetch(`http://localhost/sse?sessionId=${sessionId}`);
      
      // Send first message
      const response1 = await stub.fetch(
        `http://localhost/sse/message?sessionId=${sessionId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'test1',
            id: '1'
          })
        }
      );
      
      // Send second message
      const response2 = await stub.fetch(
        `http://localhost/sse/message?sessionId=${sessionId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'test2',
            id: '2'
          })
        }
      );
      
      expect(response1.status).toBe(202);
      expect(response2.status).toBe(202);
    });
  });
}); 