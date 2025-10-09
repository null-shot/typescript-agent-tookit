import { createMcpWorkersConfig } from '@nullshot/test-utils/vitest/mcpWorkersConfig';

export default createMcpWorkersConfig({
	wranglerConfigPath: './wrangler.jsonc',
	includeAjvMock: true,
});
