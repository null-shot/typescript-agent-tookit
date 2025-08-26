/**
 * Default MCP Workers configuration for Vitest tests
 * Includes ajv compatibility workarounds and standard MCP testing setup
 */
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export interface McpWorkersConfigOptions {
  /** Test configuration options */
  test?: any;
  /** Path to wrangler config file */
  wranglerConfigPath?: string;
  /** Additional path aliases for module resolution */
  additionalAliases?: Record<string, string>;
  /** Whether to include ajv mocking */
  includeAjvMock?: boolean;
  /** Custom path to ajv mock file */
  ajvMockPath?: string;
  /** Additional options to pass to defineWorkersConfig */
  [key: string]: any;
}

/**
 * Creates a default MCP Workers configuration for Vitest
 * This handles the complex ajv compatibility issues that arise when testing MCP clients
 */
export function createMcpWorkersConfig(options: McpWorkersConfigOptions = {}) {
  const {
    test = {},
    wranglerConfigPath = "./wrangler.jsonc",
    additionalAliases = {},
    includeAjvMock = true,
    ajvMockPath,
    ...otherOptions
  } = options;

  // Use a path relative to the built file location
  const ajvMockFile =
    ajvMockPath || new URL("./ajv-mock.js", import.meta.url).pathname;

  const config = {
    test: {
      poolOptions: {
        workers: {
          isolatedStorage: false, // Must have for Durable Objects
          singleWorker: true,
          wrangler: { configPath: wranglerConfigPath },
        },
      },
      exclude: ["**/node_modules/**"],
      ...test,
    },
    resolve: {
      alias: {
        ...(includeAjvMock && {
          ajv: ajvMockFile,
          "ajv/dist/ajv": ajvMockFile,
        }),
        ...additionalAliases,
      },
    },
    define: {
      global: "globalThis",
    },
    ...otherOptions,
  };

  return defineWorkersConfig(config);
}

/**
 * Pre-configured MCP Workers config with standard defaults
 */
export const defaultMcpWorkersConfig = createMcpWorkersConfig();
