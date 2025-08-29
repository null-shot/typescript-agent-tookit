import { Hono } from 'hono';
import { applyPermissionlessAgentSessionRouter } from '@nullshot/agent';
import { ToolboxService } from '@nullshot/agent/services';
import { LanguageModel, stepCountIs, type Provider } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { AiSdkAgent, AIUISDKMessage } from '@nullshot/agent/aisdk';
import mcpConfig from '../mcp.json';

// Use type assertion to make Hono app compatible with AgentRouterBuilder
const app = new Hono<{ Bindings: Env }>();
applyPermissionlessAgentSessionRouter(app);

export class SimplePromptAgent extends AiSdkAgent<Env> {
	constructor(state: DurableObjectState, env: Env) {
		let provider: Provider;
		let model: LanguageModel;
		// This is just an example, ideally you only want ot inlcude models that you plan to use for your agent itself versus multiple models
		switch (env.AI_PROVIDER) {
			case 'anthropic':
				provider = createAnthropic({
					apiKey: env.ANTHROPIC_API_KEY,
				});
				model = provider.languageModel('claude-3-haiku-20240307');
				break;
			case 'openai':
				provider = createOpenAI({
					apiKey: env.OPEN_AI_API_KEY,
				});
				model = provider.languageModel('gpt-3.5-turbo');
				break;
			case 'deepseek':
				provider = createOpenAI({
					apiKey: env.DEEPSEEK_API_KEY,
					baseURL: 'https://api.deepseek.com',
				});
				model = provider.languageModel('deepseek-chat');
				break;
			default:
				// This should never happen due to validation above, but TypeScript requires this
				throw new Error(`Unsupported AI provider: ${env.AI_PROVIDER}`);
		}

		super(state, env, model, [new ToolboxService(env, mcpConfig)]);
	}

	async processMessage(sessionId: string, messages: AIUISDKMessage): Promise<Response> {
		// Use the protected streamTextWithMessages method - model is handled automatically by the agent
		const result = await this.streamTextWithMessages(sessionId, messages.messages, {
			system: 'You will use tools to help manage and mark off tasks on a todo list.',
			maxSteps: 10,
			stopWhen: stepCountIs(10),
			// Enable MCP tools from imported mcp.json
			experimental_toolCallStreaming: true,
			onError: (error: unknown) => {
				console.error('Error processing message', error);
			},
		});

		return result.toTextStreamResponse();
	}
}

// Export the worker handler
export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// Bootstrap the agent worker with the namespace
		return app.fetch(request, env, ctx);
	},
};
