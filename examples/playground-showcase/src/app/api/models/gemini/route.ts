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

    console.log('🔄 Fetching dynamic Gemini models from Google AI API...');

    try {
      // Fetch dynamic models from Google AI API
      const modelsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (modelsResponse.status === 400) {
        const errorData = await modelsResponse.json();
        if (errorData.error?.message?.includes('API key not valid')) {
          console.log('❌ Invalid Google API key');
          return NextResponse.json(
            { error: 'Invalid Google API key' },
            { status: 401 }
          );
        }
      }

      if (!modelsResponse.ok) {
        throw new Error(`Google AI API responded with status: ${modelsResponse.status}`);
      }

      const modelsData = await modelsResponse.json();
      
      // Filter and transform Google AI models to our format
      const geminiModels = modelsData.models
        ?.filter((model: any) => {
          // Only include Gemini models that support generateContent
          return model.name?.includes('gemini') && 
                 model.supportedGenerationMethods?.includes('generateContent');
        })
        ?.map((model: any) => ({
          id: model.name.replace('models/', ''), // Remove 'models/' prefix
          name: model.displayName || model.name.replace('models/', ''),
          provider: 'gemini'
        })) || [];

      console.log(`✅ Successfully fetched ${geminiModels.length} dynamic Gemini models`);
      return NextResponse.json({ data: geminiModels });

    } catch (fetchError) {
      console.warn('⚠️ Google AI API request failed, falling back to static models');
      console.warn('Error:', fetchError);
      
      // Fallback to static models
      const fallbackModels = [
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

      console.log('📋 Using fallback Gemini models');
      return NextResponse.json({ data: fallbackModels });
    }

  } catch (error) {
    console.error('Error fetching Gemini models:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching Gemini models' },
      { status: 500 }
    );
  }
}
