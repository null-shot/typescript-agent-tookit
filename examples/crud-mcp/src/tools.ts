import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TodoRepository } from './repository';
import { TodoStatus } from './schema';
import { z } from 'zod';
import { Todo } from './schema';

export function setupServerTools(server: McpServer, repository: TodoRepository) {
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
    }) => {
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
        // Create the todo in the repository
        await repository.createTodo(todo);
        
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
        const existingTodo = await repository.getTodoById(id);
        
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
        await repository.updateTodo(updatedFields);
        
        // Get the latest todo after update
        const updatedTodo = await repository.getTodoById(id);
        
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
        const todo = await repository.getTodoById(id);
        
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
        
        await repository.deleteTodoById(id);
        
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
        const existingTodo = await repository.getTodoById(id);
        
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
        await repository.updateTodo({
          id,
          status: TodoStatus.COMPLETED
        });
        
        // Get the updated todo
        const updatedTodo = await repository.getTodoById(id);
        
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
} 