import { createMcpWorkersConfig } from "@nullshot/test-utils/vitest/mcpWorkersConfig";

export default createMcpWorkersConfig({
  test: {
    testTimeout: 30000, // 30 second timeout per test
    hookTimeout: 10000, // 10 second timeout for setup/teardown
  }
});
