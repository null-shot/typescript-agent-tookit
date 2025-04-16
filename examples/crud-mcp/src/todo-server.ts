import { CallToolResult, Implementation } from '@modelcontextprotocol/sdk/types.js';
import { McpHonoServerDO } from '@xava-labs/mcp';
import { Todo, TodoStatus } from './schema';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { TodoRepository } from './todo-repository';

/**
 * TodoMcpServer extends McpHonoServerDO for CRUD operations on todo items
 */
export class TodoMcpServer extends McpHonoServerDO {
  private repository: TodoRepository;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.repository = new TodoRepository(ctx);
    
    this.ctx.blockConcurrencyWhile(async () => {
      this.repository.initializeDatabase();
    });
  }

  /**
   * Implementation of the required abstract method
   */
  getImplementation(): Implementation {
    return {
      name: 'TodoMcpServer',
      version: '1.0.0',
    };
  }

  /**
   * Implements the required abstract configureServer method
   * Registers CRUD tools for the MCP server
   */
  configureServer(server: McpServer): void {
    // Create a new todo
    server.tool(
      'create_todo',
      'Create a new todo item',
      {
        title: z.string().describe('The title of the todo'),
        description: z.string().describe('The description of the todo'),
        status: z.enum([TodoStatus.NOT_STARTED, TodoStatus.IN_PROGRESS, TodoStatus.COMPLETED, TodoStatus.CANCELED]).optional().describe('The status of the todo'),
        due_date: z.string().optional().describe('The due date of the todo'),
      },       
      async ({ title, description, status, due_date }: { 
        title: string; 
        description: string; 
        status?: TodoStatus; 
        due_date?: string; 
      }) : Promise<CallToolResult> => {
        const now = new Date().toISOString();
        const todo: Todo = {
          id: crypto.randomUUID(),
          title,
          description,
          status: status || TodoStatus.NOT_STARTED,
          due_date,
          created_at: now,
          updated_at: now
        };
        console.log("Result: ", todo);
        try {
          await this.repository.createTodo(todo);
          
          return {
            content: [
              {
                type: "text",
                text: `Todo created with id: ${todo.id}`
              }
            ],
            todo
          };
        } catch (error) {
          console.error("Error creating todo:", error);
          throw new Error(`Failed to create todo: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    );
    
    // Resource to get a single todo by ID
    server.resource(
      'getTodo',
      'd1://database/todos/{id}',
      async (uri: URL) => {
        try {
          const parts = uri.pathname.split('/');
          const id = parts[parts.length - 1];
          
          const todo = await this.repository.getTodoById(id);
          
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
    
    // Update a todo
    server.tool(
      'updateTodo',
      'Update a todo item',
      {
        id: z.string().describe('The ID of the todo to update'),
        title: z.string().optional().describe('The new title of the todo'),
        description: z.string().optional().describe('The new description of the todo'),
        status: z.enum([TodoStatus.NOT_STARTED, TodoStatus.IN_PROGRESS, TodoStatus.COMPLETED, TodoStatus.CANCELED]).optional().describe('The new status of the todo'),
        due_date: z.string().optional().describe('The new due date of the todo'),
      },
      async ({ id, title, description, status, due_date }: { 
        id: string; 
        title?: string; 
        description?: string; 
        status?: TodoStatus; 
        due_date?: string; 
      }) => {
        try {
          // First check if the todo exists
          const existingTodo = await this.repository.getTodoById(id);
          
          if (!existingTodo) {
            return {
              content: [
                {
                  type: "text",
                  text: `Todo with ID ${id} not found`
                }
              ]
            };
          }
          
          // Create a partial update object - only include fields that were provided
          const updatedFields: Partial<Todo> & { id: string } = { id };
          
          if (title !== undefined) updatedFields.title = title;
          if (description !== undefined) updatedFields.description = description;
          if (status !== undefined) updatedFields.status = status;
          if (due_date !== undefined) updatedFields.due_date = due_date;
          
          // Update the todo with only the provided fields
          await this.repository.updateTodo(updatedFields);
          
          // Get the latest todo after update
          const updatedTodo = await this.repository.getTodoById(id);
          
          return {
            content: [
              {
                type: "text",
                text: `Todo updated: ${updatedTodo!.title}`
              }
            ],
            todo: updatedTodo
          };
        } catch (error) {
          console.error("Error updating todo:", error);
          throw new Error(`Failed to update todo: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    );
    
    // Delete a todo
    server.tool(
      'deleteTodo',
      'Delete a todo item',
      {
        id: z.string().describe('The ID of the todo to delete')
      },
      async ({ id }: { id: string }) => {
        try {
          const todo = await this.repository.getTodoById(id);
          
          if (!todo) {
            return {
              content: [
                {
                  type: "text",
                  text: `Todo with ID ${id} not found`
                }
              ]
            };
          }
          
          await this.repository.deleteTodoById(id);
          
          return {
            content: [
              {
                type: "text",
                text: `Todo deleted: ${todo.title}`
              }
            ]
          };
        } catch (error) {
          console.error("Error deleting todo:", error);
          throw new Error(`Failed to delete todo: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    );
    
    // Mark a todo as completed
    server.tool(
      'completeTodo',
      'Mark a todo item as completed',
      {
        id: z.string().describe('The ID of the todo to mark as completed')
      },
      async ({ id }: { id: string }) => {
        try {
          const existingTodo = await this.repository.getTodoById(id);
          
          if (!existingTodo) {
            return {
              content: [
                {
                  type: "text",
                  text: `Todo with ID ${id} not found`
                }
              ]
            };
          }
          
          // Update only the status field
          await this.repository.updateTodo({
            id,
            status: TodoStatus.COMPLETED
          });
          
          // Get the updated todo
          const updatedTodo = await this.repository.getTodoById(id);
          
          return {
            content: [
              {
                type: "text",
                text: `Todo marked as completed: ${updatedTodo!.title}`
              }
            ],
            todo: updatedTodo
          };
        } catch (error) {
          console.error("Error completing todo:", error);
          throw new Error(`Failed to complete todo: ${error instanceof Error ? error.message : String(error)}`);
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
            const todo = await this.repository.getTodoById(todoId);
            
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
            tags: searchParams.getAll('tag'),
            limit: parseInt(searchParams.get('limit') || '10'),
            offset: parseInt(searchParams.get('offset') || '0'),
            sort_by: searchParams.get('sort_by') || 'created_at',
            sort_direction: searchParams.get('sort_direction') || 'desc'
          };
          
          const todos = await this.repository.listTodos(filters);
          
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
            status: searchParams.get('status') as TodoStatus.NOT_STARTED | TodoStatus.IN_PROGRESS | null,
            sort_by: searchParams.get('sort_by') || 'created_at',
            sort_direction: searchParams.get('sort_direction') || 'asc'
          };
          
          const todos = await this.repository.getTodaysTodos(options);
          
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
          const stats = await this.repository.getTodoStats();
          
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
} 