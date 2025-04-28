import { Hono } from 'hono';
import { ExternalService, MiddlewareService } from '../service';
import { AgentEnv } from '../env';
import { MCPClientManager } from 'agents/mcp/client';
import { LanguageModelV1CallOptions, ToolSet } from 'ai';

/**
 * Configuration for an MCP tool server
 */
export interface MCPServerConfig {
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

/**
 * Simplified interface for MCP tool objects
 */
interface MCPTool {
  name: string;
  description?: string;
  serverId: string;
  inputSchema?: {
    properties?: Record<string, any>;
  };
}

/**
 * Service for managing and exposing tools configurations and injecting them into the language model
 */
export class ToolboxService implements ExternalService, MiddlewareService {
  public name = '@xava-labs/agent/toolbox-service';
  private env: AgentEnv;
  private mcpClientManager: MCPClientManager;
  // Map to track which server config name maps to which server ID
  private serverNames: Map<string, string> = new Map();

  constructor(env: AgentEnv) {
    this.env = env;
    this.mcpClientManager = new MCPClientManager('agent-toolbox', '1.0.0');
  }

  isBase64(str: string): boolean {
    // Base64 strings must be multiple of 4 in length
    if (str.length % 4 !== 0) {
      return false;
    }
    // Valid Base64 characters plus optional padding
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(str)) {
      return false;
    }

    return true;
  }

  /**
   * Parse the MCP servers configuration from environment variables
   */
  private parseServerConfig(): Record<string, MCPServerConfig> {
    const registryStr = this.env.TOOLBOX_SERVICE_MCP_SERVERS;
    if (!registryStr) {
      throw new Error('TOOLBOX_SERVICE_MCP_SERVERS environment variable is not set');
    }

    try {
      if (this.isBase64(registryStr)) {
        const decoded = atob(registryStr);
        return JSON.parse(decoded).mcpServers || {};
      } else {
        return JSON.parse(registryStr).mcpServers || {};
      }
    } catch (error) {
      throw new Error(`Error parsing MCP servers configuration: ${error}`);
    }
  }

  /**
   * Initialize the tools service by connecting to configured MCP servers
   */
  async initialize(): Promise<void> {
    // Get the MCP server configurations
    const mcpServers = this.parseServerConfig();
    
    console.log(`Tools service initializing with ${Object.keys(mcpServers).length} servers`);
    
    // Connect to each MCP server with a URL
    for (const [name, config] of Object.entries(mcpServers)) {
      if (config.url) {
        try {
          console.log(`Initializing MCP client for ${name} at ${config.url}`);
          const { id } = await this.mcpClientManager.connect(config.url);
          // Store the mapping between server ID and config name
          this.serverNames.set(id, name);
          console.log(`MCP client for ${name} initialized with ID: ${id}`);
        } catch (error) {
          console.error(`Failed to create MCP client for ${name}:`, error);
        }
      } else if (config.command) {
        console.warn(`Skipping MCP server ${name} with command transport. Only SSE transport is currently supported.`);
      }
    }
    
    // Log duplicate tool names
    this.checkForDuplicateToolNames();
  }
  
  /**
   * Check for duplicate tool names across MCP servers and log warnings
   */
  private checkForDuplicateToolNames(): void {
    const toolsMap = new Map<string, string[]>();
    
    // Get all tools from the manager
    const allTools = this.mcpClientManager.listTools();
    
    console.log('All tools:', allTools);
    // Group tools by name and track which servers they come from
    for (const tool of allTools) {
      const name = tool.name;
      if (!toolsMap.has(name)) {
        toolsMap.set(name, []);
      }
      toolsMap.get(name)?.push(tool.serverId);
    }
    
    // Log warnings for duplicate tools
    for (const [name, serverIds] of toolsMap.entries()) {
      if (serverIds.length > 1) {
        console.warn(`Warning: Tool name '${name}' is duplicated across multiple MCP servers: ${serverIds.join(', ')}`);
      }
    }
  }


  getTools() : ToolSet {
    return this.mcpClientManager.unstable_getAITools();
  }
  
  /**
   * Register tool-related routes with the Hono app
   */
  registerRoutes<E extends AgentEnv>(app: Hono<{ Bindings: E }>): void {
    // Register a route to get information about MCP servers
    app.get('/mcp', async (c) => {
      // Gather information about MCP servers and their tools
      const mcpServers = [];
      
      for (const [id, connection] of Object.entries(this.mcpClientManager.mcpConnections)) {
        const serverName = this.serverNames.get(id) || id;
        const serverUrl = connection.url ? connection.url.toString() : "";
        
        const serverInfo = {
          id,
          name: serverName,
          url: serverUrl,
          tools: this.mcpClientManager.listTools()
            .filter(tool => tool.serverId === id)
            .map(tool => tool.name),
          connectionState: connection.connectionState
        };
        
        mcpServers.push(serverInfo);
      }
      
      return c.json({ mcpServers }, 200);
    });

    // Register a route to get all tools with details
    app.get('/tools', async (c) => {
      // Gather detailed information about all tools
      const toolsInfo = [];
      
      // Get all tools from the manager
      const allTools = this.mcpClientManager.listTools();
      
      for (const tool of allTools as MCPTool[]) {
        const serverName = this.serverNames.get(tool.serverId) || tool.serverId;
        
        toolsInfo.push({
          name: tool.name,
          description: tool.description || 'No description available',
          mcpServer: serverName,
          parameters: tool.inputSchema?.properties || {}
        });
      }
      
      return c.json({ tools: toolsInfo }, 200);
    });
  }
  
  /**
   * Clean up resources when service is shutdown
   */
  async shutdown(): Promise<void> {
    // Close all MCP connections
    await this.mcpClientManager.closeAllConnections();
  }
} 