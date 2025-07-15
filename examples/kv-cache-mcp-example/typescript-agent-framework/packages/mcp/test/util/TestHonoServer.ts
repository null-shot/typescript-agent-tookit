import { McpHonoServerDO } from '../../src/mcp/hono-server';
import { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { Hono } from 'hono';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

/**
 * TestHonoServer extends McpHonoServerDO for testing purposes
 * Implements a simple Hello World example with a custom root path
 */
export class TestHonoServer extends McpHonoServerDO {
  /**
   * Implementation of the required abstract method
   */
  getImplementation(): Implementation {
    return {
      name: 'TestMcpServer',
      version: '1.0.0',
      vendor: 'Test'
    };
  }

  /**
   * Implements the required abstract configureServer method
   * Registers custom tools for the MCP server
   */
  public configureServer(server: McpServer): void {
    // Register an echo tool with a proper schema for the message parameter
    (server.tool as any)(
      'echo', 
      'A simple echo tool that returns the input message',
      { message: z.string() },
      async (args: { message: string }) => {
        return {
          content: [
            {
              type: 'text',
              text: args.message
            }
          ]
        };
      }
    );
  }

  /**
   * Override setupRoutes to add custom routes
   * Takes the Hono app instance as parameter
   */
  protected setupRoutes(app: Hono<{ Bindings: Env }>): void {
    // Call the parent implementation first to setup SSE and other MCP routes
    super.setupRoutes(app);
    
    // Add a custom hello world route at the root
    app.get('/', (c) => {
      return c.text('Hello World from TestHonoServer!');
    });

    // Add an MCP example route
    app.get('/mcp-example', (c) => {
      const implementation = this.getImplementation();
      return c.json({
        name: implementation.name,
        version: implementation.version,
        status: 'running'
      });
    });
    
    // Add the /custom-endpoint example that responds with a static message
    app.get('/custom-endpoint', (c) => {
      return c.text('This is a custom endpoint example');
    });
  }
} 