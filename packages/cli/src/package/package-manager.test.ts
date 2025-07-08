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
});
