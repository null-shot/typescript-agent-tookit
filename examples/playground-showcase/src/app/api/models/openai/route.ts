import { NextRequest, NextResponse } from 'next/server';

// Required for static export with API routes
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const apiKey = authHeader.slice(7); // Remove 'Bearer ' prefix
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is required' },
        { status: 400 }
      );
    }

    // Fetch models from OpenAI API
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return NextResponse.json(
        { error: `OpenAI API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Filter and format models for chat completions
    const chatModels = data.data
      .filter((model: { id: string }) => 
        model.id.includes('gpt') || 
        model.id.includes('o1') ||
        model.id.includes('o3')
      )
      .map((model: { id: string }) => ({
        id: model.id,
        name: model.id,
        provider: 'openai'
      }))
      .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

    return NextResponse.json({ data: chatModels });
  } catch (error) {
    console.error('Error fetching OpenAI models:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching OpenAI models' },
      { status: 500 }
    );
  }
}
