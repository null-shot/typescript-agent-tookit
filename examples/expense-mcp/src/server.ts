import { Implementation } from "@modelcontextprotocol/sdk/types.js";
import { McpHonoServerDO } from "@null-shot/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ExpenseRepository } from "./repository";
import { setupServerTools } from "./tools";
import { setupServerResources } from "./resources";

// Define the environment interface for workflow access
interface WorkflowEnv {
  EXPENSE_APPROVAL_WORKFLOW?: any;
}

/**
 * ExpenseMcpServer extends McpHonoServerDO for CRUD operations on expenses
 */
export class ExpenseMcpServer extends McpHonoServerDO {
  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env);
  }

  /**
   * Implementation of the required abstract method
   */
  getImplementation(): Implementation {
    return {
      name: "ExpenseMcpServer",
      version: "1.0.0",
    };
  }

  /**
   * Implements the required abstract configureServer method
   * Registers CRUD tools for the MCP server
   */
  configureServer(server: McpServer): void {
    // Create repository for expense management
    const repository = new ExpenseRepository();

    // Remove the initializeDatabase call since it's not needed for in-memory storage
    // this.ctx.blockConcurrencyWhile(async () => {
    //   repository.initializeDatabase();
    // });

    // Create and set up tools and resources with our repository
    // Pass the environment to enable workflow access
    setupServerTools(server, repository, this.env as WorkflowEnv);
    setupServerResources(server, repository);
  }

  // Add session logging to debug
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");
    console.log(
      `[ExpenseMcpServer] Processing request for sessionId: ${sessionId}`
    );
    console.log(`[ExpenseMcpServer] Request path: ${url.pathname}`);

    return super.fetch(request);
  }

  // Override processSSEConnection to add debugging
  protected processSSEConnection(request: Request): Response {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");
    console.log(`[MCP Session ${sessionId}] Processing SSE connection`);
    console.log("[MCP] SSE sessionId:", sessionId);

    const result = super.processSSEConnection(request);

    // Log session count after processing
    console.log(
      "[MCP] Active sessions after SSE connection:",
      (this as any).sessions?.size || "unknown"
    );

    return result;
  }

  // Override processMcpRequest to add debugging
  protected processMcpRequest(request: Request) {
    console.log("[MCP] Processing MCP request:", request.url);
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");
    console.log("[MCP] MCP request sessionId:", sessionId);

    // Log session map state
    const sessions = (this as any).sessions;
    if (sessions) {
      console.log("[MCP] Available sessions:", Array.from(sessions.keys()));
      console.log("[MCP] Session exists?", sessions.has(sessionId));
    }

    return super.processMcpRequest(request);
  }
}
