import { describe, it, expect, beforeEach, vi } from "vitest";
import { vol } from "memfs";
import { WranglerManager } from "../wrangler/wrangler-manager.js";

// Mock the package manager import
vi.mock("../package/package-manager.js", () => ({
  PackageManager: class MockPackageManager {
    async getInstalledMCPServersWithMetadata() {
      return {};
    }
  }
}));

vi.mock("fs/promises", async () => {
  const fs = await vi.importActual("memfs");

  // @ts-ignore
  return { ...fs.promises };
});

describe("WranglerManager", () => {
  beforeEach(() => {
    vol.reset();
    // Create the current directory in memfs to allow file writes
    vol.fromJSON({ ".": null });
  });

  it("should create default config if file does not exist", async () => {
    const manager = new WranglerManager("wrangler.jsonc");
    const config = await manager.readConfig();

    expect(config.name).toBe("mcp-worker");
    expect(config.compatibility_flags).toContain("nodejs_compat");
    expect(config.services).toBeDefined();
    expect(config.vars).toBeDefined();
  });

  it("should update config with dependency wrangler configs", async () => {
    vol.fromJSON({
      "wrangler.jsonc": JSON.stringify({
        name: "test-worker",
        compatibility_date: "2024-01-01",
      }),
    });

    const manager = new WranglerManager("wrangler.jsonc");
    
    // Mock dependency wrangler configs
    const dependencyConfigs = [
      {
        name: "mcp-filesystem",
        compatibility_date: "2024-06-01",
        vars: { DEBUG: "true" },
        compatibility_flags: ["experimental"],
      },
      {
        name: "mcp-database",
        vars: { DB_URL: "localhost" },
      }
    ];

    await manager.updateConfigWithDependencies(dependencyConfigs);
    const updatedConfig = await manager.readConfig();

    // Should have service bindings
    expect(updatedConfig.services).toHaveLength(2);
    expect(updatedConfig.services).toEqual(
      expect.arrayContaining([
        { binding: "MCP_FILESYSTEM_SERVICE", service: "mcp-filesystem" },
        { binding: "MCP_DATABASE_SERVICE", service: "mcp-database" }
      ])
    );

    // Should merge environment variables
    expect(updatedConfig.vars?.DEBUG).toBe("true");
    expect(updatedConfig.vars?.DB_URL).toBe("localhost");

    // Should update compatibility date to latest
    expect(updatedConfig.compatibility_date).toBe("2024-06-01");

    // Should merge compatibility flags
    expect(updatedConfig.compatibility_flags).toContain("nodejs_compat");
    expect(updatedConfig.compatibility_flags).toContain("experimental");
  });

  it("should preserve custom user services during cleanup", async () => {
    vol.fromJSON({
      "wrangler.jsonc": JSON.stringify({
        name: "test-worker",
        services: [
          { binding: "MCP_OLD_SERVICE", service: "old-mcp-service" }, // MCP service to be removed
          { binding: "CUSTOM_API", service: "my-custom-api" }, // Custom service to preserve
          { binding: "MCP_CURRENT_SERVICE", service: "current-mcp-service" } // MCP service to keep
        ],
      }),
    });

    const manager = new WranglerManager("wrangler.jsonc");
    
    // Only current-mcp-service in the new dependency configs
    const dependencyConfigs = [
      { name: "current-mcp-service" }
    ];

    await manager.updateConfigWithDependencies(dependencyConfigs);
    const updatedConfig = await manager.readConfig();

    // Should keep custom service and current MCP service, remove old MCP service
    expect(updatedConfig.services).toHaveLength(2);
    expect(updatedConfig.services).toEqual(
      expect.arrayContaining([
        { binding: "CUSTOM_API", service: "my-custom-api" }, // Preserved
        { binding: "CURRENT_MCP_SERVICE_SERVICE", service: "current-mcp-service" } // Updated/kept
      ])
    );
  });

  it("should handle service name changes", async () => {
    // Mock the package manager import at runtime
    const packageManagerModule = await import("../package/package-manager.js");
    vi.spyOn(packageManagerModule, 'PackageManager').mockImplementation(() => ({
      async getInstalledMCPServersWithMetadata() {
        return {
          "filesystem": {
            serviceName: "old-service-name", // Old service name
            hasWranglerConfig: true
          }
        };
      }
    }) as any);

    vol.fromJSON({
      "wrangler.jsonc": JSON.stringify({
        name: "test-worker",
        services: [
          { binding: "OLD_SERVICE_NAME_SERVICE", service: "old-service-name" },
        ],
      }),
    });

    const manager = new WranglerManager("wrangler.jsonc");
    
    // New dependency config with changed service name
    const dependencyConfigs = [
      { name: "new-service-name" } // Service name has changed
    ];

    await manager.updateConfigWithDependencies(dependencyConfigs);
    const updatedConfig = await manager.readConfig();

    // Should remove old binding and add new one
    expect(updatedConfig.services).toHaveLength(1);
    expect(updatedConfig.services[0]).toEqual({
      binding: "NEW_SERVICE_NAME_SERVICE",
      service: "new-service-name"
    });

    // Restore the original mock
    vi.restoreAllMocks();
  });

  it("should get MCP bindings (legacy method)", async () => {
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
});
