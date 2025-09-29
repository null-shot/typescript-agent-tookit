# @nullshot/test-utils

Testing utilities for nullshot projects.

## Installation

```bash
yarn add -D @nullshot/test-utils
```

## Usage

This package provides utilities for testing MCP applications, particularly in Cloudflare Worker environments.

### Available Utilities

- `WorkerSSEClientTransport`: A client transport for Server-Sent Events (SSE) in Worker environments (deprecated)
- `WorkerStreamableHTTPClientTransport`: A client transport for Streamable HTTP in Worker environments (recommended)
- `WorkerWebSocketClientTransport`: A client transport for WebSocket connections in Worker environments

### Example

```typescript
import { WorkerStreamableHTTPClientTransport } from "@nullshot/test-utils";

// Set up test client
const transport = new WorkerStreamableHTTPClientTransport({
  endpoint: "https://your-worker.example.com/mcp",
});

// Use in tests
// ...
```

## License

MIT
