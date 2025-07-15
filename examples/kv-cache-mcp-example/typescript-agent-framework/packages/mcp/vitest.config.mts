import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				isolatedStorage: false, // Must have for Durable Objects
				singleWorker: true,
				wrangler: { configPath: './test/wrangler.test.jsonc' }
			},
		},
	},
});
