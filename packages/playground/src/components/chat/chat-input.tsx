import React, { useState, useRef, useEffect } from "react";
import { cn } from "../../lib/exports/utils";
import { Send, Brain, ChevronDown } from "lucide-react";
import { getCurrentModelConfig, loadAIModelConfig, saveAIModelConfig, getModels, type AIModel } from "../../lib/exports/storage";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  selectedModel?: {
    id: string;
    name: string;
    provider: string;
  };
  onModelChange?: (model: { id: string; name: string; provider: string }) => void;
  availableModels?: Array<{ id: string; name: string; provider: string }>;
  className?: string;
  error?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  selectedModel,
  onModelChange,
  availableModels = [],
  className,
  error
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [providerModels, setProviderModels] = useState<AIModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [defaultModel, setDefaultModel] = useState<{ id: string; name: string; provider: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load default model from local storage
  useEffect(() => {
    const loadDefaultModel = () => {
      const config = loadAIModelConfig();
      if (config && config.model) {
        const modelFromStorage = {
          id: config.model,
          name: config.model,
          provider: config.provider
        };
        setDefaultModel(modelFromStorage);
        
        // If no selected model is provided, use the default from storage
        if (!selectedModel && onModelChange) {
          onModelChange(modelFromStorage);
        }
      }
    };

    loadDefaultModel();
  }, [selectedModel, onModelChange]);

  useEffect(() => {
    const fetchProviderModels = async () => {
      const currentConfig = getCurrentModelConfig();
      if (!currentConfig) {
        setProviderModels([]);
        return;
      }

      // Only Workers AI can work without API key, all others require API keys
      const providersWithoutApiKey = ['workers-ai'];
      if (!providersWithoutApiKey.includes(currentConfig.provider) && !currentConfig.apiKey) {
        setProviderModels([]);
        return;
      }

      setLoadingModels(true);
      try {
        const models = await getModels(currentConfig.provider, currentConfig.apiKey || 'no-key');
        setProviderModels(models);
      } catch (error) {
        console.error('Error fetching provider models:', error);
        setProviderModels([]);
      } finally {
        setLoadingModels(false);
      }
    };

    fetchProviderModels();
  }, []); // TODO: This should re-run when provider/config changes
  
  // Re-fetch models when the saved configuration changes
  useEffect(() => {
    const fetchProviderModels = async () => {
      const currentConfig = getCurrentModelConfig();
      if (!currentConfig) {
        setProviderModels([]);
        return;
      }

      // Only Workers AI can work without API key, all others require API keys
      const providersWithoutApiKey = ['workers-ai'];
      if (!providersWithoutApiKey.includes(currentConfig.provider) && !currentConfig.apiKey) {
        setProviderModels([]);
        return;
      }

      setLoadingModels(true);
      try {
        const models = await getModels(currentConfig.provider, currentConfig.apiKey || 'no-key');
        setProviderModels(models);
      } catch (error) {
        console.error('Error fetching provider models after config change:', error);
        setProviderModels([]);
      } finally {
        setLoadingModels(false);
      }
    };

    // Listen for storage changes (when Model Selection saves config)
    const handleStorageChange = () => {
      fetchProviderModels();
    };
    
    // Listen for custom config update events (from Settings Modal)
    const handleConfigUpdate = () => {
      fetchProviderModels();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('ai-config-updated', handleConfigUpdate);
    fetchProviderModels(); // Initial fetch
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('ai-config-updated', handleConfigUpdate);
    };
  }, []); // Run once but listen for storage changes

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showModelDropdown && !(event.target as Element).closest('.model-dropdown')) {
        setShowModelDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModelDropdown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Convert availableModels to AIModel format and prioritize providerModels (from API)
  const availableAsAIModels: AIModel[] = availableModels.map(model => ({
    id: model.id,
    name: model.name,
    provider: model.provider as 'openai' | 'anthropic'
  }));
  
  const modelsToShow = providerModels.length > 0 ? providerModels : availableAsAIModels;
  // Use selectedModel first, then defaultModel, then fallback
  const displayModel = selectedModel || defaultModel || { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", provider: "anthropic" };

  return (
    <div className={cn("figma-chat-input-container figma-override", className)}>
      {error && (
        <div className="figma-error-status">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6.5" stroke="#FD5353" strokeWidth="1.2"/>
            <path d="M7 3.5V7.5" stroke="#FD5353" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M7 10H7.01" stroke="#FD5353" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          
          <span className="flex-1 opacity-80 font-normal">
            An error occurred
          </span>
        </div>
      )}

      <div className="figma-comment-box">
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={disabled}
            className="figma-message-input"
            rows={1}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="relative model-dropdown">
            <button
              type="button"
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="figma-model-selector-gradient"
              disabled={disabled}
            >
              <Brain size={14} color="#7E98FF" strokeWidth={1.2} />

              <span className="figma-model-selector-text">
                {displayModel?.name || "Claude - 4 - Opus"}
              </span>

              <ChevronDown size={14} color="rgba(255, 255, 255, 0.6)" strokeWidth={1.33} />
            </button>

            {showModelDropdown && modelsToShow.length > 0 && (
              <div 
                className="figma-dropdown-menu absolute bottom-full left-0 mb-2 min-w-[400px] max-w-[500px] z-[99999]"
                style={{
                  background: '#222531',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}
              >
                {loadingModels ? (
                  <div className="p-3 text-sm text-white/60" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Loading models...
                  </div>
                ) : (
                  <>
                    <div className="figma-dropdown-header">
                      <span className="figma-dropdown-header-text">
                        Select Model
                      </span>
                    </div>
                    
                    <div className="figma-dropdown-content">
                      {modelsToShow.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => {
                            const newSelectedModel = { 
                              id: model.id, 
                              name: model.name, 
                              provider: getCurrentModelConfig()?.provider || 'anthropic' 
                            };
                            
                            // Save to localStorage for persistence
                            const currentConfig = getCurrentModelConfig();
                            if (currentConfig) {
                              saveAIModelConfig({
                                ...currentConfig,
                                model: model.id
                              });
                            }
                            
                            // Update local state
                            setDefaultModel(newSelectedModel);
                            onModelChange?.(newSelectedModel);
                            setShowModelDropdown(false);
                          }}
                          className="figma-dropdown-item w-full px-4 py-3 text-left text-sm text-white/80 hover:bg-white/10 transition-colors whitespace-nowrap overflow-hidden text-ellipsis"
                          title={model.name} // Show full name on hover
                        >
                          {model.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            onClick={handleSubmit}
            disabled={disabled || !message.trim()}
            className="figma-send-button"
          >
            <Send size={16} color="#FFFFFF" strokeWidth={1.2} />
          </button>
        </div>
      </div>
    </div>
  );
} 