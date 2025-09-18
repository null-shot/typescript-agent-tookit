"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ChatContainer } from "../../components/chat";
import { MCPServerDirectory } from "../../components/mcp-server-directory";
import { DockerInstallModal } from "../../components/docker-install-modal";
import { PlaygroundHeader } from "../../components/playground-header";
import { MCPServer } from "../../types/mcp-server";
import { LocalToolboxStatus } from "../../components/ui/local-toolbox-status";
import { useMcpServerManager } from "../../hooks/use-mcp-server-manager";

interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'workers-ai' | 'deepseek' | 'gemini' | 'grok';
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  maxSteps?: number;
  systemPrompt?: string;
}

export interface PlaygroundExactProps {
  className?: string;
  style?: React.CSSProperties;
  showInstallModal?: boolean;
  userAvatar?: string;
}

// Exact replica of the original playground page
export function PlaygroundExact({
  className = "",
  style,
  showInstallModal = true,
  userAvatar = "/images/default-avatar.png",
}: PlaygroundExactProps) {
  const [isToolboxInstalled, setIsToolboxInstalled] = useState(false);
  const [toolboxStatus, setToolboxStatus] = useState<LocalToolboxStatus>('disconnected');
  const [enabledServerCount, setEnabledServerCount] = useState(0);
  const [isDockerModalOpen, setIsDockerModalOpen] = useState(false);
  const [dockerToolboxOnline, setDockerToolboxOnline] = useState(false);

  // Use the existing WebSocket connection for MCP Proxy status
  const { connected: mcpProxyConnected, connect: connectMcp } = useMcpServerManager();

  // Load installation state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const installed = localStorage.getItem('local_toolbox_installed') === 'true';
      setIsToolboxInstalled(installed);
    }
  }, []);

  // Persist installation state to localStorage
  const setToolboxInstalled = useCallback((installed: boolean) => {
    setIsToolboxInstalled(installed);
    if (typeof window !== 'undefined') {
      localStorage.setItem('local_toolbox_installed', installed.toString());
    }
  }, []);

  // Check Docker Toolbox health (separate from MCP Proxy)
  const checkDockerToolboxHealth = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:11990/health', {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      
      if (response.ok) {
        setDockerToolboxOnline(true);
        // If Docker is running and we didn't know it was installed, mark it as installed
        if (!isToolboxInstalled) {
          setToolboxInstalled(true);
        }
        return true;
      } else {
        setDockerToolboxOnline(false);
        return false;
      }
    } catch {
      setDockerToolboxOnline(false);
      return false;
    }
  }, [isToolboxInstalled, setToolboxInstalled]);

  // Determine status based on both Docker Toolbox and MCP Proxy status
  const determineToolboxStatus = useCallback((
    isInstalled: boolean, 
    dockerOnline: boolean, 
    mcpConnected: boolean
  ): LocalToolboxStatus => {
    if (!isInstalled) {
      return 'disconnected';
    }
    
    if (!dockerOnline) {
      return 'offline'; // Docker container not running
    }
    
    if (!mcpConnected) {
      // Docker is running but MCP Proxy connection failed
      return 'cannot_connect';
    }
    
    return 'online'; // Both Docker and MCP Proxy are working
  }, []);

  // Update status based on both services
  useEffect(() => {
    const newStatus = determineToolboxStatus(
      isToolboxInstalled, 
      dockerToolboxOnline, 
      mcpProxyConnected
    );
    setToolboxStatus(newStatus);
    
    console.log('Status update:', {
      isInstalled: isToolboxInstalled,
      dockerOnline: dockerToolboxOnline,
      mcpConnected: mcpProxyConnected,
      finalStatus: newStatus
    });
  }, [isToolboxInstalled, dockerToolboxOnline, mcpProxyConnected, determineToolboxStatus]);

  // Auto-connect to MCP Proxy WebSocket when component mounts
  useEffect(() => {
    connectMcp();
  }, [connectMcp]);

  // Periodic Docker Toolbox health check
  useEffect(() => {
    // Initial check
    checkDockerToolboxHealth();
    
    // Check every 10 seconds
    const interval = setInterval(checkDockerToolboxHealth, 10000);
    return () => clearInterval(interval);
  }, [checkDockerToolboxHealth]);

  // Also check when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkDockerToolboxHealth();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkDockerToolboxHealth]);

  const handleServerToggle = useCallback((server: MCPServer, enabled: boolean) => {
    console.log(`Server ${server.id} ${enabled ? 'enabled' : 'disabled'}`);
  }, []);

  const handleServerCountChange = useCallback((count: number) => {
    setEnabledServerCount(count);
  }, []);

  const handleInstallClick = useCallback(() => {
    if (showInstallModal) {
      setIsDockerModalOpen(true);
    }
  }, [showInstallModal]);

  const handleDockerInstallComplete = useCallback(() => {
    setToolboxInstalled(true);
    setToolboxStatus('online');
    setIsDockerModalOpen(false);
    // Immediately check both services after installation
    setTimeout(() => {
      checkDockerToolboxHealth();
      connectMcp();
    }, 1000);
  }, [connectMcp, setToolboxInstalled, checkDockerToolboxHealth]);

  const handleModelChange = useCallback((config: ModelConfig | null) => {
    console.log('Model config changed:', config);
  }, []);

  // Display title (server-safe)
  const chatTitle = typeof window !== 'undefined' && window.location.pathname.includes('/chat/') 
    ? `Chat Session` 
    : "Playground Chat";

  return (
    <>
      <main className={`mcp-playground-page flex h-screen overflow-hidden ${className}`} style={style}>
        {/* Left Side - MCP Server Directory (flex-1 to take most space) */}
        <div className="flex-1 flex flex-col" style={{ paddingLeft: '60px', paddingTop: '24px', paddingBottom: '24px' }}>
          {/* Playground Header */}
          <div className="pr-6 pb-5 max-w-7xl mx-auto w-full">
            <PlaygroundHeader 
              isToolboxInstalled={isToolboxInstalled}
              toolboxStatus={toolboxStatus}
              onInstallClick={handleInstallClick}
            />
          </div>
          
          {/* MCP Server Directory */}
          <div className="flex-1 overflow-hidden pr-6">
            <MCPServerDirectory
              onServerToggle={handleServerToggle}
              onServerCountChange={handleServerCountChange}
            />
          </div>
        </div>

        {/* Right Side - Fixed Width Chat */}
        <div 
          className="flex-shrink-0 bg-[#14161D] border-l border-[rgba(255,255,255,0.12)] pb-6"
          style={{ width: '460px' }}
        >
          <ChatContainer 
            title={chatTitle}
            showHeader={true}
            className="h-full"
            userAvatar={userAvatar}
            onModelConfigChange={handleModelChange}
            enableSessionManagement={false} // Main page doesn't need session management
            enabledMCPServerCount={enabledServerCount} // Pass the count of enabled MCP servers
          />
        </div>
      </main>

      {/* Docker Install Modal */}
      {showInstallModal && (
        <DockerInstallModal
          isOpen={isDockerModalOpen}
          onClose={() => setIsDockerModalOpen(false)}
          onInstallationComplete={handleDockerInstallComplete}
        />
      )}
    </>
  );
} 