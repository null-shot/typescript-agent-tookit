
import { 
  CoreMessage, 
  ToolSet, 
  LanguageModel, 
  ToolChoice,
  TelemetrySettings,
  ProviderMetadata,
  StreamTextTransform,
  StreamTextOnChunkCallback,
  StreamTextOnErrorCallback,
  StreamTextOnFinishCallback,
  StreamTextOnStepFinishCallback,
  ToolCallRepairFunction,
  LanguageModelV1Middleware
} from 'ai';

import {
    Service
} from '../service';

// Type for ID generator function
type IDGenerator = () => string;

/**
 * Parameters for streamText that match the AI SDK's streamText function parameters
 */
export interface StreamTextParams {
  // Core parameters
  model: LanguageModel;
  messages?: CoreMessage[];
  
  // Prompt options
  system?: string;
  prompt?: string;
  
  // Tool-related parameters
  tools?: ToolSet;
  toolChoice?: ToolChoice<ToolSet>;
  
  // Generation settings
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stopSequences?: string[];
  seed?: number;
  
  // Request settings
  maxRetries?: number;
  abortSignal?: AbortSignal;
  headers?: Record<string, string | undefined>;
  
  // Step control
  maxSteps?: number;
  experimental_generateMessageId?: IDGenerator;
  experimental_continueSteps?: boolean;
  
  // Tool control
  experimental_activeTools?: Array<keyof ToolSet>;
  experimental_repairToolCall?: ToolCallRepairFunction<ToolSet>;
  toolCallStreaming?: boolean;
  experimental_toolCallStreaming?: boolean;
  
  // Output and streaming
  experimental_output?: any;
  experimental_transform?: StreamTextTransform<ToolSet> | Array<StreamTextTransform<ToolSet>>;
  
  // Callbacks
  onChunk?: StreamTextOnChunkCallback<ToolSet>;
  onError?: StreamTextOnErrorCallback;
  onFinish?: StreamTextOnFinishCallback<ToolSet>;
  onStepFinish?: StreamTextOnStepFinishCallback<ToolSet>;
  
  // Provider options
  providerOptions?: Record<string, Record<string, any>>;
  experimental_providerMetadata?: ProviderMetadata;
  experimental_telemetry?: TelemetrySettings;
  
  // Internal options
  _internal?: {
    now?: () => number;
    generateId?: IDGenerator;
    currentDate?: () => Date;
  };
}

export interface MiddlewareService extends Service, LanguageModelV1Middleware {
  /**
   * Transform tools in streamText parameters
   * @param tools The original tools to transform
   * @param sessionId The session ID of the current request
   * @returns The transformed tools
   */
  transformStreamTextTools?(tools?: ToolSet): ToolSet;
}

export function isMiddlewareService(service: Service): service is MiddlewareService {
  return (
    ('middlewareVersion' in service && typeof service.middlewareVersion === 'string') ||
    ('transformParams' in service && typeof service.transformParams === 'function') ||
    ('wrapGenerate' in service && typeof service.wrapGenerate === 'function') ||
    ('wrapStream' in service && typeof service.wrapStream === 'function') ||  
    ('transformStreamTextTools' in service && typeof service.transformStreamTextTools === 'function')
  );
}