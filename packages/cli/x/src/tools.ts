import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function setupServerTools(server: McpServer) {
  //TODO: Setup tools
  // server.tool(
  //   'create_todo',
  //   'Create a new todo item',
  //   {
  //     title: z.string().describe('The title of the todo'),
  //     description: z.string().describe('The description of the todo'),
  //     status: z.enum([TodoStatus.NOT_STARTED, TodoStatus.IN_PROGRESS, TodoStatus.COMPLETED, TodoStatus.CANCELED]).optional().describe('The status of the todo'),
  //     due_date: z.string().optional().describe('The due date of the todo'),
  //   },       
  //   async ({ title, description, status, due_date }: { 
  //     title: string; 
  //     description: string; 
  //     status?: TodoStatus; 
  //     due_date?: string; 
  //   }) => {
  //     const now = new Date().toISOString();
  //     const todo: Todo = {
  //       id: crypto.randomUUID(),
  //       title,
  //       description,
  //       status: status || TodoStatus.NOT_STARTED,
  //       due_date,
  //       created_at: now,
  //       updated_at: now
  //     };
  //     console.log("Result: ", todo);
  //    
  //       return {
  //         content: [
  //           {
  //             type: "text",
  //             text: `Todo created with id: ${todo.id}`
  //           }
  //         ],
  //         todo
  //       };
  //   }
  // );
} 