import { NextRequest, NextResponse } from 'next/server';
import { streamText, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Chat API received body:', JSON.stringify(body, null, 2));
    
    // Extract messages from the standard useChat format
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      console.log('Missing messages array');
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Get model configuration from headers or use defaults
    const headerProvider = request.headers.get('x-provider') || 'anthropic';
    const headerApiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
    const headerModel = request.headers.get('x-model') || 'claude-3-5-sonnet-20241022';
    const headerTemperature = parseFloat(request.headers.get('x-temperature') || '0.7');
    const headerMaxTokens = parseInt(request.headers.get('x-max-tokens') || '2000');

    // If headers don't have the info, try to get from body (fallback)
    const finalProvider = body.provider || headerProvider;
    const finalApiKey = body.apiKey || headerApiKey;
    const finalModel = body.model || headerModel;
    const finalTemperature = body.temperature || headerTemperature;
    const finalMaxTokens = body.maxTokens || headerMaxTokens;
    
    // MCP integration parameters
    const mcpProxyId = body.mcpProxyId;
    const mcpSessionId = body.mcpSessionId;
    const enableMCPTools = true; // Force enable for testing

    console.log('Extracted config:', { 
      provider: finalProvider, 
      hasApiKey: !!finalApiKey, 
      model: finalModel,
      temperature: finalTemperature,
      maxTokens: finalMaxTokens
    });

    if (!finalProvider || !finalApiKey) {
      console.log('Missing provider or API key:', { provider: finalProvider, hasApiKey: !!finalApiKey });
      return NextResponse.json(
        { error: 'Provider and API key are required. Please configure your AI model in the settings.' },
        { status: 400 }
      );
    }

    // Configure the AI model
    let aiModel;
    let modelName = finalModel;

    if (finalProvider === 'openai') {
      // Default to gpt-4o if no model specified
      if (!modelName) {
        modelName = 'gpt-4o';
      }
      const openaiProvider = createOpenAI({
        apiKey: finalApiKey,
      });
      aiModel = openaiProvider(modelName);
    } else if (finalProvider === 'anthropic') {
      // Default to claude-3-5-sonnet if no model specified
      if (!modelName) {
        modelName = 'claude-3-5-sonnet-20241022';
      }
      const anthropicProvider = createAnthropic({
        apiKey: finalApiKey,
      });
      aiModel = anthropicProvider(modelName);
    } else if (finalProvider === 'workers-ai') {
      // Workers AI integration using REST API
      if (!modelName) {
        modelName = '@cf/meta/llama-3.1-8b-instruct';
      }
      console.log('🚀 Workers AI integration - using REST API with model:', modelName);
      
      // Workers AI requires Cloudflare account ID and API token
      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
      if (!accountId) {
        return NextResponse.json(
          { error: 'CLOUDFLARE_ACCOUNT_ID environment variable is required for Workers AI' },
          { status: 500 }
        );
      }

      // Use Workers AI REST API directly
      const workersAIResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelName}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${finalApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            max_tokens: finalMaxTokens,
            temperature: finalTemperature,
          }),
        }
      );

      if (!workersAIResponse.ok) {
        const errorText = await workersAIResponse.text();
        console.error('Workers AI API error:', errorText);
        return NextResponse.json(
          { error: `Workers AI API error: ${workersAIResponse.status}` },
          { status: workersAIResponse.status }
        );
      }

      const workersAIResult = await workersAIResponse.json();
      console.log('✅ Workers AI response received');
      
      // Return in the format expected by the frontend
      return NextResponse.json({
        choices: [{
          message: {
            role: 'assistant',
            content: workersAIResult.result?.response || workersAIResult.response || 'No response from Workers AI'
          }
        }]
      });
    } else if (finalProvider === 'deepseek') {
      // DeepSeek integration using official @ai-sdk/deepseek provider
      if (!modelName) {
        modelName = 'deepseek-chat';
      }
      const deepseekProvider = createDeepSeek({
        apiKey: finalApiKey,
      });
      aiModel = deepseekProvider(modelName);
      console.log('✅ Using DeepSeek with model:', modelName, '(official provider)');
    } else if (finalProvider === 'gemini') {
      // Google Gemini integration using @ai-sdk/google
      if (!modelName) {
        modelName = 'gemini-1.5-pro';
      }
      const geminiProvider = createGoogleGenerativeAI({
        apiKey: finalApiKey,
      });
      aiModel = geminiProvider(modelName);
      console.log('✅ Using Gemini with model:', modelName);
    } else if (finalProvider === 'grok') {
      // xAI Grok integration using OpenAI-compatible API
      if (!modelName) {
        modelName = 'grok-1';
      }
      const grokProvider = createOpenAI({
        apiKey: finalApiKey,
        baseURL: 'https://api.x.ai/v1',
      });
      aiModel = grokProvider(modelName);
      console.log('✅ Using Grok with model:', modelName);
    } else {
      return NextResponse.json(
        { error: `Unsupported provider: ${finalProvider}` },
        { status: 400 }
      );
    }

    console.log('Creating stream with:', { provider: finalProvider, model: modelName });
    console.log('Messages being sent:', messages);
    console.log('MCP integration:', { mcpProxyId, mcpSessionId, enableMCPTools });

    // Temporarily disable tools to fix chat
    const tools = undefined;

    // Create the streaming response
    const result = streamText({
      model: aiModel,
      messages: messages,
      temperature: finalTemperature,
      tools: tools,
    });

    console.log('Stream result created, returning response');
    
    // Return the streaming response using the correct AI SDK method
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        );
      }
      
      if (error.message.includes('429')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
        );
      }
      
      if (error.message.includes('quota')) {
        return NextResponse.json(
          { error: 'API quota exceeded' },
          { status: 402 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error while processing chat request' },
      { status: 500 }
    );
  }
}
