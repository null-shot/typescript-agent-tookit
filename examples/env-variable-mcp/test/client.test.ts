import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { WorkerSSEClientTransport, WorkerWebSocketClientTransport } from '@nullshot/test-utils';

describe('Environment Variable MCP Server Tests', () => {
	const baseUrl = 'http://localhost';
	const wsBaseUrl = 'ws://localhost';

	// Define transport configurations
	const transportConfigs = [
		{
			name: 'SSE',
			createTransport: (ctx: ExecutionContext) => {
				const url = new URL(`${baseUrl}/sse`);
				return new WorkerSSEClientTransport(url, ctx);
			},
		},
		{
			name: 'WebSocket',
			createTransport: (ctx: ExecutionContext) => {
				const url = new URL(`${wsBaseUrl}/ws`);
				return new WorkerWebSocketClientTransport(url, ctx);
			},
		},
	];

	// Parameterized tests for each transport type
	describe.each(transportConfigs)('$name Transport', (transportConfig) => {
		let client: Client;
		let ctx: ExecutionContext;

		beforeEach(async () => {
			console.log(`--------- ${transportConfig.name} TEST STARTING ---------`);
			ctx = createExecutionContext();

			// Create a new client
			client = new Client({
				name: 'env-variable-test-client',
				version: '1.0.0',
			});

			console.log(`Created MCP Client for ${transportConfig.name} testing`);
		});

		afterEach(async () => {
			console.log(`--------- ${transportConfig.name} TEST ENDING ---------`);
			try {
				await client.close();
				console.log(`${transportConfig.name} client closed successfully`);
			} catch (err) {
				console.warn(`Error closing ${transportConfig.name} client:`, err);
			}
		});

		it('should successfully connect to the env-variable mcp server', async () => {
			console.log(`Testing ${transportConfig.name} transport connection`);

			const transport = transportConfig.createTransport(ctx);
			await client.connect(transport);

			await waitOnExecutionContext(ctx);
			console.log(`${transportConfig.name} client connection test passed!`);
		});

		it('should return correct server version and name', async () => {
			console.log(`Testing ${transportConfig.name} server version`);

			const transport = transportConfig.createTransport(ctx);
			await client.connect(transport);

			const serverInfo = await client.getServerVersion();

			// Verify that serverInfo is defined
			expect(serverInfo).not.toBeUndefined();

			if (serverInfo) {
				// Expected values from EnvVariableMcpServer's getImplementation method
				expect(serverInfo.name).toBe('EnvVariableMcpServer');
				expect(serverInfo.version).toBe('1.0.0');
			}

			await waitOnExecutionContext(ctx);
			console.log(`${transportConfig.name} server version test passed!`);
		});

		it('should list available tools including greeting tool', async () => {
			console.log(`Testing ${transportConfig.name} tools listing`);

			const transport = transportConfig.createTransport(ctx);
			await client.connect(transport);

			const tools = await client.listTools();

			// Verify tools are available
			expect(tools).not.toBeUndefined();
			expect(tools.tools).toHaveLength(1);

			// Check greeting tool exists
			const greetingTool = tools.tools.find((tool) => tool.name === 'greeting');
			expect(greetingTool).not.toBeUndefined();
			expect(greetingTool?.description).toBe('Sends a greeting using an optional name if supplied');

			// Verify tool parameters
			expect(greetingTool?.inputSchema).toHaveProperty('properties');
			const properties = (greetingTool?.inputSchema as any)?.properties;
			expect(properties).toHaveProperty('name');
			expect(properties.name.type).toBe('string');

			await waitOnExecutionContext(ctx);
			console.log(`${transportConfig.name} tools listing test passed!`);
		});

		it('should execute greeting tool with default environment variable', async () => {
			console.log(`Testing ${transportConfig.name} greeting tool with default name`);

			const transport = transportConfig.createTransport(ctx);
			await client.connect(transport);

			// Call greeting tool without providing a name (should use DEFAULT_NAME env var)
			const result = await client.callTool({
				name: 'greeting',
				arguments: {},
			});

			// Verify result structure
			expect(result).not.toBeUndefined();
			expect(result.content).toHaveLength(1);
			expect(result.content[0].type).toBe('text');

			// Check that it uses the default name from environment variable (DEFAULT_NAME = "World")
			const textContent = (result.content[0] as any).text;
			expect(textContent).toBe('Hello World');

			await waitOnExecutionContext(ctx);
			console.log(`${transportConfig.name} greeting tool default test passed!`);
		});

		it('should execute greeting tool with custom name parameter', async () => {
			console.log(`Testing ${transportConfig.name} greeting tool with custom name`);

			const transport = transportConfig.createTransport(ctx);
			await client.connect(transport);

			const customName = 'Alice';

			// Call greeting tool with a custom name
			const result = await client.callTool({
				name: 'greeting',
				arguments: { name: customName },
			});

			// Verify result structure
			expect(result).not.toBeUndefined();
			expect(result.content).toHaveLength(1);
			expect(result.content[0].type).toBe('text');

			// Check that it uses the provided name
			const textContent = (result.content[0] as any).text;
			expect(textContent).toBe(`Hello ${customName}`);

			await waitOnExecutionContext(ctx);
			console.log(`${transportConfig.name} greeting tool custom name test passed!`);
		});

		it('should handle empty string name parameter by using default', async () => {
			console.log(`Testing ${transportConfig.name} greeting tool with empty name`);

			const transport = transportConfig.createTransport(ctx);
			await client.connect(transport);

			// Call greeting tool with empty string (should fallback to DEFAULT_NAME)
			const result = await client.callTool({
				name: 'greeting',
				arguments: { name: '' },
			});

			// Verify result structure
			expect(result).not.toBeUndefined();
			expect(result.content).toHaveLength(1);
			expect(result.content[0].type).toBe('text');

			// Check that it falls back to default name when empty string provided
			const textContent = (result.content[0] as any).text;
			expect(textContent).toBe('Hello World');

			await waitOnExecutionContext(ctx);
			console.log(`${transportConfig.name} greeting tool empty name test passed!`);
		});

		it('should list resources (should be empty)', async () => {
			console.log(`Testing ${transportConfig.name} resources listing`);

			const transport = transportConfig.createTransport(ctx);
			await client.connect(transport);

			const resources = await client.listResources();

			// Verify resources list is empty since setupServerResources does nothing
			expect(resources).not.toBeUndefined();
			expect(resources.resources).toHaveLength(0);

			await waitOnExecutionContext(ctx);
			console.log(`${transportConfig.name} resources listing test passed!`);
		});

		it('should list prompts (should be empty)', async () => {
			console.log(`Testing ${transportConfig.name} prompts listing`);

			const transport = transportConfig.createTransport(ctx);
			await client.connect(transport);

			const prompts = await client.listPrompts();

			// Verify prompts list is empty since setupServerPrompts does nothing
			expect(prompts).not.toBeUndefined();
			expect(prompts.prompts).toHaveLength(0);

			await waitOnExecutionContext(ctx);
			console.log(`${transportConfig.name} prompts listing test passed!`);
		});
	});
});
