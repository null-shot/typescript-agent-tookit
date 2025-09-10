import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        isolatedStorage: false,
        singleWorker: true,
        wrangler: { configPath: "./wrangler.jsonc" },
      },
    },
  },
  resolve: {
    alias: {
      // Mock ajv for MCP compatibility
      ajv: "@nullshot/test-utils/vitest/ajv-mock",
      "ajv/dist/ajv": "@nullshot/test-utils/vitest/ajv-mock",
    },
  },
});