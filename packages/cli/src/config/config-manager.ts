import { readFile, writeFile, access } from "fs/promises";
import { parse, parseTree, modify, applyEdits } from "jsonc-parser";
import Ajv from "ajv";
import type { JSONSchemaType } from "ajv";
import type { MCPConfig, MCPServerConfig } from "../types/index.js";
import { ConfigError } from "../utils/errors.js";
import { Logger } from "../utils/logger.js";

const logger = new Logger();

const mcpConfigSchema: JSONSchemaType<MCPConfig> = {
  type: "object",
  properties: {
    servers: {
      type: "object",
      patternProperties: {
        "^[a-zA-Z][a-zA-Z0-9_-]*$": {
          type: "object",
          properties: {
            source: { type: "string" },
            command: { type: "string" },
            env: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  value: { type: "string", nullable: true },
                },
                required: ["name"],
                additionalProperties: false,
              },
              nullable: true,
            },
            auth: {
              type: "object",
              properties: {
                headers: {
                  type: "object",
                  patternProperties: {
                    "^[a-zA-Z][a-zA-Z0-9-_]*$": { type: "string" },
                  },
                  additionalProperties: false,
                  nullable: true,
                },
              },
              additionalProperties: false,
              nullable: true,
            },
          },
          required: ["source", "command"],
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
  },
  required: ["servers"],
  additionalProperties: false,
};

export class ConfigManager {
  private ajv = new Ajv();
  #validate = this.ajv.compile(mcpConfigSchema);

  constructor(private configPath: string) {}

  async load(): Promise<MCPConfig> {
    try {
      await access(this.configPath);
    } catch {
      throw new ConfigError(
        `Configuration file not found: ${this.configPath}`,
        `Run 'mcp-cli init' to create a new configuration file`,
      );
    }

    try {
      const content = await readFile(this.configPath, "utf-8");
      const config = parse(content) as MCPConfig;

      if (!this.#validate(config)) {
        const errors =
          this.#validate.errors
            ?.map((err) => `${err.instancePath || "root"}: ${err.message}`)
            .join(", ") || "Unknown validation error";

        throw new ConfigError(
          `Invalid configuration: ${errors}`,
          "Check your configuration file against the schema",
        );
      }

      return config;
    } catch (error) {
      if (error instanceof ConfigError) throw error;

      throw new ConfigError(
        `Failed to parse configuration file: ${error instanceof Error ? error.message : String(error)}`,
        "Ensure the file contains valid JSONC syntax",
      );
    }
  }

  async save(config: MCPConfig): Promise<void> {
    if (!this.#validate(config)) {
      const errors =
        this.#validate.errors
          ?.map((err) => `${err.instancePath || "root"}: ${err.message}`)
          .join(", ") || "Unknown validation error";

      throw new ConfigError(`Invalid configuration: ${errors}`);
    }

    try {
      // Preserve formatting if file exists
      let content: string;
      try {
        const existingContent = await readFile(this.configPath, "utf-8");
        const edits = modify(existingContent, [], config, {
          formattingOptions: { insertSpaces: true, tabSize: 2 },
        });
        content = applyEdits(existingContent, edits);
      } catch {
        // File doesn't exist, create new
        content = JSON.stringify(config, null, 2);
      }

      await writeFile(this.configPath, content, "utf-8");
      logger.debug(`Configuration saved to ${this.configPath}`);
    } catch (error) {
      throw new ConfigError(
        `Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async validate(): Promise<boolean> {
    const config = await this.load();
    return this.#validate(config);
  }

  async init(force = false): Promise<void> {
    if (!force) {
      try {
        await access(this.configPath);
        throw new ConfigError(
          `Configuration file already exists: ${this.configPath}`,
          "Use --force to overwrite the existing file",
        );
      } catch (error) {
        if (error instanceof ConfigError) throw error;
        // File doesn't exist, proceed with initialization
      }
    }

    const defaultConfig: MCPConfig = {
      servers: {
        filesystem: {
          source: "github:modelcontextprotocol/servers#filesystem",
          command: "npx -y @modelcontextprotocol/server-filesystem",
        },
        github: {
          source: "github:modelcontextprotocol/servers#github",
          command: "npx -y @modelcontextprotocol/server-github",
          env: [{ name: "GITHUB_PERSONAL_ACCESS_TOKEN" }],
        },
      },
    };

    await this.save(defaultConfig);
  }

  async addServer(name: string, config: MCPServerConfig): Promise<void> {
    const currentConfig = await this.load();
    currentConfig.servers[name] = config;
    await this.save(currentConfig);
  }

  async removeServer(name: string): Promise<void> {
    const currentConfig = await this.load();
    delete currentConfig.servers[name];
    await this.save(currentConfig);
  }

  async getServer(name: string): Promise<MCPServerConfig | undefined> {
    const config = await this.load();
    return config.servers[name];
  }

  async listServers(): Promise<string[]> {
    const config = await this.load();
    return Object.keys(config.servers);
  }
}
