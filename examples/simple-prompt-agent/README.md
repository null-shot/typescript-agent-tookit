# Simple Prompt Agent

A Cloudflare Workers-based AI agent implementation that uses the @nullshot/agent SDK to create a simple that can manage your tasks through a todo list.

## Overview

This project demonstrates:

- Integration with AI providers (OpenAI, Anthropic, DeepSeek, Workers AI, Gemini, or Grok)
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

- **Router**: Uses Hono framework with the permissionless agent session router from @nullshot/agent
- **Agent SDK**: Implements `AiSdkAgent` from @nullshot/agent/aisdk
- **Tools Service**: Integrates `ToolboxService` for registering mcp.json and managing MCP connections as tools for your agent to use

## Getting Started

### Prerequisites

- Node.js v18 or later
- pnpm package manager
- Wrangler CLI (Cloudflare Workers)

### Installation

1. Install dependencies:

```bash
pnpm install
```

2. Set up your environment variables by copying the example file:

```bash
cp .dev.vars.example .dev.vars
```

3. Configure your `.dev.vars` with the following variables:

```
AI_PROVIDER=[anthropic || openai || deepseek || workers-ai || gemini || grok]
ANTHROPIC_API_KEY=[your_anthropic_key]
OPEN_AI_API_KEY=[your_openai_key]
DEEPSEEK_API_KEY=[your_deepseek_key]
WORKERS_AI_MODEL=[optional_workers_ai_model_override]
GOOGLE_API_KEY=[your_google_api_key]
GEMINI_MODEL=[optional_gemini_model_override]
GROK_API_KEY=[your_grok_api_key]
GROK_MODEL=[optional_grok_model_override]
```

### Development

The development setup runs three services:

- CRUD MCP server on port 8788
- Agent service on port 8787
- Playground UI on port 3000

To start development:

```bash
pnpm dev
```

To start the agent by itself:

```bash
pnpm start
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

- Extends `AiSdkAgent` from @nullshot/agent/aisdk
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
                                                   │   3rd Party    │ │  AI Provider   │
                                                   │  MCP Services  │ │  • OpenAI      │
                                                   │                │ │  • Anthropic   │
                                                   │                │ │  • DeepSeek    │
                                                   │                │ │  • Workers AI  │
                                                   │                │ │  • Gemini      │
                                                   │                │ │  • Grok        │
                                                   └────────────────┘ └────────────────┘
```

### Router Setup

The project uses:

- Hono framework for routing
- Permissionless agent session router from @nullshot/agent
- Type-safe environment bindings

### Available Endpoints

- `POST /agent/chat/:sessionId` - Send messages to the agent

## Development Workflow

1. Start the development servers:

```bash
pnpm dev
```

2. Access the services:

- Agent API: http://localhost:8787
- CRUD MCP: http://localhost:8788
- Playground UI: http://localhost:3000

3. Interact with the agent through the Playground UI or directly via the API endpoints

## Environment Variables

Required variables in `.dev.vars`:

- `AI_PROVIDER`: Choose between 'anthropic', 'openai', 'deepseek', 'workers-ai', 'gemini', or 'grok'
- `ANTHROPIC_API_KEY`: Your Anthropic API key (if using Anthropic)
- `OPEN_AI_API_KEY`: Your OpenAI API key (if using OpenAI)
- `DEEPSEEK_API_KEY`: Your DeepSeek API key (if using DeepSeek)
- `WORKERS_AI_MODEL`: Workers AI model to use (defaults to '@cf/meta/llama-3.1-8b-instruct')
- `GOOGLE_API_KEY`: Your Google API key (if using Gemini)
- `GEMINI_MODEL`: Gemini model to use (defaults to 'gemini-1.5-pro')
- `GROK_API_KEY`: Your Grok API key (if using Grok)
- `GROK_MODEL`: Grok model to use (defaults to 'grok-1')
- `TOOLS_REGISTRY`: Automatically populated during build from mcp.json

### Workers AI Provider

When using `AI_PROVIDER=workers-ai`, the agent uses Cloudflare's Workers AI platform directly through the AI binding. This provides:

- **70+ Available Models**: Access to Llama, Gemma, Mistral, Qwen, and other models
- **No External API Keys**: Uses Cloudflare's AI binding (no additional costs beyond Workers AI usage)
- **Low Latency**: Models run on Cloudflare's edge network
- **Cost Effective**: Pay only for actual AI inference usage

**Popular Workers AI Models:**
- `@cf/meta/llama-3.1-8b-instruct` (default)
- `@cf/meta/llama-3.2-3b-instruct`
- `@cf/google/gemma-2b-it-lora`
- `@cf/mistral/mistral-7b-instruct-v0.1`
- `@cf/qwen/qwen1.5-7b-chat-awq`

To use Workers AI, simply set:
```bash
AI_PROVIDER=workers-ai
# Optionally specify a different model:
WORKERS_AI_MODEL=@cf/meta/llama-3.2-3b-instruct
```

## Testing

Run the test suite:

```bash
pnpm test
```

## Deployment

Deploy to Cloudflare Workers:

```bash
pnpm deploy
```

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Hono Framework](https://hono.dev/)
- [@nullshot/agent Documentation](https://github.com/nullshot/typescript-agent-framework/tree/main/packages/agent)
