import { ExpenseMcpServer } from './server';
import { ExpenseApprovalWorkflow } from './workflow';

// Export classes for Durable Object and Workflow bindings
export { ExpenseMcpServer, ExpenseApprovalWorkflow };

// Worker entrypoint for handling incoming requests
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const sessionIdStr = url.searchParams.get('sessionId');
    
    // ALWAYS use the same DO for all MCP requests to ensure session consistency
    // This maintains session isolation per client while fixing the routing issue
    const clientIP = request.headers.get('cf-connecting-ip') || 
                     request.headers.get('x-forwarded-for') || 
                     '127.0.0.1';
    
    // Use client IP + connection info to create a stable session key
    const sessionKey = `client-${clientIP}-${url.searchParams.get('connectionId') || 'default'}`;
    
    const id = env.EXPENSE_MCP_SERVER.idFromName(sessionKey);

    console.log(`Fetching sessionId: ${sessionIdStr} with sessionKey: ${sessionKey} -> id: ${id}`);
    
    // Don't modify the sessionId in the URL - let MCP handle it internally
    return env.EXPENSE_MCP_SERVER.get(id).fetch(request);
  }
}; 