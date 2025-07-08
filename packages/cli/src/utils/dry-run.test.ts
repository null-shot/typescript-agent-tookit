import { describe, it, expect, vi } from "vitest";
import { DryRunManager } from "../utils/dry-run.js";

describe("DryRunManager", () => {
  it("should execute action when not in dry-run mode", async () => {
    const manager = new DryRunManager(false);
    const action = vi.fn().mockResolvedValue("result");

    const result = await manager.execute("Test action", action);

    expect(action).toHaveBeenCalled();
    expect(result).toBe("result");
  });

  it("should not execute action in dry-run mode", async () => {
    const manager = new DryRunManager(true);
    const action = vi.fn().mockResolvedValue("result");

    const result = await manager.execute("Test action", action);

    expect(action).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
    expect(manager.getOperations()).toContain("Test action");
  });

  it("should track operations in dry-run mode", async () => {
    const manager = new DryRunManager(true);

    await manager.execute("First action", async () => {});
    await manager.execute("Second action", async () => {});

    const operations = manager.getOperations();
    expect(operations).toHaveLength(2);
    expect(operations).toContain("First action");
    expect(operations).toContain("Second action");
  });
});
