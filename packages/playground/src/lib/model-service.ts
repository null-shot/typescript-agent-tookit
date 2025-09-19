export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'workers-ai' | 'deepseek' | 'gemini' | 'grok';
  category?: string;
  description?: string;
}

export interface ModelCacheEntry {
  models: AIModel[];
  timestamp: number;
  apiKey: string; // Hash of API key to validate cache
}

// Cache duration in milliseconds (30 minutes)
const CACHE_DURATION = 30 * 60 * 1000;
const MODEL_CACHE_PREFIX = 'ai_models_cache_';

// Hash function for API keys (simple hash for cache validation)
function hashApiKey(apiKey: string): string {
  let hash = 0;
  for (let i = 0; i < apiKey.length; i++) {
    const char = apiKey.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

// Get cache key for provider
function getCacheKey(provider: 'openai' | 'anthropic' | 'workers-ai' | 'deepseek' | 'gemini' | 'grok'): string {
  return `${MODEL_CACHE_PREFIX}${provider}`;
}

// Check if cache is valid
function isCacheValid(cacheEntry: ModelCacheEntry, apiKey: string): boolean {
  const now = Date.now();
  const isNotExpired = (now - cacheEntry.timestamp) < CACHE_DURATION;
  const isApiKeyMatch = cacheEntry.apiKey === hashApiKey(apiKey);
  return isNotExpired && isApiKeyMatch;
}

// Get models from cache
function getModelsFromCache(provider: 'openai' | 'anthropic' | 'workers-ai' | 'deepseek' | 'gemini' | 'grok', apiKey: string): AIModel[] | null {
  try {
    if (typeof window === 'undefined') return null;
    
    const cached = localStorage.getItem(getCacheKey(provider));
    if (!cached) return null;
    
    const cacheEntry: ModelCacheEntry = JSON.parse(cached);
    
    if (isCacheValid(cacheEntry, apiKey)) {
      console.log(`Using cached models for ${provider}`);
      return cacheEntry.models;
    }
    
    // Cache is invalid, remove it
    localStorage.removeItem(getCacheKey(provider));
    return null;
  } catch (error) {
    console.error('Error reading models cache:', error);
    return null;
  }
}

// Save models to cache
function saveModelsToCache(provider: 'openai' | 'anthropic' | 'workers-ai' | 'deepseek' | 'gemini' | 'grok', models: AIModel[], apiKey: string): void {
  try {
    if (typeof window === 'undefined') return;
    
    const cacheEntry: ModelCacheEntry = {
      models,
      timestamp: Date.now(),
      apiKey: hashApiKey(apiKey)
    };
    
    localStorage.setItem(getCacheKey(provider), JSON.stringify(cacheEntry));
    console.log(`Cached ${models.length} models for ${provider}`);
  } catch (error) {
    console.error('Error saving models cache:', error);
  }
}

// Clear cache for a specific provider
export function clearModelCache(provider?: 'openai' | 'anthropic'): void {
  try {
    if (typeof window === 'undefined') return;
    
    if (provider) {
      localStorage.removeItem(getCacheKey(provider));
      console.log(`Cleared model cache for ${provider}`);
    } else {
      // Clear all model caches
      localStorage.removeItem(getCacheKey('openai'));
      localStorage.removeItem(getCacheKey('anthropic'));
      console.log('Cleared all model caches');
    }
  } catch (error) {
    console.error('Error clearing model cache:', error);
  }
}

// Fetch models from OpenAI API
async function fetchOpenAIModels(apiKey: string): Promise<AIModel[]> {
  const response = await fetch('/api/models/openai', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json() as { error?: string };
    throw new Error(errorData.error || `OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { data: Array<{ id: string; name: string }> };
  return data.data.map(model => ({
    id: model.id,
    name: model.name,
    provider: 'openai' as const
  }));
}

// Fetch models from Anthropic API
async function fetchAnthropicModels(apiKey: string): Promise<AIModel[]> {
  const response = await fetch('/api/models/anthropic', {
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json() as { error?: string };
    throw new Error(errorData.error || `Anthropic API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { data: Array<{ id: string; name: string }> };
  return data.data.map(model => ({
    id: model.id,
    name: model.name,
    provider: 'anthropic' as const
  }));
}

// Workers AI models - dynamic with fallback
async function fetchWorkersAIModels(apiKey?: string): Promise<AIModel[]> {
  try {
    // Try to fetch from the API route which handles dynamic fetching
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Only add API key header if we have a valid key
    if (apiKey && apiKey.trim()) {
      headers['x-api-key'] = apiKey;
    }
    
    const response = await fetch('/api/models/workers-ai', {
      headers,
    });

    if (response.ok) {
      const data = await response.json() as { data: Array<{ id: string; name: string; category?: string; description?: string }> };
      return data.data.map(model => ({
        id: model.id,
        name: model.name,
        category: model.category,
        description: model.description,
        provider: 'workers-ai' as const
      }));
    }
  } catch (error) {
    console.warn('Failed to fetch dynamic Workers AI models, using fallback:', error);
  }

  // Fallback to static list with categories
  const fallbackModels = [
    { id: '@cf/meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B Instruct', category: 'Meta Llama' },
    { id: '@cf/meta/llama-3.2-3b-instruct', name: 'Llama 3.2 3B Instruct', category: 'Meta Llama' },
    { id: '@cf/google/gemma-2b-it-lora', name: 'Gemma 2B IT LoRA', category: 'Google Gemma' },
    { id: '@cf/mistral/mistral-7b-instruct-v0.1', name: 'Mistral 7B Instruct', category: 'Mistral AI' },
    { id: '@cf/qwen/qwen1.5-7b-chat-awq', name: 'Qwen 1.5 7B Chat', category: 'Alibaba Qwen' },
  ];

  return fallbackModels.map(model => ({
    id: model.id,
    name: model.name,
    category: model.category,
    provider: 'workers-ai' as const
  }));
}

// DeepSeek models - static list with API validation
async function fetchDeepSeekModels(apiKey: string): Promise<AIModel[]> {
  // DeepSeek doesn't have a public models API, return known models
  const deepseekModels = [
    { id: 'deepseek-chat', name: 'DeepSeek Chat', category: 'DeepSeek' },
    { id: 'deepseek-coder', name: 'DeepSeek Coder', category: 'DeepSeek' },
  ];

  return deepseekModels.map(model => ({
    id: model.id,
    name: model.name,
    category: model.category,
    provider: 'deepseek' as const
  }));
}

// Gemini models - dynamic fetching with fallback
async function fetchGeminiModels(apiKey: string): Promise<AIModel[]> {
  try {
    const response = await fetch('/api/models/gemini', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json() as { data: any[] };
      return data.data.map((model: any) => ({
        id: model.id,
        name: model.name,
        category: 'Google Gemini',
        provider: 'gemini' as const
      }));
    } else {
      throw new Error(`API responded with status: ${response.status}`);
    }
  } catch (error) {
    console.warn('Failed to fetch dynamic Gemini models, using fallback:', error);
    
    // Fallback to static models
    const geminiModels = [
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', category: 'Google Gemini' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', category: 'Google Gemini' },
      { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', category: 'Google Gemini' },
    ];

    return geminiModels.map(model => ({
      id: model.id,
      name: model.name,
      category: model.category,
      provider: 'gemini' as const
    }));
  }
}

// Grok models - dynamic fetching with fallback
async function fetchGrokModels(apiKey: string): Promise<AIModel[]> {
  try {
    const response = await fetch('/api/models/grok', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json() as { data: any[] };
      return data.data.map((model: any) => ({
        id: model.id,
        name: model.name,
        category: 'xAI',
        provider: 'grok' as const
      }));
    } else {
      throw new Error(`API responded with status: ${response.status}`);
    }
  } catch (error) {
    console.warn('Failed to fetch dynamic Grok models, using fallback:', error);
    
    // Fallback to static models
    const grokModels = [
      { id: 'grok-1', name: 'Grok 1', category: 'xAI' },
      { id: 'grok-1.5', name: 'Grok 1.5', category: 'xAI' },
      { id: 'grok-2', name: 'Grok 2', category: 'xAI' },
    ];

    return grokModels.map(model => ({
      id: model.id,
      name: model.name,
      category: model.category,
      provider: 'grok' as const
    }));
  }
}

// Main function to get models (with caching)
export async function getModels(provider: 'openai' | 'anthropic' | 'workers-ai' | 'deepseek' | 'gemini' | 'grok', apiKey: string, forceRefresh = false): Promise<AIModel[]> {
  // Workers AI doesn't need an API key
  if (provider !== 'workers-ai' && !apiKey.trim()) {
    throw new Error('API key is required');
  }

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cachedModels = getModelsFromCache(provider, apiKey);
    if (cachedModels) {
      return cachedModels;
    }
  }

  console.log(`Fetching fresh models for ${provider}`);
  
  // Fetch from API
  let models: AIModel[];
  try {
    if (provider === 'openai') {
      models = await fetchOpenAIModels(apiKey);
    } else if (provider === 'anthropic') {
      models = await fetchAnthropicModels(apiKey);
    } else if (provider === 'workers-ai') {
      models = await fetchWorkersAIModels(apiKey);
    } else if (provider === 'deepseek') {
      models = await fetchDeepSeekModels(apiKey);
    } else if (provider === 'gemini') {
      models = await fetchGeminiModels(apiKey);
    } else if (provider === 'grok') {
      models = await fetchGrokModels(apiKey);
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
    
    // Cache the results
    saveModelsToCache(provider, models, apiKey);
    
    return models;
  } catch (error) {
    console.error(`Error fetching ${provider} models:`, error);
    
    // Try to return stale cache as fallback
    const staleCache = getModelsFromCache(provider, apiKey);
    if (staleCache) {
      console.warn(`Using stale cache for ${provider} due to API error`);
      return staleCache;
    }
    
    throw error;
  }
}

// Get all models for all configured providers
export async function getAllAvailableModels(): Promise<AIModel[]> {
  const { getCurrentModelConfig } = await import('./storage');
  const config = getCurrentModelConfig();
  
  if (!config) {
    return [];
  }

  try {
    const models = await getModels(config.provider, config.apiKey);
    return models;
  } catch (error) {
    console.error('Error fetching models:', error);
    return [];
  }
}

// Get a specific model by ID
export async function getModelById(modelId: string, provider: 'openai' | 'anthropic', apiKey: string): Promise<AIModel | null> {
  try {
    const models = await getModels(provider, apiKey);
    return models.find(model => model.id === modelId) || null;
  } catch (error) {
    console.error('Error finding model by ID:', error);
    return null;
  }
}

// Validate that a model ID exists for the provider
export async function validateModelId(modelId: string, provider: 'openai' | 'anthropic', apiKey: string): Promise<boolean> {
  try {
    const model = await getModelById(modelId, provider, apiKey);
    return model !== null;
  } catch (error) {
    console.error('Error validating model ID:', error);
    return false;
  }
}

// Refresh models cache
export async function refreshModelsCache(provider: 'openai' | 'anthropic', apiKey: string): Promise<AIModel[]> {
  return getModels(provider, apiKey, true);
}

// Get cache status
export function getModelCacheStatus(provider: 'openai' | 'anthropic', apiKey: string): {
  hasCachedData: boolean;
  isValid: boolean;
  timestamp?: number;
  age?: number;
} {
  try {
    if (typeof window === 'undefined') {
      return { hasCachedData: false, isValid: false };
    }
    
    const cached = localStorage.getItem(getCacheKey(provider));
    if (!cached) {
      return { hasCachedData: false, isValid: false };
    }
    
    const cacheEntry: ModelCacheEntry = JSON.parse(cached);
    const isValid = isCacheValid(cacheEntry, apiKey);
    const age = Date.now() - cacheEntry.timestamp;
    
    return {
      hasCachedData: true,
      isValid,
      timestamp: cacheEntry.timestamp,
      age
    };
  } catch (error) {
    console.error('Error checking cache status:', error);
    return { hasCachedData: false, isValid: false };
  }
} 