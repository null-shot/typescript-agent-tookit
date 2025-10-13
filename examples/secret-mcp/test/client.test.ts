import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { WorkerSSEClientTransport } from '@nullshot/test-utils/mcp/WorkerSSEClientTransport';

// Define response type for clarity
interface ToolResponse {
	content: Array<{
		type: string;
		text: string;
	}>;
	correct?: boolean;
}

describe('Secret MCP Client Integration Tests', () => {
	const baseUrl = 'http://localhost';
	let client: Client;
	let ctx: ExecutionContext;

	beforeEach(async () => {
		console.log(`--------- STARTING SECRET MCP TEST ---------`);
		ctx = createExecutionContext();

		client = new Client({
			name: 'test-client',
			version: '1.0.0',
		});

		console.log(`Created MCP Client for Secret testing`);
	});

	afterEach(async () => {
		console.log(`--------- ENDING SECRET MCP TEST ---------`);
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

	it('should successfully connect to the secret MCP server', async () => {
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

		expect(serverInfo).not.toBeUndefined();

		if (serverInfo) {
			expect(serverInfo.name).toBe('SecretMcpServer');
			expect(serverInfo.version).toBe('1.0.0');
		}

		await waitOnExecutionContext(ctx);
		console.log(`Server version test passed!`);
	});

	it('should list available tools including guess_number tool', async () => {
		const transport = createTransport(ctx);
		await client.connect(transport);

		const tools = await client.listTools();

		expect(tools).toBeDefined();
		expect(tools.tools).toBeDefined();
		expect(Array.isArray(tools.tools)).toBe(true);
		expect(tools.tools).toHaveLength(1);

		// Check guess_number tool exists
		const guessNumberTool = tools.tools.find((tool) => tool.name === 'guess_number');
		expect(guessNumberTool).not.toBeUndefined();
		expect(guessNumberTool?.description).toBe('Tells you if you guessed the number correctly');

		// Verify tool parameters
		expect(guessNumberTool?.inputSchema).toHaveProperty('properties');
		const properties = (guessNumberTool?.inputSchema as any)?.properties;
		expect(properties).toHaveProperty('guess');
		expect(properties.guess.type).toBe('number');

		await waitOnExecutionContext(ctx);
		console.log(`List tools test passed! Found ${tools.tools.length} tools`);
	});

	it('should execute guess_number tool with correct guess', async () => {
		const transport = createTransport(ctx);
		await client.connect(transport);

		// The secret number is 7 (from .dev.vars)
		const result = (await client.callTool({
			name: 'guess_number',
			arguments: { guess: 7 },
		})) as ToolResponse;

		expect(result).not.toBeUndefined();
		expect(result.content).toHaveLength(1);
		expect(result.content[0].type).toBe('text');
		expect(result.content[0].text).toBe('You guessed 7');
		expect(result.correct).toBe(true);

		await waitOnExecutionContext(ctx);
		console.log(`Guess number tool (correct) test passed!`);
	});

	it('should execute guess_number tool with incorrect guess', async () => {
		const transport = createTransport(ctx);
		await client.connect(transport);

		// Guess wrong number
		const result = (await client.callTool({
			name: 'guess_number',
			arguments: { guess: 5 },
		})) as ToolResponse;

		expect(result).not.toBeUndefined();
		expect(result.content).toHaveLength(1);
		expect(result.content[0].type).toBe('text');
		expect(result.content[0].text).toBe('You guessed 5');
		expect(result.correct).toBe(false);

		await waitOnExecutionContext(ctx);
		console.log(`Guess number tool (incorrect) test passed!`);
	});

	it('should handle different number guesses correctly', async () => {
		const transport = createTransport(ctx);
		await client.connect(transport);

		const testCases = [
			{ guess: 1, expected: false },
			{ guess: 7, expected: true }, // Correct answer
			{ guess: 10, expected: false },
			{ guess: 0, expected: false },
		];

		for (const testCase of testCases) {
			const result = (await client.callTool({
				name: 'guess_number',
				arguments: { guess: testCase.guess },
			})) as ToolResponse;

			expect(result).not.toBeUndefined();
			expect(result.content).toHaveLength(1);
			expect(result.content[0].type).toBe('text');
			expect(result.content[0].text).toBe(`You guessed ${testCase.guess}`);
			expect(result.correct).toBe(testCase.expected);
		}

		await waitOnExecutionContext(ctx);
		console.log(`Multiple guess number test passed!`);
	});

	it('should handle edge case numbers', async () => {
		const transport = createTransport(ctx);
		await client.connect(transport);

		const edgeCases = [
			{ guess: -1, expected: false },
			{ guess: 999, expected: false },
			{ guess: 7.5, expected: false }, // Non-integer
		];

		for (const testCase of edgeCases) {
			const result = (await client.callTool({
				name: 'guess_number',
				arguments: { guess: testCase.guess },
			})) as ToolResponse;

			expect(result).not.toBeUndefined();
			expect(result.content).toHaveLength(1);
			expect(result.content[0].type).toBe('text');
			expect(result.content[0].text).toBe(`You guessed ${testCase.guess}`);
			expect(result.correct).toBe(testCase.expected);
		}

		await waitOnExecutionContext(ctx);
		console.log(`Edge case numbers test passed!`);
	});
});
