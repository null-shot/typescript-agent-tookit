# Todo List MCP - CRUD Application Plan

## Overview

This project will demonstrate a Todo List application built using MCP (Multi-Cloud Processing) with Cloudflare Workers and Durable Objects. The application will showcase CRUD (Create, Read, Update, Delete) operations and how MCP can be used to build interactive applications.

## Core Components

### 1. Database Schema

We'll use Durable Object's `state.sql()` to create and manage a SQLite database with the following schema:

```sql
CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  due_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
);
```

### 2. MCP Server

We'll extend the `McpHonoServerDO` class to create our MCP server with:
- WebSocket and SSE endpoints for real-time communication
- Database initialization
- CRUD operation handlers
- Resource functions for querying todos

### 3. MCP Tools

We'll implement the following tools:

1. **Create Todo**
   - Create a new todo item with title, description, due date, and tags
   - Validate input data
   - Return created todo

2. **Read Todo**
   - Get a single todo by ID
   - Return todo details or error if not found

3. **Update Todo**
   - Update todo properties (title, description, status, due date, tags)
   - Validate input data
   - Return updated todo

4. **Delete Todo**
   - Delete a todo by ID
   - Return success or error message

5. **Complete Todo**
   - Mark a todo as completed
   - Update completion timestamp
   - Return updated todo

### 4. MCP Resources

Resource functions will provide flexible querying capabilities:

1. **List Todos**
   - Get all todos with pagination
   - Filter by status, due date range, tags
   - Sort by different fields
   - Search by text in title or description

2. **Today's Todos**
   - Get todos due today
   - Sort by priority or due time

3. **Upcoming Todos**
   - Get todos due in the next N days
   - Group by day

4. **Statistics**
   - Get count of todos by status
   - Get completion rate

### 5. MCP Prompts

We'll create prompt templates for common interactions:

1. **Create Todo Prompt**
   - Guide users through creating new todos
   - Suggest tags and due dates

2. **Today's Todo List Prompt**
   - Show today's todos
   - Allow marking todos as complete
   - Guide users through completing their tasks one by one

3. **Task Planning Prompt**
   - Analyze upcoming todos
   - Suggest how to prioritize tasks

4. **Task History Prompt**
   - Show completed tasks
   - Provide insights on productivity

### 6. MCP Sampling (Future Feature)

We'll document how MCP Sampling could be implemented in the future:

- Track completion patterns
- Identify optimal task scheduling
- Provide personalized suggestions

## Implementation Steps

1. **Project Setup**
   - Initialize project structure
   - Configure Wrangler for Cloudflare Workers
   - Set up necessary dependencies

2. **Database Implementation**
   - Create Durable Object class
   - Implement SQL schema
   - Create database helper functions

3. **MCP Server Implementation**
   - Extend McpHonoServerDO class
   - Set up routes and handlers
   - Implement WebSocket and SSE connections

4. **Tools Implementation**
   - Implement CRUD operation tools
   - Add validation and error handling
   - Create utility functions

5. **Resources Implementation**
   - Implement query functions
   - Add filtering and sorting capabilities
   - Create specialized resource endpoints

6. **Prompts Implementation**
   - Create prompt templates
   - Design conversational flows
   - Implement multi-step interactions

7. **Testing**
   - Test CRUD operations
   - Verify real-time updates
   - Test edge cases and error handling

8. **Documentation**
   - Create usage examples
   - Document API endpoints
   - Provide prompt examples

## Usage Scenarios

### Scenario 1: Simple Todo List Creation

1. User connects to the MCP server
2. User creates several todo items using the Create Todo tool
3. User lists all todos using the List Todos resource
4. User updates status of todos using the Update Todo tool
5. User sees real-time updates via WebSocket/SSE

### Scenario 2: Working Through Today's Todo List

1. User connects to the MCP server
2. System fetches today's todos using the Today's Todos resource
3. System presents items one by one to the user
4. User marks items as complete using the Complete Todo tool
5. System provides encouragement and progress updates
6. When all items are complete, system provides summary

## Technical Stack

- Cloudflare Workers
- Durable Objects with SQLite
- Hono for HTTP routing
- WebSockets and SSE for real-time updates
- TypeScript for type safety

## Next Steps

After implementing this plan, we can consider enhancements like:
- Implementing the MCP Sampling feature 