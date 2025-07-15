import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TodoRepository } from './repository';
import { TodoStatus } from './schema';

export function setupServerResources(server: McpServer, repository: TodoRepository) {
  // Resource to get a single todo by ID
  server.resource(
    'getTodo',
    'd1://database/todos/{id}',
    async (uri: URL) => {
      try {
        const parts = uri.pathname.split('/');
        const id = parts[parts.length - 1];
        
        const todo = await repository.getTodoById(id);
        
        if (!todo) {
          return {
            contents: [
              {
                text: `Todo with ID ${id} not found`,
                uri: 'data:text/plain,todo_not_found'
              }
            ]
          };
        }
        
        return {
          contents: [
            {
              text: `Found todo: ${todo.title}`,
              uri: uri.href
            }
          ],
          todo
        };
      } catch (error) {
        console.error("Error fetching todo:", error);
        throw new Error(`Failed to fetch todo: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // Resource to list todos with filtering and pagination
  server.resource(
    'listTodos',
    'd1://database/todos',
    {
      description: 'List todos with optional filtering and pagination'
    },
    async (uri: URL) => {
      try {
        const searchParams = uri.searchParams;
        
        // Check if an 'id' parameter is provided to get a single todo
        const todoId = searchParams.get('id');
        if (todoId) {
          // If ID is provided, return a single todo
          const todo = await repository.getTodoById(todoId);
          
          if (!todo) {
            return {
              contents: [
                {
                  text: `Todo with ID ${todoId} not found`,
                  uri: 'data:text/plain,todo_not_found'
                }
              ],
              todos: []
            };
          }
          
          return {
            contents: [
              {
                text: `Found todo: ${todo.title}`,
                uri: uri.href
              }
            ],
            todos: [todo]
          };
        }
        
        // Otherwise, proceed with normal listing
        const filters = {
          status: searchParams.get('status') as TodoStatus | null,
          due_date_start: searchParams.get('due_date_start'),
          due_date_end: searchParams.get('due_date_end'),
          search_text: searchParams.get('search_text'),
          limit: parseInt(searchParams.get('limit') || '10'),
          offset: parseInt(searchParams.get('offset') || '0'),
          sort_by: searchParams.get('sort_by') || 'created_at',
          sort_direction: searchParams.get('sort_direction') || 'desc'
        };
        
        const todos = await repository.listTodos(filters);
        
        if (todos.length === 0) {
          return {
            contents: [
              {
                text: `No todos found matching the criteria`,
                uri: 'data:text/plain,No todos found'
              }
            ],
            todos: []
          };
        }
        
        return {
          contents: [
            {
              text: `Found ${todos.length} todo(s)`,
              uri: uri.href
            }
          ],
          todos
        };
      } catch (error) {
        console.error("Error listing todos:", error);
        throw new Error(`Failed to list todos: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // Resource to get today's todos
  server.resource(
    'getTodaysTodos',
    'd1://database/todos/today',
    {
      description: 'Get todos that are due today'
    },
    async (uri: URL) => {
      try {
        const searchParams = uri.searchParams;
        const options = {
          status: searchParams.get('status') as TodoStatus | null,
          sort_by: searchParams.get('sort_by') || 'created_at',
          sort_direction: searchParams.get('sort_direction') || 'asc'
        };
        
        const todos = await repository.getTodaysTodos(options);
        
        if (todos.length === 0) {
          return {
            contents: [
              {
                text: `No todos due today`,
                uri: 'data:text/plain,no_todos_today'
              }
            ]
          };
        }
        
        return {
          contents: [
            {
              text: `Found ${todos.length} todo(s) due today`,
              uri: uri.href
            }
          ],
          todos
        };
      } catch (error) {
        console.error("Error getting today's todos:", error);
        throw new Error(`Failed to get today's todos: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // Resource to get todo statistics
  server.resource(
    'getTodoStats',
    'd1://database/todos/stats',
    {
      description: 'Get statistics about todos'
    },
    async (uri: URL) => {
      try {
        const stats = await repository.getTodoStats();
        
        return {
          contents: [
            {
              text: `Todo Statistics`,
              uri: uri.href
            }
          ],
          stats
        };
      } catch (error) {
        console.error("Error getting todo stats:", error);
        throw new Error(`Failed to get todo stats: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
} 