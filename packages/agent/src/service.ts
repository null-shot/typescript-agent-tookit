import { Hono } from 'hono';
import { AgentEnv } from './env';
import { CoreSystemMessage, LanguageModelV1Middleware } from 'ai';
import { 
  CoreMessage, 
  StreamTextResult, 
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
  ToolCallRepairFunction
} from 'ai';

export interface Service {
  /**
   * Initialize the service while the agent is safely blocking concurrency
   * This function is best for database migrations, etc.
   */
  initialize?(): Promise<void>;

  /**
   * The name of the service should be formated in @[org]/[repo]/[service-name] ie: @xava-labs/agent/service-name
   */ 
  name: string;
}

/**
 * Interface for services that need to register routes with Hono
 */
export interface ExternalService extends Service {
  /**
   * Register routes with the Hono app
   * @param app The Hono app to register routes with
   */
  registerRoutes<E extends AgentEnv>(app: Hono<{ Bindings: E }>): void;
}

export function isExternalService(service: Service): service is ExternalService {
  return 'registerRoutes' in service && typeof service.registerRoutes === 'function';
}

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
  transformStreamTextTools?<T extends ToolSet>(tools?: T): Promise<T>;
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

export interface Event {
  id: string;
  system?: string;
  CoreMessage?: string;
}

export interface EventService extends Service {
  onEvent?: ((message: CoreSystemMessage) => void) | undefined;
}