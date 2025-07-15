#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * CLI utility for generating tools registry configuration
 */
class ToolsRegistryCLI {
  /**
   * Read a config file and convert it to an environment variable value
   */
  static generateFromFile(configFile, format = 'base64') {
    try {
      // Read the config file
      const configContent = fs.readFileSync(configFile, 'utf8');
      const config = JSON.parse(configContent);
      
      return this.generateFromConfig(config, format);
    } catch (error) {
      console.error(`Error generating tools registry from ${configFile}:`, error);
      throw error;
    }
  }

  /**
   * Convert a config object to an environment variable value
   */
  static generateFromConfig(config, format = 'base64') {
    try {
      // Convert to string
      const jsonStr = JSON.stringify(config);
      
      // Format based on preference
      if (format === 'base64') {
        return Buffer.from(jsonStr).toString('base64');
      } else {
        return jsonStr;
      }
    } catch (error) {
      console.error('Error generating tools registry from config:', error);
      throw error;
    }
  }

  /**
   * Update a .env file with the TOOLS_REGISTRY value
   */
  static updateEnvFile(envFilePath, toolsRegistry) {
    try {
      let envContent = '';
      
      // Read existing file if it exists
      if (fs.existsSync(envFilePath)) {
        envContent = fs.readFileSync(envFilePath, 'utf8');
      }
      
      // Check if TOOLS_REGISTRY already exists
      const regex = /^TOOLS_REGISTRY=.*/m;
      if (regex.test(envContent)) {
        // Update existing TOOLS_REGISTRY
        envContent = envContent.replace(regex, `TOOLBOX_SERVICE_MCP_SERVERS=${toolsRegistry}`);
      } else {
        // Add new TOOLS_REGISTRY
        envContent += `\nTOOLBOX_SERVICE_MCP_SERVERS=${toolsRegistry}`;
      }
      
      // Write the updated file
      fs.writeFileSync(envFilePath, envContent.trim() + '\n');
      
      console.log(`Updated ${envFilePath} with TOOLBOX_SERVICE_MCP_SERVERS`);
      return true;
    } catch (error) {
      console.error(`Error updating ${envFilePath}:`, error);
      return false;
    }
  }

  /**
   * Find the MCP config file
   * Checks for provided file first, then looks for mcp.json in current directory
   */
  static findMcpConfigFile(providedFile) {
    if (providedFile && fs.existsSync(providedFile)) {
      return providedFile;
    }
    
    // Check for mcp.json in current directory
    const defaultFile = path.join(process.cwd(), 'mcp.json');
    if (fs.existsSync(defaultFile)) {
      return defaultFile;
    }
    
    return null;
  }
}

/**
 * Parse CLI arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    mcpFile: null,
    format: 'base64',
    outputFile: null,
    stdout: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--format' || arg === '-f') {
      result.format = args[++i] || 'base64';
    } else if (arg === '--file' || arg === '-o') {
      result.outputFile = args[++i];
    } else if (arg === '--mcp-file' || arg === '-i') {
      result.mcpFile = args[++i];
    } else if (arg === '--stdout') {
      result.stdout = true;
    } else if (arg.startsWith('--')) {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    } else if (!result.mcpFile) {
      // If a positional argument is provided, treat it as the MCP file
      result.mcpFile = arg;
    }
  }

  return result;
}

// Main CLI function
function main() {
  const opts = parseArgs();
  
  // Find the MCP config file
  const mcpFile = ToolsRegistryCLI.findMcpConfigFile(opts.mcpFile);
  
  if (!mcpFile) {
    console.log('Usage: tools-registry-cli [options]');
    console.log('\nOptions:');
    console.log('  --mcp-file, -i <file>   Input MCP config file (default: mcp.json in current directory)');
    console.log('  --format, -f <format>   Output format (json or base64, default: base64)');
    console.log('  --file, -o <file>       Output file (default: .dev.vars in current directory)');
    console.log('  --stdout                Output to stdout instead of a file');
    console.log('\nExamples:');
    console.log('  tools-registry-cli');
    console.log('  tools-registry-cli --mcp-file ./my-config.json');
    console.log('  tools-registry-cli --mcp-file ./my-config.json --stdout');
    console.log('  tools-registry-cli --format json');
    console.log('  tools-registry-cli --file .env.tools');
    process.exit(1);
  }

  try {
    console.log(`Using MCP config file: ${mcpFile}`);
    const result = ToolsRegistryCLI.generateFromFile(mcpFile, opts.format);
    
    // Default behavior: output to .dev.vars in current working directory
    if (!opts.stdout) {
      const outputFile = opts.outputFile || path.join(process.cwd(), '.dev.vars');
      ToolsRegistryCLI.updateEnvFile(outputFile, result);
    } else {
      // Output to stdout if requested
      console.log(result);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the CLI
main(); 