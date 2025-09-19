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

    console.log('🔄 Fetching dynamic Grok models from xAI API...');

    try {
      // Fetch dynamic models from xAI API
      const modelsResponse = await fetch('https://api.x.ai/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (modelsResponse.status === 401) {
        console.log('❌ Invalid xAI API key');
        return NextResponse.json(
          { error: 'Invalid xAI API key' },
          { status: 401 }
        );
      }

      if (!modelsResponse.ok) {
        throw new Error(`xAI API responded with status: ${modelsResponse.status}`);
      }

      const modelsData = await modelsResponse.json();
      
      // Transform xAI models to our format
      const grokModels = modelsData.data
        ?.filter((model: any) => {
          // Only include models that are available and not deprecated
          return model.id && !model.deprecated;
        })
        ?.map((model: any) => ({
          id: model.id,
          name: model.id.split('-').map((word: string) => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' '), // Convert "grok-1" to "Grok 1"
          provider: 'grok'
        })) || [];

      console.log(`✅ Successfully fetched ${grokModels.length} dynamic Grok models`);
      return NextResponse.json({ data: grokModels });

    } catch (fetchError) {
      console.warn('⚠️ xAI API request failed, falling back to static models');
      console.warn('Error:', fetchError);
      
      // Fallback to static models
      const fallbackModels = [
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

      console.log('📋 Using fallback Grok models');
      return NextResponse.json({ data: fallbackModels });
    }

  } catch (error) {
    console.error('Error fetching Grok models:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching Grok models' },
      { status: 500 }
    );
  }
}
