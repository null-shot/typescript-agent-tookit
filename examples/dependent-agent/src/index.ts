import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { type AgentEnv } from '@null-shot/agent';
import type { LanguageModel } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { AiSdkAgent, type AIUISDKMessage } from '@null-shot/agent/aisdk';
import { ToolboxService } from '@null-shot/agent/services';

interface EnvWithAgent extends Env, AgentEnv {
  ANTHROPIC_API_KEY: string;
  AGENT: DurableObjectNamespace<DependentAgent>;
  MCP_SERVICE: Fetcher;
}

// Instantiate application with Hono
const app = new Hono<{ Bindings: EnvWithAgent }>();

app.use(
	'*',
	cors({
		origin: '*', // Allow any origin for development; restrict this in production
		allowMethods: ['POST', 'GET', 'OPTIONS'],
		allowHeaders: ['Content-Type'],
		exposeHeaders: ['X-Session-Id'],
		maxAge: 86400, // 24 hours
	}),
);

// Root route with available endpoints
app.get('/', async (c) => {
	return c.json({
		message: 'Agent Dependencies Example',
		endpoints: {
			'GET /': 'This help message',
			'GET /test/mcp': 'Test MCP service basic connectivity',
			'GET /test/mcp/sse': 'Test MCP service SSE endpoint',
			'POST /agent/chat/:sessionId?': 'Chat with the agent'
		},
		service_bindings: {
			MCP_SERVICE: 'Connected to MCP service'
		}
	});
});

// Test route to check MCP service connectivity
app.get('/test/mcp', async (c) => {
	try {
		console.log('🧪 Testing MCP service connectivity...');
		
		// Test basic connectivity to MCP service
		const response = await c.env.MCP_SERVICE.fetch(new Request('https://mcp-service/mcp', {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		}));

		const data = await response.text();
		console.log('✅ MCP Service Response:', { status: response.status, data });

		return c.json({
			success: true,
			mcp_service: {
				status: response.status,
				statusText: response.statusText,
				data: data,
				headers: Object.fromEntries(response.headers.entries())
			},
			message: 'MCP service test completed'
		});
	} catch (error) {
		console.error('❌ MCP Service Error:', error);
		return c.json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
			message: 'MCP service test failed'
		}, 500);
	}
});

// Test route to check if MCP service supports SSE endpoint
app.get('/test/mcp/sse', async (c) => {
	try {
		console.log('🧪 Testing MCP service SSE endpoint...');
		
		// Test SSE endpoint connectivity
		const response = await c.env.MCP_SERVICE.fetch(new Request('https://mcp-service/sse', {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'text/event-stream'
			}
		}));

		console.log('✅ MCP SSE Response:', { status: response.status });

		return c.json({
			success: true,
			sse_endpoint: {
				status: response.status,
				statusText: response.statusText,
				headers: Object.fromEntries(response.headers.entries())
			},
			message: 'MCP SSE endpoint test completed'
		});
	} catch (error) {
		console.error('❌ MCP SSE Error:', error);
		return c.json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
			message: 'MCP SSE endpoint test failed'
		}, 500);
	}
});

// Route all requests to the durable object instance based on session
app.all('/agent/chat/:sessionId?', async (c) => {
	const { AGENT } = c.env;
	var sessionIdStr = c.req.param('sessionId');

	if (!sessionIdStr || sessionIdStr == '') {
		sessionIdStr = crypto.randomUUID();
	}

	const id = AGENT.idFromName(sessionIdStr);

	const forwardRequest = new Request('https://internal.com/agent/chat/' + sessionIdStr, {
		method: c.req.method,
		body: c.req.raw.body,
	});

	// Forward to Durable Object and get response
	return await AGENT.get(id).fetch(forwardRequest);
});

//
export class DependentAgent extends AiSdkAgent<EnvWithAgent> {
	constructor(state: DurableObjectState, env: EnvWithAgent) {
		let model: LanguageModel;
		switch (env.AI_PROVIDER) {
			case 'anthropic':
				const anthropic = createAnthropic({
					apiKey: env.ANTHROPIC_API_KEY,
				});
				model = anthropic('claude-3-haiku-20240307');
				break;
			default:
				// This should never happen due to validation above, but TypeScript requires this
				throw new Error(`Unsupported AI provider: ${env.AI_PROVIDER}`);
		}

		super(state, env, model, [
			new ToolboxService(env)
		]);
	}

	async processMessage(sessionId: string, messages: AIUISDKMessage): Promise<Response> {
		const result = await this.streamText(sessionId, {
			model: this.model,
			system: 'You are a conversational expert, enjoying deep, intellectual conversations.',
			messages: messages.messages,
			maxSteps: 10,
			// Enable MCP tools from imported mcp.json
			experimental_toolCallStreaming: true,
			onError: (error: unknown) => {
				console.error('Error processing message', error);
			},
		});

		return result.toDataStreamResponse();
	}
}

export default {
	async fetch(request: Request, env: EnvWithAgent, ctx: ExecutionContext): Promise<Response> {
		return app.fetch(request, env, ctx);
	},
};
