// src/package/package-manager.ts

import { readFile, writeFile } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { detect } from "package-manager-detector";
import type { PackageJson, PackageManagerInfo, MCPServerMetadata, DependencyAnalysisResult } from "../types/index.js";
import { CLIError } from "../utils/errors.js";
import { Logger } from "../utils/logger.js";
import { DependencyAnalyzer } from "../dependency/dependency-analyzer.js";

const execAsync = promisify(exec);
const logger = new Logger();

export class PackageManager {
  private packageManagerInfo: PackageManagerInfo | null = null;
  private dependencyAnalyzer = new DependencyAnalyzer();

  async detectPackageManager(): Promise<PackageManagerInfo> {
    if (this.packageManagerInfo) return this.packageManagerInfo;

    try {
      // Use detection library as fallback
      const detected = await detect();
      const managerName = detected?.name || "npm";

      this.packageManagerInfo = this.getPackageManagerInfo(
        managerName as "npm" | "yarn" | "pnpm",
      );
      return this.packageManagerInfo;
    } catch (error) {
      logger.warn("Could not detect package manager, defaulting to npm");
      this.packageManagerInfo = this.getPackageManagerInfo("npm");
      return this.packageManagerInfo;
    }
  }

  private getPackageManagerInfo(
    name: "npm" | "yarn" | "pnpm",
  ): PackageManagerInfo {
    const configs = {
      npm: {
        name: "npm" as const,
        installCommand: "npm install",
        removeCommand: "npm uninstall",
        listCommand: "npm list --depth=0 --json",
      },
      yarn: {
        name: "yarn" as const,
        installCommand: "yarn add",
        removeCommand: "yarn remove",
        listCommand: "yarn list --depth=0 --json",
      },
      pnpm: {
        name: "pnpm" as const,
        installCommand: "pnpm add",
        removeCommand: "pnpm remove",
        listCommand: "pnpm list --depth=0 --json",
      },
    };

    return configs[name];
  }

  async installPackage(source: string, serverName: string): Promise<void> {
    // Check if package is already installed in mcpServers metadata
    const installedServers = await this.getInstalledMCPPackages();
    if (installedServers.includes(serverName)) {
      logger.debug(`Package ${serverName} is already installed in mcpServers, skipping installation`);
      return;
    }

    // Also check if the package is already in dependencies or devDependencies
    const packageJson = await this.readPackageJson();
    const extractedName = this.extractPackageName(source);
    const allDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    
    // Check both the extracted name and the source itself
    // For GitHub sources, also check if any dependency has the same source URL
    const isAlreadyInstalled = 
      allDependencies[extractedName] === source || 
      Object.values(allDependencies).includes(source) ||
      (source.startsWith("github:") && Object.values(allDependencies).some(depSource => depSource === source));
    
    if (isAlreadyInstalled) {
      logger.debug(`Package ${source} is already in dependencies, skipping installation`);
      
      // Even though package is installed, we still need to ensure MCP metadata exists
      // since the package might have been installed manually
      try {
        const analysis = await this.analyzeDependency(source, serverName);
        await this.addMCPMetadata(serverName, source, analysis);
        logger.debug(`Added MCP metadata for existing package ${serverName}`);
      } catch (error) {
        logger.warn(`Failed to add MCP metadata for existing package: ${error instanceof Error ? error.message : String(error)}`);
      }
      return;
    }

    const manager = await this.detectPackageManager();

    try {
      logger.debug(`Installing ${source} using ${manager.name}`);
      
      const command = `${manager.installCommand} ${source}`;

      // Set environment variable to prevent infinite loop with postinstall
      const env = {
        ...process.env,
        NULLSHOT_INSTALLING: 'true'
      };

      const { stderr } = await execAsync(command, { env });

      if (stderr && !stderr.includes("npm WARN")) {
        logger.warn(`Package installation warning: ${stderr}`);
      }

      logger.debug(`Successfully installed ${source}`);

      // Analyze the installed dependency
      const analysis = await this.analyzeDependency(source, serverName);

      // Update package.json with MCP server metadata
      await this.addMCPMetadata(serverName, source, analysis);
    } catch (error) {
      throw new CLIError(
        `Failed to install package ${source}: ${error instanceof Error ? error.message : String(error)}`,
        `Check that the source URL is valid and accessible`,
        1,
      );
    }
  }

  async removePackage(packageName: string): Promise<void> {
    const manager = await this.detectPackageManager();

    try {
      logger.debug(`Removing ${packageName} using ${manager.name}`);
      const command = `${manager.removeCommand} ${packageName}`;

      await execAsync(command);
      logger.debug(`Successfully removed ${packageName}`);

      // Remove MCP metadata
      await this.removeMCPMetadata(packageName);
    } catch (error) {
      throw new CLIError(
        `Failed to remove package ${packageName}: ${error instanceof Error ? error.message : String(error)}`,
        "Check that the package is actually installed",
        1,
      );
    }
  }

  async getInstalledMCPPackages(): Promise<string[]> {
    try {
      const packageJson = await this.readPackageJson();
      return Object.keys(packageJson.mcpServers || {});
    } catch {
      return [];
    }
  }

  async getMCPPackageMetadata(serverName: string): Promise<MCPServerMetadata | undefined> {
    try {
      const packageJson = await this.readPackageJson();
      return packageJson.mcpServers?.[serverName];
    } catch {
      return undefined;
    }
  }

  async cleanupRemovedServers(currentServers: string[]): Promise<void> {
    const installedServers = await this.getInstalledMCPPackages();
    const serversToRemove = installedServers.filter(
      (server) => !currentServers.includes(server),
    );

    for (const serverName of serversToRemove) {
      try {
        // Get package name from metadata
        const packageJson = await this.readPackageJson();
        const mcpMetadata = packageJson.mcpServers?.[serverName];

        if (mcpMetadata?.packageName) {
          await this.removePackage(mcpMetadata.packageName);
        }
      } catch (error) {
        logger.warn(
          `Failed to remove server ${serverName}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private async readPackageJson(): Promise<PackageJson> {
    try {
      const content = await readFile("package.json", "utf-8");
      return JSON.parse(content);
    } catch (error) {
      throw new CLIError(
        "No package.json found in current directory",
        "Make sure you are in a Node.js project directory with a package.json file",
        1,
      );
    }
  }

  private async writePackageJson(packageJson: PackageJson): Promise<void> {
    try {
      await writeFile(
        "package.json",
        JSON.stringify(packageJson, null, 2) + "\n",
        "utf-8",
      );
    } catch (error) {
      throw new CLIError(
        `Failed to update package.json: ${error instanceof Error ? error.message : String(error)}`,
        "Check file permissions and disk space",
        1,
      );
    }
  }

  private async addMCPMetadata(
    serverName: string,
    source: string,
    analysis?: DependencyAnalysisResult,
  ): Promise<void> {
    const packageJson = await this.readPackageJson();

    if (!packageJson.mcpServers) {
      packageJson.mcpServers = {};
    }

    const searchPackageName = this.extractPackageName(source);
    const dependencyPath = await this.dependencyAnalyzer.findDependencyPath(searchPackageName);
    
    // Extract the actual package name from the found dependency path
    const actualPackageName = dependencyPath ? path.basename(dependencyPath) : searchPackageName;

    const metadata: any = {
      source,
      installedAt: new Date().toISOString(),
      packageName: actualPackageName, // Store the actual installed package name
      hasWranglerConfig: analysis?.hasWranglerConfig || false,
    };

    // Only store essential metadata - paths can be generated dynamically
    if (analysis?.serviceName) {
      metadata.serviceName = analysis.serviceName;
    }
    
    if (analysis?.d1Databases && analysis.d1Databases.length > 0) {
      metadata.d1Databases = analysis.d1Databases;
    }

    packageJson.mcpServers[serverName] = metadata;

    await this.writePackageJson(packageJson);
  }

  private async removeMCPMetadata(serverName: string): Promise<void> {
    const packageJson = await this.readPackageJson();

    if (packageJson.mcpServers) {
      delete packageJson.mcpServers[serverName];

      if (Object.keys(packageJson.mcpServers).length === 0) {
        delete packageJson.mcpServers;
      }
    }

    await this.writePackageJson(packageJson);
  }

  /**
   * Analyze a dependency after installation to extract metadata
   */
  private async analyzeDependency(source: string, serverName: string): Promise<DependencyAnalysisResult | undefined> {
    try {
      const packageName = this.extractPackageName(source);
      const dependencyPath = await this.dependencyAnalyzer.findDependencyPath(packageName);
      
      if (!dependencyPath) {
        logger.warn(`Could not find installed dependency path for ${serverName} (${packageName})`);
        return undefined;
      }

      logger.debug(`Analyzing dependency ${serverName} at ${dependencyPath}`);
      const analysis = await this.dependencyAnalyzer.analyzeDependency(dependencyPath);
      
      if (analysis.serviceName) {
        logger.debug(`Found service ${analysis.serviceName} in dependency ${serverName}`);
      }
      
      if (analysis.hasWranglerConfig) {
        logger.debug(`Dependency ${serverName} has wrangler config at: ${analysis.wranglerConfigPath}`);
      }

      return analysis;
    } catch (error) {
      logger.warn(`Failed to analyze dependency ${serverName}: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }

  /**
   * Get detailed metadata for installed MCP servers including dependency analysis
   */
  async getInstalledMCPServersWithMetadata(): Promise<Record<string, MCPServerMetadata>> {
    try {
      const packageJson = await this.readPackageJson();
      return packageJson.mcpServers || {};
    } catch {
      return {};
    }
  }

  /**
   * Get dependencies with wrangler configs
   */
  async getDependenciesWithWranglerConfigs(): Promise<Array<{
    name: string;
    dependencyPath: string;
    wranglerConfigPath?: string;
    serviceName?: string;
  }>> {
    const metadata = await this.getInstalledMCPServersWithMetadata();
    const dependencies: Array<{
      name: string;
      dependencyPath: string;
      wranglerConfigPath?: string;
      serviceName?: string;
    }> = [];

    for (const [name, serverMetadata] of Object.entries(metadata)) {
      if (serverMetadata.packageName && serverMetadata.hasWranglerConfig) {
        // Generate paths dynamically from the packageName
        const dependencyPath = path.join("node_modules", serverMetadata.packageName);
        const wranglerConfigPath = path.join(dependencyPath, "wrangler.jsonc");
        
        const dependency: {
          name: string;
          dependencyPath: string;
          wranglerConfigPath?: string;
          serviceName?: string;
        } = {
          name,
          dependencyPath,
          wranglerConfigPath,
        };

        if (serverMetadata.serviceName) {
          dependency.serviceName = serverMetadata.serviceName;
        }

        dependencies.push(dependency);
      }
    }

    return dependencies;
  }

  private extractPackageName(source: string): string {
    // Extract package name from various source formats
    if (source.startsWith("github:")) {
      const match = source.match(/github:([^#]+)/);
      return match ? (match[1]?.replace("/", "-") ?? source) : source;
    }

    if (source.startsWith("@")) {
      const match = source.match(/@([^@]+)/);
      return match ? `@${match[1]}` : source;
    }

    return source.split("@")[0] ?? source;
  }

  /**
   * Add or update scripts in package.json
   */
  async addScripts(scripts: Record<string, string>): Promise<void> {
    const packageJson = await this.readPackageJson();
    
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }

    Object.assign(packageJson.scripts, scripts);
    
    await this.writePackageJson(packageJson);
  }

  /**
   * Check if a script exists in package.json
   */
  async hasScript(scriptName: string): Promise<boolean> {
    try {
      const packageJson = await this.readPackageJson();
      return !!(packageJson.scripts && packageJson.scripts[scriptName]);
    } catch {
      return false;
    }
  }

  /**
   * Get a script command from package.json
   */
  async getScript(scriptName: string): Promise<string | undefined> {
    try {
      const packageJson = await this.readPackageJson();
      return packageJson.scripts?.[scriptName];
    } catch {
      return undefined;
    }
  }

  /**
   * Add to postinstall script (creating or appending)
   */
  async addToPostinstall(command: string): Promise<void> {
    const packageJson = await this.readPackageJson();
    
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }

    const existing = packageJson.scripts.postinstall;
    if (existing) {
      // Don't add if already exists
      if (existing.includes(command)) {
        return;
      }
      packageJson.scripts.postinstall = `${existing} && ${command}`;
    } else {
      packageJson.scripts.postinstall = command;
    }
    
    await this.writePackageJson(packageJson);
  }

  /**
   * Run a script if it exists
   */
  async runScript(scriptName: string): Promise<boolean> {
    const hasScript = await this.hasScript(scriptName);
    if (!hasScript) {
      return false;
    }

    const manager = await this.detectPackageManager();
    const command = `${manager.name} run ${scriptName}`;
    
    try {
      await execAsync(command);
      logger.debug(`Successfully ran script: ${scriptName}`);
      return true;
    } catch (error) {
      logger.warn(`Failed to run script ${scriptName}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}
