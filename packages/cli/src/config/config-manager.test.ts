import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { vol } from "memfs";
import { ConfigManager } from "../config/config-manager.js";
import { ConfigError } from "../utils/errors.js";

vi.mock("fs/promises", async () => {
  const fs = await vi.importActual("memfs");

  // @ts-ignore
  return { ...fs.promises };
});

describe("ConfigManager", () => {
  beforeEach(() => {
    vol.reset();
  });

  afterEach(() => {
    vol.reset();
  });

  it("should load valid configuration", async () => {
    const config = {
      servers: {
        test: {
          source: "github:test/repo",
          command: "npm start",
        },
      },
    };

    vol.fromJSON({
      "mcp.jsonc": JSON.stringify(config),
    });

    const manager = new ConfigManager("mcp.jsonc");
    const result = await manager.load();

    expect(result).toEqual(config);
  });

  it("should throw ConfigError for missing file", async () => {
    const manager = new ConfigManager("nonexistent.jsonc");

    await expect(manager.load()).rejects.toThrow(ConfigError);
  });

  it("should validate configuration schema", async () => {
    const invalidConfig = {
      servers: {
        "invalid-name-with-spaces": {
          source: "github:test/repo",
          // missing required 'command' field
        },
      },
    };

    vol.fromJSON({
      "mcp.jsonc": JSON.stringify(invalidConfig),
    });

    const manager = new ConfigManager("mcp.jsonc");

    await expect(manager.load()).rejects.toThrow(ConfigError);
  });

  it("should initialize default configuration", async () => {
    const manager = new ConfigManager("mcp.jsonc");
    await manager.init();

    const config = await manager.load();
    expect(config.servers).toBeDefined();
    expect(Object.keys(config.servers)).toContain("filesystem");
  });

  it("should preserve JSONC formatting on save", async () => {
    const originalContent = `{
  // MCP Server Configuration
  "servers": {
    "test": {
      "source": "github:test/repo",
      "command": "npm start"
    }
  }
}`;

    vol.fromJSON({
      "mcp.jsonc": originalContent,
    });

    const manager = new ConfigManager("mcp.jsonc");
    const config = await manager.load();
    config.servers.newServer = {
      source: "github:new/repo",
      command: "npm run new",
    };

    await manager.save(config);

    const savedContent = vol.readFileSync("mcp.jsonc", "utf-8") as string;
    expect(savedContent).toContain("// MCP Server Configuration");
  });
});
