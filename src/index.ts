// Simple Worker that uses the MCP template service
export default {
  async fetch(request: Request, env: any) {
    // Call the MCP template service
    if (env.MCP_SERVICE) {
      return await env.MCP_SERVICE.fetch(request);
    }
    
    return new Response('Hello from test project! MCP service not available.', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};