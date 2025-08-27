import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				isolatedStorage: false,
				singleWorker: true,
				wrangler: { configPath: './wrangler.jsonc' }
			},
		},
		// Temporarily exclude problematic test with ajv compatibility issues
		exclude: ["**/test/expense-mcp-client.test.ts", "**/node_modules/**"],
	},
	resolve: {
		alias: {
			'@xava-labs/test-utils': '../../packages/test-utils/src/index.ts'
		}
	}
});