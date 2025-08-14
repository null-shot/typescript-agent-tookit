import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				isolatedStorage: false, // This is required for Durable Objects to work
				//singleWorker: true, // This is required if you plan to have multiple files doing integration tests
				wrangler: { configPath: './wrangler.jsonc' },
			},
		},
	},
});
