export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic';
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
function getCacheKey(provider: 'openai' | 'anthropic'): string {
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
function getModelsFromCache(provider: 'openai' | 'anthropic', apiKey: string): AIModel[] | null {
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
function saveModelsToCache(provider: 'openai' | 'anthropic', models: AIModel[], apiKey: string): void {
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

// Main function to get models (with caching)
export async function getModels(provider: 'openai' | 'anthropic', apiKey: string, forceRefresh = false): Promise<AIModel[]> {
  if (!apiKey.trim()) {
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
    } else {
      models = await fetchAnthropicModels(apiKey);
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