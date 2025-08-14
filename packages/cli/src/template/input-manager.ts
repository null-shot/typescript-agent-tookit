import path from "node:path";
import fs from "node:fs/promises";

export interface ProjectConfig {
  projectName: string;
  targetDirectory: string;
  fullPath: string;
}

export class InputManager {
  /**
   * Prompt user for project configuration using prompts library
   */
  async promptForProjectConfig(templateType: "mcp" | "agent"): Promise<ProjectConfig> {
    const templateName = templateType === "mcp" ? "MCP Server" : "Agent";
    
    console.log(`\nCreating a new ${templateName} project...\n`);

    // Generate example directory name
    const exampleName = this.generateExampleName();

    const prompts = await import("prompts");
    const response = await prompts.default({
      type: "text",
      name: "targetDirectory",
      message: `In which directory do you want to create your ${templateName.toLowerCase()}?`,
      hint: "also used as application name",
      initial: `./${exampleName}`,
      validate: async (value: string) => {
        const trimmed = value.trim();
        
        if (trimmed === "") {
          return "Please enter a directory name";
        }
        
        // If it's just "." use current directory
        if (trimmed === ".") {
          return true;
        }
        
        // Validate path format
        if (!this.isValidPath(trimmed)) {
          return "Please enter a valid directory name (relative to current directory)";
        }
        
        // Check if directory already exists
        const fullPath = path.resolve(process.cwd(), trimmed);
        try {
          const stat = await fs.stat(fullPath);
          if (stat.isDirectory()) {
            return `Directory "${trimmed}" already exists. Please choose a different name.`;
          } else if (stat.isFile()) {
            return `A file named "${trimmed}" already exists. Please choose a different name.`;
          }
        } catch (error: any) {
          if (error.code === "ENOENT") {
            return true; // Directory doesn't exist, which is what we want
          }
          return `Unable to check directory "${trimmed}": ${error.message}`;
        }
        
        return true;
      }
    });

    // Handle user cancellation (Ctrl+C)
    if (!response.targetDirectory) {
      process.exit(0);
    }

    const cleanDirectory = response.targetDirectory.trim();
    const absolutePath = path.resolve(process.cwd(), cleanDirectory);
    const projectName = this.generateProjectName(cleanDirectory);

    return {
      projectName,
      targetDirectory: cleanDirectory,
      fullPath: absolutePath
    };
  }

  /**
   * Generate a random example directory name
   */
  private generateExampleName(): string {
    const adjectives = ["awesome", "cool", "super", "amazing", "brilliant", "fantastic"];
    const nouns = ["app", "project", "tool", "service", "api", "bot"];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const suffix = Math.random().toString(36).substring(2, 6);
    return `${adjective}-${noun}-${suffix}`;
  }

  /**
   * Generate a project name based on the target directory
   */
  private generateProjectName(targetDirectory: string): string {
    if (targetDirectory === "." || targetDirectory === "") {
      // Use current directory name
      return path.basename(process.cwd());
    }
    
    // Remove ./ prefix if present, then use the last part of the path as project name
    const cleanPath = targetDirectory.startsWith("./") ? targetDirectory.slice(2) : targetDirectory;
    const basename = path.basename(cleanPath);
    return this.sanitizeProjectName(basename);
  }

  /**
   * Sanitize a string to be a valid npm package name
   */
  private sanitizeProjectName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "-") // Replace invalid chars with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
  }

  /**
   * Validate if a path is safe and valid
   */
  private isValidPath(pathStr: string): boolean {
    try {
      // Check for directory traversal attempts
      if (pathStr.includes("..")) {
        return false;
      }
      
      // Check for absolute paths (both Unix and Windows style)
      if (path.isAbsolute(pathStr)) {
        return false;
      }
      
      // Additional check for Windows-style absolute paths on non-Windows systems
      if (process.platform !== "win32" && /^[A-Za-z]:\\/.test(pathStr)) {
        return false;
      }
      
      // Check for invalid characters based on platform
      const invalidChars = process.platform === "win32" 
        ? /[<>:"|?*\x00-\x1f]/
        : /[\x00]/;
      
      if (invalidChars.test(pathStr)) {
        return false;
      }
      
      // Check for reserved names on Windows
      if (process.platform === "win32") {
        const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
        const pathParts = pathStr.split(path.sep);
        for (const part of pathParts) {
          if (reservedNames.test(part)) {
            return false;
          }
        }
      }
      
      // Check for paths that are too long
      if (pathStr.length > 255) {
        return false;
      }
      
      // Check for empty path segments (both forward and back slashes)
      if (pathStr.includes("//") || pathStr.includes("\\\\")) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }
}
