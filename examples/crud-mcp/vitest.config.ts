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
      // Mock Ajv to avoid CJS/ESM issues via published mock file
      ajv: "@null-shot/test-utils/vitest/ajv-mock",
      "ajv/dist/ajv": "@null-shot/test-utils/vitest/ajv-mock",
    },
  },
  // Ensure vitest-pool-workers stays external and is not transformed by Vite
  ssr: {
    external: ["@cloudflare/vitest-pool-workers"],
  },
});
