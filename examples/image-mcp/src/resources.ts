import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function setupServerResources(server: McpServer) {
  // Resource to get a single todo by ID
  // server.resource(
  //   'getTodo',
  //   'd1://database/todos/{id}',
  //   async (uri: URL) => {
  //     try {
  //       const parts = uri.pathname.split('/');
  //       const id = parts[parts.length - 1];
        
  //       const todo = await repository.getTodoById(id);
        
  //       if (!todo) {
  //         return {
  //           contents: [
  //             {
  //               text: `Todo with ID ${id} not found`,
  //               uri: 'data:text/plain,todo_not_found'
  //             }
  //           ]
  //         };
  //       }
        
  //       return {
  //         contents: [
  //           {
  //             text: `Found todo: ${todo.title}`,
  //             uri: uri.href
  //           }
  //         ],
  //         todo
  //       };
  //     } catch (error) {
  //       console.error("Error fetching todo:", error);
  //       throw new Error(`Failed to fetch todo: ${error instanceof Error ? error.message : String(error)}`);
  //     }
  //   }
  // );
} 