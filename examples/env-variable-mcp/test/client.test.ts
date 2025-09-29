import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { WorkerSSEClientTransport } from '@nullshot/test-utils/mcp/WorkerSSEClientTransport';

describe('Environment Variable MCP Client Integration Tests', () => {
	const baseUrl = 'http://localhost';
	let client: Client;
	let ctx: ExecutionContext;

	beforeEach(async () => {
		console.log(`--------- STARTING ENV VAR MCP TEST ---------`);
		ctx = createExecutionContext();

		// Create a standard MCP client
		client = new Client({
			name: 'test-client',
			version: '1.0.0',
		});

		console.log(`Created MCP Client for Environment Variable testing`);
	});

	afterEach(async () => {
		console.log(`--------- ENDING ENV VAR MCP TEST ---------`);
		try {
			// Only call close if client is properly initialized
			if (client && typeof client.close === 'function') {
				await client.close();
				console.log(`Client closed successfully`);
			}
		} catch (err) {
			console.warn(`Error closing client:`, err);
		}
	});

	// Helper function to create the transport
	function createTransport(ctx: ExecutionContext) {
		const url = new URL(`${baseUrl}/sse`);
		return new WorkerSSEClientTransport(url, ctx);
	}

	// Test for basic functionality
	it('should initialize the client properly', () => {
		expect(client).toBeDefined();

		// Simply check that the client was created successfully
		// Skip checking internal properties since they seem to vary
		const clientOptions = client.constructor.name;
		expect(clientOptions).toBe('Client');
	});

	it('should successfully connect to the env-variable mcp server', async () => {
		console.log(`Testing SSE transport connection`);

		const transport = createTransport(ctx);
		await client.connect(transport);

		await waitOnExecutionContext(ctx);
		console.log(`Client connection test passed!`);
	});

	it('should return server version matching the implementation', async () => {
		console.log(`Testing server version`);

		const transport = createTransport(ctx);
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
		console.log(`Server version test passed!`);
	});

	it('should list available tools including greeting tool', async () => {
		const transport = createTransport(ctx);
		await client.connect(transport);

		const tools = await client.listTools();

		// Verify tools are available
		expect(tools).not.toBeUndefined();
		expect(tools.tools).toHaveLength(1);

		// Check greeting tool exists
		const greetingTool = tools.tools.find((tool) => tool.name === 'greeting');
		expect(greetingTool).not.toBeUndefined();
		expect(greetingTool?.description).toBe('Sends a greeting using an optional name if supplied');

		await waitOnExecutionContext(ctx);
		console.log(`Tools listing test passed!`);
	});

	it('should execute greeting tool with default environment variable', async () => {
		const transport = createTransport(ctx);
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
		console.log(`Greeting tool default test passed!`);
	});

	it('should execute greeting tool with custom name parameter', async () => {
		const transport = createTransport(ctx);
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
		console.log(`Greeting tool custom name test passed!`);
	});
});
