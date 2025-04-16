# MCP Todo List CRUD Example

This example demonstrates a CRUD (Create, Read, Update, Delete) application using MCP (Model Context Protocol) with Cloudflare Workers and Durable Objects.

## Features

- MCP Server implementation using Durable Objects
- WebSocket and SSE for real-time communication
- SQLite database for storing todo items
- CRUD operations for todo items
- Flexible querying and filtering
- Example prompts for interacting with the todo list

## Project Structure

```
.
├── src/                   # Source code
│   ├── index.ts           # Worker entrypoint
│   ├── todo-server.ts     # TodoMcpServer implementation 
│   ├── schema.ts          # Todo schema and types
│   └── env.ts             # Environment type definitions
├── wrangler.jsonc         # Cloudflare Workers configuration
├── package.json           # Project dependencies
└── tsconfig.json          # TypeScript configuration
```

## Setup

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Yarn](https://yarnpkg.com/) or [npm](https://www.npmjs.com/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/cli-wrangler/install-update)

### 2. Installation

```bash
# Install dependencies
yarn install

# Login to Cloudflare (if not already logged in)
wrangler login
```

### 3. Development

```bash
# Start the development server
yarn dev
```

Visit `http://localhost:8787` to view the application.

### 4. Deployment

```bash
# Deploy to Cloudflare Workers
yarn deploy
```

## MCP Features Showcased

### 1. MCP Resources

- `listTodos`: List and filter todo items
- `getTodaysTodos`: Get todos due today
- `getTodoStats`: Get statistics about todos

### 2. MCP Tools

- `createTodo`: Create a new todo item
- `getTodo`: Get a todo item by ID
- `updateTodo`: Update a todo item
- `deleteTodo`: Delete a todo item
- `completeTodo`: Mark a todo as completed

### 3. MCP Prompts

The application includes example prompts for common interactions:

- Creating a new todo
- Listing and filtering todos
- Managing today's todo list
- Guided workflow for completing tasks

### 4. MCP Sampling (Future Feature)

The application architecture is designed to accommodate future sampling capabilities such as:

- Tracking completion patterns
- Identifying optimal task scheduling
- Providing personalized suggestions

## Usage Examples

### Creating a Todo

```
createTodo(
  title: "Complete project report",
  description: "Finalize the quarterly project report for the management team",
  due_date: "2023-12-15",
)
```

### Listing Todos

```
listTodos(
  status: "pending",
  sort_by: "due_date",
  sort_direction: "asc"
)
```

### Working Through Today's Todos

```
getTodaysTodos()
```

## Client Connection

Connect to the MCP server using:

```javascript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const endpoint = new URL("https://<worker-url>/api/mcp");
const transport = new SSEClientTransport(endpoint);
const client = new Client(transport);

await client.connect();
```

## License

MIT 