import { readFile, access, stat, readdir } from "node:fs/promises";
import path from "node:path";
import { parse } from "jsonc-parser";
import type { WranglerConfig, DependencyAnalysisResult } from "../types/index.js";
import { Logger } from "../utils/logger.js";

const logger = new Logger();

export class DependencyAnalyzer {
  /**
   * Analyze a dependency and extract wrangler configuration path and service name
   */
  async analyzeDependency(dependencyPath: string): Promise<DependencyAnalysisResult> {
    logger.debug(`Analyzing dependency at: ${dependencyPath}`);

    const result: DependencyAnalysisResult = {
      hasWranglerConfig: false,
    };

    try {
      // Try to find wrangler.jsonc or wrangler.json and get its path
      const wranglerConfigPath = await this.findWranglerConfigPath(dependencyPath);
      
      if (!wranglerConfigPath) {
        logger.debug(`No wrangler config found in ${dependencyPath}`);
        return result;
      }

      result.wranglerConfigPath = wranglerConfigPath;
      result.hasWranglerConfig = true;

      // Read the config to extract service name and D1 databases
      const wranglerConfig = await this.readWranglerConfigFromPath(wranglerConfigPath);
      if (wranglerConfig) {
        result.wranglerConfig = wranglerConfig;
        if (wranglerConfig.name) {
          result.serviceName = wranglerConfig.name;
        }
        
        // Extract D1 database bindings
        if (wranglerConfig.d1_databases && Array.isArray(wranglerConfig.d1_databases)) {
          result.d1Databases = wranglerConfig.d1_databases.map((db: any) => db.binding).filter(Boolean);
        }
      }

      logger.debug(`Successfully analyzed dependency: ${result.serviceName || 'unnamed'} at ${wranglerConfigPath}`);
      return result;

    } catch (error) {
      logger.warn(`Failed to analyze dependency at ${dependencyPath}: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  }

  /**
   * Find wrangler configuration file path in a dependency directory
   */
  private async findWranglerConfigPath(dependencyPath: string): Promise<string | null> {
    const wranglerFiles = ["wrangler.jsonc", "wrangler.json"];
    
    for (const fileName of wranglerFiles) {
      const filePath = path.join(dependencyPath, fileName);
      
      try {
        await access(filePath);
        logger.debug(`Found ${fileName} in ${dependencyPath}`);
        return filePath;
      } catch (error) {
        // File doesn't exist, continue to next
        continue;
      }
    }

    return null;
  }

  /**
   * Read wrangler configuration from a specific file path
   */
  private async readWranglerConfigFromPath(wranglerConfigPath: string): Promise<WranglerConfig | null> {
    try {
      const content = await readFile(wranglerConfigPath, "utf-8");
      const config = parse(content) as WranglerConfig;
      return config;
    } catch (error) {
      logger.warn(`Failed to read wrangler config from ${wranglerConfigPath}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Find the installation path of a dependency
   */
  async findDependencyPath(packageName: string): Promise<string | null> {
    try {
      // First try the old approach with exact package name
      const possiblePaths = [
        path.join("node_modules", packageName),
        path.join("node_modules", "@types", packageName),
      ];

      for (const possiblePath of possiblePaths) {
        try {
          const stats = await stat(possiblePath);
          if (stats.isDirectory()) {
            logger.debug(`Found dependency at: ${possiblePath}`);
            return possiblePath;
          }
        } catch {
          // Directory doesn't exist, continue
          continue;
        }
      }

      // If exact name doesn't work, search for any package with wrangler.jsonc
      // This handles cases where package names don't match the GitHub URL pattern
      const nodeModulesPath = path.resolve("node_modules");
      
      try {
        const packages = await readdir(nodeModulesPath);
        
        for (const pkg of packages) {
          if (pkg.startsWith('.')) continue; // Skip dot files
          
          const packagePath = path.join(nodeModulesPath, pkg);
          const wranglerPath = await this.findWranglerConfigPath(packagePath);
          
          if (wranglerPath) {
            logger.debug(`Found dependency with wrangler config at: ${packagePath}`);
            return packagePath;
          }
        }
      } catch {
        // node_modules doesn't exist or can't be read
      }

      // If not found in standard locations, try to resolve using Node.js resolution
      try {
        const resolvedPath = require.resolve(packageName);
        const packageDir = this.findPackageRoot(resolvedPath);
        
        if (packageDir) {
          logger.debug(`Resolved dependency to: ${packageDir}`);
          return packageDir;
        }
      } catch {
        // Package not resolvable
      }

      logger.warn(`Could not find dependency path for: ${packageName}`);
      return null;

    } catch (error) {
      logger.warn(`Error finding dependency path for ${packageName}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Find the root directory of a package from a resolved file path
   */
  private findPackageRoot(filePath: string): string | null {
    let currentDir = path.dirname(filePath);
    
    // Walk up the directory tree looking for package.json
    while (currentDir !== path.dirname(currentDir)) {
      try {
        const packageJsonPath = path.join(currentDir, "package.json");
        // This will throw if package.json doesn't exist
        require.resolve(packageJsonPath);
        return currentDir;
      } catch {
        currentDir = path.dirname(currentDir);
      }
    }

    return null;
  }

  /**
   * Get dependency wrangler config paths for all dependencies that have wrangler configs
   */
  async getDependencyWranglerPaths(dependencies: Array<{
    name: string;
    dependencyPath: string;
  }>): Promise<Array<{
    name: string;
    wranglerConfigPath: string;
    serviceName?: string;
  }>> {
    const results: Array<{
      name: string;
      wranglerConfigPath: string;
      serviceName?: string;
    }> = [];

    for (const dependency of dependencies) {
      const analysis = await this.analyzeDependency(dependency.dependencyPath);
      
      if (analysis.hasWranglerConfig && analysis.wranglerConfigPath) {
        const result: {
          name: string;
          wranglerConfigPath: string;
          serviceName?: string;
        } = {
          name: dependency.name,
          wranglerConfigPath: analysis.wranglerConfigPath,
        };
        
        if (analysis.serviceName) {
          result.serviceName = analysis.serviceName;
        }
        
        results.push(result);
      }
    }

    return results;
  }
}
