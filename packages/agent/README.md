# Cloudflare Worker AI Agent

This package implements a Durable Object-based Agent architecture for building AI applications on Cloudflare Workers. It uses the Vercel AI SDK to interact with Claude via Anthropic's API.

## Architecture

The agent architecture consists of the following components:

- **Base Agent Class**: A Durable Object that provides basic message handling capabilities
- **AIAgent Implementation**: Extends the base Agent to work with Anthropic's Claude model
- **API Router**: Handles HTTP requests and routes them to the appropriate Agent

## Features

- Durable Objects for persistent agent state
- Session-based conversations with AIAgent
- Streaming responses using Vercel AI SDK
- Cloudflare AI Gateway integration
- Extensible agent architecture

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment variables in `wrangler.jsonc` or use `.dev.vars`
4. Run the development server: `npm run dev`

## Environment Variables

- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
- `CLOUDFLARE_AI_GATEWAY_ID`: Your Cloudflare AI Gateway ID

## API Endpoints

### `/api/chat`

POST endpoint for creating a new chat session with the AI Agent.

Example request:
```json
{
  "messages": [
    { "role": "user", "content": "Hello, how are you?" }
  ]
}
```

### `/agent/:id/message`

POST endpoint for sending a message to a specific agent instance.

Example request:
```json
{
  "sessionId": "optional-session-id", 
  "message": [
    { "role": "user", "content": "Tell me more about that." }
  ]
}
```

## Extending with New Agent Types

To create a new agent type:

1. Create a new class that extends the `Agent<T>` class
2. Implement the `processMessage(message: T, sessionId: string)` method
3. Export the new agent class in `index.ts`
4. Add the agent class to the Durable Objects configuration in `wrangler.jsonc`

## Deployment

To deploy to Cloudflare Workers:

1. Update your secrets in Cloudflare:
   ```
   npx wrangler secret put ANTHROPIC_API_KEY
   ```

2. Deploy with Wrangler:
   ```
   npm run deploy
   ```

## Development

- `npm run dev` - Start the development server
- `npm test` - Run tests
- `npm run deploy` - Deploy to Cloudflare Workers

# Agent SDK

This package provides a base implementation for building AI agents using Cloudflare Workers.

## Features

- Base Agent class for implementing custom AI agents
- Routing and session management
- Tools service for integrating with external MCP (Model Context Protocol) servers

## Usage

### Basic Usage

```typescript
import { Agent, AgentEnv } from '@xava-labs/agent';
import { streamText } from 'ai';

export class MyAgent extends Agent<MyEnv> {
  async processMessage(messages, sessionId) {
    // Process messages and return a response
    const result = streamText({
      model: 'some-model',
      messages,
    });
    
    return result.toDataStreamResponse();
  }
}
```

### Using the Tools Service

The Tools Service allows you to integrate with external MCP (Model Context Protocol) servers. Here's how to use it:

1. First, create a configuration file for your MCP servers (e.g., `mcp-config.json`):

```json
{
  "mcpServers": {
    "todo-list": {
      "url": "https://example.com/sse"
    },
    "github": {
      "command": "some-command",
      "args": ["arg1", "arg2"],
      "env": {
        "API_KEY": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

2. Generate the tools registry and update your environment variables:

```bash
# By default, this updates .dev.vars in the current directory
npx tools-registry-cli ./mcp-config.json

# To output to a specific file
npx tools-registry-cli ./mcp-config.json --file .env.tools

# To output to stdout (for piping to other commands)
npx tools-registry-cli ./mcp-config.json --stdout
```

3. Add the tools service to your agent:

```typescript
import { Agent, AgentEnv } from '@xava-labs/agent';
import { ToolsService } from '@xava-labs/agent/src/services/tools-service';

export class MyAgent extends Agent<EnvWithAgent> {
  private toolsService: ToolsService;

  constructor(state, env) {
    super(state, env);
    
    // Create and initialize the tools service
    this.toolsService = new ToolsService(env);
    this.initializeToolsService();
  }
  
  private async initializeToolsService() {
    await this.toolsService.initialize();
    
    // Access the Hono app for registering routes
    if ('registerRoutes' in this.toolsService) {
      const app = (this as any).app;
      if (app) {
        this.toolsService.registerRoutes(app);
      }
    }
  }
  
  // ...
}
```

## CLI Tools

### tools-registry-cli

Converts an MCP configuration file to a base64-encoded string and updates your environment variables.

```bash
npx tools-registry-cli <configFile> [options]
```

Options:
- `--format, -f <format>`: Output format ('json' or 'base64', default: 'base64')
- `--file, -o <file>`: Output file (default: .dev.vars in current directory)
- `--stdout`: Output to stdout instead of a file

Examples:
```bash
# Update .dev.vars in current directory
npx tools-registry-cli ./mcp-config.json

# Specify a different output file
npx tools-registry-cli ./mcp-config.json --file .env.custom

# Output as JSON instead of base64
npx tools-registry-cli ./mcp-config.json --format json

# Output to stdout for piping
npx tools-registry-cli ./mcp-config.json --stdout
```

## API

### Agent

Base class for implementing custom AI agents.

### ToolsService

Service for managing tools configurations and endpoints.

### Services Import

You can import the services directly in your project:

```typescript
// Import the full services module
import { ToolsService } from '@xava-labs/agent/services';

// Use the service in your application
const toolsService = new ToolsService(env);
```

This is made possible through the package exports configuration that specifically exposes the services path.

### Tools Registry

The tools registry is a JSON object that contains the configuration for MCP servers. It is stored in the `TOOLS_SERVICE_DEFAULT_REGISTRY` environment variable.

Example:

```json
{
  "mcpServers": {
    "tool-name": {
      "command": "command-to-execute",
      "args": ["arg1", "arg2"],
      "url": "server-url",
      "env": {
        "ENV_VAR": "value"
      }
    }
  }
}
``` 