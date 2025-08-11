import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        isolatedStorage: false, // Must have for Durable Objects
        singleWorker: true,
        wrangler: { configPath: "./wrangler.jsonc" },
      },
    },
    // Temporarily exclude problematic test with ajv compatibility issues
    exclude: ["**/test/todo-mcp-client.test.ts", "**/node_modules/**"],
  },
});
