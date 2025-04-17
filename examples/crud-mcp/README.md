# MCP Todo List CRUD Example

This example demonstrates a CRUD (Create, Read, Update, Delete) application using MCP (Model Context Protocol) with Cloudflare Workers and Durable Objects. The implementation showcases a robust todo list management system with real-time capabilities and SQLite persistence.

## Features

- **MCP Server Implementation**
  - Built on Durable Objects for state persistence
  - WebSocket and SSE support for real-time updates
  - SQLite database for reliable data storage
  - Comprehensive error handling and logging

- **Todo Management**
  - Full CRUD operations (Create, Read, Update, Delete)
  - Status tracking (Not Started, In Progress, Completed, Canceled)
  - Due date management
  - Rich filtering and sorting capabilities
  - Statistics and analytics

## Project Structure

```
.
├── src/
│   ├── index.ts          # Worker entrypoint and session management
│   ├── server.ts         # TodoMcpServer implementation
│   ├── repository.ts     # Database operations and queries
│   ├── schema.ts         # Data models and validation
│   ├── tools.ts          # MCP tool definitions
│   └── resources.ts      # MCP resource definitions
```

## Technical Details

### Data Model

The todo items are structured with the following fields:
- `id`: Unique identifier (UUID)
- `title`: Task title (required)
- `description`: Detailed description (optional)
- `status`: Current state (not_started, in_progress, completed, canceled)
- `due_date`: When the task is due (optional)
- `created_at`: Creation timestamp
- `updated_at`: Last modification timestamp

### Available Operations

#### MCP Tools

1. `create_todo`
   - Creates a new todo item
   - Parameters: title, description, status (optional), due_date (optional)

2. `updateTodo`
   - Updates an existing todo
   - Parameters: id, title (optional), description (optional), status (optional), due_date (optional)

3. `deleteTodo`
   - Removes a todo item
   - Parameters: id

4. `completeTodo`
   - Marks a todo as completed
   - Parameters: id

#### MCP Resources

1. `getTodo` (d1://database/todos/{id})
   - Retrieves a single todo by ID

2. `listTodos` (d1://database/todos)
   - Lists todos with advanced filtering options:
   - Filter by status
   - Date range filtering
   - Text search
   - Pagination support
   - Customizable sorting

3. `getTodaysTodos` (d1://database/todos/today)
   - Fetches todos due today
   - Optional status filtering
   - Customizable sorting

4. `getTodoStats` (d1://database/todos/stats)
   - Provides todo statistics:
   - Total count
   - Count by status
   - Completion rate

## Wrangler Configuration

The application uses Cloudflare Workers with the following configuration:

### wrangler.jsonc
```jsonc
{
  "name": "crud-mcp",
  "main": "src/index.ts",
  "compatibility_date": "2025-03-10",
  "compatibility_flags": ["nodejs_compat"],
  "durable_objects": {
    "bindings": [
      {
        "name": "TODO_MCP_SERVER",
        "class_name": "TodoMcpServer"
      }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["TodoMcpServer"]
    }
  ],
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  }
}
```

Key Configuration Points:
- **Durable Objects**: The `TodoMcpServer` class is bound as a Durable Object for state management
- **SQLite Support**: The `TodoMcpServer` class is registered for SQLite functionality via migrations
- **Observability**: Full request sampling enabled for monitoring and debugging
- **TypeScript Support**: Main entry point configured for TypeScript (`src/index.ts`)

### Environment Types

The application includes TypeScript definitions for the Worker environment:

```typescript
interface Env {
  TODO_MCP_SERVER: DurableObjectNamespace<TodoMcpServer>;
}
```

This type definition ensures proper typing for the Durable Object namespace throughout the application.

## Client Connection

Connect to the MCP server using:

```javascript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const endpoint = new URL("https://<worker-url>/sse");
const transport = new SSEClientTransport(endpoint);
const client = new Client(transport);

await client.connect();
```

## Usage Examples

### Creating a Todo

```typescript
const result = await client.callTool('create_todo', {
  title: "Complete project report",
  description: "Finalize the quarterly project report",
  due_date: "2024-03-20"
});
```

### Listing Todos with Filters

```typescript
const todos = await client.getResource(new URL(
  "d1://database/todos?status=in_progress&sort_by=due_date&sort_direction=asc"
));
```

### Getting Today's Tasks

```typescript
const todaysTodos = await client.getResource(new URL(
  "d1://database/todos/today?sort_by=created_at&sort_direction=asc"
));
```

### Updating a Todo

```typescript
const result = await client.callTool('updateTodo', {
  id: "todo-uuid",
  status: "completed",
  description: "Updated description"
});
```

## Setup

1. Prerequisites:
   - Node.js (v16 or higher)
   - Yarn or npm
   - Wrangler CLI

2. Installation:
   ```bash
   yarn install
   ```

3. Development:
   ```bash
   yarn dev
   ```

4. Deployment:
   ```bash
   wrangler login
   yarn deploy
   ```

## Error Handling

The implementation includes comprehensive error handling:
- Input validation using Zod schemas
- Database operation error handling
- Detailed error messages and logging
- Proper HTTP status codes

## Performance Considerations

- Efficient SQLite queries with proper indexing
- Pagination support for large datasets
- Real-time updates via WebSocket/SSE
- Durable Object state management

## License

MIT 