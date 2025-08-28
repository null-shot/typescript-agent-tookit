import { ModelMessage, LanguageModel, StreamTextResult, ToolSet, streamText, wrapLanguageModel } from 'ai';
import { isMiddlewareService, MiddlewareService, StreamTextWithMessagesParams, StreamTextWithPromptParams } from './middleware';
import { NullShotAgent } from '../agent';
import { AgentEnv } from '../env';
import { Service } from '../service';

/**
 * A message from the AI UI SDK - Could not find this in the ai package
 */
export interface AIUISDKMessage {
	id: string;
	messages: ModelMessage[];
}

/**
 * A wrapper around the AI SDK's to support AI UI SDK and enhanced middleware support
 */
export abstract class AiSdkAgent<ENV extends AgentEnv> extends NullShotAgent<ENV, AIUISDKMessage> {
	protected model: LanguageModel;
	protected middleware: MiddlewareService[] = [];

	constructor(state: DurableObjectState, env: ENV, model: string | LanguageModel, services: Service[] = []) {
		super(state, env, services);
		this.model = model;
	}

	protected override async initializeServices(): Promise<void> {
		await super.initializeServices();

		for (const service of this.services) {
			// Register middleware for middleware services
			if (isMiddlewareService(service)) {
				this.middleware.push(service);
			}
		}

		// Wrap the language model with middleware if needed
		if (this.middleware.length > 0) {
			this.model = wrapLanguageModel({
				model: this.model as any, // Must be LanguageModelV2 object - very annoying!
				middleware: this.middleware,
			});
		}

		return Promise.resolve();
	}

	/**
	 * Stream text with messages (conversation mode)
	 */
	protected async streamTextWithMessages(
		sessionId: string,
		messages: ModelMessage[],
		options: Omit<Partial<StreamTextWithMessagesParams>, 'model' | 'messages'> = {},
	): Promise<StreamTextResult<ToolSet, string>> {
		const params: StreamTextWithMessagesParams = {
			model: this.model,
			messages,
			experimental_generateMessageId: () => `${sessionId}-${crypto.randomUUID()}`,
			...options,
		};

		// Enrich with tools via middleware
		this.enrichParamsWithTools(params);

		// Call AI SDK v5 streamText - no casting needed!
		return streamText(params);
	}

	/**
	 * Stream text with prompt (single prompt mode)
	 */
	protected async streamTextWithPrompt(
		sessionId: string,
		prompt: string,
		options: Omit<Partial<StreamTextWithPromptParams>, 'model' | 'prompt'> = {},
	): Promise<StreamTextResult<ToolSet, string>> {
		const params: StreamTextWithPromptParams = {
			model: this.model,
			prompt,
			experimental_generateMessageId: () => `${sessionId}-${crypto.randomUUID()}`,
			...options,
		};

		// Enrich with tools via middleware
		this.enrichParamsWithTools(params);

		// Call AI SDK v5 streamText - no casting needed!
		return streamText(params);
	}

	/**
	 * Common logic to enrich parameters with tools via middleware
	 */
	private enrichParamsWithTools(params: StreamTextWithMessagesParams | StreamTextWithPromptParams): void {
		// Apply middleware transformations for tools
		// Note: If model is a string and we have middleware, we can only apply tool transformations
		// The wrapLanguageModel middleware (wrapGenerate, wrapStream) only works with LanguageModelV2 objects
		for (const middleware of this.middleware) {
			if (middleware.transformStreamTextTools) {
				params.tools = middleware.transformStreamTextTools(params.tools);
				console.debug('Transforming tools with middleware:', middleware.name || 'unnamed');
			}
		}
	}
}
