"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ChatContainer } from "../../components/chat";
import { MCPServerDirectory } from "../../components/mcp-server-directory";
import { ModelSelector } from "../../components/model-selector";
import { MCPServer } from "../../types/mcp-server";
import { getCurrentModelConfig, AIModelConfig } from "../../lib/storage";
import { usePlaygroundConfig } from './playground-provider';

// Extended interface for model config with validation status (matching ModelSelector)
interface AIModelConfigWithValidation extends AIModelConfig {
  isValid?: boolean;
  validationError?: string | null;
}

export interface PlaygroundProps {
  className?: string;
  style?: React.CSSProperties;
  layout?: 'horizontal' | 'vertical';
  showModelSelector?: boolean;
  showMCPDirectory?: boolean;
  showChat?: boolean;
}

export function Playground({
  className,
  style,
  layout = 'horizontal',
  showModelSelector = true,
  showMCPDirectory = true,
  showChat = true,
}: PlaygroundProps) {
  const config = usePlaygroundConfig();
  const [enabledServerCount, setEnabledServerCount] = useState<number>(0);
  const [modelConfig, setModelConfig] = useState<AIModelConfig | null>(null);

  // Load initial model config with fallback to config
  useEffect(() => {
    const currentConfig = getCurrentModelConfig();
    setModelConfig(currentConfig || config.defaultModelConfig || null);
  }, [config.defaultModelConfig]);

  // Listen for localStorage changes to keep model config in sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && (
        e.key.startsWith('ai_model_config_') || 
        e.key === 'current_ai_provider'
      )) {
        setModelConfig(getCurrentModelConfig());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleServerToggle = (server: MCPServer, enabled: boolean) => {
    // Server state is now managed in MCPServerDirectory component
    console.log(`Server ${server.name} ${enabled ? 'enabled' : 'disabled'}`);
  };

  const handleServerCountChange = (count: number) => {
    setEnabledServerCount(count);
  };

  const handleModelChange = useCallback((config: AIModelConfigWithValidation | null) => {
    console.log('Model config updated:', config);
    
    // Store the config without validation properties for regular use
    const baseConfig: AIModelConfig | null = config ? {
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      maxSteps: config.maxSteps,
      systemPrompt: config.systemPrompt
    } : null;
    
    setModelConfig(baseConfig);
    
    // You can use config.isValid and config.validationError here for UI feedback
    if (config && !config.isValid && config.validationError) {
      console.warn('Model config validation failed:', config.validationError);
    }
  }, []);

  // Determine chat title based on selected server
  const chatTitle = enabledServerCount > 0
    ? `Chat with ${enabledServerCount} MCP Server${enabledServerCount > 1 ? 's' : ''}`
    : "Playground Chat";

  const containerClasses = `flex overflow-hidden ${
    layout === 'horizontal' ? 'h-screen' : 'flex-col min-h-screen'
  }`;

  const baseStyle = {
    background: config.theme === 'dark' ? "#09090B" : "#FFFFFF",
    ...style,
  };

  if (layout === 'vertical') {
    return (
      <main className={`${containerClasses} ${className || ''}`} style={baseStyle}>
        {/* Top Section - MCP Server Directory */}
        {showMCPDirectory && (
          <div className="border-b border-[rgba(255,255,255,0.1)] flex-shrink-0">
            <MCPServerDirectory
              onServerToggle={handleServerToggle}
              onServerCountChange={handleServerCountChange}
            />
          </div>
        )}

        {/* Bottom Section - Chat + Model Selector */}
        <div className="flex flex-1 min-h-0">
          {/* Chat Interface */}
          {showChat && (
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-4xl h-full">
                  <ChatContainer 
                    title={chatTitle}
                    showHeader={true}
                    className="h-full"
                    enabledMCPServerCount={enabledServerCount}
                    onModelConfigChange={handleModelChange}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Model Selector */}
          {showModelSelector && (
            <div className="border-l border-[rgba(255,255,255,0.1)] p-4 flex-shrink-0">
              <ModelSelector 
                onModelChange={handleModelChange}
                className="sticky top-4"
              />
            </div>
          )}
        </div>
      </main>
    );
  }

  // Horizontal layout (default)
  return (
    <main className={`${containerClasses} ${className || ''}`} style={baseStyle}>
      {/* Left Half - MCP Server Directory */}
      {showMCPDirectory && (
        <div className="w-1/2 border-r border-[rgba(255,255,255,0.1)] flex-shrink-0">
          <MCPServerDirectory
            onServerToggle={handleServerToggle}
            onServerCountChange={handleServerCountChange}
          />
        </div>
      )}

      {/* Right Half - Chat + Model Selector */}
      <div className={`${showMCPDirectory ? 'w-1/2' : 'w-full'} flex flex-col min-w-0`}>
        <div className="flex flex-1 min-h-0">
          {/* Chat Interface */}
          {showChat && (
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-4xl h-full">
                  <ChatContainer 
                    title={chatTitle}
                    showHeader={true}
                    className="h-full"
                    enabledMCPServerCount={enabledServerCount}
                    onModelConfigChange={handleModelChange}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Model Selector */}
          {showModelSelector && (
            <div className="border-l border-[rgba(255,255,255,0.1)] p-4 flex-shrink-0">
              <ModelSelector 
                onModelChange={handleModelChange}
                className="sticky top-4"
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 