import { createMcpWorkersConfig } from "@null-shot/test-utils/vitest/mcpWorkersConfig";

export default createMcpWorkersConfig({
  test: {
    testTimeout: 30000, // 30 second timeout per test
    hookTimeout: 10000, // 10 second timeout for setup/teardown
  }
});