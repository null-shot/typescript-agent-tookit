# MCP Server Implementation for Cloudflare Workers

This package provides a Model Context Protocol (MCP) server implementation for Cloudflare Workers with Hono integration for HTTP routing.

## Features

- **Hono Integration** - Seamless integration with the Hono framework
- **Message Validation** - Validates incoming messages against the MCP JSON-RPC schema
- **Server-Sent Events (SSE)** - Provides real-time communication
- **Extensible Design** - Easily extend the base server with custom routes and functionality

## Architecture

The implementation is based on a Hono server that extends the base MCP server class:

1. **McpHonoServerDO** - Base class that implements core MCP functionality with Hono
2. **Transport Layer** - Handles communication between clients and the server
3. **Custom Extensions** - Extend the base server with your own routes and implementations

### Components

- `SSETransport` - Implements the MCP Transport interface using Server-Sent Events
- `McpHonoServerDO` - Base Hono server implementation for MCP

## Setup

### 1. Create Your Custom MCP Server

Create a custom server by extending the `McpHonoServerDO` class:

```typescript
import { McpHonoServerDO } from '@vibework/mcp/hono-server';
import { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { Hono } from 'hono';

/**
 * Custom MCP Server implementation
 */
export class MyMcpServer extends McpHonoServerDO {
  /**
   * Implementation of the required abstract method
   */
  getImplementation(): Implementation {
    return {
      name: 'MyMcpServer',
      version: '1.0.0',
      vendor: 'Your Company'
    };
  }

  /**
   * Override setupRoutes to add custom routes
   */
  protected setupRoutes(app: Hono): void {
    // Call the parent implementation first to setup SSE and other MCP routes
    super.setupRoutes(app);
    
    // Add your custom routes
    app.get('/', (c) => {
      return c.text('Hello from MyMcpServer!');
    });

    // Add additional MCP-related routes
    app.get('/status', (c) => {
      const implementation = this.getImplementation();
      return c.json({
        name: implementation.name,
        version: implementation.version,
        status: 'running'
      });
    });
  }
  
  /**
   * You can optionally override configureServer to add custom tools
   */
  protected configureServer(server): void {
    // Register custom tools and methods
    server.tool('MyTool', 'My custom tool', async (params: any) => {
      // Implement your tool logic here
      return {
        content: [
          {
            type: 'text',
            text: 'Tool response'
          }
        ]
      };
    });
  }
}
```

### 2. Configure Your Worker

```typescript
// worker.ts
import { MyMcpServer } from './my-mcp-server';

// Worker entrypoint
export default {
  fetch(request: Request, env: any, ctx: ExecutionContext) {
    // Create a new instance of your server and handle the request
    const server = new MyMcpServer();
    return server.fetch(request, env, ctx);
  }
};
```

### 3. Set Up Wrangler Configuration

If you're using Durable Objects or other Cloudflare features, configure them in your wrangler.jsonc:

```jsonc
{
  "name": "my-mcp-worker",
  "main": "src/worker.ts",
  "compatibility_date": "2023-10-30",
  "compatibility_flags": ["nodejs_compat"]
}
```

## Client Connection Options

Clients can connect to your MCP server via Server-Sent Events (SSE):

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

// Connect with SSE
const sseUrl = new URL('https://your-worker.example.com/');
const transport = new SSEClientTransport(sseUrl);
const client = new Client({
  name: 'my-client',
  version: '1.0.0'
});

await client.connect(transport);
```

## How It Works

1. **HTTP Request Flow**:
   - Your custom server class inherits from `McpHonoServerDO`
   - The base class sets up the core MCP routes for SSE
   - You can add custom routes and functionality by overriding methods

2. **SSE Connection**:
   - Client connects to the base path (e.g., `/`)
   - The server creates an SSE stream for communication
   - Server sends events to client; client sends requests via separate HTTP POST requests

## Session Management

The server generates a unique session ID for SSE connections and passes it in the initial event.

## Advanced Configuration

You can customize various aspects of the MCP server:

1. **Tool Registration** - Override `configureServer` method to register custom tools
2. **Custom Routes** - Override `setupRoutes` to add custom HTTP endpoints
3. **Request Handlers** - Implement custom request handling logic

## References

- [Model Context Protocol (MCP) Documentation](https://modelcontextprotocol.com)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Hono Framework](https://hono.dev/) 