// src/package/package-manager.ts

import { readFile, writeFile } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { detect } from "package-manager-detector";
import type { PackageJson, PackageManagerInfo } from "../types/index.js";
import { CLIError } from "../utils/errors.js";
import { Logger } from "../utils/logger.js";

const execAsync = promisify(exec);
const logger = new Logger();

export class PackageManager {
  private packageManagerInfo: PackageManagerInfo | null = null;

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
    const manager = await this.detectPackageManager();

    try {
      logger.debug(`Installing ${source} using ${manager.name}`);
      const command = `${manager.installCommand} ${source}`;

      const { stderr } = await execAsync(command);

      if (stderr && !stderr.includes("npm WARN")) {
        logger.warn(`Package installation warning: ${stderr}`);
      }

      logger.debug(`Successfully installed ${source}`);

      // Update package.json with MCP server metadata
      await this.addMCPMetadata(serverName, source);
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
  ): Promise<void> {
    const packageJson = await this.readPackageJson();

    if (!packageJson.mcpServers) {
      packageJson.mcpServers = {};
    }

    packageJson.mcpServers[serverName] = {
      source,
      installedAt: new Date().toISOString(),
      packageName: this.extractPackageName(source),
    };

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
}
