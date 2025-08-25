import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { vol } from "memfs";
import { DependencyAnalyzer } from "./dependency-analyzer.js";
import type { WranglerConfig } from "../types/index.js";

// Mock fs/promises
vi.mock("node:fs/promises", async () => {
  const memfs = await vi.importActual("memfs");
  return memfs.fs.promises;
});

// Mock path - use actual implementation without mocking
// vi.mock("node:path", async () => {
//   const actual = await vi.importActual("node:path");
//   return actual.default || actual;
// });

describe("DependencyAnalyzer", () => {
  let analyzer: DependencyAnalyzer;

  beforeEach(() => {
    analyzer = new DependencyAnalyzer();
    vol.reset();
    vol.fromJSON({ ".": null }); // Ensure we can write files
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("analyzeDependency", () => {
    it("should successfully analyze dependency with wrangler.jsonc", async () => {
      const dependencyPath = "/test/dependency";
      const wranglerConfig: WranglerConfig = {
        name: "test-service",
        compatibility_date: "2023-01-01",
      };

      vol.fromJSON({
        [`${dependencyPath}/wrangler.jsonc`]: JSON.stringify(wranglerConfig),
      });

      const result = await analyzer.analyzeDependency(dependencyPath);

      expect(result.hasWranglerConfig).toBe(true);
      expect(result.serviceName).toBe("test-service");
      expect(result.wranglerConfigPath).toBe(`${dependencyPath}/wrangler.jsonc`);
      expect(result.wranglerConfig).toEqual(wranglerConfig);
    });

    it("should successfully analyze dependency with wrangler.json", async () => {
      const dependencyPath = "/test/dependency";
      const wranglerConfig: WranglerConfig = {
        name: "test-service-json",
        compatibility_date: "2023-01-01",
      };

      vol.fromJSON({
        [`${dependencyPath}/wrangler.json`]: JSON.stringify(wranglerConfig),
      });

      const result = await analyzer.analyzeDependency(dependencyPath);

      expect(result.hasWranglerConfig).toBe(true);
      expect(result.serviceName).toBe("test-service-json");
      expect(result.wranglerConfigPath).toBe(`${dependencyPath}/wrangler.json`);
      expect(result.wranglerConfig).toEqual(wranglerConfig);
    });

    it("should return false when no wrangler config found", async () => {
      const dependencyPath = "/test/dependency";
      
      vol.fromJSON({
        [`${dependencyPath}/package.json`]: JSON.stringify({ name: "test" }),
      });

      const result = await analyzer.analyzeDependency(dependencyPath);

      expect(result.hasWranglerConfig).toBe(false);
      expect(result.serviceName).toBeUndefined();
      expect(result.wranglerConfigPath).toBeUndefined();
      expect(result.wranglerConfig).toBeUndefined();
    });

    it("should handle malformed wrangler config gracefully", async () => {
      const dependencyPath = "/test/dependency";

      vol.fromJSON({
        [`${dependencyPath}/wrangler.jsonc`]: "{ invalid json",
      });

      const result = await analyzer.analyzeDependency(dependencyPath);

      expect(result.hasWranglerConfig).toBe(true);
      expect(result.wranglerConfigPath).toBe(`${dependencyPath}/wrangler.jsonc`);
      // jsonc-parser may return empty object for invalid JSON rather than null
      expect(result.wranglerConfig).toBeTruthy();
      expect(result.serviceName).toBeUndefined();
    });

    it("should handle missing service name in wrangler config", async () => {
      const dependencyPath = "/test/dependency";
      const wranglerConfig: WranglerConfig = {
        compatibility_date: "2023-01-01",
      };

      vol.fromJSON({
        [`${dependencyPath}/wrangler.jsonc`]: JSON.stringify(wranglerConfig),
      });

      const result = await analyzer.analyzeDependency(dependencyPath);

      expect(result.hasWranglerConfig).toBe(true);
      expect(result.serviceName).toBeUndefined();
      expect(result.wranglerConfig).toEqual(wranglerConfig);
    });

    it("should prefer wrangler.jsonc over wrangler.json", async () => {
      const dependencyPath = "/test/dependency";
      
      vol.fromJSON({
        [`${dependencyPath}/wrangler.jsonc`]: JSON.stringify({ name: "jsonc-service" }),
        [`${dependencyPath}/wrangler.json`]: JSON.stringify({ name: "json-service" }),
      });

      const result = await analyzer.analyzeDependency(dependencyPath);

      expect(result.serviceName).toBe("jsonc-service");
      expect(result.wranglerConfigPath).toBe(`${dependencyPath}/wrangler.jsonc`);
    });
  });

  describe("findDependencyPath", () => {
    it("should find dependency by exact package name", async () => {
      const packageName = "test-package";
      
      vol.fromJSON({
        [`node_modules/${packageName}/package.json`]: JSON.stringify({ name: packageName }),
      });

      const result = await analyzer.findDependencyPath(packageName);

      expect(result).toBe(`node_modules/${packageName}`);
    });

    it("should find dependency in @types namespace", async () => {
      const packageName = "test-package";
      
      vol.fromJSON({
        [`node_modules/@types/${packageName}/package.json`]: JSON.stringify({ name: `@types/${packageName}` }),
      });

      const result = await analyzer.findDependencyPath(packageName);

      expect(result).toBe(`node_modules/@types/${packageName}`);
    });

    it("should find dependency by scanning for wrangler config", async () => {
      const packageName = "unknown-package";
      const actualPackageName = "actual-package-name";
      
      vol.fromJSON({
        [`node_modules/${actualPackageName}/package.json`]: JSON.stringify({ name: actualPackageName }),
        [`node_modules/${actualPackageName}/wrangler.jsonc`]: JSON.stringify({ name: "service" }),
        [`node_modules/other-package/package.json`]: JSON.stringify({ name: "other" }),
      });

      const result = await analyzer.findDependencyPath(packageName);

      expect(result).toContain(`node_modules/${actualPackageName}`);
    });

    it("should return null when package not found", async () => {
      const packageName = "non-existent-package";

      const result = await analyzer.findDependencyPath(packageName);

      expect(result).toBeNull();
    });

    it("should skip dot files when scanning node_modules", async () => {
      const packageName = "unknown-package";
      
      vol.fromJSON({
        "node_modules/.hidden/wrangler.jsonc": JSON.stringify({ name: "hidden" }),
        "node_modules/valid-package/wrangler.jsonc": JSON.stringify({ name: "valid" }),
      });

      const result = await analyzer.findDependencyPath(packageName);

      expect(result).toContain("node_modules/valid-package");
    });

    it("should handle missing node_modules gracefully", async () => {
      const packageName = "test-package";
      
      // Don't create node_modules directory
      vol.fromJSON({ "package.json": JSON.stringify({ name: "test" }) });

      const result = await analyzer.findDependencyPath(packageName);

      expect(result).toBeNull();
    });
  });

  describe("getDependencyWranglerPaths", () => {
    it("should get wrangler paths for multiple dependencies", async () => {
      const dependencies = [
        { name: "dep1", dependencyPath: "/deps/dep1" },
        { name: "dep2", dependencyPath: "/deps/dep2" },
        { name: "dep3", dependencyPath: "/deps/dep3" },
      ];

      vol.fromJSON({
        "/deps/dep1/wrangler.jsonc": JSON.stringify({ name: "service1" }),
        "/deps/dep2/wrangler.jsonc": JSON.stringify({ name: "service2" }),
        // dep3 has no wrangler config
      });

      const result = await analyzer.getDependencyWranglerPaths(dependencies);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: "dep1",
        wranglerConfigPath: "/deps/dep1/wrangler.jsonc",
        serviceName: "service1",
      });
      expect(result[1]).toEqual({
        name: "dep2",
        wranglerConfigPath: "/deps/dep2/wrangler.jsonc",
        serviceName: "service2",
      });
    });

    it("should return empty array when no dependencies have wrangler configs", async () => {
      const dependencies = [
        { name: "dep1", dependencyPath: "/deps/dep1" },
        { name: "dep2", dependencyPath: "/deps/dep2" },
      ];

      vol.fromJSON({
        "/deps/dep1/package.json": JSON.stringify({ name: "dep1" }),
        "/deps/dep2/package.json": JSON.stringify({ name: "dep2" }),
      });

      const result = await analyzer.getDependencyWranglerPaths(dependencies);

      expect(result).toHaveLength(0);
    });

    it("should handle dependencies without service names", async () => {
      const dependencies = [
        { name: "dep1", dependencyPath: "/deps/dep1" },
      ];

      vol.fromJSON({
        "/deps/dep1/wrangler.jsonc": JSON.stringify({ compatibility_date: "2023-01-01" }),
      });

      const result = await analyzer.getDependencyWranglerPaths(dependencies);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: "dep1",
        wranglerConfigPath: "/deps/dep1/wrangler.jsonc",
      });
      expect(result[0].serviceName).toBeUndefined();
    });

    it("should handle empty dependencies array", async () => {
      const result = await analyzer.getDependencyWranglerPaths([]);
      expect(result).toHaveLength(0);
    });
  });

  describe("private methods edge cases", () => {
    it("should handle file access errors gracefully", async () => {
      const dependencyPath = "/inaccessible/dependency";
      
      // Create a dependency path but make it inaccessible by not creating the directory
      const result = await analyzer.analyzeDependency(dependencyPath);

      expect(result.hasWranglerConfig).toBe(false);
    });
  });
});
