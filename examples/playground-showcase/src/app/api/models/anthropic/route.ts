import { NextRequest, NextResponse } from 'next/server';

// Required for static export with API routes
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Anthropic API key is required' },
        { status: 400 }
      );
    }

    // Since Anthropic doesn't have a public models API endpoint,
    // we'll return the known available models
    const anthropicModels = [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet (Latest)',
        provider: 'anthropic'
      },
      {
        id: 'claude-3-5-sonnet-20240620',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic'
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        provider: 'anthropic'
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        provider: 'anthropic'
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        provider: 'anthropic'
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        provider: 'anthropic'
      }
    ];

    // Validate the API key by making a simple request to Anthropic
    try {
      const validationResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        })
      });

      // If we get a 401, the API key is invalid
      if (validationResponse.status === 401) {
        return NextResponse.json(
          { error: 'Invalid Anthropic API key' },
          { status: 401 }
        );
      }

      // Even if the request fails for other reasons (like quota), 
      // we still return the models if the key is valid
    } catch (validationError) {
      console.warn('Could not validate Anthropic API key, returning models anyway:', validationError);
    }

    return NextResponse.json({ data: anthropicModels });
  } catch (error) {
    console.error('Error fetching Anthropic models:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching Anthropic models' },
      { status: 500 }
    );
  }
}
