import React, { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ChatConfiguration } from "./chat-configuration";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { DateDivider } from "./date-divider";
import { ChatSettingsModal } from "./chat-settings-modal";
import { NewChatConfirmationModal } from "./new-chat-confirmation-modal";
import { ProxyMismatchPopup } from "../ui/proxy-mismatch-popup";
import { useChat, type Message as UIMessage } from "@ai-sdk/react";
import { usePathname, useRouter } from "next/navigation";
import { 
  saveAIModelConfig, 
  loadAIModelConfig, 
  AIModelConfig,
  saveChat,
  loadChat,
  getOrCreateProxyId,
  validateProxyId,
  ProxyIdValidationResult
} from "@/lib/storage";
import { getAllAvailableModels, type AIModel } from "@/lib/model-service";
import { MessageSquare, Settings2 } from "lucide-react";
import { DockerInstallModal } from "@/components/docker-install-modal";

interface ModelConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  maxSteps?: number;
  systemPrompt?: string;
}

interface ModelOption {
  id: string;
  name: string;
  provider: string;
}

interface Message {
  id: string;
  content: string;
  timestamp: string | Date;
  sender: "user" | "agent" | "error";
  isThinking?: boolean;
  isStreaming?: boolean;
  showTaskList?: boolean;
  taskSteps?: Array<{
    id: string;
    title: string;
    status: "pending" | "in-progress" | "completed";
  }>;
  error?: {
    error: string;
    userMessage: string;
    errorType: string;
    details?: string;
    suggestions?: string[];
  };
}

interface DateDividerItem {
  id: string;
  type: 'date-divider';
  date: Date;
}

interface ChatContainerProps {
  className?: string;
  title?: string;
  showHeader?: boolean;
  userAvatar?: string;
  onModelConfigChange?: (config: ModelConfig | null) => void;
  enableSessionManagement?: boolean; // New prop to enable session features
  sessionId?: string; // For existing sessions
  enabledMCPServerCount?: number; // Number of enabled MCP servers
}

// Extract session ID from URL path
function getSessionIdFromPath(path: string): string | null {
  const match = path.match(/\/chat\/([^\/]+)/);
  return match ? match[1] : null;
}

// Check if this is a new chat
function isNewChat(sessionId: string | null): boolean {
  return sessionId === 'new';
}

// Helper function to check if two dates are on different days
function isDifferentDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() !== date2.getFullYear() ||
    date1.getMonth() !== date2.getMonth() ||
    date1.getDate() !== date2.getDate()
  );
}

export function ChatContainer({
  className,
  title = "Playground Chat",
  showHeader = true,
  userAvatar = "/images/default-avatar.png",
  onModelConfigChange,
  enableSessionManagement = false,
  sessionId: propSessionId,
  enabledMCPServerCount = 0
}: ChatContainerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null);
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<Message | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelOption>({
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic"
  });
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);

  // Session management (only if enabled)
  const urlSessionId = enableSessionManagement ? (propSessionId || getSessionIdFromPath(pathname || "")) : null;
  const [sessionId, setSessionId] = useState<string | null>(urlSessionId);
  const [displaySessionId, setDisplaySessionId] = useState<string | null>(
    enableSessionManagement && !isNewChat(sessionId) ? sessionId : null
  );

  // Get proxyId for MCP connection
  const [proxyId, setProxyId] = useState<string | null>(null);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ProxyIdValidationResult | null>(null);
  const [showDockerModal, setShowDockerModal] = useState(false);
  const [showProxyMismatchPopup, setShowProxyMismatchPopup] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  
  // Ref for auto-scrolling messages container
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom function
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  };
  
    useEffect(() => {
    // Get or create proxyId from localStorage
    const currentProxyId = getOrCreateProxyId();
    setProxyId(currentProxyId);
    
    // Generate a new session ID for this chat session
    const newChatSessionId = crypto.randomUUID();
    setChatSessionId(newChatSessionId);
    
    console.log('Using proxyId for MCP connection:', currentProxyId);
    console.log('Generated new chat session ID:', newChatSessionId);
  }, []);

  // Periodic health check and proxyId validation
  useEffect(() => {
    const performHealthCheck = async () => {
      try {
        const result = await validateProxyId();
        setValidationResult(result);
        
        if (!result.isValid) {
          console.warn('ProxyId validation failed:', result);
          if (result.serverProxyId && result.frontendProxyId !== result.serverProxyId) {
            console.error('ProxyId mismatch detected:', {
              frontend: result.frontendProxyId,
              server: result.serverProxyId
            });
            // Show dedicated proxy mismatch popup
            setShowProxyMismatchPopup(true);
          } else if (!result.serverConnected) {
            // Show Docker modal for initial setup when server is not connected
            setShowDockerModal(true);
          }
        } else {
          console.log('ProxyId validation successful');
        }
      } catch (error) {
        console.error('Health check failed:', error);
      }
    };

    // Perform initial check
    performHealthCheck();

    // Set up periodic checking every 5 seconds
    const healthCheckInterval = setInterval(performHealthCheck, 5000);

    return () => clearInterval(healthCheckInterval);
  }, []);

  const handleDockerModalClose = () => {
    setShowDockerModal(false);
  };

  const handleInstallationComplete = () => {
    setShowDockerModal(false);
    // Trigger immediate health check
    validateProxyId().then(setValidationResult);
  };

  const handleProxyMismatchPopupClose = () => {
    setShowProxyMismatchPopup(false);
  };

  const handleSettingsModalClose = () => {
    setShowSettingsModal(false);
  };

  const handleSettingsConfigUpdate = (config: AIModelConfig) => {
    // Update the model config when settings are changed
    const modelConfig: ModelConfig = {
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model,
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 2000,
      systemPrompt: config.systemPrompt
    };
    setModelConfig(modelConfig);
    onModelConfigChange?.(modelConfig);
  };

  const handleNewChatClick = () => {
    // Check if there are existing messages
    const hasMessages = aiMessages.length > 0;
    
    if (hasMessages) {
      // Show confirmation modal
      setShowNewChatModal(true);
    } else {
      // No messages, directly create new chat
      handleCreateNewChat();
    }
  };

  const handleCreateNewChat = () => {
    if (enableSessionManagement) {
      // Navigate to new chat page
      router.push('/chat/new');
    } else {
      // For non-session management, stop any ongoing request and clear the chat state
      stop(); // Cancel any ongoing streaming request
      setMessages([]);
      setCurrentError(null);
      setErrorMessage(null);
      
      // Generate a new chat session ID for MCP connections
      const newChatSessionId = crypto.randomUUID();
      setChatSessionId(newChatSessionId);
      
      console.log('Started new chat with session ID:', newChatSessionId);
    }
  };

  const handleNewChatModalClose = () => {
    setShowNewChatModal(false);
  };

  // Chat hook - only initialize if we have a valid model config
  const {
    messages: aiMessages,
    append,
    status,
    setMessages,
    stop,
  } = useChat({
    api: modelConfig ? '/api/chat' : undefined,
    id: enableSessionManagement ? 'session-chat' : 'chat-session',
    streamProtocol: 'data' as const,
    initialMessages: (enableSessionManagement && sessionId && !isNewChat(sessionId) ? loadChat(sessionId) : []) as UIMessage[],
    headers: modelConfig ? {
      'Authorization': `Bearer ${modelConfig.apiKey}`,
    } : {},
    body: modelConfig ? {
      provider: modelConfig.provider.toLowerCase(),
      model: selectedModel.id,
      temperature: modelConfig.temperature || 0.7,
      maxTokens: modelConfig.maxTokens || 2000,
      mcpProxyId: proxyId, // Pass proxyId to chat API for Durable Object routing
      mcpSessionId: chatSessionId, // Pass unique session ID for SSE transport
      enableMCPTools: enabledMCPServerCount > 0 && validationResult?.isValid && validationResult?.serverConnected, // Only enable tools if servers are active and connection is valid
    } : {} as Record<string, unknown>,
    onError: (error) => {
      console.error('Chat error:', error);
      setCurrentError(error.message);
      
      // Try to parse structured error response
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.userMessage && errorData.errorType) {
          const errorMessage: Message = {
            id: `error-${Date.now()}`,
            content: errorData.userMessage,
            timestamp: new Date(),
            sender: "error",
            error: errorData
          };
          setErrorMessage(errorMessage);
          return;
        }
      } catch {
        // Not a structured error, continue with generic handling
      }
      
      // Handle MCP-specific errors
      if (error.message.includes('MCP') || error.message.includes('400') || error.message.includes('Bad Request')) {
        const mcpErrorMessage: Message = {
          id: `mcp-error-${Date.now()}`,
          content: 'Unable to connect to tools. The message was processed but tools may not be available. Please try again.',
          timestamp: new Date(),
          sender: "error",
          error: {
            error: 'MCP Connection Error',
            userMessage: 'Unable to connect to tools. The message was processed but tools may not be available.',
            errorType: 'MCP_CONNECTION_ERROR',
            details: error.message,
            suggestions: [
              'Try sending your message again',
              'Check if the tools are running properly',
              'Contact support if the issue persists'
            ]
          }
        };
        setErrorMessage(mcpErrorMessage);
        return;
      }
      
      // Generic error handling
      const genericErrorMessage: Message = {
        id: `generic-error-${Date.now()}`,
        content: 'An error occurred while processing your message. Please try again.',
        timestamp: new Date(),
        sender: "error",
        error: {
          error: 'Chat Error',
          userMessage: 'An error occurred while processing your message.',
          errorType: 'CHAT_ERROR',
          details: error.message,
          suggestions: [
            'Try sending your message again',
            'Refresh the page if the issue persists'
          ]
        }
      };
      setErrorMessage(genericErrorMessage);
    },
  });

  // Handle configuration completion
  const handleConfigurationComplete = (config: { provider: string; version: string; apiKey: string }) => {
    const modelConfig: ModelConfig = {
      provider: config.provider.toLowerCase() as 'openai' | 'anthropic',
      apiKey: config.apiKey,
      model: config.version,
      temperature: 0.7,
      maxTokens: 2000,
    };
    
    // Save to localStorage for persistence
    const aiModelConfig: AIModelConfig = {
      provider: modelConfig.provider,
      apiKey: modelConfig.apiKey,
      model: modelConfig.model,
      temperature: modelConfig.temperature,
      maxTokens: modelConfig.maxTokens,
    };
    saveAIModelConfig(aiModelConfig);
    
    setModelConfig(modelConfig);
    setCurrentError(null);
    setErrorMessage(null);
    onModelConfigChange?.(modelConfig);
  };

  // Load existing configuration on mount
  useEffect(() => {
    const existingConfig = loadAIModelConfig();
    if (existingConfig && existingConfig.apiKey && existingConfig.model) {
      const modelConfig: ModelConfig = {
        provider: existingConfig.provider,
        apiKey: existingConfig.apiKey,
        model: existingConfig.model,
        temperature: existingConfig.temperature || 0.7,
        maxTokens: existingConfig.maxTokens || 2000,
      };
      setModelConfig(modelConfig);
      onModelConfigChange?.(modelConfig);
    }
  }, [onModelConfigChange]);

  // Load available models when app starts
  useEffect(() => {
    const loadAvailableModels = async () => {
      try {
        const models = await getAllAvailableModels();
        setAvailableModels(models);
        
        // If we have models and no selected model, pick the first one
        if (models.length > 0 && !selectedModel.id) {
          const firstModel = models[0];
          setSelectedModel({
            id: firstModel.id,
            name: firstModel.name,
            provider: firstModel.provider
          });
        }
      } catch (error) {
        console.error('Error loading available models:', error);
      }
    };

    loadAvailableModels();
  }, [selectedModel.id]);

  // Session management effects (only if enabled)
  useEffect(() => {
    if (!enableSessionManagement) return;
    
    // Only handle new chat session creation
    if (!isNewChat(sessionId) || aiMessages.length === 0) return;
    
    // Generate a new session ID only once when we transition from new to having messages
    const newSessionId = crypto.randomUUID();
    
    // Update URL directly with History API to prevent navigation
    const newUrl = window.location.pathname.replace('/chat/new', `/chat/${newSessionId}`);
    window.history.replaceState({}, '', newUrl);
    
    // Update session ID state
    setSessionId(newSessionId);
    setDisplaySessionId(newSessionId);
  }, [enableSessionManagement, sessionId, aiMessages.length]);

  // Save messages effect (only if session management enabled)
  useEffect(() => {
    if (!enableSessionManagement) return;
    
    // Don't save for new chats until they have a proper ID
    if (isNewChat(sessionId) || !sessionId) return;
    
    // Don't save empty message arrays
    if (aiMessages.length === 0) return;
    
    // Use a timeout to debounce rapid saves
    const saveTimeout = setTimeout(() => {
      console.log(`Saving messages for session ${sessionId}`, aiMessages);
      saveChat(sessionId, aiMessages);
    }, 500); // 500ms debounce
    
    return () => clearTimeout(saveTimeout);
  }, [enableSessionManagement, sessionId, aiMessages]);

  // Handle model selection
  const handleModelSelect = (model: ModelOption) => {
    setSelectedModel(model);
  };

  // Convert AI messages to display format
  const displayMessages = useMemo(() => {
    if (!modelConfig) return [];
    
    return aiMessages.map((msg, index) => {
      const isLatestAssistantMessage = msg.role === "assistant" && msg === aiMessages[aiMessages.length - 1];
      const isActivelyStreaming = status === 'streaming' && isLatestAssistantMessage && !!msg.content;
      const isThinking = status === 'submitted' && index === aiMessages.length - 1 && msg.role === 'assistant' && !msg.content;
      
      // Sample task steps for demo (would come from actual agent logic)
      const sampleTaskSteps = index === 1 && msg.role === 'assistant' ? [
        { id: "1", title: "Preparing agent to Fetch Website Data", status: "completed" as const },
        { id: "2", title: "Getting high on caffeine...", status: "completed" as const },
        { id: "3", title: "Coming up with instructions...", status: "completed" as const }
      ] : [];

      return {
        id: msg.id,
        content: msg.content || '',
        timestamp: new Date(msg.createdAt || new Date()),
        sender: msg.role === "user" ? "user" : "agent" as "user" | "agent",
        isStreaming: isActivelyStreaming,
        isThinking,
        showTaskList: sampleTaskSteps.length > 0,
        taskSteps: sampleTaskSteps
      };
    });
  }, [aiMessages, status, modelConfig]);

  // Add thinking message and error messages if needed
  const messagesWithThinking = useMemo(() => {
    const messages: Message[] = [...displayMessages];
    
    // Add error message if present
    if (errorMessage) {
      messages.push({
        ...errorMessage,
        timestamp: new Date(errorMessage.timestamp)
      });
    }
    
    // Add thinking indicator if we're in submitted state and last message is from user
    if (status === 'submitted' && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender === 'user') {
        messages.push({
          id: "thinking",
          content: "",
          timestamp: new Date(),
          sender: "agent",
          isThinking: true
        });
      }
    }
    
    return messages;
  }, [displayMessages, status, errorMessage]);

  // Group messages by date (only if session management enabled)
  const messagesWithDates = useMemo(() => {
    if (!enableSessionManagement) {
      return messagesWithThinking.map(msg => msg);
    }

    const result: (Message | DateDividerItem)[] = [];
    let lastDate: Date | null = null;
    
    messagesWithThinking.forEach((message) => {
      const messageDate = new Date(message.timestamp);
      
      if (!lastDate || isDifferentDay(lastDate, messageDate)) {
        result.push({
          id: `date-${messageDate.toISOString()}`,
          type: 'date-divider',
          date: messageDate
        });
        lastDate = messageDate;
      }
      
      result.push(message);
    });
    
    return result;
  }, [messagesWithThinking, enableSessionManagement]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messagesWithThinking]);
  
  // Auto-scroll when streaming
  useEffect(() => {
    if (status === 'streaming') {
      scrollToBottom();
    }
  }, [status]);

  // Handle message send from chat input
  const handleSendMessage = (message: string) => {
    if (!message.trim() || !modelConfig) return;
    
    setCurrentError(null);
    setErrorMessage(null);
    
    // Add user message using the chat hook's append function
    append({ role: 'user', content: message });
  };

  // Title display
  const displayTitle = title || 
    (enableSessionManagement && displaySessionId ? `Chat #${displaySessionId}` : title);

  // Show configuration if no model config
  if (!modelConfig) {
    return (
      <div 
        className={cn("flex flex-col h-full w-full relative overflow-hidden", className)}
        style={{
          background: "transparent"
        }}
      >
        <ChatConfiguration onContinue={handleConfigurationComplete} />
      </div>
    );
  }

  // Main chat interface
  return (
    <div 
      className={cn("flex flex-col h-full w-full relative overflow-hidden", className)}
      style={{
        background: "transparent"
      }}
    >
      {/* Header - Matches Figma padding and spacing with full-width divider */}
      {showHeader && (
        <div className="border-b" style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
          <div 
            className="flex justify-between items-center gap-6"
            style={{
              padding: "20px 24px"
            }}
          >
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
              <span 
                className="text-white font-bold"
                style={{
                  fontFamily: "Space Grotesk",
                  fontSize: "16px",
                  fontWeight: 700,
                  lineHeight: "1em"
                }}
              >
                {displayTitle}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div 
                className="w-6 h-6 cursor-pointer hover:bg-white/10 rounded p-1 transition-colors"
                onClick={handleNewChatClick}
                title="Start new chat"
              >
                <MessageSquare 
                  size={24} 
                  stroke="white" 
                  strokeWidth={1.2}
                />
              </div>
              <div 
                className="w-6 h-6 cursor-pointer hover:bg-white/10 rounded p-1 transition-colors"
                onClick={() => setShowSettingsModal(true)}
                title="Settings"
              >
                <Settings2 
                  size={24} 
                  stroke="white" 
                  strokeWidth={1.2}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Area with proper Figma spacing */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Messages - Matches Figma padding (24px sides) and spacing (32px between groups) */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto"
          style={{
            padding: "24px 24px 0 24px"
          }}
        >
          <div className="space-y-8">
            {(enableSessionManagement ? messagesWithDates : messagesWithThinking).map((item) => {
              // Handle date dividers (only for session management)
              if (enableSessionManagement && 'type' in item && item.type === 'date-divider') {
                return (
                  <div key={item.id}>
                    <DateDivider date={item.date} />
                  </div>
                );
              }
              
              const message = item as Message;
              
              return (
                <ChatMessage
                  key={message.id}
                  content={message.content}
                  timestamp={message.timestamp}
                  variant={message.sender}
                  avatar={userAvatar}
                  isThinking={message.isThinking}
                  isStreaming={message.isStreaming}
                  showTaskList={message.showTaskList}
                  taskSteps={message.taskSteps}
                  error={message.error}
                />
              );
            })}
          </div>
          {/* Bottom spacing for scroll */}
          <div className="h-6" />
          {/* Scroll anchor element */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Fixed at bottom with proper spacing */}
        <div 
          className="flex-shrink-0 flex justify-center border-t"
          style={{
            padding: "24px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            backgroundColor: "transparent"
          }}
        >
          <ChatInput
            onSend={handleSendMessage}
            disabled={status === 'submitted' || status === 'streaming'}
            selectedModel={selectedModel}
            onModelChange={handleModelSelect}
            availableModels={availableModels.map(model => ({
              id: model.id,
              name: model.name,
              provider: model.provider
            }))}
            error={currentError || undefined}
          />
        </div>
      </div>
      
      {/* Docker Install Modal for Initial Setup */}
      <DockerInstallModal
        isOpen={showDockerModal}
        onClose={handleDockerModalClose}
        onInstallationComplete={handleInstallationComplete}
        proxyId={validationResult?.frontendProxyId}
        reason="initial"
      />
      
      {/* Proxy Mismatch Popup */}
      <ProxyMismatchPopup
        isOpen={showProxyMismatchPopup}
        onClose={handleProxyMismatchPopupClose}
        frontendProxyId={validationResult?.frontendProxyId || ''}
        serverProxyId={validationResult?.serverProxyId || ''}
      />
      
      {/* Settings Modal */}
      <ChatSettingsModal
        isOpen={showSettingsModal}
        onClose={handleSettingsModalClose}
        onConfigUpdate={handleSettingsConfigUpdate}
      />
      
      {/* New Chat Confirmation Modal */}
      <NewChatConfirmationModal
        isOpen={showNewChatModal}
        onClose={handleNewChatModalClose}
        onConfirm={handleCreateNewChat}
      />
    </div>
  );
} 