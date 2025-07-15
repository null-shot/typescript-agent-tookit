import { CoreMessage, JSONRPCMessage, LanguageModel, StreamTextResult, ToolSet, streamText, wrapLanguageModel } from "ai";
import { isMiddlewareService, MiddlewareService, StreamTextParams } from "./middleware";
import { XavaAgent } from "../agent";
import { AgentEnv } from "../env";
import { Service } from "../service";

/**
 * A message from the AI UI SDK - Could not find this in the ai package
 */
export interface AIUISDKMessage {
    id: string;
    messages: CoreMessage[];
}

/**
 * A wrapper around the AI SDK's to support AI UI SDK and enhanced middleware support
 */
export abstract class AiSdkAgent<ENV extends AgentEnv> extends XavaAgent<ENV, AIUISDKMessage> {
    protected model: LanguageModel;
    protected middleware: MiddlewareService[] = [];

    constructor(state: DurableObjectState, env: ENV, model: LanguageModel, services: Service[] = []) {
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
        this.model = wrapLanguageModel({
            model: this.model,
            middleware: this.middleware
        });

        return Promise.resolve();
    }
    /**
     * Stream text with middleware support
     * This method applies the tools transformation middleware
     */
    protected async streamText(
        sessionId: string,
        options: Partial<StreamTextParams> = {}
    ): Promise<StreamTextResult<ToolSet, string>> {
        // Create initial parameters
        let params: StreamTextParams = {
        model: this.model,
        experimental_generateMessageId: () => `${sessionId}-${crypto.randomUUID()}`,
        ...options
        };

        // TODO: consider all params to have a params transform function
        for (const middleware of this.middleware) {
            if (middleware.transformStreamTextTools) {
                params.tools = middleware.transformStreamTextTools(params.tools);
                console.log("Transforming tools", params.tools);
            }
        }

        // Call streamText with transformed parameters
        return streamText(params);
    }
  } 