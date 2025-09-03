import { createMcpWorkersConfig } from "@nullshot/test-utils/vitest/mcpWorkersConfig";

export default createMcpWorkersConfig({
  test: {
    testTimeout: 30000, // 30 seconds for Browser Rendering operations
  }
});