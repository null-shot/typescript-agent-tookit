"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { 
  loadAIModelConfig, 
  saveAIModelConfig,
  loadProviderConfig,
  saveCurrentProvider,
  getCurrentProvider,
  AIModelConfig
} from "@/lib/storage";

// Simplified types for API-driven approach
interface APIModel {
  id: string;
  name: string;
  description?: string;
}

// Extended interface for model config with validation status
interface AIModelConfigWithValidation extends AIModelConfig {
  isValid?: boolean;
  validationError?: string | null;
}

export interface ModelSelectorProps {
  className?: string;
  onModelChange?: (config: AIModelConfigWithValidation | null) => void;
}

export function ModelSelector({ className, onModelChange }: ModelSelectorProps) {
  const [config, setConfig] = useState<AIModelConfig>(() => {
    const saved = loadAIModelConfig();
    if (saved) {
      return saved;
    }
    // If no saved config, start with the current provider or default to openai
    const currentProvider = getCurrentProvider();
    return { provider: currentProvider, apiKey: '', model: '' };
  });
  const [availableModels, setAvailableModels] = useState<APIModel[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Validate API key and fetch models
  const validateAndFetchModels = useCallback(async (provider: 'openai' | 'anthropic', apiKey: string) => {
    if (!apiKey.trim()) {
      setAvailableModels([]);
      setValidationError(null);
      return;
    }

    setIsValidating(true);
    setValidationError(null);
    
    try {
      let models: APIModel[] = [];
      
      if (provider === 'openai') {
        const response = await fetch('/api/models/openai', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `API error: ${response.status}`);
        }
        
        const data = await response.json() as { data: APIModel[] };
        models = data.data;
          
      } else if (provider === 'anthropic') {
        const response = await fetch('/api/models/anthropic', {
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || `API error: ${response.status}`);
        }
        
        const data = await response.json() as { data: APIModel[] };
        models = data.data;
      }
      
      setAvailableModels(models);
      
      // Auto-select first model if none selected
      if (models.length > 0 && !config.model) {
        const newConfig = { ...config, model: models[0].id };
        setConfig(newConfig);
        saveAIModelConfig(newConfig);
        
        // Notify parent with validation status
        const configWithValidation: AIModelConfigWithValidation = {
          ...newConfig,
          isValid: true, // We know it's valid since we have models
          validationError: null
        };
        onModelChange?.(configWithValidation);
      }
      
    } catch (error) {
      console.error('Model validation failed:', error);
      setValidationError(error instanceof Error ? error.message : 'Unknown error');
      setAvailableModels([]);
    } finally {
      setIsValidating(false);
    }
  }, [config, onModelChange]);

  // Debounced validation effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateAndFetchModels(config.provider, config.apiKey);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [config.provider, config.apiKey, validateAndFetchModels]);

  // Save config and notify parent
  useEffect(() => {
    // Always save config to localStorage regardless of validation status
    saveAIModelConfig(config);
    
    // Always notify parent of current config state
    // Include validation status in the notification
    const configWithValidation: AIModelConfigWithValidation = {
      ...config,
      isValid: availableModels.length > 0 && config.apiKey.trim().length > 0,
      validationError: validationError
    };
    
    // Only pass config if we have at least an API key (even if validation failed)
    const configToSave = config.apiKey.trim().length > 0 ? configWithValidation : null;
    onModelChange?.(configToSave);
  }, [config, availableModels, validationError, onModelChange]); // Added validationError to dependencies

  const handleProviderChange = (provider: 'openai' | 'anthropic') => {
    // Load the saved config for this provider, or use empty values if none exists
    const savedProviderConfig = loadProviderConfig(provider);
    const newConfig: AIModelConfig = { 
      provider, 
      apiKey: savedProviderConfig?.apiKey || '', 
      model: savedProviderConfig?.model || '',
      temperature: savedProviderConfig?.temperature,
      maxTokens: savedProviderConfig?.maxTokens,
      maxSteps: savedProviderConfig?.maxSteps,
      systemPrompt: savedProviderConfig?.systemPrompt
    };
    
    setConfig(newConfig);
    setAvailableModels([]);
    setValidationError(null);
    
    // Save the current provider selection
    saveCurrentProvider(provider);
  };

  const handleApiKeyChange = (apiKey: string) => {
    setConfig((prev: AIModelConfig) => ({ ...prev, apiKey, model: '' }));
    setAvailableModels([]);
  };

  const handleModelChange = (modelId: string) => {
    setConfig((prev: AIModelConfig) => ({ ...prev, model: modelId }));
  };

  const isConfigured = config.apiKey.trim().length > 0 && availableModels.length > 0;
  const hasApiKey = config.apiKey.trim().length > 0;

  return (
    <div 
      className={cn(
        "bg-[#17181A] border border-[rgba(255,255,255,0.1)] rounded-lg transition-all duration-200",
        isExpanded ? "w-80" : "w-12",
        className
      )}
    >
      {/* Collapsed state - show status indicator */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full h-12 flex items-center justify-center hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors"
          aria-label="Open model settings"
        >
          <div className={cn(
            "w-3 h-3 rounded-full",
            isConfigured ? "bg-green-500" : 
            isValidating ? "bg-yellow-500 animate-pulse" :
            hasApiKey && validationError ? "bg-red-500" : "bg-gray-500"
          )} />
        </button>
      )}

      {/* Expanded state - full configuration */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white/90">AI Model</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-white/40 hover:text-white/60 transition-colors"
              aria-label="Collapse model settings"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
          </div>

          {/* Provider Selection */}
          <div>
            <label className="text-xs text-white/60 mb-2 block">Provider</label>
            <select
              value={config.provider}
              onChange={(e) => handleProviderChange(e.target.value as 'openai' | 'anthropic')}
              className="w-full bg-[#09090B] border border-[rgba(255,255,255,0.2)] rounded-md px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-[rgba(255,255,255,0.4)]"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>

          {/* API Key */}
          <div>
            <label className="text-xs text-white/60 mb-2 block">API Key</label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={config.apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder={`Enter ${config.provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key`}
                className="w-full bg-[#09090B] border border-[rgba(255,255,255,0.2)] rounded-md px-3 py-2 pr-10 text-sm text-white/80 focus:outline-none focus:border-[rgba(255,255,255,0.4)]"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                aria-label={showApiKey ? "Hide API key" : "Show API key"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  {showApiKey ? (
                    <path d="M12 3C6.48 3 2 12 2 12s4.48 9 10 9 10-9 10-9-4.48-9-10-9zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  ) : (
                    <path d="M12 6c3.79 0 7.17 2.13 8.82 5.5-.59 1.22-1.42 2.27-2.41 3.12l1.41 1.41c1.39-1.23 2.49-2.77 3.18-4.53C21.27 7.11 17 4 12 4c-1.27 0-2.49.2-3.64.57l1.65 1.65C10.66 6.09 11.32 6 12 6zm-1.07 1.14L13 9.21c.57.25 1.03.71 1.28 1.28l2.07 2.07c.08-.34.14-.7.14-1.07C16.5 9.01 14.48 7 12 7c-.37 0-.72.05-1.07.14zM2.01 3.87l2.68 2.68C3.06 7.83 1.77 9.53 1 11.5 2.73 15.89 7 19 12 19c1.52 0 2.98-.29 4.32-.82l3.42 3.42 1.41-1.41L3.42 2.45 2.01 3.87zm7.5 7.5l2.61 2.61c-.04.01-.08.02-.12.02-1.38 0-2.5-1.12-2.5-2.5 0-.05.01-.08.01-.13zm-3.4-3.4l1.75 1.75c-.23.55-.36 1.15-.36 1.78 0 2.48 2.02 4.5 4.5 4.5.63 0 1.23-.13 1.78-.36l.98.98c-.88.24-1.8.38-2.76.38-3.79 0-7.17-2.13-8.82-5.5.7-1.43 1.72-2.61 2.93-3.53z"/>
                  )}
                </svg>
              </button>
            </div>
            
            {/* Validation feedback */}
            {isValidating && (
              <p className="text-xs text-yellow-500 mt-1 flex items-center gap-1">
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.364-7.364l-2.828 2.828M9.464 9.464L6.636 6.636m12.728 12.728l-2.828-2.828M9.464 14.536l-2.828 2.828"/>
                </svg>
                Checking models...
              </p>
            )}
            
            {validationError && (
              <p className="text-xs text-red-400 mt-1">
                {validationError}
              </p>
            )}
          </div>

          {/* Model Selection - only show if we have models */}
          {availableModels.length > 0 && (
            <>
              <div>
                <label className="text-xs text-white/60 mb-2 block">Model</label>
                <select
                  value={config.model}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full bg-[#09090B] border border-[rgba(255,255,255,0.2)] rounded-md px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-[rgba(255,255,255,0.4)]"
                >
                  {availableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-white/40 mt-1">
                  {availableModels.length} model{availableModels.length !== 1 ? 's' : ''} available
                </p>
              </div>

              {/* Advanced Settings */}
              <div className="space-y-4 pt-4 border-t border-[rgba(255,255,255,0.1)]">
                <h4 className="text-xs font-medium text-white/70">Advanced Settings</h4>
                
                {/* System Prompt */}
                <div>
                  <label className="text-xs text-white/60 mb-2 block">
                    System Prompt
                    <span className="text-white/40 ml-1 text-xs">(optional)</span>
                  </label>
                  <textarea
                    value={config.systemPrompt || ''}
                    onChange={(e) => setConfig((prev: AIModelConfig) => ({ ...prev, systemPrompt: e.target.value }))}
                    placeholder="Enter a system prompt to guide the AI's behavior..."
                    className="w-full bg-[#09090B] border border-[rgba(255,255,255,0.2)] rounded-md px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-[rgba(255,255,255,0.4)] min-h-[80px] resize-y"
                  />
                  <p className="text-xs text-white/40 mt-1">
                    The system prompt sets the behavior and context for the AI assistant.
                  </p>
                </div>

                {/* Temperature */}
                <div>
                  <label className="text-xs text-white/60 mb-2 block">
                    Temperature: <span className="text-white/80">{config.temperature ?? 0.7}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={config.temperature ?? 0.7}
                    onChange={(e) => setConfig((prev: AIModelConfig) => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-white/40 mt-1">
                    <span>Precise</span>
                    <span>Creative</span>
                  </div>
                </div>

                {/* Max Tokens */}
                <div>
                  <label className="text-xs text-white/60 mb-2 block">
                    Max Tokens
                    <span className="text-white/40 ml-1 text-xs">(optional)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="128000"
                    value={config.maxTokens || ''}
                    onChange={(e) => setConfig((prev: AIModelConfig) => ({ 
                      ...prev, 
                      maxTokens: e.target.value ? parseInt(e.target.value, 10) : undefined 
                    }))}
                    placeholder="e.g., 4096"
                    className="w-full bg-[#09090B] border border-[rgba(255,255,255,0.2)] rounded-md px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-[rgba(255,255,255,0.4)]"
                  />
                  <p className="text-xs text-white/40 mt-1">
                    Maximum number of tokens to generate. Leave empty for model default.
                  </p>
                </div>

                {/* Max Steps */}
                <div>
                  <label className="text-xs text-white/60 mb-2 block">
                    Max Steps: <span className="text-white/80">{config.maxSteps ?? 10}</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="25"
                    step="1"
                    value={config.maxSteps ?? 10}
                    onChange={(e) => setConfig((prev: AIModelConfig) => ({ ...prev, maxSteps: parseInt(e.target.value, 10) }))}
                    className="w-full"
                  />
                  <p className="text-xs text-white/40 mt-1">
                    Maximum number of reasoning steps for tool use. Default is 10.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Status */}
          <div className="flex items-center gap-2 pt-2 border-t border-[rgba(255,255,255,0.1)]">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConfigured ? "bg-green-500" : 
              isValidating ? "bg-yellow-500 animate-pulse" :
              hasApiKey && validationError ? "bg-red-500" : "bg-gray-500"
            )} />
            <span className="text-xs text-white/60">
              {isConfigured ? `Ready with ${config.model}` : 
               isValidating ? "Validating..." :
               validationError ? "API key invalid" :
               hasApiKey ? "Checking models..." : "API key required"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
} 