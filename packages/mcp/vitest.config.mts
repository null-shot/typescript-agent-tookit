import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				isolatedStorage: false, // Must have for Durable Objects
				singleWorker: true,
				wrangler: { configPath: './test/wrangler.test.jsonc' },
			},
		},
		// Only include our specific test files in src/
		include: ['src/**/*.test.ts'],
		// Temporarily exclude problematic Durable Object tests with ajv compatibility issues
		exclude: ['**/test/hono.test.ts', '**/test/mcp-client.test.ts', '**/node_modules/**', '**/dist/**'],
	},
	define: {
		global: 'globalThis',
	},
	optimizeDeps: {
		exclude: ['ajv'],
	},
});
