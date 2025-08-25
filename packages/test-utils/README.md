# @null-shot/test-utils

Testing utilities for null-shot projects.

## Installation

```bash
yarn add -D @null-shot/test-utils
```

## Usage

This package provides utilities for testing MCP applications, particularly in Cloudflare Worker environments.

### Available Utilities

- `WorkerSSEClientTransport`: A client transport for Server-Sent Events (SSE) in Worker environments
- `WorkerWebSocketClientTransport`: A client transport for WebSocket connections in Worker environments

### Example

```typescript
import { WorkerSSEClientTransport } from '@null-shot/test-utils';

// Set up test client
const transport = new WorkerSSEClientTransport({
  endpoint: 'https://your-worker.example.com/sse'
});

// Use in tests
// ...
```

## License

MIT 