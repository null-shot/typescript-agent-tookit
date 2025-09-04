import { BrowserMcpServer } from './server.js';
// Export the BrowserMcpServer class for Durable Object binding
export { BrowserMcpServer };
// Worker entrypoint for handling incoming requests
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const sessionIdStr = url.searchParams.get('sessionId');
        const id = sessionIdStr
            ? env.BROWSER_MCP_SERVER.idFromString(sessionIdStr)
            : env.BROWSER_MCP_SERVER.newUniqueId();
        console.log(`Fetching sessionId: ${sessionIdStr} with id: ${id}`);
        url.searchParams.set('sessionId', id.toString());
        return env.BROWSER_MCP_SERVER.get(id).fetch(new Request(url.toString(), request));
    }
};
