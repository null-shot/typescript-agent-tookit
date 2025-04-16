# @xava-labs/test-utils

Testing utilities for xava-labs projects.

## Installation

```bash
yarn add -D @xava-labs/test-utils
```

## Usage

This package provides utilities for testing MCP applications, particularly in Cloudflare Worker environments.

### Available Utilities

- `WorkerSSEClientTransport`: A client transport for Server-Sent Events (SSE) in Worker environments
- `WorkerWebSocketClientTransport`: A client transport for WebSocket connections in Worker environments

### Example

```typescript
import { WorkerSSEClientTransport } from '@xava-labs/test-utils';

// Set up test client
const transport = new WorkerSSEClientTransport({
  endpoint: 'https://your-worker.example.com/sse'
});

// Use in tests
// ...
```

## License

MIT 