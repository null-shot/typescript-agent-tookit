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
    // Create the current directory in memfs to allow file writes
    vol.fromJSON({ ".": null });
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
      "mcp.json": JSON.stringify(config),
    });

    const manager = new ConfigManager("mcp.json");
    const result = await manager.load();

    expect(result).toEqual(config);
  });

  it("should throw ConfigError for missing file", async () => {
    const manager = new ConfigManager("nonexistent.json");

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
      "mcp.json": JSON.stringify(invalidConfig),
    });

    const manager = new ConfigManager("mcp.json");

    await expect(manager.load()).rejects.toThrow(ConfigError);
  });

  it("should initialize default configuration", async () => {
    const manager = new ConfigManager("mcp.json");
    await manager.init();

    const config = await manager.load();
    expect(config.servers).toBeDefined();
    expect(Object.keys(config.servers)).toContain("filesystem");
  });

  it("should preserve JSON formatting on save", async () => {
    const originalContent = `{
  "servers": {
    "test": {
      "source": "github:test/repo",
      "command": "npm start"
    }
  }
}`;

    vol.fromJSON({
      "mcp.json": originalContent,
    });

    const manager = new ConfigManager("mcp.json");
    const config = await manager.load();
    config.servers.newServer = {
      source: "github:new/repo",
      command: "npm run new",
    };

    await manager.save(config);

    const savedContent = vol.readFileSync("mcp.json", "utf-8") as string;
    expect(JSON.parse(savedContent)).toEqual(config);
  });
});
