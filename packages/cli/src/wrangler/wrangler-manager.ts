import { readFile, writeFile, access } from "node:fs/promises";
import { parse, modify, applyEdits } from "jsonc-parser";
import type { WranglerConfig } from "../types/index.js";
import { CLIError } from "../utils/errors.js";
import { Logger } from "../utils/logger.js";

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
        services: [],
        vars: {},
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

    /**
   * Update configuration by merging dependency wrangler configs and handling cleanup
   */
  async updateConfigWithDependencies(
    dependencyConfigs: WranglerConfig[]
  ): Promise<void> {
    const wranglerConfig = await this.readConfig();
    
    // Ensure basic structure
    this.ensureWranglerStructure(wranglerConfig);
    
    // Get metadata from package manager to detect service name changes
    let packageManager;
    let existingMetadata: Record<string, any> = {};
    try {
      packageManager = new (await import("../package/package-manager.js")).PackageManager();
      existingMetadata = await packageManager.getInstalledMCPServersWithMetadata();
    } catch (error) {
      logger.warn(`Failed to load package metadata: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Track current service names from dependencies
    const currentServiceNames = new Set<string>();
    const serviceNameToServerName = new Map<string, string>();
    
    // For each dependency config, add service bindings and merge vars
    for (const depConfig of dependencyConfigs) {
      if (depConfig.name) {
        currentServiceNames.add(depConfig.name);
        
        // Find the corresponding server name from serverNames array
        // For now, we'll map by index or try to find by matching service name in metadata
        let serverName = depConfig.name; // fallback
        for (const [metaServerName, metaData] of Object.entries(existingMetadata)) {
          if (metaData.serviceName === depConfig.name || metaServerName === depConfig.name) {
            serverName = metaServerName;
            break;
          }
        }
        serviceNameToServerName.set(depConfig.name, serverName);
        
        // Check if service name has changed
        const oldMetadata = existingMetadata[serverName];
        if (oldMetadata && oldMetadata.serviceName && oldMetadata.serviceName !== depConfig.name) {
          // Service name has changed, remove old binding
          const oldServiceBindingName = `${oldMetadata.serviceName.toUpperCase().replace(/-/g, '_')}_SERVICE`;
          const oldServiceIndex = wranglerConfig.services!.findIndex(
            service => service.binding === oldServiceBindingName
          );
          if (oldServiceIndex !== -1) {
            wranglerConfig.services!.splice(oldServiceIndex, 1);
            logger.debug(`Removed old service binding ${oldServiceBindingName} -> ${oldMetadata.serviceName}`);
          }
        }
        
        // Add or update service binding using dependency's service name
        const serviceBindingName = `${depConfig.name.toUpperCase().replace(/-/g, '_')}_SERVICE`;
        const existingService = wranglerConfig.services!.find(
          service => service.binding === serviceBindingName
        );
        
        if (!existingService) {
          wranglerConfig.services!.push({
            binding: serviceBindingName,
            service: depConfig.name
          });
          logger.debug(`Added service binding ${serviceBindingName} -> ${depConfig.name}`);
        } else {
          existingService.service = depConfig.name;
          logger.debug(`Updated service binding ${serviceBindingName} -> ${depConfig.name}`);
        }
      }
      
      // Merge environment variables
      if (depConfig.vars && wranglerConfig.vars) {
        Object.entries(depConfig.vars).forEach(([key, value]) => {
          if (value && !wranglerConfig.vars![key]) {
            wranglerConfig.vars![key] = value;
          }
        });
      }
      
      // Merge compatibility requirements
      if (depConfig.compatibility_date) {
        const currentDate = wranglerConfig.compatibility_date;
        if (!currentDate || new Date(depConfig.compatibility_date) > new Date(currentDate)) {
          wranglerConfig.compatibility_date = depConfig.compatibility_date;
        }
      }
      
      if (depConfig.compatibility_flags && wranglerConfig.compatibility_flags) {
        const currentFlags = wranglerConfig.compatibility_flags;
        const newFlags = depConfig.compatibility_flags.filter(
          flag => !currentFlags.includes(flag)
        );
        if (newFlags.length > 0) {
          wranglerConfig.compatibility_flags = [...currentFlags, ...newFlags];
        }
      }
    }
    
    // Clean up removed services (only MCP-managed services)
    if (wranglerConfig.services) {
      const originalLength = wranglerConfig.services.length;
      
      // Generate expected service binding names for current dependencies
      const expectedBindingNames = new Set<string>();
      for (const serviceName of currentServiceNames) {
        expectedBindingNames.add(`${serviceName.toUpperCase().replace(/-/g, '_')}_SERVICE`);
      }
      
      wranglerConfig.services = wranglerConfig.services.filter((service) => {
        // Only filter out services that follow MCP naming convention
        const isMCPService = service.binding && service.binding.endsWith('_SERVICE');
        
        if (isMCPService) {
          // Keep services that match the current expected binding names
          return expectedBindingNames.has(service.binding);
        } else {
          // Keep all non-MCP services (custom user services)
          return true;
        }
      });

      if (wranglerConfig.services.length !== originalLength) {
        const removedCount = originalLength - wranglerConfig.services.length;
        logger.debug(`Cleaned up ${removedCount} removed service bindings`);
      }
    }
    
    await this.writeConfig(wranglerConfig);
    logger.debug(`Updated wrangler.jsonc with ${dependencyConfigs.length} dependency configurations`);
  }

  /**
   * Legacy method for getting MCP bindings from Durable Objects
   */
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

  /**
   * Ensure wrangler config has required structure
   */
  private ensureWranglerStructure(wranglerConfig: WranglerConfig): void {
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
  }

}
