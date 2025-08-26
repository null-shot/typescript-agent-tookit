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
		exclude: ['test/expense-mcp-client.test.ts', 'node_modules/**', 'dist/**'],
	},
	resolve: {
		alias: {
			'@xava-labs/test-utils': '../../packages/test-utils/src/index.ts'
		}
	},
	optimizeDeps: {
		exclude: ['ajv']
	}
});