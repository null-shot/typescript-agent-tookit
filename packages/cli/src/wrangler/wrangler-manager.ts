import { readFile, writeFile, access } from "node:fs/promises";
import { parse, modify, applyEdits } from "jsonc-parser";
import type { WranglerConfig, MCPConfig } from "../types";
import { CLIError } from "../utils/errors";
import { Logger } from "../utils/logger";

const logger = new Logger();

export class WranglerManager {
  private wranglerPath;
  #config: WranglerConfig = {};

  constructor(configPath: string = "wrangler.jsonc") {
    this.wranglerPath = configPath;
  }

  async readConfig(): Promise<WranglerConfig> {
    try {
      await access(this.wranglerPath);
    } catch {
      // Create default wrangler config if it doesn't exist
      const defaultConfig: WranglerConfig = {
        name: "mcp-worker",
        compatibility_date:
          new Date().toISOString().split("T")[0] ?? "2025-05-15",
        compatibility_flags: ["nodejs_compat"],
        durable_objects: {
          bindings: [],
        },
        services: [],
      };

      await this.writeConfig(defaultConfig);
      return defaultConfig;
    }

    try {
      const content = await readFile(this.wranglerPath, "utf-8");
      this.#config = parse(content) as WranglerConfig;
      return this.#config;
    } catch (error) {
      throw new CLIError(
        `Failed to parse wrangler.jsonc: ${error instanceof Error ? error.message : String(error)}`,
        "Ensure the file contains valid JSONC syntax",
        1,
      );
    }
  }

  async writeConfig(config: WranglerConfig): Promise<void> {
    try {
      // Preserve formatting if file exists
      let content: string;
      try {
        const existingContent = await readFile(this.wranglerPath, {
          encoding: "utf-8",
          flag: "r",
        });
        const edits = modify(existingContent, [], config, {
          formattingOptions: { insertSpaces: true, tabSize: 2 },
        });
        content = applyEdits(existingContent, edits);
      } catch {
        // File doesn't exist, create new
        content = JSON.stringify(config, null, 2);
      }

      await writeFile(this.wranglerPath, content, {
        encoding: "utf-8",
        flag: "w+",
      });
      logger.debug(`Wrangler configuration saved to ${this.wranglerPath}`);
    } catch (error) {
      throw new CLIError(
        `Failed to save wrangler.jsonc: ${error instanceof Error ? error.message : String(error)}`,
        "Check file permissions and disk space",
        1,
      );
    }
  }

  async updateConfig(mcpConfig: MCPConfig): Promise<void> {
    const wranglerConfig = await this.readConfig();

    // Ensure required structure exists
    if (!wranglerConfig.durable_objects) {
      wranglerConfig.durable_objects = { bindings: [] };
    }
    if (!wranglerConfig.durable_objects.bindings) {
      wranglerConfig.durable_objects.bindings = [];
    }
    if (!wranglerConfig.services) {
      wranglerConfig.services = [];
    }
    if (!wranglerConfig.vars) {
      wranglerConfig.vars = {};
    }

    // Add nodejs_compat flag if not present
    if (!wranglerConfig.compatibility_flags) {
      wranglerConfig.compatibility_flags = [];
    }
    if (!wranglerConfig.compatibility_flags.includes("nodejs_compat")) {
      wranglerConfig.compatibility_flags.push("nodejs_compat");
    }

    // Generate MCP server bindings
    const mcpServers = Object.entries(mcpConfig.servers);

    for (const [serverName, serverConfig] of mcpServers) {
      // Create Durable Object binding for each MCP server
      const durableObjectName = serverName;
      const existingDO = wranglerConfig.durable_objects.bindings.find(
        (binding) => binding.name === durableObjectName,
      );

      if (!existingDO && serverConfig.type === "do") {
        wranglerConfig.durable_objects.bindings.push({
          name: durableObjectName,
          class_name: durableObjectName,
        });
      }

      // Create service binding if needed
      const serviceBindingName = `MCP_${serverName.toUpperCase()}`;
      const existingService = wranglerConfig.services.find(
        (service) => service.name === serviceBindingName,
      );

      if (!existingService && (serverConfig.type ?? "worker") === "worker") {
        wranglerConfig.services.push({
          name: serviceBindingName,
          service: serverName,
          // environment: "production",
        });
      }

      // Add environment variables
      if (serverConfig.env) {
        for (const envVar of serverConfig.env) {
          if (envVar.value) {
            wranglerConfig.vars[envVar.name] = envVar.value;
          }
          // If no value provided, assume it will be read from process.env
        }
      }

      // Add auth headers as environment rariables
      if (serverConfig.auth?.headers) {
        for (const [headerName, headerValue] of Object.entries(
          serverConfig.auth.headers,
        )) {
          const envName = `MCP_${serverName.toUpperCase()}_${headerName.toUpperCase()}`;
          wranglerConfig.vars[envName] = headerValue;
        }
      }
    }

    await this.writeConfig(wranglerConfig);
    logger.debug(
      `Updated wrangler.jsonc with ${mcpServers.length} MCP server configurations`,
    );
  }

  async getMCPBindings(): Promise<string[]> {
    try {
      const config = await this.readConfig();

      if (!config.durable_objects?.bindings) {
        return [];
      }

      return config.durable_objects.bindings.map((binding) => binding.name);
    } catch {
      return [];
    }
  }

  async cleanupRemovedServers(currentServers: string[]): Promise<void> {
    const config = await this.readConfig();
    let hasChanges = false;

    // Remove Durable Object bindings for removed servers
    if (config.durable_objects?.bindings) {
      const originalLength = config.durable_objects.bindings.length;
      config.durable_objects.bindings = config.durable_objects.bindings.filter(
        (binding) => {
          const serverName = binding.name;
          return currentServers.includes(serverName);
        },
      );

      if (config.durable_objects.bindings.length !== originalLength) {
        hasChanges = true;
      }
    }

    // Remove service bindings for removed servers
    if (config.services) {
      const originalLength = config.services.length;
      config.services = config.services.filter((service) => {
        const serverName = service.service;
        return currentServers.includes(serverName);
      });

      if (config.services.length !== originalLength) {
        hasChanges = true;
      }
    }

    // Clean up environment variables for removed servers
    if (config.vars) {
      const removedServers = (await this.getMCPBindings()).filter(
        (server) => !currentServers.includes(server),
      );

      for (const serverName of removedServers) {
        const prefix = `MCP_${serverName.toUpperCase()}_`;
        const keysToRemove = Object.keys(config.vars).filter((key) =>
          key.startsWith(prefix),
        );

        for (const key of keysToRemove) {
          delete config.vars[key];
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      await this.writeConfig(config);
      logger.debug(
        `Cleaned up wrangler.jsonc configuration for removed servers`,
      );
    }
  }

  async updateConfigForDedicatedWorkers(
    mcpConfig: MCPConfig,
    serversToRun: Record<string, MCPServerConfig>
  ): Promise<void> {
    const wranglerConfig = await this.readConfig();

    // Ensure required structure exists
    if (!wranglerConfig.durable_objects) {
      wranglerConfig.durable_objects = { bindings: [] };
    }
    if (!wranglerConfig.durable_objects.bindings) {
      wranglerConfig.durable_objects.bindings = [];
    }
    if (!wranglerConfig.services) {
      wranglerConfig.services = [];
    }
    if (!wranglerConfig.vars) {
      wranglerConfig.vars = {};
    }

    // Add nodejs_compat flag if not present
    if (!wranglerConfig.compatibility_flags) {
      wranglerConfig.compatibility_flags = [];
    }
    if (!wranglerConfig.compatibility_flags.includes("nodejs_compat")) {
      wranglerConfig.compatibility_flags.push("nodejs_compat");
    }

    // Configure service bindings for dedicated workers with script_name
    for (const [serverName, serverConfig] of Object.entries(serversToRun)) {
      // Create Durable Object binding for each MCP server with script_name
      const durableObjectName = serverName;
      const existingDO = wranglerConfig.durable_objects.bindings.find(
        (binding) => binding.name === durableObjectName,
      );

      if (!existingDO && serverConfig.type === "do") {
        wranglerConfig.durable_objects.bindings.push({
          name: durableObjectName,
          class_name: durableObjectName,
          script_name: serverName, // Point to the dedicated worker script
        });
      } else if (existingDO && serverConfig.type === "do") {
        // Update existing binding with script_name
        existingDO.script_name = serverName;
      }

      // Create service binding for dedicated workers with proper script_name
      const serviceBindingName = `MCP_${serverName.toUpperCase()}`;
      const existingService = wranglerConfig.services.find(
        (service) => service.name === serviceBindingName,
      );

      if (!existingService && (serverConfig.type ?? "worker") === "worker") {
        wranglerConfig.services.push({
          name: serviceBindingName,
          service: serverName,
          // Use script_name to point to the actual worker file in node_modules
          environment: "production", // Ensure consistent environment
        });
      } else if (existingService) {
        // Update existing service binding
        existingService.service = serverName;
      }

      // Add environment variables for service discovery
      if (serverConfig.env) {
        for (const envVar of serverConfig.env) {
          if (envVar.value) {
            wranglerConfig.vars[envVar.name] = envVar.value;
          }
        }
      }

      // Add auth headers as environment variables
      if (serverConfig.auth?.headers) {
        for (const [headerName, headerValue] of Object.entries(
          serverConfig.auth.headers,
        )) {
          const envName = `MCP_${serverName.toUpperCase()}_${headerName.toUpperCase()}`;
          wranglerConfig.vars[envName] = headerValue;
        }
      }

      // Add service discovery variables
      wranglerConfig.vars[`MCP_${serverName.toUpperCase()}_SERVICE`] = serverName;
      wranglerConfig.vars[`MCP_${serverName.toUpperCase()}_SCRIPT`] = serverName;
    }

    // Ensure services can discover each other
    const serviceNames = Object.keys(serversToRun);
    wranglerConfig.vars.MCP_SERVICES = JSON.stringify(serviceNames);
    wranglerConfig.vars.MCP_SERVICE_DISCOVERY = "enabled";

    await this.writeConfig(wranglerConfig);
    logger.debug(
      `Updated wrangler.jsonc with dedicated worker configurations for ${Object.keys(serversToRun).length} MCP servers`,
    );
  }

  async generateWorkerCode(mcpConfig: MCPConfig): Promise<string> {
    const serverEntries = Object.entries(mcpConfig.servers);

    return `// Auto-generated MCP Worker
import { DurableObject } from 'cloudflare:workers';

export interface Env {
${serverEntries.map(([name]) => `  McpAgent_${name}: DurableObjectNamespace;`).join("\n")}
${serverEntries.map(([name]) => `  MCP_${name.toUpperCase()}: Fetcher;`).join("\n")}
}

export class McpAgent extends DurableObject {
  private sessions = new Map<string, WebSocket>();
  
  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected websocket', { status: 426 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    this.ctx.acceptWebSocket(server);
    const sessionId = crypto.randomUUID();
    this.sessions.set(sessionId, server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    // Handle MCP protocol messages
    try {
      const data = typeof message === 'string' ? JSON.parse(message) : message;
      
      // Process MCP JSON-RPC 2.0 messages
      const response = await this.handleMCPMessage(data);
      
      if (response) {
        ws.send(JSON.stringify(response));
      }
    } catch (error) {
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: 'Parse error'
        }
      }));
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    // Clean up session
    for (const [sessionId, socket] of this.sessions.entries()) {
      if (socket === ws) {
        this.sessions.delete(sessionId);
        break;
      }
    }
  }

  private async handleMCPMessage(message: any): Promise<any> {
    // Implement MCP protocol handling
    // This would include capabilities negotiation, resource/tool/prompt handling
    return {
      jsonrpc: '2.0',
      id: message.id,
      result: { message: 'MCP message received' }
    };
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const serverName = url.pathname.split('/')[1];
    
${serverEntries
  .map(
    ([name]) => `
    if (serverName === '${name}') {
      const durableObjectId = env.McpAgent_${name}.idFromName('${name}');
      const durableObject = env.McpAgent_${name}.get(durableObjectId);
      return durableObject.fetch(request);
    }`,
  )
  .join("")}
    
    return new Response('Not found', { status: 404 });
  },
};`;
  }
}
