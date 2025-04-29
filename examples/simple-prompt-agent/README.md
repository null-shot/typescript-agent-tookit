# Simple Prompt Agent

A Cloudflare Workers-based AI agent implementation that uses the @xava-labs/agent SDK to create a simple that can manage your tasks through a todo list.

## Overview

This project demonstrates:
- Integration with AI providers (OpenAI or Anthropic)
- Tool-based interactions using the Model Context Protocol (MCP)
- Durable Object-based state management
- Streaming responses for real-time interactions

## Project Structure

```
/simple-prompt-agent
├── src/
│   └── index.ts         # Main worker implementation with agent and router setup
├── mcp.json             # MCP server configuration
├── wrangler.jsonc       # Cloudflare Workers configuration
├── .dev.vars            # Local development environment variables
└── package.json         # Project dependencies
```

### Key Components

- **Router**: Uses Hono framework with the permissionless agent session router from @xava-labs/agent
- **Agent SDK**: Implements `AiSdkAgent` from @xava-labs/agent/aisdk
- **Tools Service**: Integrates `ToolboxService` for registering mcp.json and managing MCP connections as tools for your agent to use

## Getting Started

### Prerequisites

- Node.js v18 or later
- Yarn package manager
- Wrangler CLI (Cloudflare Workers)

### Installation

1. Install dependencies:
```bash
yarn install
```

2. Set up your environment variables by copying the example file:
```bash
cp .dev.vars.example .dev.vars
```

3. Configure your `.dev.vars` with the following variables:
```
AI_PROVIDER=[anthropic || openai]
ANTHROPIC_API_KEY=[your_anthropic_key]
OPEN_AI_API_KEY=[your_openai_key]
```

### Development

The development setup runs three services:

- CRUD MCP server on port 8788
- Agent service on port 8787
- Playground UI on port 3000

To start development:

```bash
yarn dev
```

To start the agent by itself:

```bash
yarn start
```

## Configuration Files

### mcp.json

The `mcp.json` file configures the Model Context Protocol servers that the agent can interact with:

```json
{
  "mcpServers": {
    "todo-list": {
      "url": "http://localhost:8788/sse"
    }
  }
}
```

This configuration is automatically serialized into an environment variable during the build process. The `tools-registry-cli` converts this configuration into a base64-encoded string that's stored in the `TOOLS_REGISTRY` environment variable.

## Architecture

### Agent Implementation

The `SimplePromptAgent` class:
- Extends `AiSdkAgent` from @xava-labs/agent/aisdk
- Supports both Anthropic and OpenAI language models
- Integrates with the ToolboxService for todo list management
- Uses streaming responses for real-time interaction

```ascii
┌──────────┐     HTTP        ┌─────────────────┐      ┌───────────────────────┐
│          │ ──────────────> │     Worker      │      │    Durable Object     │
│ Browser  │                 │ ┌─────────────┐ │ ───> │  ┌─────────────────┐  │
│          │ <─ ─ ─ ─ ─ ─ ─  │ │   Router    │ │      │  │  Agent Router   │  │
└──────────┘     Stream      │ │    (Auth)   │ │      │  │ Business Logic  │┐ |
                             │ └─────────────┘ │      │  └─────────────────┘| │
                             └─────────────────┘      │         │           | │
                                                      │         │           | │
                                                      │         ▼           | │
                                                      │  ┌─────────────┐    | │
                                                      │  │ToolboxService│   | │
                                                      │  └─────┬───────┘    | │
                                                      └───────────────────────┘
                                                               │            │
                                                               ▼            ▼
                                                   ┌────────────────┐ ┌────────────────┐
                                                   │   3rd Party    │ │   AI Provider  │
                                                   │  MCP Services  │ │OpenAI/Anthropic│
                                                   └────────────────┘ └────────────────┘
```

### Router Setup

The project uses:
- Hono framework for routing
- Permissionless agent session router from @xava-labs/agent
- Type-safe environment bindings

### Available Endpoints

- `POST /agent/chat/:sessionId` - Send messages to the agent

## Development Workflow

1. Start the development servers:
```bash
yarn dev
```

2. Access the services:
- Agent API: http://localhost:8787
- CRUD MCP: http://localhost:8788
- Playground UI: http://localhost:3000

3. Interact with the agent through the Playground UI or directly via the API endpoints

## Environment Variables

Required variables in `.dev.vars`:

- `AI_PROVIDER`: Choose between 'anthropic' or 'openai'
- `ANTHROPIC_API_KEY`: Your Anthropic API key (if using Anthropic)
- `OPEN_AI_API_KEY`: Your OpenAI API key (if using OpenAI)
- `TOOLS_REGISTRY`: Automatically populated during build from mcp.json

## Testing

Run the test suite:

```bash
yarn test
```

## Deployment

Deploy to Cloudflare Workers:

```bash
yarn deploy
```

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Hono Framework](https://hono.dev/)
- [@xava-labs/agent Documentation](https://github.com/xava-labs/agent) 