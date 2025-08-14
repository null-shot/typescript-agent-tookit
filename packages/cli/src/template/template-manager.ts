// Import simple-git dynamically to avoid type resolution issues
import path from "node:path";
import fs from "node:fs/promises";
import { CLIError } from "../utils/errors.js";
import { Logger } from "../utils/logger.js";
import { DryRunManager } from "../utils/dry-run.js";
import type { PackageJson } from "../types/index.js";
import { modify as modifyJsonc, applyEdits } from "jsonc-parser";

const logger = new Logger();

export interface TemplateConfig {
  mcp: {
    repositoryUrl: string;
    templateName: string;
  };
  agent: {
    repositoryUrl: string;
    templateName: string;
  };
}

export class TemplateManager {
  private git: any;
  private dryRunManager: DryRunManager;

  constructor(dryRunManager: DryRunManager) {
    this.dryRunManager = dryRunManager;
  }

  private async initGit() {
    if (!this.git) {
      const { simpleGit: git } = await import("simple-git");
      this.git = git();
    }
    return this.git;
  }

  private static readonly TEMPLATE_CONFIG: TemplateConfig = {
    mcp: {
      repositoryUrl: "https://github.com/null-shot/typescript-mcp-template",
      templateName: "MCP Server"
    },
    agent: {
      repositoryUrl: "https://github.com/null-shot/typescript-agent-template", 
      templateName: "Agent"
    }
  };

  /**
   * Create a new project from a template
   */
  async createProject(
    templateType: "mcp" | "agent",
    projectName: string,
    targetDirectory: string
  ): Promise<void> {
    const template = TemplateManager.TEMPLATE_CONFIG[templateType];
    const fullPath = path.resolve(process.cwd(), targetDirectory);

    logger.debug(`Creating ${template.templateName} project in: ${fullPath}`);

    // Check if directory already exists
    await this.validateTargetDirectory(fullPath);

    // Clone the repository
    await this.cloneRepository(template.repositoryUrl, fullPath);

    // Update project files with the new name
    await this.updateProjectFiles(fullPath, projectName);

    // Clean up git history
    await this.cleanupGitHistory(fullPath);
  }

  /**
   * Validate that the target directory doesn't exist
   */
  private async validateTargetDirectory(targetPath: string): Promise<void> {
    try {
      const stat = await fs.stat(targetPath);
      
      // If we can stat it, it exists - this is not allowed
      if (stat.isDirectory()) {
        throw new CLIError(
          `Directory "${targetPath}" already exists`,
          "Choose a different directory name or remove the existing directory"
        );
      } else if (stat.isFile()) {
        throw new CLIError(
          `A file named "${targetPath}" already exists`,
          "Choose a different directory name or remove the existing file"
        );
      } else {
        throw new CLIError(
          `Path "${targetPath}" already exists`,
          "Choose a different directory name"
        );
      }
    } catch (error: any) {
      if (error.code === "ENOENT") {
        // Directory doesn't exist, which is what we want
        await this.validateParentDirectory(targetPath);
        return;
      }
      
      if (error instanceof CLIError) {
        throw error;
      }
      
      throw new CLIError(
        `Unable to access target directory: ${error.message}`,
        "Make sure you have the necessary permissions"
      );
    }
  }

  /**
   * Validate that the parent directory exists and is writable
   */
  private async validateParentDirectory(targetPath: string): Promise<void> {
    const parentDir = path.dirname(targetPath);
    
    try {
      const stat = await fs.stat(parentDir);
      if (!stat.isDirectory()) {
        throw new CLIError(
          `Parent path "${parentDir}" is not a directory`,
          "Make sure the parent directory exists"
        );
      }
      
      // Test if we can write to the parent directory
      await fs.access(parentDir, fs.constants.W_OK);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        throw new CLIError(
          `Parent directory "${parentDir}" does not exist`,
          "Make sure the parent directory exists before creating the project"
        );
      } else if (error.code === "EACCES") {
        throw new CLIError(
          `No write permission for parent directory "${parentDir}"`,
          "Make sure you have write permissions to the parent directory"
        );
      } else if (error instanceof CLIError) {
        throw error;
      } else {
        throw new CLIError(
          `Unable to access parent directory "${parentDir}": ${error.message}`,
          "Make sure the parent directory exists and you have the necessary permissions"
        );
      }
    }
  }

  /**
   * Clone the git repository to the target directory
   */
  private async cloneRepository(repositoryUrl: string, targetPath: string): Promise<void> {
    await this.dryRunManager.execute(
      `Clone template repository from ${repositoryUrl}`,
      async () => {
        try {
          logger.debug(`Cloning repository: ${repositoryUrl}`);
          const git = await this.initGit();
          await git.clone(repositoryUrl, targetPath, {
            "--depth": 1, // Shallow clone for faster download
            "--single-branch": null
          });
          logger.debug(`Repository cloned successfully to ${targetPath}`);
        } catch (error: any) {
          throw new CLIError(
            `Failed to clone repository: ${error.message}`,
            "Make sure you have git installed and internet connectivity"
          );
        }
      }
    );
  }

  /**
   * Update package.json and wrangler.jsonc with the new project name
   */
  private async updateProjectFiles(projectPath: string, projectName: string): Promise<void> {
    await this.updatePackageJson(projectPath, projectName);
    await this.updateWranglerConfig(projectPath, projectName);
  }

  /**
   * Update package.json with the new project name
   */
  private async updatePackageJson(projectPath: string, projectName: string): Promise<void> {
    const packageJsonPath = path.join(projectPath, "package.json");

    await this.dryRunManager.execute(
      `Update package.json name to "${projectName}"`,
      async () => {
        try {
          const packageJsonContent = await fs.readFile(packageJsonPath, "utf-8");
          const packageJson: PackageJson = JSON.parse(packageJsonContent);
          
          packageJson.name = projectName;
          
          const updatedContent = JSON.stringify(packageJson, null, 2) + "\n";
          await fs.writeFile(packageJsonPath, updatedContent, "utf-8");
          
          logger.debug(`Updated package.json name to: ${projectName}`);
        } catch (error: any) {
          if (error.code === "ENOENT") {
            logger.warn("package.json not found in template - skipping update");
            return;
          }
          throw new CLIError(
            `Failed to update package.json: ${error.message}`,
            "Make sure the template contains a valid package.json file"
          );
        }
      }
    );
  }

  /**
   * Update wrangler.jsonc with the new project name
   */
  private async updateWranglerConfig(projectPath: string, projectName: string): Promise<void> {
    const wranglerConfigPath = path.join(projectPath, "wrangler.jsonc");

    await this.dryRunManager.execute(
      `Update wrangler.jsonc name to "${projectName}"`,
      async () => {
        try {
          const wranglerContent = await fs.readFile(wranglerConfigPath, "utf-8");
          
          // Update the name field
          const edits = modifyJsonc(
            wranglerContent,
            ["name"],
            projectName,
            { formattingOptions: { insertSpaces: true, tabSize: 2 } }
          );
          
          const updatedContent = applyEdits(wranglerContent, edits);
          
          await fs.writeFile(wranglerConfigPath, updatedContent, "utf-8");
          
          logger.debug(`Updated wrangler.jsonc name to: ${projectName}`);
        } catch (error: any) {
          if (error.code === "ENOENT") {
            logger.warn("wrangler.jsonc not found in template - skipping update");
            return;
          }
          throw new CLIError(
            `Failed to update wrangler.jsonc: ${error.message}`,
            "Make sure the template contains a valid wrangler.jsonc file"
          );
        }
      }
    );
  }

  /**
   * Remove the .git directory to start fresh
   */
  private async cleanupGitHistory(projectPath: string): Promise<void> {
    const gitDir = path.join(projectPath, ".git");

    await this.dryRunManager.execute(
      "Clean up template git history",
      async () => {
        try {
          await fs.rm(gitDir, { recursive: true, force: true });
          logger.debug("Removed .git directory from cloned template");
        } catch (error: any) {
          // Non-critical error - log but don't fail
          logger.warn(`Could not remove .git directory: ${error.message}`);
        }
      }
    );
  }

  /**
   * Get the list of available template types
   */
  static getAvailableTemplates(): Array<{ type: "mcp" | "agent"; name: string; url: string }> {
    return [
      {
        type: "mcp",
        name: TemplateManager.TEMPLATE_CONFIG.mcp.templateName,
        url: TemplateManager.TEMPLATE_CONFIG.mcp.repositoryUrl
      },
      {
        type: "agent", 
        name: TemplateManager.TEMPLATE_CONFIG.agent.templateName,
        url: TemplateManager.TEMPLATE_CONFIG.agent.repositoryUrl
      }
    ];
  }
}
