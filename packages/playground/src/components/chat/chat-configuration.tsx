"use client";

import React, { useState, useEffect } from "react";
import { cn } from "../../lib/exports/utils";
import { loadAIModelConfig, saveAIModelConfig, AIModelConfig, getModels, type AIModel } from "../../lib/exports/storage";
import Image from "next/image";
import { MessageSquare, Settings2 } from "lucide-react";

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
            <Image 
              src="/images/badge_light_bg.png" 
              alt="Playground Chat"
              width={32}
              height={32}
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

      {/* Main Content - Adjusted for top center positioning */}
      <div className="flex-1 flex flex-col justify-between px-6 py-8">
        {/* Form Section - Positioned at top center */}
        <div className="flex flex-col justify-center items-center">
          <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
            {/* Select LLM - First field */}
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <label className="text-white text-sm font-medium">Select LLM</label>
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

            {/* Select Version - Second field */}
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <label className="text-white text-sm font-medium">Select Version</label>
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

            {/* API Key - Third field */}
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
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 16V12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 8H12.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>{error}</span>
                  </div>
                )}
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
        </div>

        {/* Fixed Bottom Section - Matching Figma design */}
        <div className="border border-[rgba(255,255,255,0.2)] rounded-lg relative">
          {/* Content container */}
          <div className="flex flex-col items-center justify-center gap-2 py-4 px-5">
            {/* Lock icon with gradient colors */}
            <div className="w-6 h-6 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#7849EF]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18 10V6C18 4.89543 17.1046 4 16 4H8C6.89543 4 6 4.89543 6 6V10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 14H14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            {/* Text */}
            <span className="text-white text-base font-medium text-center">
              Set up your API Keys to access chat
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 