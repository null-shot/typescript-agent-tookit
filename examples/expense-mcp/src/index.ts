import { ExpenseMcpServer } from './server';
import { ExpenseApprovalWorkflow } from './workflow';

// Export classes for Durable Object and Workflow bindings
export { ExpenseMcpServer, ExpenseApprovalWorkflow };

// Worker entrypoint for handling incoming requests
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const sessionIdStr = url.searchParams.get('sessionId')
    const id = sessionIdStr
        ? env.EXPENSE_MCP_SERVER.idFromString(sessionIdStr)
        : env.EXPENSE_MCP_SERVER.newUniqueId();

    console.log(`Fetching sessionId: ${sessionIdStr} with id: ${id}`);
    
    url.searchParams.set('sessionId', id.toString());

    return env.EXPENSE_MCP_SERVER.get(id).fetch(new Request(
        url.toString(),
        request
    ));
  }
}; 