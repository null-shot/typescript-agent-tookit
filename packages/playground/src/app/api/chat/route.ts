import { streamText, experimental_createMCPClient as createMCPClient } from 'ai';
import { NextRequest } from 'next/server';

interface ChatRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  provider: 'openai' | 'anthropic';
  model: string;
  temperature?: number;
  maxTokens?: number;
  maxSteps?: number;
  systemPrompt?: string;
  mcpProxyId?: string; // MCP proxy ID for Durable Object routing
  mcpSessionId?: string; // Unique session ID for SSE transport
  enableMCPTools?: boolean; // Whether to enable MCP tools for this request
}

// Error types and user-friendly messages
interface ErrorResponse {
  error: string;
  userMessage: string;
  errorType: string;
  details?: string;
  suggestions?: string[];
}

function createErrorResponse(error: unknown): ErrorResponse {
  console.error('Chat API error:', error);
  
  // Type guard for error objects
  const isErrorWithMessage = (err: unknown): err is { message: string; cause?: { message: string; statusCode?: number }; statusCode?: number } => {
    return typeof err === 'object' && err !== null && ('message' in err || ('cause' in err && typeof (err as Record<string, unknown>).cause === 'object' && (err as Record<string, unknown>).cause !== null && 'message' in ((err as Record<string, unknown>).cause as Record<string, unknown>)));
  };
  
  // Handle AI API errors (Anthropic, OpenAI, etc.)
  if (isErrorWithMessage(error)) {
    const errorMessage = error.cause?.message || error.message;
    const statusCode = error.statusCode || error.cause?.statusCode;
    
    // Anthropic-specific errors
    if (errorMessage.includes('prompt is too long')) {
      const match = errorMessage.match(/(\d+) tokens > (\d+) maximum/);
      const currentTokens = match?.[1];
      const maxTokens = match?.[2];
      
      return {
        error: 'Token limit exceeded',
        userMessage: `Your conversation is too long for this model. You're using ${currentTokens} tokens, but the maximum is ${maxTokens}.`,
        errorType: 'TOKEN_LIMIT_EXCEEDED',
        details: errorMessage,
        suggestions: [
          'Try starting a new conversation',
          'Use a model with a larger context window',
          'Summarize your conversation and start fresh'
        ]
      };
    }
    
    if (errorMessage.includes('rate_limit_error') || statusCode === 429) {
      return {
        error: 'Rate limit exceeded',
        userMessage: 'You\'re sending requests too quickly. Please wait a moment before trying again.',
        errorType: 'RATE_LIMIT_EXCEEDED',
        details: errorMessage,
        suggestions: [
          'Wait 30-60 seconds before retrying',
          'Consider upgrading your API plan for higher limits'
        ]
      };
    }
    
    if (errorMessage.includes('insufficient_quota') || errorMessage.includes('billing')) {
      return {
        error: 'API quota exceeded',
        userMessage: 'Your API quota has been exceeded. Please check your billing settings.',
        errorType: 'QUOTA_EXCEEDED',
        details: errorMessage,
        suggestions: [
          'Check your API billing dashboard',
          'Add credits to your account',
          'Upgrade your API plan'
        ]
      };
    }
    
    if (errorMessage.includes('invalid_api_key') || statusCode === 401) {
      return {
        error: 'Invalid API key',
        userMessage: 'Your API key is invalid or has expired. Please check your API key settings.',
        errorType: 'INVALID_API_KEY',
        details: errorMessage,
        suggestions: [
          'Verify your API key is correct',
          'Check if your API key has expired',
          'Generate a new API key from your provider dashboard'
        ]
      };
    }
    
    if (errorMessage.includes('model_not_found') || errorMessage.includes('model not found')) {
      return {
        error: 'Model not found',
        userMessage: 'The selected AI model is not available or doesn\'t exist.',
        errorType: 'MODEL_NOT_FOUND',
        details: errorMessage,
        suggestions: [
          'Try a different model',
          'Check if the model name is spelled correctly',
          'Verify your API access includes this model'
        ]
      };
    }
    
    if (errorMessage.includes('server_error') || (statusCode && statusCode >= 500)) {
      return {
        error: 'Server error',
        userMessage: 'The AI service is experiencing issues. Please try again in a few moments.',
        errorType: 'SERVER_ERROR',
        details: errorMessage,
        suggestions: [
          'Wait a few minutes and try again',
          'Check the AI provider\'s status page',
          'Try a different model if available'
        ]
      };
    }
  }
  
  // MCP-specific errors
  if (isErrorWithMessage(error) && (error.message?.includes('MCP') || error.message?.includes('closed client'))) {
    return {
      error: 'Tool connection error',
      userMessage: 'There was an issue connecting to the tools. Your message was processed, but tools may not be available.',
      errorType: 'MCP_CONNECTION_ERROR',
      details: error.message,
      suggestions: [
        'Try your request again',
        'Tools may be temporarily unavailable'
      ]
    };
  }
  
  // Network errors
  if (isErrorWithMessage(error) && (error.message?.includes('fetch') || error.message?.includes('network'))) {
    return {
      error: 'Network error',
      userMessage: 'Unable to connect to the AI service. Please check your internet connection.',
      errorType: 'NETWORK_ERROR',
      details: error.message,
      suggestions: [
        'Check your internet connection',
        'Try again in a few moments',
        'Contact support if the issue persists'
      ]
    };
  }
  
  // Generic fallback
  return {
    error: 'Unexpected error',
    userMessage: 'An unexpected error occurred. Please try again.',
    errorType: 'UNKNOWN_ERROR',
    details: isErrorWithMessage(error) ? error.message : 'Unknown error',
    suggestions: [
      'Try your request again',
      'Refresh the page if the issue persists',
      'Contact support if the problem continues'
    ]
  };
}

// Dynamic provider factory with dynamic imports
async function createProvider(provider: 'openai' | 'anthropic', apiKey: string) {
  switch (provider) {
    case 'openai': {
      const { createOpenAI } = await import('@ai-sdk/openai');
      return createOpenAI({ apiKey });
    }
    case 'anthropic': {
      const { createAnthropic } = await import('@ai-sdk/anthropic');
      return createAnthropic({ apiKey });
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

// Global MCP client instance
let mcpClient: Awaited<ReturnType<typeof createMCPClient>> | null = null;

// Function to get or create MCP client using AI SDK's built-in support
async function getMCPClient(proxyId?: string, sessionId?: string) {
  // If client exists but is closed, reset it
  if (mcpClient) {
    try {
      // Try to use the client to check if it's still alive
      await mcpClient.tools();
    } catch {
      console.log('MCP client is closed, creating new one...');
      mcpClient = null;
    }
  }
  
  if (!mcpClient) {
    // Construct URL with both proxyId (for DO routing) and sessionId (for SSE transport)
    const baseUrl = process.env.NEXT_PUBLIC_MCP_PROXY_URL || 'http://localhost:6050';
    const url = new URL('/sse', baseUrl);
    
    if (proxyId && sessionId) {
      // proxyId is needed for Durable Object routing
      url.searchParams.set('proxyId', proxyId);
      // sessionId is needed for the SSE transport within the DO
      url.searchParams.set('sessionId', sessionId);
    }
    
    console.log('Creating MCP client with URL:', url.toString());
    
    // Use the built-in SSE transport from AI SDK
    mcpClient = await createMCPClient({
      transport: {
        type: 'sse',
        url: url.toString(),
        // Optional headers for authentication
        headers: {}
      }
    });
  }
  
  return mcpClient;
}

export async function POST(request: NextRequest) {
  let body: ChatRequest | null = null;
  
  try {
    body = await request.json();
    
    if (!body) {
      return Response.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const { messages, provider, model, mcpProxyId, mcpSessionId, enableMCPTools, ...otherParams } = body;

    // Get API key from Authorization header instead of environment variables
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');
    
    console.log('🔍 Chat API Debug Info:', {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length,
      provider,
      model,
      enableMCPTools,
      mcpProxyId: !!mcpProxyId,
      mcpSessionId: !!mcpSessionId,
      messagesCount: messages?.length
    });
    
    if (!apiKey) {
      console.error('❌ No API key provided in Authorization header');
      return Response.json(
        { error: 'API key required in Authorization header' },
        { status: 401 }
      );
    }

    // Create the provider
    console.log('🔧 Creating provider:', provider);
    const providerInstance = await createProvider(provider, apiKey);

    // Only get MCP client and tools if explicitly enabled
    let mcpTools = {};
    if (enableMCPTools && mcpProxyId && mcpSessionId) {
      try {
        console.log('🛠️ Attempting to get MCP tools...');
        const client = await getMCPClient(mcpProxyId, mcpSessionId);
        mcpTools = await client.tools();
        console.log('✅ MCP tools retrieved successfully with proxyId:', mcpProxyId, 'sessionId:', mcpSessionId);
        console.log('🔧 Available tools:', Object.keys(mcpTools).length);
      } catch (mcpError) {
        console.warn('⚠️ MCP tools unavailable, continuing without tools:', mcpError);
        // Continue without tools rather than failing completely
      }
    } else {
      console.log('🚫 MCP tools disabled for this request');
    }

    console.log('🚀 Starting streamText with:', {
      model: model,
      provider: provider,
      hasSystemPrompt: !!otherParams.systemPrompt,
      temperature: otherParams.temperature,
      maxTokens: otherParams.maxTokens,
      toolsCount: Object.keys(mcpTools).length
    });

    const result = streamText({
      model: providerInstance(model),
      system: otherParams.systemPrompt,
      messages,
      temperature: otherParams.temperature,
      maxTokens: otherParams.maxTokens,
      maxSteps: otherParams.maxSteps || 10,
      // Include MCP tools if available and model supports tools
      tools: mcpTools,
      // Don't close the client - keep it alive for reuse
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('💥 Chat API Error Details:', {
      error: error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      requestBody: body ? {
        provider: body.provider,
        model: body.model,
        enableMCPTools: body.enableMCPTools,
        messagesCount: body.messages?.length
      } : 'No body parsed'
    });
    
    // If there's a critical error with the MCP client, reset it
    if (error instanceof Error && error.message.includes('closed client')) {
      console.error('MCP client error detected, resetting client...');
      mcpClient = null;
    }
    
    // Create structured error response
    const errorResponse = createErrorResponse(error);
    
    // Return structured error that the UI can handle
    return Response.json(errorResponse, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 