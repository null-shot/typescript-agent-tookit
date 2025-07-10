import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { loadAIModelConfig } from "@/lib/storage";
import { getModels, type AIModel } from "@/lib/model-service";
import { MessageSquare, Settings2 } from "lucide-react";

interface ModelResponse {
  data: Array<{
    id: string;
    name: string;
  }>;
}

interface ChatConfigurationProps {
  onContinue: (config: {
    provider: string;
    version: string;
    apiKey: string;
  }) => void;
  className?: string;
}

export function ChatConfiguration({ onContinue, className }: ChatConfigurationProps) {
  const [selectedProvider, setSelectedProvider] = useState("OpenAI");
  const [selectedVersion, setSelectedVersion] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Load existing configuration on mount
  React.useEffect(() => {
    const existingConfig = loadAIModelConfig();
    if (existingConfig) {
      // Pre-fill form with existing configuration
      setSelectedProvider(existingConfig.provider === 'openai' ? 'OpenAI' : 'Anthropic');
      setApiKey(existingConfig.apiKey);
      setSelectedVersion(existingConfig.model);
    }
  }, []);

  // Fetch models when provider and API key change
  const fetchModels = async (provider: string, key: string) => {
    if (!provider || !key.trim()) {
      setAvailableModels([]);
      return;
    }

    setLoadingModels(true);
    setError(null);

    try {
      const models = await getModels(provider.toLowerCase() as 'openai' | 'anthropic', key);
      setAvailableModels(models);
      
      // Reset selected version when models change
      setSelectedVersion("");
    } catch (error) {
      console.error('Error fetching models:', error);
      setError('Failed to fetch models. Please check your API key.');
      setAvailableModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  // Fetch models when provider or API key changes
  React.useEffect(() => {
    if (apiKey.trim() && selectedProvider) {
      const timeoutId = setTimeout(() => {
        fetchModels(selectedProvider, apiKey);
      }, 500); // Debounce API calls
      
      return () => clearTimeout(timeoutId);
    } else {
      setAvailableModels([]);
      setSelectedVersion("");
    }
  }, [selectedProvider, apiKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      setError("Failed to fetch, Enter Valid API Key");
      return;
    }
    
    if (!selectedVersion.trim()) {
      setError("Please select a model version");
      return;
    }
    
    setError(null);
    onContinue({
      provider: selectedProvider,
      version: selectedVersion,
      apiKey: apiKey.trim()
    });
  };

  return (
    <div className={cn("flex flex-col h-full w-full relative", className)}>
      {/* Header */}
      <div className="flex justify-between items-center gap-6 border-b border-[rgba(255,255,255,0.12)] p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
            <img 
              src="/images/badge_light_bg.png" 
              alt="Playground Chat"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-white font-bold text-base">Playground Chat</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 cursor-pointer">
            <MessageSquare 
              size={24} 
              stroke="white" 
              strokeWidth={1.2}
            />
          </div>
          <div className="w-6 h-6 cursor-pointer">
            <Settings2 
              size={24} 
              stroke="white" 
              strokeWidth={1.2}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center items-center px-6">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
          {/* AI Model Provider */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <label className="text-white text-sm font-medium">AI Model Provider</label>
              <span className="text-[#FD5353]">*</span>
            </div>
            <div className="relative">
              <select 
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#323546] border-0 rounded-lg text-white text-sm appearance-none pr-8"
              >
                <option value="OpenAI">OpenAI</option>
                <option value="Anthropic">Anthropic</option>
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4" viewBox="0 0 8 4" fill="none">
                  <path d="M4 6L0 2L8 2L4 6Z" fill="white"/>
                </svg>
              </div>
            </div>
          </div>

          {/* API Key - moved before Model Version */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <label className="text-white text-sm font-medium">API Key</label>
              <span className="text-[#FD5353]">*</span>
            </div>
            <div className="space-y-1.5">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter API Key"
                className="w-full px-3 py-2.5 bg-[#323546] border-0 rounded-lg text-white placeholder:text-[rgba(255,255,255,0.4)] text-sm"
              />
              {error && (
                <div className="flex items-center gap-1 text-[#FD5353] text-xs">
                  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5.5" stroke="#FD5353"/>
                    <path d="M6 3V7" stroke="#FD5353" strokeLinecap="round"/>
                    <path d="M6 9H6.01" stroke="#FD5353" strokeLinecap="round"/>
                  </svg>
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* Model Version - now after API Key */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <label className="text-white text-sm font-medium">Model Version</label>
              <span className="text-[#FD5353]">*</span>
            </div>
            <div className="relative">
              <select 
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#323546] border-0 rounded-lg text-white text-sm appearance-none pr-8"
                disabled={loadingModels || availableModels.length === 0}
              >
                <option value="">
                  {loadingModels 
                    ? "Loading models..." 
                    : availableModels.length === 0 
                      ? "Enter API key to load models" 
                      : "Select a model"
                  }
                </option>
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4" viewBox="0 0 8 4" fill="none">
                  <path d="M4 6L0 2L8 2L4 6Z" fill="white"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <button
            type="submit"
            className="w-full py-2 px-4 bg-gradient-to-r from-[#7849EF] to-[#326CD8] text-white text-base font-bold rounded-xl hover:opacity-90 transition-opacity"
          >
            Continue
          </button>
        </form>

        {/* Disabled Chat Input - Fixed at bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
          <div className="bg-gradient-to-br from-white to-black border border-[rgba(255,255,255,0.2)] rounded-lg p-3 relative">
            <div className="absolute inset-0 bg-[#14161D] rounded-lg flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-5 h-5 bg-white rounded flex items-center justify-center">
                  <svg className="w-3.5 h-4.5" viewBox="0 0 14.48 18.75" fill="none">
                    <path 
                      d="M0 0H14.48V18.75H0V0Z" 
                      fill="url(#gradient2)"
                    />
                    <defs>
                      <linearGradient id="gradient2" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="#1751FF" />
                        <stop offset="100%" stopColor="#17A0FF" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <span className="text-white text-xs font-medium opacity-80 text-center">
                  Set up your API Keys to access chat
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center opacity-0">
              <span className="text-[rgba(255,255,255,0.4)] text-sm">Comment as Crypto User</span>
              <button 
                disabled
                className="p-2 border border-[rgba(255,255,255,0.2)] rounded-lg opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.2">
                  <path d="M22 2L11 13"/>
                  <path d="M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 