# Simple Prompt Agent

A basic implementation of an AI agent using the Cloudflare Workers Durable Objects infrastructure.

## Overview

This is a simple agent implementation that:

1. Extends the Agent class from the @xava-labs/agent package
2. Provides a basic echo response mechanism that can be replaced with a real LLM integration
3. Uses a reusable router pattern for handling agent sessions
4. Implements a clean bootstrapping pattern for agent Workers

## Key Features

- **Durable Object-Based**: Leverages Cloudflare Durable Objects for session state management
- **Reusable Router**: Includes a router implementation that can be used across multiple projects:
  - `createAgentRouter()`: Creates a reusable router that can be configured with different namespaces
  - `bootstrapAgentWorker()`: Bootstraps a complete Worker with agent functionality
- **Streaming API**: Uses streaming responses for real-time interactions
- **Extensible**: Designed to be easily extended with real LLM integrations

## Project Structure

```
/simple-prompt-agent
  ├── src/
  │   ├── index.ts      # Main worker entry point and agent implementation
  │   └── router.ts     # Reusable router implementation with bootstrap function
  ├── wrangler.jsonc    # Cloudflare Workers configuration
  └── package.json      # Dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js v18 or later
- Wrangler CLI installed

### Installation

1. Clone the repository
2. Navigate to the examples/simple-prompt-agent directory
3. Install dependencies:

```bash
yarn install
```

### Development

To start the development server:

```bash
yarn dev
```

### Testing

To run the tests:

```bash
yarn test
```

### Deployment

To deploy to Cloudflare Workers:

```bash
yarn deploy
```

## API Endpoints

- **GET /** - Returns basic information about the agent
- **POST /chat/:sessionId?** - Sends a message to the agent
  - If no sessionId is provided, a new session will be created
  - If a sessionId is provided, the message will be added to the existing session

## Router Implementation

The project includes a reusable router pattern that can be easily used in any project:

### Router Creation and Configuration

```typescript
// Create a reusable router
const router = createAgentRouter();

// Configure it with a namespace
router.configureNamespace(env.MY_AGENT_NAMESPACE);

// Mount it in your Hono app
app.route('/chat', router);
```

### Complete Worker Bootstrapping

```typescript
// Bootstrap a complete Worker with a single function call
const app = bootstrapAgentWorker({
  agentNamespace: env.MY_AGENT_NAMESPACE,
  basePath: '/chat',        // optional, defaults to '/chat'
  infoRoute: true           // optional, defaults to true
});

// Use in your fetch handler
export default {
  async fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  }
};
```

## Example Usage

```javascript
// Send a message to a new session
const response = await fetch('https://simple-prompt-agent.example.workers.dev/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify([
    { role: 'user', content: 'Hello, agent!' }
  ])
});

// Get the session ID from the URL after a new session is created
const url = response.url;
const sessionId = url.split('/').pop();

// Send another message to the same session
await fetch(`https://simple-prompt-agent.example.workers.dev/chat/${sessionId}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify([
    { role: 'user', content: 'How are you today?' }
  ])
});
```

## Extending to Other Projects

To use this router in other projects:

1. Copy the `router.ts` file to your project
2. Import `bootstrapAgentWorker` or `createAgentRouter` as needed
3. Configure with your own Durable Object namespace

This pattern provides a clean, reusable way to create agent-based Workers without duplicating code.

## Extending the Agent

To enhance this agent with real LLM capabilities, modify the `processMessage` method in the `SimplePromptAgent` class to integrate with your preferred LLM provider.

Example:

```typescript
async processMessage(messages: CoreMessage[], sessionId: string): Promise<Response> {
  try {
    // Integration with OpenAI or other LLM provider
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
      stream: true
    });
    
    // Return a streaming response
    return new StreamingTextResponse(response);
  } catch (error) {
    console.error('Error in processMessage:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
```

# Simple Prompt Agent Example

This example demonstrates a simple agent implementation that uses the tools service to integrate with external MCP (Model Context Protocol) servers.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Yarn](https://yarnpkg.com/)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

## Setup

1. Install dependencies:

```bash
yarn install
```

2. Set up environment variables:

Copy the `.dev.vars.example` file to `.dev.vars` and fill in the required values:

```bash
cp .dev.vars.example .dev.vars
```

3. Build the project:

```bash
yarn build
```

This will:
- Run the `prebuild` script to generate the tools registry from `mcp-config.json` and update `.dev.vars`
- Build the worker

4. Start the development server:

```bash
yarn dev
```

## How it Works

### Tools Service Integration

This example demonstrates how to use the tools service to integrate with external MCP servers. The integration works as follows:

1. **Configuration**: The `mcp-config.json` file contains the configuration for the MCP servers.

2. **Preprocessing**: During the build process, the `prebuild` script runs the `tools-registry-cli` to convert the configuration to a base64-encoded string and directly updates the `.dev.vars` file with the `TOOLS_REGISTRY` environment variable.

3. **Environment Variables**: The Wrangler configuration (`wrangler.jsonc`) includes the `TOOLS_SERVICE_DEFAULT_REGISTRY` environment variable, which is populated from the `.dev.vars` file.

4. **Service Initialization**: The `SimplePromptAgent` class creates an instance of the ToolsService and initializes it manually.

5. **API Endpoints**: The tools service adds API endpoints for interacting with the tools:
   - `GET /tools`: Lists all available tools
   - `GET /tools/:toolName`: Gets information about a specific tool

## API Endpoints

### Agent Endpoints

- `POST /agent/chat/:sessionId`: Send a message to the agent

### Tools Endpoints

- `GET /tools`: List all available tools
- `GET /tools/:toolName`: Get information about a specific tool

## Developing

### Adding New Tools

To add a new tool to the configuration:

1. Edit the `mcp-config.json` file to add the new tool:

```json
{
  "mcpServers": {
    "new-tool": {
      "url": "https://example.com/sse"
    }
  }
}
```

2. Rebuild the project:

```bash
yarn build
```

### Customizing the Agent

The agent implementation is in `src/index.ts`. You can customize it by modifying the `processMessage` method. 