import { NextRequest, NextResponse } from 'next/server';

// Required for static export with API routes
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google API key is required' },
        { status: 400 }
      );
    }

    // Google doesn't have a public models API for Gemini,
    // so we return the known available models
    const geminiModels = [
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'gemini'
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'gemini'
      },
      {
        id: 'gemini-1.0-pro',
        name: 'Gemini 1.0 Pro',
        provider: 'gemini'
      },
      {
        id: 'gemini-pro-vision',
        name: 'Gemini Pro Vision',
        provider: 'gemini'
      }
    ];

    // Validate the API key by making a simple request to Google AI
    try {
      const validationResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'test' }]
          }]
        })
      });

      // If we get a 400 with invalid API key, the key is invalid
      if (validationResponse.status === 400) {
        const errorData = await validationResponse.json();
        if (errorData.error?.message?.includes('API_KEY_INVALID')) {
          return NextResponse.json(
            { error: 'Invalid Google API key' },
            { status: 401 }
          );
        }
      }

      // Even if the request fails for other reasons (like quota), 
      // we still return the models if the key is valid
    } catch (validationError) {
      console.warn('Could not validate Google API key, returning models anyway:', validationError);
    }

    return NextResponse.json({ data: geminiModels });
  } catch (error) {
    console.error('Error fetching Gemini models:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching Gemini models' },
      { status: 500 }
    );
  }
}
