import { NextRequest, NextResponse } from 'next/server';

// Required for static export with API routes
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'xAI API key is required' },
        { status: 400 }
      );
    }

    // xAI doesn't have a public models API for Grok,
    // so we return the known available models
    const grokModels = [
      {
        id: 'grok-1',
        name: 'Grok 1',
        provider: 'grok'
      },
      {
        id: 'grok-1.5',
        name: 'Grok 1.5',
        provider: 'grok'
      },
      {
        id: 'grok-2',
        name: 'Grok 2',
        provider: 'grok'
      }
    ];

    // Validate the API key by making a simple request to xAI
    try {
      const validationResponse = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'grok-1',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        })
      });

      // If we get a 401, the API key is invalid
      if (validationResponse.status === 401) {
        return NextResponse.json(
          { error: 'Invalid xAI API key' },
          { status: 401 }
        );
      }

      // Even if the request fails for other reasons (like quota), 
      // we still return the models if the key is valid
    } catch (validationError) {
      console.warn('Could not validate xAI API key, returning models anyway:', validationError);
    }

    return NextResponse.json({ data: grokModels });
  } catch (error) {
    console.error('Error fetching Grok models:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching Grok models' },
      { status: 500 }
    );
  }
}
