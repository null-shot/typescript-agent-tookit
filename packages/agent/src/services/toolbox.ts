import { Hono } from 'hono';
import { ExternalService, MiddlewareService } from '../service';
import { AgentEnv } from '../env';
import { experimental_createMCPClient as createMCPClient } from 'ai';

/**
 * Configuration for an MCP tool server
 */
export interface MCPServerConfig {
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
}

/**
 * Interface for the tools registry configuration
 */
export interface ToolsRegistry {
  mcpServers: Record<string, MCPServerConfig>;
}

/**
 * Simplified interface for tool objects
 */
interface ToolObject {
  description?: string;
  parameters?: Record<string, any>;
  [key: string]: any;
}

/**
 * Service for managing and exposing tools configurations and injecting them into the language model
 */
export class ToolboxService implements ExternalService, MiddlewareService {
  public name = '@xava-labs/agent/toolbox-service';
  private registry: ToolsRegistry;
  private env: AgentEnv;
  private mcpClients: Record<string, any> = {};
  private toolNameToMcpMap: Record<string, string[]> = {};

  constructor(env: AgentEnv) {
    this.env = env;
    this.registry = this.createToolsRegistry();
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

  createToolsRegistry() : ToolsRegistry {

    const registryStr = this.env.TOOLBOX_SERVICE_MCP_SERVERS;
    if (!registryStr) {
      throw new Error('TOOLS_REGISTRY environment variable is not set');
    }

    // Try to load the tools registry from environment variables
    try {
      if (this.isBase64(registryStr)) {
        const decoded = atob(registryStr);
        return JSON.parse(decoded) as ToolsRegistry;  
      } else {
        return JSON.parse(registryStr) as ToolsRegistry;
      }
    } catch (error) {
      throw new Error(`Error initializing toolbox service: ${error}`);
    }
  }

  /**
   * Initialize the tools service by parsing the tools registry from environment variables
   */
  async initialize(): Promise<void> {
    // If we couldn't load a registry, create an empty one
    if (!this.registry) {
      this.registry = { mcpServers: {} };
    }

    console.log(`Tools service initialized with ${Object.keys(this.registry.mcpServers).length} tools`);
    
    // Initialize MCP clients after loading the registry
    await this.initializeMCPClients();
    
    // Check for duplicate tool names
    this.checkForDuplicateToolNames();
  }
  
  /**
   * Initialize MCP clients for servers with SSE transport
   */
  private async initializeMCPClients(): Promise<void> {
    if (!this.registry) {
      return;
    }

    // Create MCP clients for each server with 'sse' transport
    for (const [name, config] of Object.entries(this.registry.mcpServers)) {
      if (config.url) {
        try {
          const mcpClient = await createMCPClient({
            transport: {
              type: 'sse',
              url: config.url,
            },
          });
          this.mcpClients[name] = mcpClient;
          
          // Track tool names for this MCP client
          try {
            const toolSet = await mcpClient.tools();
            const toolNames = Object.keys(toolSet);
            
            for (const toolName of toolNames) {
              if (!this.toolNameToMcpMap[toolName]) {
                this.toolNameToMcpMap[toolName] = [];
              }
              this.toolNameToMcpMap[toolName].push(name);
            }
          } catch (error) {
            console.error(`Failed to get tools from MCP client ${name}:`, error);
          }
        } catch (error) {
          console.error(`Failed to create MCP client for ${name}:`, error);
        }
      } else if (config.command) {
        console.warn(`Skipping MCP server ${name} with command transport. Only SSE transport is currently supported.`);
      }
    }
  }
  
  /**
   * Check for duplicate tool names across MCP servers and log warnings
   */
  private checkForDuplicateToolNames(): void {
    for (const [toolName, mcpServers] of Object.entries(this.toolNameToMcpMap)) {
      if (mcpServers.length > 1) {
        console.warn(`Warning: Tool name '${toolName}' is duplicated across multiple MCP servers: ${mcpServers.join(', ')}`);
      }
    }
  }

  /**
   * Get aggregated tools from all MCP clients
   */
  private async getAggregatedTools(): Promise<any> {
    const aggregatedTools = {};
    
    for (const [name, client] of Object.entries(this.mcpClients)) {
      try {
        const tools = await client.tools();
        Object.assign(aggregatedTools, tools);
      } catch (error) {
        console.error(`Failed to get tools from MCP client ${name}:`, error);
      }
    }

    return aggregatedTools;
  }

  /**
   * Transforms parameters before they are passed to the language model
   * Implements the LanguageModelV1Middleware transformParams method
   */
  async transformParams(options: {
    type: 'generate' | 'stream';
    params: any; // Using any type to avoid TypeScript errors with tools property
  }): Promise<any> {
    const { params } = options;

    // Get the aggregated tools
    const mcpTools = await this.getAggregatedTools();

    // If there are no tools or params doesn't have tools, return unchanged params
    if (!mcpTools || Object.keys(mcpTools).length === 0) {
      return params;
    }

    // Create a copy of the params
    const newParams = { ...params };

    // If tools doesn't exist, create it
    if (!newParams.tools) {
      newParams.tools = {};
    }

    // Add MCP tools to existing tools
    newParams.tools = {
      ...newParams.tools,
      ...mcpTools,
    };

    return newParams;
  }

  /**
   * Register tool-related routes with the Hono app
   */
  registerRoutes<E extends AgentEnv>(app: Hono<{ Bindings: E }>): void {
    // Register a route to get information about MCP servers
    app.get('/mcp', async (c) => {
      if (!this.registry) {
        return c.json({ mcpServers: [] }, 200);
      }
      
      // Gather information about MCP servers and their tools
      const mcpServers = [];
      
      for (const [name, config] of Object.entries(this.registry.mcpServers)) {
        const serverInfo: any = {
          name,
          url: config.url,
          hasCommand: !!config.command,
          tools: []
        };
        
        // Get the tools for this MCP server if a client exists
        if (this.mcpClients[name]) {
          try {
            const tools = await this.mcpClients[name].tools();
            serverInfo.tools = Object.keys(tools);
          } catch (error) {
            console.error(`Failed to get tools from MCP client ${name}:`, error);
          }
        }
        
        mcpServers.push(serverInfo);
      }
      
      return c.json({ mcpServers }, 200);
    });

    // Register a route to get all tools with details
    app.get('/tools', async (c) => {
      if (!this.registry) {
        return c.json({ tools: [] }, 200);
      }
      
      // Gather detailed information about all tools
      const toolsInfo = [];
      
      for (const [mcpName, client] of Object.entries(this.mcpClients)) {
        try {
          const tools = await client.tools();
          
          for (const [toolName, toolData] of Object.entries(tools)) {
            // Cast to our ToolObject interface to properly type it
            const toolObj = toolData as ToolObject;
            
            toolsInfo.push({
              name: toolName,
              description: toolObj.description || 'No description available',
              mcpServer: mcpName,
              parameters: toolObj.parameters || {}
            });
          }
        } catch (error) {
          console.error(`Failed to get tools from MCP client ${mcpName}:`, error);
        }
      }
      
      return c.json({ tools: toolsInfo }, 200);
    });
  }
} 