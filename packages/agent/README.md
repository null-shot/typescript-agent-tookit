# Cloudflare Worker AI Agent

This package implements a Durable Object-based Agent architecture for building AI applications on Cloudflare Workers. It supports multiple AI providers through AI SDK integration.

## Architecture

```
    USER                         AGENT GATEWAY                 AGENT
┌──────────┐     HTTP        ┌─────────────────┐      ┌───────────────────────┐
│          │ ──────────────> │     Worker      │      │    Durable Object     │
│ Browser  │                 │ ┌─────────────┐ │ ───> │  ┌─────────────────┐  │
│          │ <─ ─ ─ ─ ─ ─ ─  │ │   Router    │ │      │  │  Agent Router   │--│---> [STATE = D1/KV/etc.] 
└──────────┘     Stream      │ │    (Auth)   │ │      │  │ Business Logic  │┐ |
                             │ └─────────────┘ │      │  └─────────────────┘| │
                             └─────────────────┘      │         │           | │
                                                      │         │           | │
                                                      │         ▼           | │
                                                      │  ┌─────────────┐    | │
                                                      │  │   Services  │    | │
                                                      │  └─────┬───────┘    | │
                                                      └───────────────────────┘
                                                               │            │
                                                               ▼            ▼
                                                   ┌────────────────┐ ┌────────────────┐
                                                   │   3rd Party    │ │   AI Provider  │
                                                   │  MCP Services  │ │OpenAI/Anthropic│
                                                   └────────────────┘ └────────────────┘
```

## Features

- **AI SDK Support**: Integrate with AI providers via the Vercel AI SDK
- **Services**: Routes for 3rd party business logic via webhooks
- **Middleware**: Dynamic tool injection, parameter modification, and response transformation
- **Sessions**: Simple session generation and management
- **Auth**: [Coming Soon] Authentication examples
- **Events**: [Coming Soon] System event handling for agents
- **Cloudflare Agent**: [Coming Soon] Native integration with Cloudflare Agent platform

## Installation

```bash
npm install @null-shot/agent
```

## Packages

The framework consists of the following packages:

- `@null-shot/agent` - Core agent framework
- `@null-shot/agent/aisdk` - AI SDK integration layer
- `@null-shot/agent/services` - Services for extending agent functionality

## Basic Usage

```typescript
import { XavaAgent, AgentEnv } from '@null-shot/agent';
import { AiSdkAgent } from '@null-shot/agent/aisdk';
import { ToolboxService } from '@null-shot/agent/services';
import { createOpenAI } from '@ai-sdk/openai';

// Define your environment type
type MyEnv = Env & AgentEnv;

// Create your agent class
export class MyAgent extends AiSdkAgent<MyEnv> {
  constructor(state: DurableObjectState, env: MyEnv) {
    // Initialize the AI model
    const openai = createOpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
    const model = openai('gpt-4');
    
    // Initialize with services
    super(state, env, model, [new ToolboxService(env)]);
  }

  async processMessage(sessionId: string, messages: AIUISDKMessage): Promise<Response> {
    const result = await this.streamText(sessionId, {
      model: this.model,
      system: 'You are a helpful assistant.',
      messages: messages.messages,
      maxSteps: 10,
    });

    return result.toDataStreamResponse();
  }
}

// Worker handler
export default {
  async fetch(request, env, ctx) {
    // Apply router
    applyPermissionlessAgentSessionRouter(app);
    return app.fetch(request, env, ctx);
  }
};
```

## Services

Services extend agent capabilities by providing specific functionality. They allow you to:

1. Expose APIs for 3rd party services (admin, webhooks, etc.)
2. Inject context for LLMs (tools, prompts, current_time, etc.)
3. Modify LLM responses (prompt retries, quality control, reactive events)
4. [Coming Soon] Fire dynamic events from 3rd party systems

### Built-in Services

- **Toolbox**: Leverages `mcp.json` to manage tool injection to AI agents
- **Time Context**: [Coming Soon] Provides time-related context to agents

### Creating a Custom Service

Services implement the `Service` interface or extend it with additional capabilities:

```typescript
import { Service, AgentEnv } from '@null-shot/agent';
import { Hono } from 'hono';

// Basic service
export class MyService implements Service {
  name = '@my-org/agent/my-service';
  
  async initialize(): Promise<void> {
    // Initialize service resources
    console.log('Initializing my service');
  }
}

// External service with HTTP routes
export class MyExternalService implements ExternalService {
  name = '@my-org/agent/external-service';
  
  registerRoutes<E extends AgentEnv>(app: Hono<{ Bindings: E }>): void {
    app.get('/my-service/status', (c) => {
      return c.json({ status: 'ok' });
    });
  }
}

// Middleware service for AI interactions
export class MyMiddlewareService implements MiddlewareService {
  name = '@my-org/agent/middleware-service';
  middlewareVersion = '1.0.0';
  
  transformStreamTextTools(tools) {
    // Add or modify tools
    return {
      ...tools,
      myTool: {
        description: 'My custom tool',
        execute: async (params) => {
          // Tool implementation
          return { result: 'success' };
        }
      }
    };
  }
  
  transformParams(params) {
    // Modify parameters for AI requests
    return {
      ...params,
      temperature: 0.7,
    };
  }
}
```

### Registering Services with an Agent

Register services when creating an agent instance:

```typescript
constructor(state: DurableObjectState, env: MyEnv) {
  const services = [
    new ToolboxService(env),
    new MyCustomService(),
    new MyMiddlewareService()
  ];
  
  super(state, env, model, services);
}
```

## Routers

Routers act as an API gateway for agents, handling CORS, routing logic, and authentication. They will likely be renamed to "gateways" in a future release.

### Built-in Routers

- **`applyPermissionlessAgentSessionRouter()`**: Creates new sessions automatically or reuses sessions based on the `/agent/chat/:sessionId` endpoint.

```typescript
import { Hono } from 'hono';
import { AgentEnv, applyPermissionlessAgentSessionRouter } from '@null-shot/agent';

// Create Hono app
const app = new Hono<{ Bindings: MyEnv }>();
// Apply routers / custom config
applyPermissionlessAgentSessionRouter(app);
// Export worker handler
export default {
  fetch: app.fetch,
};
```

## Agent Environment

The `AgentEnv` interface provides default Durable Object naming and toolbox service configuration:

```typescript
interface AgentEnv {
  AgentDurableObject: DurableObjectNamespace;
  TOOLBOX_SERVICE_MCP_SERVERS?: string;
}
```

### Custom Environments

Implement custom environments by extending `AgentEnv`:

```typescript
// Define a custom environment
type MyEnv = {
  OPENAI_API_KEY: string;
  MY_CUSTOM_BINDING: string;
} & AgentEnv;

// Use it in your agent
export class MyAgent extends AiSdkAgent<MyEnv> {
  // ...
}
```

## Tools Management with MCP.json

The framework includes a CLI tool for managing Model Context Protocol (MCP) configurations.

### MCP.json Structure

```json
{
  "mcpServers": {
    "todo-list": {
      "url": "http://localhost:8788/sse"
    },
    "github": {
      "command": "npx mcp-github",
      "args": ["--port", "9000"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

### Tools Registry CLI

The `tools-registry-cli` processes `mcp.json` files and updates environment variables:

```bash
# Install globally
npm install -g @null-shot/agent

# Process mcp.json in current directory and update .dev.vars
npx tools-registry-cli

# Specify custom input file
npx tools-registry-cli ./my-config.json

# Output to custom file
npx tools-registry-cli --file .env.tools

# Output as JSON instead of base64
npx tools-registry-cli --format json

# Output to stdout
npx tools-registry-cli --stdout
```

## Community and Support

Join our community on [Discord](https://discord.gg/acwpp6zWEc) to discuss features and contributions for this package in the #agent channel.