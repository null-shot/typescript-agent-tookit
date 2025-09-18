import { Hono } from 'hono';
import { applyPermissionlessAgentSessionRouter } from '@nullshot/agent';
import { ToolboxService } from '@nullshot/agent/services';
import { LanguageModel, stepCountIs, type Provider } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createWorkersAI } from 'workers-ai-provider';
import { AiSdkAgent, AIUISDKMessage } from '@nullshot/agent/aisdk';
import { Service } from '@nullshot/agent';
import mcpConfig from '../mcp.json';

// Custom Workers AI provider implementation (TODO: Remove after testing official provider)
function createCustomWorkersAI(binding: Ai): Provider {
  return {
    languageModel: (modelId: string) => {
      return {
        specificationVersion: 'v2',
        modelId,
        provider: 'workers-ai',
        defaultObjectGenerationMode: 'json',
        supportedUrls: {},
        
        async doGenerate(options) {
          // Extract messages from the prompt
          const messages: Array<{ role: string; content: string }> = [];
          
          if ('messages' in options.prompt) {
            // Handle message-based prompts
            for (const msg of (options.prompt as any).messages) {
              const content = Array.isArray(msg.content) 
                ? msg.content.map((part: any) => part.text || part).join('')
                : msg.content;
              messages.push({ role: msg.role, content });
            }
          } else if ('text' in options.prompt) {
            // Handle simple text prompts
            messages.push({ role: 'user', content: (options.prompt as any).text });
          }

          try {
            const response = await binding.run(modelId as any, {
              messages,
              max_tokens: (options as any).maxTokens || 1000,
              temperature: options.temperature || 0.7,
              stream: false
            } as any);

            // Handle different response formats from Workers AI
            const responseText = (response as any).response || 
                               (response as any).generated_text || 
                               (response as any).text ||
                               JSON.stringify(response);

            return {
              content: [{ type: 'text', text: responseText }],
              finishReason: 'stop',
              usage: {
                inputTokens: 0, // Workers AI doesn't provide token counts
                outputTokens: 0,
                totalTokens: 0
              },
              warnings: []
            };
          } catch (error) {
            console.error('Workers AI generation error:', error);
            throw error;
          }
        },

        async doStream(options) {
          // Extract messages from the prompt
          const messages: Array<{ role: string; content: string }> = [];
          
          if ('messages' in options.prompt) {
            for (const msg of (options.prompt as any).messages) {
              const content = Array.isArray(msg.content) 
                ? msg.content.map((part: any) => part.text || part).join('')
                : msg.content;
              messages.push({ role: msg.role, content });
            }
          } else if ('text' in options.prompt) {
            messages.push({ role: 'user', content: (options.prompt as any).text });
          }

          try {
            const response = await binding.run(modelId as any, {
              messages,
              max_tokens: (options as any).maxTokens || 1000,
              temperature: options.temperature || 0.7,
              stream: true
            } as any);

            // Create a readable stream from the Workers AI stream
            const stream = new ReadableStream({
              async start(controller) {
                try {
                  // Handle both streaming and non-streaming responses
                  if (Symbol.asyncIterator in response) {
                    // Streaming response
                    for await (const chunk of response as any) {
                      const text = chunk.response || chunk.generated_text || chunk.text;
                      if (text) {
                        controller.enqueue({
                          type: 'text-delta',
                          textDelta: text
                        });
                      }
                    }
                  } else {
                    // Non-streaming response - send as single chunk
                    const text = (response as any).response || 
                               (response as any).generated_text || 
                               (response as any).text ||
                               JSON.stringify(response);
                    controller.enqueue({
                      type: 'text-delta',
                      textDelta: text
                    });
                  }
                  
                  controller.enqueue({
                    type: 'finish',
                    finishReason: 'stop',
                    usage: {
                      inputTokens: 0,
                      outputTokens: 0,
                      totalTokens: 0
                    }
                  });
                  controller.close();
                } catch (error) {
                  console.error('Workers AI streaming error:', error);
                  controller.error(error);
                }
              }
            });

            return { stream };
          } catch (error) {
            console.error('Workers AI streaming error:', error);
            throw error;
          }
        }
      };
    },
    
    // Required Provider interface methods (not implemented for Workers AI)
    textEmbeddingModel: () => {
      throw new Error('Text embedding models not supported in Workers AI provider');
    },
    
    imageModel: () => {
      throw new Error('Image models not supported in Workers AI provider');
    }
  };
}

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
				if (!env.DEEPSEEK_API_KEY) {
					throw new Error('DeepSeek requires DEEPSEEK_API_KEY. Please set this environment variable.');
				}
				provider = createDeepSeek({
					apiKey: env.DEEPSEEK_API_KEY,
				});
				model = provider.languageModel('deepseek-chat');
				console.log(`✅ Using DeepSeek with model: deepseek-chat (official provider)`);
				break;
		case 'workers-ai':
			// Workers AI integration using official workers-ai-provider with binding
			if (!env.AI) {
				throw new Error('Workers AI binding not available. Make sure AI binding is configured in wrangler.jsonc');
			}
			const workersAiModel = env.WORKERS_AI_MODEL || '@cf/meta/llama-3.1-8b-instruct';
			const workersai = createWorkersAI({ binding: env.AI });
			model = workersai(workersAiModel as any); // Direct model creation with type assertion
			console.log(`✅ Using Workers AI with model: ${workersAiModel} (official provider)`);
			break;
		case 'gemini':
			// Google Gemini integration using official @ai-sdk/google
			if (!env.GOOGLE_API_KEY) {
				throw new Error('Gemini requires GOOGLE_API_KEY. Please set this environment variable.');
			}
			provider = createGoogleGenerativeAI({
				apiKey: env.GOOGLE_API_KEY,
			});
			model = provider.languageModel(env.GEMINI_MODEL || 'gemini-1.5-pro');
			console.log(`✅ Using Gemini with model: ${env.GEMINI_MODEL || 'gemini-1.5-pro'}`);
			break;
		case 'grok':
			// xAI Grok integration using OpenAI-compatible API
			if (!env.GROK_API_KEY) {
				throw new Error('Grok requires GROK_API_KEY. Please set this environment variable.');
			}
			provider = createOpenAI({
				apiKey: env.GROK_API_KEY,
				baseURL: 'https://api.x.ai/v1',
			});
			model = provider.languageModel(env.GROK_MODEL || 'grok-1');
			console.log(`✅ Using Grok with model: ${env.GROK_MODEL || 'grok-1'}`);
			break;
			default:
				// This should never happen due to validation above, but TypeScript requires this
				throw new Error(`Unsupported AI provider: ${env.AI_PROVIDER}`);
		}

		// Create services array - no special middleware needed for Workers AI
		const services: Service[] = [new ToolboxService(env, mcpConfig)];
		
		super(state, env, model, services);
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
