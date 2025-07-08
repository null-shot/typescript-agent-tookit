import { describe, it, expect, beforeEach, vi } from "vitest";
import { vol } from "memfs";
import { WranglerManager } from "../wrangler/wrangler-manager.js";

vi.mock("fs/promises", async () => {
  const fs = await vi.importActual("memfs");

  // @ts-ignore
  return { ...fs.promises };
});

describe("WranglerManager", () => {
  beforeEach(() => {
    vol.reset();
  });

  it("should create default config if file does not exist", async () => {
    const manager = new WranglerManager("wrangler.jsonc");
    const config = await manager.readConfig();

    expect(config.name).toBe("mcp-worker");
    expect(config.compatibility_flags).toContain("nodejs_compat");
    expect(config.durable_objects).toBeDefined();
  });

  it("should update config with MCP servers", async () => {
    vol.fromJSON({
      "wrangler.jsonc": JSON.stringify({
        name: "test-worker",
        compatibility_date: "2024-01-01",
      }),
    });

    const manager = new WranglerManager("wrangler.jsonc");
    const mcpConfig = {
      servers: {
        filesystem: {
          source: "github:test/repo",
          command: "npm start",
          type: "do" as const,
          env: [{ name: "TEST_VAR", value: "test" }],
        },
      },
    };

    await manager.updateConfig(mcpConfig);
    const updatedConfig = await manager.readConfig();

    expect(updatedConfig.durable_objects?.bindings).toHaveLength(1);
    expect(updatedConfig.durable_objects?.bindings?.[0].name).toBe(
      "filesystem",
    );
    expect(updatedConfig.vars?.TEST_VAR).toBe("test");
  });

  it("should get MCP bindings", async () => {
    vol.fromJSON({
      "wrangler.jsonc": JSON.stringify({
        name: "test-worker",
        durable_objects: {
          bindings: [
            { name: "filesystem", class_name: "filesystem" },
            { name: "OtherBinding", class_name: "Other" },
          ],
        },
      }),
    });

    const manager = new WranglerManager("wrangler.jsonc");
    const bindings = await manager.getMCPBindings();

    expect(bindings).toEqual(["filesystem", "OtherBinding"]);
  });

  it("should cleanup removed servers", async () => {
    vol.fromJSON({
      "wrangler.jsonc": JSON.stringify({
        name: "test-worker",
        durable_objects: {
          bindings: [
            { name: "filesystem", class_name: "filesystem" },
            { name: "removed", class_name: "removed" },
          ],
        },
        services: [
          { name: "FILESYSTEM", service: "FILESYSTEM" },
          { name: "REMOVED", service: "REMOVED" },
        ],
      }),
    });

    const manager = new WranglerManager("wrangler.jsonc");
    await manager.cleanupRemovedServers(["FILESYSTEM", "filesystem"]);

    const config = await manager.readConfig();
    expect(config.durable_objects?.bindings).toHaveLength(1);
    expect(config.services).toHaveLength(1);
  });
});
