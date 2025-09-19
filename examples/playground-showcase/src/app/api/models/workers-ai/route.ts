import { NextRequest, NextResponse } from 'next/server';

// Fallback models organized by category for better UX
const FALLBACK_MODELS = {
  'Meta Llama': [
    {
      id: '@cf/meta/llama-3.1-8b-instruct',
      name: 'Llama 3.1 8B Instruct',
      category: 'Meta Llama',
      description: 'Fast and efficient for most tasks',
      provider: 'workers-ai'
    },
    {
      id: '@cf/meta/llama-3.2-3b-instruct',
      name: 'Llama 3.2 3B Instruct', 
      category: 'Meta Llama',
      description: 'Lightweight and fast',
      provider: 'workers-ai'
    },
    {
      id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      name: 'Llama 3.3 70B Instruct (Fast)',
      category: 'Meta Llama', 
      description: 'Most capable Llama model',
      provider: 'workers-ai'
    }
  ],
  'Google Gemma': [
    {
      id: '@cf/google/gemma-2b-it-lora',
      name: 'Gemma 2B IT LoRA',
      category: 'Google Gemma',
      description: 'Efficient instruction-tuned model',
      provider: 'workers-ai'
    },
    {
      id: '@cf/google/gemma-7b-it-lora',
      name: 'Gemma 7B IT LoRA', 
      category: 'Google Gemma',
      description: 'Balanced performance and efficiency',
      provider: 'workers-ai'
    }
  ],
  'Mistral AI': [
    {
      id: '@cf/mistral/mistral-7b-instruct-v0.1',
      name: 'Mistral 7B Instruct',
      category: 'Mistral AI',
      description: 'High-quality open model',
      provider: 'workers-ai'
    },
    {
      id: '@cf/mistralai/mistral-small-3.1-24b-instruct',
      name: 'Mistral Small 3.1 24B',
      category: 'Mistral AI', 
      description: 'Advanced reasoning capabilities',
      provider: 'workers-ai'
    }
  ],
  'Alibaba Qwen': [
    {
      id: '@cf/qwen/qwen1.5-7b-chat-awq',
      name: 'Qwen 1.5 7B Chat',
      category: 'Alibaba Qwen',
      description: 'Multilingual conversational AI',
      provider: 'workers-ai'
    },
    {
      id: '@cf/qwen/qwen2.5-coder-32b-instruct',
      name: 'Qwen 2.5 Coder 32B',
      category: 'Alibaba Qwen',
      description: 'Specialized for coding tasks',
      provider: 'workers-ai'
    }
  ],
  'Microsoft': [
    {
      id: '@cf/microsoft/phi-2',
      name: 'Microsoft Phi-2',
      category: 'Microsoft',
      description: 'Small but capable reasoning model',
      provider: 'workers-ai'
    }
  ]
};

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

    // Try to fetch dynamic models if we have API key and account ID
    if (apiKey && accountId && apiKey !== 'no-key') {
      try {
        console.log('🔄 Fetching dynamic Workers AI models from Cloudflare API...');
        
        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models/search`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.result && Array.isArray(data.result)) {
            console.log('✅ Successfully fetched dynamic Workers AI models');
            
            // Transform and categorize dynamic models
            const dynamicModels = data.result
              .filter((model: { task?: { name?: string }; name?: string; id?: string }) => model.task?.name === 'Text Generation')
              .map((model: { name?: string; id?: string; description?: string }) => {
                const modelName = model.name || model.id;
                const category = getCategoryFromModelName(modelName);
                
                return {
                  id: model.name || model.id,
                  name: formatModelName(modelName),
                  category,
                  description: model.description || 'AI text generation model',
                  provider: 'workers-ai'
                };
              })
              .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

            return NextResponse.json({ data: dynamicModels });
          }
        } else {
          console.warn('⚠️ Cloudflare API request failed, falling back to static models');
        }
      } catch (error) {
        console.warn('⚠️ Error fetching dynamic models, falling back to static models:', error);
      }
    } else {
      console.log('ℹ️ No API key or account ID provided, using fallback models');
    }

    // Fallback to static categorized models
    console.log('📋 Using fallback Workers AI models');
    const fallbackModels = Object.values(FALLBACK_MODELS).flat();
    
    return NextResponse.json({ data: fallbackModels });

  } catch (error) {
    console.error('❌ Error in Workers AI models API:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching Workers AI models' },
      { status: 500 }
    );
  }
}

function getCategoryFromModelName(modelName: string): string {
  if (modelName.includes('llama')) return 'Meta Llama';
  if (modelName.includes('gemma')) return 'Google Gemma';
  if (modelName.includes('mistral')) return 'Mistral AI';
  if (modelName.includes('qwen')) return 'Alibaba Qwen';
  if (modelName.includes('phi')) return 'Microsoft';
  if (modelName.includes('deepseek')) return 'DeepSeek';
  if (modelName.includes('falcon')) return 'TII Falcon';
  return 'Other';
}

function formatModelName(modelName: string): string {
  // Remove @cf/ prefix and format nicely
  const cleanName = modelName.replace('@cf/', '').replace(/[-_]/g, ' ');
  return cleanName.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
