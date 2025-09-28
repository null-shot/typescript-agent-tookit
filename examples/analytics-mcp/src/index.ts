import { AnalyticsMcpServer } from './server';

// Export the AnalyticsMcpServer class for Durable Object binding
export { AnalyticsMcpServer };

// Worker entrypoint for handling incoming requests
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);
      const sessionIdStr = url.searchParams.get('sessionId');
      
      // Generate or use existing session ID
      const id = sessionIdStr
        ? env.ANALYTICS_MCP_SERVER.idFromString(sessionIdStr)
        : env.ANALYTICS_MCP_SERVER.newUniqueId();

      console.log(`Analytics MCP: Processing request for session ${id.toString()}`);
      
      // Add session ID to URL for the Durable Object
      url.searchParams.set('sessionId', id.toString());

      // Forward request to the Durable Object
      const durableObject = env.ANALYTICS_MCP_SERVER.get(id);
      const response = await durableObject.fetch(new Request(url.toString(), request));

      // Add CORS headers for browser compatibility
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      };

      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: corsHeaders
        });
      }

      // Add CORS headers to response
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          ...corsHeaders
        }
      });

      return newResponse;
    } catch (error) {
      console.error('Worker request handling error:', error);
      
      return Response.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: Date.now()
      }, { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }
  }
};

// Environment interface for TypeScript
interface Env {
  ANALYTICS_MCP_SERVER: DurableObjectNamespace<AnalyticsMcpServer>;
  ANALYTICS: AnalyticsEngineDataset;
  DB: D1Database;
}
