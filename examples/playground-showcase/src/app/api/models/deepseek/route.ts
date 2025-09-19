import { NextRequest, NextResponse } from 'next/server';

// Required for static export with API routes
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'DeepSeek API key is required' },
        { status: 400 }
      );
    }

    // Try to fetch dynamic models from DeepSeek API
    try {
      console.log('🔄 Fetching dynamic DeepSeek models from API...');
      
      const modelsResponse = await fetch('https://api.deepseek.com/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json();
        const dynamicModels = modelsData.data.map((model: any) => ({
          id: model.id,
          name: model.id.split('-').map((word: string) => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' '),
          provider: 'deepseek'
        }));
        
        console.log(`✅ Successfully fetched ${dynamicModels.length} dynamic DeepSeek models`);
        return NextResponse.json({ data: dynamicModels });
      }
      
      // If API call fails, fall back to static models
      console.log('⚠️ DeepSeek API request failed, falling back to static models');
    } catch (error) {
      console.log('⚠️ DeepSeek API request failed, falling back to static models');
    }

    // Updated fallback models with latest available models (as of our testing)
    console.log('📋 Using fallback DeepSeek models');
    const fallbackModels = [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        provider: 'deepseek'
      },
      {
        id: 'deepseek-reasoner',
        name: 'DeepSeek Reasoner',
        provider: 'deepseek'
      },
      {
        id: 'deepseek-coder',
        name: 'DeepSeek Coder',
        provider: 'deepseek'
      }
    ];

    return NextResponse.json({ data: fallbackModels });
  } catch (error) {
    console.error('Error fetching DeepSeek models:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching DeepSeek models' },
      { status: 500 }
    );
  }
}
