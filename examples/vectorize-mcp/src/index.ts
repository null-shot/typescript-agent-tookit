import { VectorizeMcpServer } from './server';

// Export the VectorizeMcpServer class for Durable Object binding
export { VectorizeMcpServer };

/**
 * Worker entrypoint for handling incoming requests to the Vectorize MCP Server
 * 
 * This worker provides:
 * - Semantic search capabilities through MCP tools
 * - Vector document management
 * - Embedding generation and storage
 * - RAG (Retrieval-Augmented Generation) workflows
 */
export default {
  async fetch(request: Request, env: {
    VECTORIZE_INDEX: VectorizeIndex;
    VECTORIZE_MCP_SERVER: DurableObjectNamespace;
    AI?: any;
  }, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Root endpoint - provide API information
    if (url.pathname === '/') {
      return new Response(JSON.stringify({
        name: 'Vectorize MCP Server',
        version: '1.0.0',
        description: 'MCP server for Cloudflare Vectorize - semantic search and vector operations',
        endpoints: {
          '/': 'API information (this endpoint)',
          '/health': 'Health check endpoint',
          '/sse': 'Server-Sent Events endpoint for MCP clients',
          '/sse/message': 'MCP message endpoint for SSE clients'
        },
        capabilities: {
          tools: 9,
          resources: 4,
          prompts: 4,
          features: [
            'Semantic search',
            'Document management',
            'Embedding generation',
            'Batch operations',
            'RAG workflows'
          ]
        },
        vectorize: {
          index_name: 'semantic-search',
          embedding_model: '@cf/baai/bge-base-en-v1.5',
          dimensions: 768,
          max_vectors: 5000000
        },
        ai: {
          embedding_provider: 'Workers AI',
          chat_provider: 'None - vector search and embeddings only'
        }
      }, null, 2), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Handle SSE endpoint for MCP clients
    if (url.pathname === '/sse') {
      const sessionIdStr = url.searchParams.get('sessionId');
      const id = sessionIdStr
        ? env.VECTORIZE_MCP_SERVER.idFromString(sessionIdStr)
        : env.VECTORIZE_MCP_SERVER.newUniqueId();

      console.log(`🔗 SSE connection for sessionId: ${sessionIdStr} with id: ${id}`);

      url.searchParams.set('sessionId', id.toString());

      return env.VECTORIZE_MCP_SERVER.get(id).fetch(new Request(
        url.toString(),
        request
      ));
    }

    // Handle MCP message endpoint for SSE clients
    if (url.pathname === '/sse/message') {
      const sessionIdStr = url.searchParams.get('sessionId');
      const id = sessionIdStr
        ? env.VECTORIZE_MCP_SERVER.idFromString(sessionIdStr)
        : env.VECTORIZE_MCP_SERVER.newUniqueId();

      console.log(`📨 SSE message for sessionId: ${sessionIdStr} with id: ${id}`);

      url.searchParams.set('sessionId', id.toString());

      return env.VECTORIZE_MCP_SERVER.get(id).fetch(new Request(
        url.toString(),
        request
      ));
    }

    // Handle health check endpoint
    if (url.pathname === '/health') {
      const id = env.VECTORIZE_MCP_SERVER.newUniqueId();
      return env.VECTORIZE_MCP_SERVER.get(id).fetch(new Request(
        url.toString(),
        request
      ));
    }

    // Default handler for other requests - route to Durable Object
    const sessionIdStr = url.searchParams.get('sessionId');
    const id = sessionIdStr
      ? env.VECTORIZE_MCP_SERVER.idFromString(sessionIdStr)
      : env.VECTORIZE_MCP_SERVER.newUniqueId();

    console.log(`🌐 Request to ${url.pathname} for sessionId: ${sessionIdStr} with id: ${id}`);

    url.searchParams.set('sessionId', id.toString());

    return env.VECTORIZE_MCP_SERVER.get(id).fetch(new Request(
      url.toString(),
      request
    ));
  }
};
