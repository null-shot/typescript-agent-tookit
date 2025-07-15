import { ProvidedEnv } from 'cloudflare:test';
import { TestHonoServer } from './util/TestHonoServer';

// Export all necessary components
export * from '../src/mcp/server';
export * from '../src/mcp/hono-server';
export { TestHonoServer };

// Worker entrypoint
export default {
  fetch(request: Request, env: ProvidedEnv, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const sessionIdStr = url.searchParams.get('sessionId')
    const id = sessionIdStr
        ? env.MCP_DURABLE_OBJECT.idFromString(sessionIdStr)
        : env.MCP_DURABLE_OBJECT.newUniqueId();

    console.log(`Fetching sessionId: ${sessionIdStr} with id: ${id}`);
    
    url.searchParams.set('sessionId', id.toString());

    return env.MCP_DURABLE_OBJECT.get(id).fetch(new Request(
        url.toString(),
        request
    ));
  }
};