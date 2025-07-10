import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getModels, clearModelCache, getModelCacheStatus } from '../model-service';

// Mock fetch
global.fetch = vi.fn();

describe('Model Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearModelCache(); // Clear cache before each test
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
  });

  describe('getModels', () => {
    it('should fetch OpenAI models successfully', async () => {
      const mockResponse = {
        data: [
          { id: 'gpt-4o', name: 'GPT-4o' },
          { id: 'gpt-4', name: 'GPT-4' }
        ]
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const models = await getModels('openai', 'test-api-key');
      
      expect(models).toEqual([
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
        { id: 'gpt-4', name: 'GPT-4', provider: 'openai' }
      ]);

      expect(fetch).toHaveBeenCalledWith('/api/models/openai', {
        headers: {
          'Authorization': 'Bearer test-api-key',
          'Content-Type': 'application/json',
        },
      });
    });

    it('should fetch Anthropic models successfully', async () => {
      const mockResponse = {
        data: [
          { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
          { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' }
        ]
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const models = await getModels('anthropic', 'test-api-key');
      
      expect(models).toEqual([
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic' }
      ]);

      expect(fetch).toHaveBeenCalledWith('/api/models/anthropic', {
        headers: {
          'x-api-key': 'test-api-key',
          'Content-Type': 'application/json',
        },
      });
    });

    it('should throw error for empty API key', async () => {
      await expect(getModels('openai', '')).rejects.toThrow('API key is required');
    });

    it('should handle API errors gracefully', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Invalid API key' }),
      });

      await expect(getModels('openai', 'invalid-key')).rejects.toThrow('Invalid API key');
    });
  });

  describe('cache functionality', () => {
    it('should report cache status correctly', () => {
      const status = getModelCacheStatus('openai', 'test-key');
      expect(status.hasCachedData).toBe(false);
      expect(status.isValid).toBe(false);
    });

    it('should clear cache for specific provider', () => {
      clearModelCache('openai');
      expect(localStorage.removeItem).toHaveBeenCalledWith('ai_models_cache_openai');
    });

    it('should clear all caches when no provider specified', () => {
      clearModelCache();
      expect(localStorage.removeItem).toHaveBeenCalledWith('ai_models_cache_openai');
      expect(localStorage.removeItem).toHaveBeenCalledWith('ai_models_cache_anthropic');
    });
  });
}); 