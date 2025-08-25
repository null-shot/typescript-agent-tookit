import { describe, it, expect, beforeEach, vi } from "vitest";
import { vol } from "memfs";
import { PackageManager } from "../package/package-manager.js";

vi.mock("fs/promises", async () => {
  const fs = await vi.importActual("memfs");

  // @ts-ignore
  return { ...fs.promises };
});

vi.mock("child_process", () => ({
  exec: vi.fn(),
}));

describe("PackageManager", () => {
  beforeEach(() => {
    vol.reset();
  });

  it("should extract package name from GitHub source", async () => {
    vol.fromJSON({
      "package.json": JSON.stringify({ name: "test" }),
    });

    const manager = new PackageManager();
    // Access private method through type assertion for testing
    const extractPackageName = (manager as any).extractPackageName.bind(
      manager,
    );

    expect(
      extractPackageName("github:modelcontextprotocol/servers#filesystem"),
    ).toBe("modelcontextprotocol-servers");
  });

  it("should get installed MCP packages", async () => {
    vol.fromJSON({
      "package.json": JSON.stringify({
        name: "test",
        mcpServers: {
          filesystem: {
            source: "github:test/repo",
            packageName: "test-package",
          },
        },
      }),
    });

    const manager = new PackageManager();
    const installed = await manager.getInstalledMCPPackages();

    expect(installed).toEqual(["filesystem"]);
  });

  it("should get MCP package metadata", async () => {
    const metadata = {
      source: "github:test/repo",
      packageName: "test-package",
      installedAt: "2023-01-01T00:00:00.000Z",
      hasWranglerConfig: true,
      serviceName: "test-service",
    };

    vol.fromJSON({
      "package.json": JSON.stringify({
        name: "test",
        mcpServers: {
          filesystem: metadata,
        },
      }),
    });

    const manager = new PackageManager();
    const result = await manager.getMCPPackageMetadata("filesystem");

    expect(result).toEqual(metadata);
  });

  it("should return undefined for non-existent MCP package metadata", async () => {
    vol.fromJSON({
      "package.json": JSON.stringify({
        name: "test",
        mcpServers: {},
      }),
    });

    const manager = new PackageManager();
    const result = await manager.getMCPPackageMetadata("nonexistent");

    expect(result).toBeUndefined();
  });

  it("should skip installation if package already exists in dependencies", async () => {
    const mockExec = vi.fn();
    vi.doMock("child_process", () => ({
      exec: mockExec,
    }));

    vol.fromJSON({
      "package.json": JSON.stringify({
        name: "test",
        dependencies: {
          "test-package": "github:test/repo",
        },
        mcpServers: {},
      }),
    });

    const manager = new PackageManager();
    await manager.installPackage("github:test/repo", "test-server");

    expect(mockExec).not.toHaveBeenCalled();
  });

  it("should skip installation if package already exists in devDependencies", async () => {
    const mockExec = vi.fn();
    vi.doMock("child_process", () => ({
      exec: mockExec,
    }));

    vol.fromJSON({
      "package.json": JSON.stringify({
        name: "test",
        devDependencies: {
          "solitary-bar-c2b2": "github:null-shot/typescript-mcp-template",
        },
        mcpServers: {},
      }),
    });

    const manager = new PackageManager();
    await manager.installPackage("github:null-shot/typescript-mcp-template", "mcp-template");

    expect(mockExec).not.toHaveBeenCalled();
  });

  it("should skip installation if server already in mcpServers metadata", async () => {
    const mockExec = vi.fn();
    vi.doMock("child_process", () => ({
      exec: mockExec,
    }));

    vol.fromJSON({
      "package.json": JSON.stringify({
        name: "test",
        mcpServers: {
          "test-server": {
            source: "github:test/repo",
            packageName: "test-package",
          },
        },
      }),
    });

    const manager = new PackageManager();
    await manager.installPackage("github:test/repo", "test-server");

    expect(mockExec).not.toHaveBeenCalled();
  });

  it("should extract package names correctly from different source formats", async () => {
    vol.fromJSON({
      "package.json": JSON.stringify({ name: "test" }),
    });

    const manager = new PackageManager();
    const extractPackageName = (manager as any).extractPackageName.bind(manager);

    expect(extractPackageName("github:null-shot/typescript-mcp-template")).toBe("null-shot-typescript-mcp-template");
    expect(extractPackageName("@scoped/package")).toBe("@scoped/package");
    expect(extractPackageName("simple-package")).toBe("simple-package");
    expect(extractPackageName("package@1.0.0")).toBe("package");
  });
});
