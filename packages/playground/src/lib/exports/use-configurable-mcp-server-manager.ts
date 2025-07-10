"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePlaygroundConfig } from './playground-provider';

export interface McpServer {
  uniqueName: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  status?: 'running' | 'stopped' | 'error';
}

// Request message types (what we send) - Server API format
export interface AddServerRequest {
  verb: 'add';
  data: {
    'unique-name': string;
    command: string;
    args: string[];
    env: Record<string, string>;
  };
}

export interface DeleteServerRequest {
  verb: 'delete';
  data: {
    'unique-name': string;
  };
}

export interface ListServersRequest {
  verb: 'list';
}

// Response message types (what we receive) - Server API format
export interface AddServerResponse {
  verb: 'add';
  success: boolean;
  error?: string;
  message?: string;
  data?: {
    id: number;
    name: string;
    command: string;
    args: string[];
    env: string[];
    installedAt: string;
  };
  capabilities?: {
    tools: Array<{name: string, description: string}>;
    resources: Array<{name: string, description: string, uri: string}>;
    prompts: Array<{name: string, description: string}>;
  };
  totalCapabilities?: number;
  timestamp: string;
}

export interface DeleteServerResponse {
  verb: 'delete';
  success: boolean;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface ListServersResponse {
  verb: 'list';
  success: boolean;
  error?: string;
  data?: Array<{
    id: number;
    name: string;
    command: string;
    args: string[];
    env: string[];
    installedAt: string;
  }>;
  count?: number;
  timestamp: string;
}

export interface StatusResponse {
  verb: 'status';
  success: boolean;
  connected: boolean;
  message?: string;
  timestamp: string;
}

export interface ErrorMessage {
  success: false;
  error: string;
  details?: unknown;
  timestamp: string;
}

// Union type for all possible incoming messages
export type McpServerMessage = 
  | AddServerResponse
  | DeleteServerResponse
  | ListServersResponse
  | StatusResponse
  | ErrorMessage;

// Union type for all possible outgoing messages
export type McpServerRequest = 
  | AddServerRequest
  | DeleteServerRequest
  | ListServersRequest;

interface McpServerManagerState {
  servers: McpServer[];
  connected: boolean;
  loading: boolean;
  error: string | null;
  loadingServers: Set<string>; // Track which servers are currently being added/deleted
}

interface McpServerManagerActions {
  addServer: (server: Omit<McpServer, 'status'>) => Promise<boolean>;
  deleteServer: (uniqueName: string) => Promise<boolean>;
  refreshServers: () => Promise<void>;
  connect: () => void;
  disconnect: () => void;
  isServerLoading: (uniqueName: string) => boolean;
}

export type UseMcpServerManagerReturn = McpServerManagerState & McpServerManagerActions;

export function useConfigurableMcpServerManager(): UseMcpServerManagerReturn {
  const config = usePlaygroundConfig();
  const [state, setState] = useState<McpServerManagerState>({
    servers: [],
    connected: false,
    loading: false,
    error: null,
    loadingServers: new Set<string>(),
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  const updateState = useCallback((updates: Partial<McpServerManagerState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Send a message over WebSocket
  const sendMessage = useCallback((message: McpServerRequest) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.error('Cannot send message: WebSocket not connected');
    }
  }, []);

  // Helper methods to send specific message types
  const sendListServersRequest = useCallback(() => {
    const message: ListServersRequest = {
      verb: 'list'
    };
    sendMessage(message);
  }, [sendMessage]);

  const sendAddServerRequest = useCallback((server: Omit<McpServer, 'status'>) => {
    const message: AddServerRequest = {
      verb: 'add',
      data: {
        'unique-name': server.uniqueName,
        command: server.command,
        args: server.args,
        env: server.env
      }
    };
    sendMessage(message);
  }, [sendMessage]);

  const sendDeleteServerRequest = useCallback((uniqueName: string) => {
    const message: DeleteServerRequest = {
      verb: 'delete',
      data: {
        'unique-name': uniqueName
      }
    };
    sendMessage(message);
  }, [sendMessage]);

  // Handle WebSocket messages for real-time updates
  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const message: McpServerMessage = JSON.parse(event.data);

      // Handle error messages first
      if (!message.success && 'error' in message && message.error) {
        updateState({
          loading: false,
          error: message.error
        });
        return;
      }

      // Handle verb-based responses
      if ('verb' in message) {
        switch (message.verb) {
          case 'status':
            updateState({
              connected: message.connected,
              error: message.connected ? null : (message.message || 'Not connected')
            });
            break;

          case 'list':
            updateState({ loading: false });
            if (message.success && message.data) {
              // Convert server response format to our format
              const servers: McpServer[] = message.data.map(serverData => ({
                uniqueName: serverData.name,
                command: serverData.command,
                args: serverData.args,
                env: serverData.env.reduce((acc, key) => {
                  acc[key] = '***'; // Server only returns env keys, not values for security
                  return acc;
                }, {} as Record<string, string>),
                status: 'running' as const
              }));
              
              updateState({
                servers,
                error: null,
                connected: true
              });
            } else {
              updateState({
                error: ('error' in message ? message.error : undefined) || 'Failed to list servers'
              });
            }
            break;

          case 'add':
            setState(prevState => {
              const serverName = message.data?.name;
              const newLoadingServers = new Set(prevState.loadingServers);
              if (serverName) {
                newLoadingServers.delete(serverName);
              }
              return {
                ...prevState,
                loading: false,
                loadingServers: newLoadingServers,
                error: message.success 
                  ? null 
                  : (('error' in message ? message.error : undefined) || 'Failed to add server')
              };
            });
            if (message.success) {
              // Don't manually request list - proxy will auto-send updated list
            }
            break;

          case 'delete':
            // For delete, we need to track which server was being deleted
            // Since the message doesn't include the server name, we'll clear all loading servers
            setState(prevState => ({
              ...prevState,
              loading: false,
              loadingServers: new Set<string>(), // Clear all loading states on delete response
              error: message.success 
                ? null 
                : (('error' in message ? message.error : undefined) || 'Failed to delete server')
            }));
            if (message.success) {
              // Don't manually request list - proxy will auto-send updated list
            }
            break;
        }
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }, [updateState]);

  // Connect to WebSocket for real-time updates
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    updateState({ loading: true, error: null });

    try {
      // Create WebSocket connection using the configured URL
      const ws = new WebSocket(config.mcpProxyWsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        updateState({ 
          loading: false, 
          error: null
        });
        reconnectAttempts.current = 0;
        
        // Proxy will automatically send status and list - no manual requests needed
      };

      ws.onmessage = handleWebSocketMessage;

      ws.onclose = () => {
        updateState({ 
          connected: false,
          loading: false,
          error: 'Connection lost'
        });

        // Attempt to reconnect
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          updateState({ error: 'Failed to reconnect after multiple attempts' });
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateState({ 
          loading: false,
          error: 'WebSocket connection error'
        });
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      updateState({ 
        loading: false,
        error: 'Failed to connect'
      });
    }
  }, [handleWebSocketMessage, updateState, config.mcpProxyWsUrl]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    updateState({ 
      connected: false,
      loading: false 
    });
  }, [updateState]);

  // WebSocket-based server management
  const addServer = useCallback(async (server: Omit<McpServer, 'status'>): Promise<boolean> => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      updateState({ error: 'WebSocket not connected' });
      return false;
    }

    try {
      // Add server to loading set
      setState(prevState => ({
        ...prevState,
        loading: true,
        error: null,
        loadingServers: new Set([...prevState.loadingServers, server.uniqueName])
      }));
      
      sendAddServerRequest(server);
      // Response will be handled by handleWebSocketMessage
      return true; // Assume success for now, actual result will come via WebSocket
    } catch (error) {
      // Remove from loading set on error
      setState(prevState => {
        const newLoadingServers = new Set(prevState.loadingServers);
        newLoadingServers.delete(server.uniqueName);
        return {
          ...prevState,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to add server',
          loadingServers: newLoadingServers
        };
      });
      return false;
    }
  }, [sendAddServerRequest]);

  const deleteServer = useCallback(async (uniqueName: string): Promise<boolean> => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      updateState({ error: 'WebSocket not connected' });
      return false;
    }

    try {
      // Add server to loading set
      setState(prevState => ({
        ...prevState,
        loading: true,
        error: null,
        loadingServers: new Set([...prevState.loadingServers, uniqueName])
      }));
      
      sendDeleteServerRequest(uniqueName);
      // Response will be handled by handleWebSocketMessage
      return true; // Assume success for now, actual result will come via WebSocket
    } catch (error) {
      // Remove from loading set on error
      setState(prevState => {
        const newLoadingServers = new Set(prevState.loadingServers);
        newLoadingServers.delete(uniqueName);
        return {
          ...prevState,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to delete server',
          loadingServers: newLoadingServers
        };
      });
      return false;
    }
  }, [sendDeleteServerRequest, updateState]);

  const refreshServers = useCallback(async (): Promise<void> => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      updateState({ error: 'WebSocket not connected' });
      return;
    }

    try {
      updateState({ loading: true, error: null });
      sendListServersRequest();
      // Response will be handled by handleWebSocketMessage
    } catch (error) {
      updateState({ 
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh servers'
      });
    }
  }, [sendListServersRequest, updateState]);

  // Check if a specific server is loading
  const isServerLoading = useCallback((uniqueName: string): boolean => {
    return state.loadingServers.has(uniqueName);
  }, [state.loadingServers, updateState]);

  // Auto-connect on mount and cleanup on unmount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    ...state,
    addServer,
    deleteServer,
    refreshServers,
    connect,
    disconnect,
    isServerLoading,
  };
} 