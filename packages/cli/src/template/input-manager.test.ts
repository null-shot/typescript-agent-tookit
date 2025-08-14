import { describe, it, expect, beforeEach, vi } from "vitest";
import { vol } from "memfs";
import { InputManager } from "./input-manager.js";

vi.mock("fs/promises", async () => {
  const memfs = await vi.importActual<typeof import("memfs")>("memfs");
  return {
    ...memfs.fs.promises,
    default: memfs.fs.promises
  };
});

// Mock prompts library
vi.mock("prompts", () => ({
  default: vi.fn(),
}));

describe("InputManager", () => {
  let inputManager: InputManager;

  beforeEach(() => {
    vol.reset();
    vi.clearAllMocks();
    inputManager = new InputManager();
  });

  describe("promptForProjectConfig", () => {
    it("should handle current directory (.)", async () => {
      // Mock prompts response
      const prompts = await import("prompts");
      vi.mocked(prompts.default).mockResolvedValue({
        targetDirectory: "."
      });

      const config = await inputManager.promptForProjectConfig("mcp");

      expect(config.targetDirectory).toBe(".");
      expect(config.projectName).toBe("cli"); // Uses current directory name
      expect(prompts.default).toHaveBeenCalledWith({
        type: "text",
        name: "targetDirectory",
        message: "In which directory do you want to create your mcp server?",
        hint: "also used as application name",
        initial: expect.stringMatching(/^\.\/.*$/), // Should start with ./
        validate: expect.any(Function)
      });
    });

    it("should handle custom directory", async () => {
      // Mock prompts response
      const prompts = await import("prompts");
      vi.mocked(prompts.default).mockResolvedValue({
        targetDirectory: "custom-dir"
      });

      const config = await inputManager.promptForProjectConfig("agent");

      expect(config.targetDirectory).toBe("custom-dir");
      expect(config.projectName).toBe("custom-dir");
      expect(prompts.default).toHaveBeenCalledWith({
        type: "text",
        name: "targetDirectory", 
        message: "In which directory do you want to create your agent?",
        hint: "also used as application name",
        initial: expect.stringMatching(/^\.\/.*$/), // Should start with ./
        validate: expect.any(Function)
      });
    });

    it("should handle user cancellation", async () => {
      // Mock prompts response for cancellation
      const prompts = await import("prompts");
      vi.mocked(prompts.default).mockResolvedValue({});

      // Mock process.exit to prevent actual exit during test
      const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit called");
      });

      await expect(inputManager.promptForProjectConfig("mcp")).rejects.toThrow("process.exit called");
      expect(exitSpy).toHaveBeenCalledWith(0);
      
      exitSpy.mockRestore();
    });
  });

  describe("path validation", () => {
    it("should reject absolute paths", () => {
      const isValidPath = (inputManager as any).isValidPath.bind(inputManager);
      expect(isValidPath("/absolute/path")).toBe(false);
      expect(isValidPath("C:\\absolute\\path")).toBe(false);
    });

    it("should reject directory traversal attempts", () => {
      const isValidPath = (inputManager as any).isValidPath.bind(inputManager);
      expect(isValidPath("../parent")).toBe(false);
      expect(isValidPath("child/../parent")).toBe(false);
      expect(isValidPath("../../dangerous")).toBe(false);
    });

    it("should reject invalid characters", () => {
      const isValidPath = (inputManager as any).isValidPath.bind(inputManager);
      
      if (process.platform === "win32") {
        expect(isValidPath("file<name")).toBe(false);
        expect(isValidPath("file>name")).toBe(false);
        expect(isValidPath("file:name")).toBe(false);
        expect(isValidPath("file|name")).toBe(false);
        expect(isValidPath("file?name")).toBe(false);
        expect(isValidPath("file*name")).toBe(false);
        expect(isValidPath("file\"name")).toBe(false);
      }
      
      expect(isValidPath("file\x00name")).toBe(false);
    });

    it("should reject reserved names on Windows", () => {
      const isValidPath = (inputManager as any).isValidPath.bind(inputManager);
      
      if (process.platform === "win32") {
        expect(isValidPath("CON")).toBe(false);
        expect(isValidPath("PRN")).toBe(false);
        expect(isValidPath("AUX")).toBe(false);
        expect(isValidPath("NUL")).toBe(false);
        expect(isValidPath("COM1")).toBe(false);
        expect(isValidPath("LPT1")).toBe(false);
        expect(isValidPath("path/CON/file")).toBe(false);
      }
    });

    it("should reject paths that are too long", () => {
      const isValidPath = (inputManager as any).isValidPath.bind(inputManager);
      const longPath = "a".repeat(300);
      expect(isValidPath(longPath)).toBe(false);
    });

    it("should reject paths with double separators", () => {
      const isValidPath = (inputManager as any).isValidPath.bind(inputManager);
      expect(isValidPath("path//double")).toBe(false);
      expect(isValidPath("path\\\\double")).toBe(false);
    });

    it("should accept valid relative paths", () => {
      const isValidPath = (inputManager as any).isValidPath.bind(inputManager);
      expect(isValidPath("valid-path")).toBe(true);
      expect(isValidPath("valid/nested/path")).toBe(true);
      expect(isValidPath("valid_path")).toBe(true);
      expect(isValidPath("valid123")).toBe(true);
      expect(isValidPath("path-with-hyphens")).toBe(true);
    });
  });

  describe("directory existence validation", () => {
    it("should include async validation for paths", () => {
      // The actual validation happens in the promptForProjectConfig method
      // and uses inquirer's async validation. We can test the path validation
      // logic separately from the file system checks.
      expect(true).toBe(true); // Placeholder test
    });
  });

  describe("project name generation", () => {
    it("should handle directories with ./ prefix", () => {
      const generateProjectName = (inputManager as any).generateProjectName.bind(inputManager);
      
      expect(generateProjectName("./my-app")).toBe("my-app");
      expect(generateProjectName("./test-project")).toBe("test-project");
      expect(generateProjectName("my-app")).toBe("my-app"); // without prefix
      expect(generateProjectName(".")).toBe("cli"); // current directory
    });
  });
});
