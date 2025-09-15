import { Implementation } from "@modelcontextprotocol/sdk/types.js";
import { McpHonoServerDO } from "@nullshot/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VectorizeRepository } from "./repository";
import { setupServerTools } from "./tools";
import { setupServerResources } from "./resources";
import { setupServerPrompts } from "./prompts";
import { createMockRepository, isCI } from './mocks';

/**
 * VectorizeMcpServer extends McpHonoServerDO for vector database operations
 * Provides semantic search, document management, and embedding operations
 */
export class VectorizeMcpServer extends McpHonoServerDO<{
  VECTORIZE_INDEX: VectorizeIndex;
  VECTORIZE_MCP_SERVER: DurableObjectNamespace;
  AI?: any;
}> {
  private repository?: VectorizeRepository;

  constructor(ctx: DurableObjectState, env: {
    VECTORIZE_INDEX: VectorizeIndex;
    VECTORIZE_MCP_SERVER: DurableObjectNamespace;
    AI?: any;
  }) {
    super(ctx, env);
  }

  /**
   * Implementation of the required abstract method
   */
  getImplementation(): Implementation {
    return {
      name: "VectorizeMcpServer",
      version: "1.0.0",
    };
  }

  /**
   * Initialize the repository with Vectorize bindings
   */
  private initializeRepository(): VectorizeRepository {
    if (!this.repository) {
      if (isCI() || !this.env.VECTORIZE_INDEX || !this.env.AI) {
        console.warn('⚠️ CI environment detected or bindings missing. Using mock implementations.');
        this.repository = createMockRepository();
      } else {
        this.repository = new VectorizeRepository(this.env.VECTORIZE_INDEX, this.env);
      }
    }
    
    return this.repository!; // Non-null assertion since we just initialized it
  }

  /**
   * Implements the required abstract configureServer method
   * Registers vector database tools, resources, and prompts for the MCP server
   */
  configureServer(server: McpServer): void {
    try {
      console.log('🚀 Configuring Vectorize MCP Server...');
      
      // Initialize repository (with fallback for development)
      const repository = this.initializeRepository();
      
      // Set up tools, resources, and prompts
      setupServerTools(server, repository);
      setupServerResources(server, repository);
      setupServerPrompts(server);

      console.log('✅ Vectorize MCP Server configured successfully');
      console.log('📊 Available tools: 9 vector database operations');
      console.log('📚 Available resources: 4 data endpoints');
      console.log('🎭 Available prompts: 4 AI workflows');
      
    } catch (error) {
      console.error('❌ Error configuring Vectorize MCP Server:', error);
      throw error;
    }
  }

  /**
   * Get repository instance (lazy initialization)
   */
  async getRepository(): Promise<VectorizeRepository> {
    if (!this.repository) {
      this.repository = this.initializeRepository();
    }
    return this.repository;
  }

  /**
   * Health check endpoint for monitoring
   */
  async healthCheck(): Promise<{
    status: string;
    vectorize: boolean;
    workers_ai: boolean;
    timestamp: string;
  }> {
    try {
      const repository = this.initializeRepository();
      
      // Test Vectorize connection
      let vectorizeHealthy = false;
      try {
        await this.env.VECTORIZE_INDEX.describe();
        vectorizeHealthy = true;
      } catch (error) {
        console.error('Vectorize health check failed:', error);
      }

      // Test Workers AI connection
      const workersAiHealthy = !!this.env.AI;

      const overallStatus = vectorizeHealthy && workersAiHealthy ? 'healthy' : 'unhealthy';

      return {
        status: overallStatus,
        vectorize: vectorizeHealthy,
        workers_ai: workersAiHealthy,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Health check error:', error);
      return {
        status: 'error',
        vectorize: false,
        workers_ai: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Override fetch to add health check endpoint
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // Health check endpoint
    if (url.pathname === '/health') {
      try {
        const health = await this.healthCheck();
        return new Response(JSON.stringify(health, null, 2), {
          headers: { 'Content-Type': 'application/json' },
          status: health.status === 'healthy' ? 200 : 503,
        });
      } catch (error) {
        return new Response(JSON.stringify({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        }, null, 2), {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        });
      }
    }

    // Delegate to parent for MCP handling
    return super.fetch(request);
  }
}
