import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        isolatedStorage: true,
        singleWorker: true,
        wrangler: { configPath: "./wrangler.jsonc" }
      }
    },
    // Add tests later; exclude by default to avoid flakiness without real email binding
    exclude: ["**/node_modules/**"]
  }
});