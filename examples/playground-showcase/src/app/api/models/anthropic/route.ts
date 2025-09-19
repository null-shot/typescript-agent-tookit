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

    // Try to fetch dynamic models from Anthropic API
    try {
      console.log('🔄 Fetching dynamic Anthropic models from API...');
      
      const modelsResponse = await fetch('https://api.anthropic.com/v1/models', {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      });

      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json();
        const dynamicModels = modelsData.data.map((model: { id: string; display_name: string }) => ({
          id: model.id,
          name: model.display_name,
          provider: 'anthropic'
        }));
        
        console.log(`✅ Successfully fetched ${dynamicModels.length} dynamic Anthropic models`);
        return NextResponse.json({ data: dynamicModels });
      }
      
      // If API call fails, fall back to static models
      console.log('⚠️ Anthropic API request failed, falling back to static models');
    } catch {
      console.log('⚠️ Anthropic API request failed, falling back to static models');
    }

    // Updated fallback models with latest available models (as of our testing)
    console.log('📋 Using fallback Anthropic models');
    const fallbackModels = [
      {
        id: 'claude-opus-4-1-20250805',
        name: 'Claude Opus 4.1',
        provider: 'anthropic'
      },
      {
        id: 'claude-opus-4-20250514',
        name: 'Claude Opus 4',
        provider: 'anthropic'
      },
      {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        provider: 'anthropic'
      },
      {
        id: 'claude-3-7-sonnet-20250219',
        name: 'Claude Sonnet 3.7',
        provider: 'anthropic'
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude Sonnet 3.5 (New)',
        provider: 'anthropic'
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude Haiku 3.5',
        provider: 'anthropic'
      },
      {
        id: 'claude-3-5-sonnet-20240620',
        name: 'Claude Sonnet 3.5 (Old)',
        provider: 'anthropic'
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude Haiku 3',
        provider: 'anthropic'
      }
    ];

    return NextResponse.json({ data: fallbackModels });
  } catch (error) {
    console.error('Error fetching Anthropic models:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching Anthropic models' },
      { status: 500 }
    );
  }
}
