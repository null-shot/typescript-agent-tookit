"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { ImageProvider, ImageProviderProps, ImageAssets } from './image-provider';
import { RouterProvider, RouterContextValue } from './router-provider';

export interface PlaygroundConfig {
  mcpProxyUrl: string;
  mcpProxyWsUrl: string;
  apiBaseUrl?: string;
  defaultModelConfig?: {
    provider: 'openai' | 'anthropic';
    apiKey: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
    maxSteps?: number;
    systemPrompt?: string;
  };
  theme?: 'dark' | 'light';
  enabledFeatures?: {
    chat?: boolean;
    mcpServerDirectory?: boolean;
    modelSelector?: boolean;
  };
  enableLocalStorage?: boolean;
}

// Define a type for environment variables on window
interface WindowWithEnv extends Window {
  NEXT_PUBLIC_MCP_PROXY_URL?: string;
  NEXT_PUBLIC_MCP_PROXY_WS_URL?: string;
}

const DEFAULT_CONFIG: PlaygroundConfig = {
  mcpProxyUrl: typeof window !== 'undefined' 
    ? (window as WindowWithEnv).NEXT_PUBLIC_MCP_PROXY_URL || 'http://localhost:6050'
    : 'http://localhost:6050',
  mcpProxyWsUrl: typeof window !== 'undefined'
    ? (window as WindowWithEnv).NEXT_PUBLIC_MCP_PROXY_WS_URL || 'ws://localhost:6050/client/ws'
    : 'ws://localhost:6050/client/ws',
  apiBaseUrl: '/api',
  theme: 'dark',
  enabledFeatures: {
    chat: true,
    mcpServerDirectory: true,
    modelSelector: true,
  },
  enableLocalStorage: true,
};

const PlaygroundContext = createContext<PlaygroundConfig>(DEFAULT_CONFIG);

export interface PlaygroundProviderProps {
  children: ReactNode;
  config: Partial<PlaygroundConfig>;
  imageAssets: ImageAssets;
  imageComponent?: ImageProviderProps['ImageComponent'];
  router?: RouterContextValue;
}

export function PlaygroundProvider({ 
  children, 
  config,
  imageAssets,
  imageComponent,
  router
}: PlaygroundProviderProps) {
  const mergedConfig: PlaygroundConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    enabledFeatures: {
      ...DEFAULT_CONFIG.enabledFeatures,
      ...config.enabledFeatures,
    },
  };

  let content = (
    <PlaygroundContext.Provider value={mergedConfig}>
      <ImageProvider assets={imageAssets} ImageComponent={imageComponent}>
        {children}
      </ImageProvider>
    </PlaygroundContext.Provider>
  );

  // Wrap with router provider if router is provided
  if (router) {
    content = (
      <RouterProvider value={router}>
        {content}
      </RouterProvider>
    );
  }

  // Wrap everything in a scoped container with data-theme attribute
  return (
    <div 
      className="xava-playground-root" 
      data-theme={mergedConfig.theme || 'dark'}
      style={{
        // Ensure isolation from parent styles
        all: 'initial',
        display: 'block',
        minHeight: '100vh',
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      {content}
    </div>
  );
}

export function usePlaygroundConfig(): PlaygroundConfig {
  const context = useContext(PlaygroundContext);
  if (!context) {
    throw new Error('usePlaygroundConfig must be used within a PlaygroundProvider');
  }
  return context;
} 