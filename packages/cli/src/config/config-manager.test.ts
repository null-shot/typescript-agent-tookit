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
      mcpServers: {
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

  it("should reject configuration with invalid server name", async () => {
    const invalidConfig = {
      mcpServers: {
        "123invalid": {
          // starts with number, should fail pattern ^[a-zA-Z][a-zA-Z0-9_-]*$
          source: "github:test/repo",
        },
      },
    };

    vol.fromJSON({
      "mcp.json": JSON.stringify(invalidConfig),
    });

    const manager = new ConfigManager("mcp.json");

    await expect(manager.load()).rejects.toThrow(ConfigError);
  });

  it("should accept source-only configuration", async () => {
    const config = {
      mcpServers: {
        test: {
          source: "github:test/repo",
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

  it("should accept command-only configuration", async () => {
    const config = {
      mcpServers: {
        test: {
          command: "npx some-mcp-server",
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

  it("should accept url-only configuration", async () => {
    const config = {
      mcpServers: {
        test: {
          url: "https://example.com/mcp",
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

  it("should accept configuration with all three properties", async () => {
    const config = {
      mcpServers: {
        test: {
          source: "github:test/repo",
          command: "npm start",
          url: "https://example.com/mcp",
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

  it("should reject configuration with none of the required properties", async () => {
    const invalidConfig = {
      mcpServers: {
        test: {
          type: "worker",
          // missing source, command, and url
        },
      },
    };

    vol.fromJSON({
      "mcp.json": JSON.stringify(invalidConfig),
    });

    const manager = new ConfigManager("mcp.json");

    await expect(manager.load()).rejects.toThrow(ConfigError);
    await expect(manager.load()).rejects.toThrow(
      /must have at least one of 'source', 'command', or 'url'/,
    );
  });

  it("should validate with mixed server configurations", async () => {
    const config = {
      mcpServers: {
        sourceServer: {
          source: "github:test/repo",
        },
        commandServer: {
          command: "npx another-server",
        },
        urlServer: {
          url: "https://api.example.com/mcp",
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

  it("should initialize default configuration", async () => {
    const manager = new ConfigManager("mcp.json");
    await manager.init();

    const config = await manager.load();
    expect(config.mcpServers).toBeDefined();
    expect(Object.keys(config.mcpServers)).toContain("filesystem");
  });

  it("should preserve JSON formatting on save", async () => {
    const originalContent = `{
  "mcpServers": {
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
    config.mcpServers.newServer = {
      source: "github:new/repo",
      command: "npm run new",
    };

    await manager.save(config);

    const savedContent = vol.readFileSync("mcp.json", "utf-8") as string;
    expect(JSON.parse(savedContent)).toEqual(config);
  });

  it("should validate configuration on save", async () => {
    const manager = new ConfigManager("mcp.json");

    const invalidConfig = {
      mcpServers: {
        test: {
          type: "worker",
          // missing source, command, and url
        },
      },
    };

    await expect(manager.save(invalidConfig as any)).rejects.toThrow(
      ConfigError,
    );
    await expect(manager.save(invalidConfig as any)).rejects.toThrow(
      /must have at least one of 'source', 'command', or 'url'/,
    );
  });
});
