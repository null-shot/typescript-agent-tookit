import { ImageMcpServer } from './server';
// Export the TodoMcpServer class for Durable Object binding
export { ImageMcpServer };

// Worker entrypoint for handling incoming requests
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const sessionIdStr = url.searchParams.get('sessionId')
    const id = sessionIdStr
        ? env.IMAGE_MCP_SERVER.idFromString(sessionIdStr)
        : env.IMAGE_MCP_SERVER.newUniqueId();

    console.log(`Fetching sessionId: ${sessionIdStr} with id: ${id}`);
    
    url.searchParams.set('sessionId', id.toString());

    return env.IMAGE_MCP_SERVER.get(id).fetch(new Request(
        url.toString(),
        request
    ));
  }
};
