import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ChatMessage } from "./chat-message";
import { ChatHeader } from "./chat-header";
import { DateDivider } from "./date-divider";
import { useChat, type Message as UIMessage } from "@ai-sdk/react";
import { usePathname } from "next/navigation";
import { saveChat, loadChat } from "@/lib/chat-storage";

export interface Message {
  id: string;
  content: string;
  timestamp: string | Date;
  sender: "user" | "agent";
  isThinking?: boolean;
  isStreaming?: boolean;
}

interface DateDividerItem {
  id: string;
  type: 'date-divider';
  date: Date;
}

export interface ChatContainerProps {
  className?: string;
  title?: string;
  onEdit?: () => void;
  showHeader?: boolean;
  apiUrl?: string;
  initialThinking?: boolean;
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
  title,
  onEdit,
  showHeader = true,
  apiUrl = "http://localhost:8787/agent/chat",
}: ChatContainerProps) {
  const pathname = usePathname();
  const [inputValue, setInputValue] = useState("");
  
  // Session management
  const urlSessionId = getSessionIdFromPath(pathname || "");
  const [sessionId, setSessionId] = useState<string | null>(urlSessionId);
  const [displaySessionId, setDisplaySessionId] = useState<string | null>(
    isNewChat(sessionId) ? null : sessionId
  );
  
  const [isThinking, setIsThinking] = useState(false);
  
  // AI SDK chat hook
  const {
    messages: aiMessages,
    handleInputChange,
    handleSubmit,
    status,
    error,
  } = useChat({
    api: sessionId && !isNewChat(sessionId) ? `${apiUrl}/${sessionId}` : apiUrl,
    id: 'chat-session',
    initialMessages: (sessionId && !isNewChat(sessionId) ? loadChat(sessionId) : []) as UIMessage[],
    experimental_streamData: true,
    streamProtocol: 'data',
  } as {
    api: string;
    id: string;
    initialMessages: UIMessage[];
    experimental_streamData: boolean;
  });

  // Status tracking for UI state
  useEffect(() => {
    // Set thinking state when status is submitted
    setIsThinking(status === 'submitted');
    console.log("Status changed to:", status, "isThinking:", status === 'submitted');
  }, [status]);

  // Handle session ID generation for new chats ONLY
  useEffect(() => {
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
    
    // Don't save here - we'll do that in the dedicated save effect
  }, [sessionId, aiMessages.length]); // Only depend on length, not the entire messages array

  // Single place to save messages, with debounce to avoid rapid saves
  useEffect(() => {
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
  }, [sessionId, aiMessages]);

  console.log("Current status:", status);
  
  // Check for the assistant message that's being streamed
  const streamingMessage = aiMessages.find(msg => 
    msg.role === 'assistant' && msg === aiMessages[aiMessages.length - 1] && status === 'streaming'
  );
  
  console.log("Streaming message content:", streamingMessage?.content);

  // Convert AI messages to our format
  const displayMessages = React.useMemo(() => {
    return aiMessages.map((msg) => {
      const isLatestAssistantMessage = msg.role === "assistant" && msg === aiMessages[aiMessages.length - 1];
      // Only show streaming if we have content and we're in streaming state
      const isActivelyStreaming = status === 'streaming' && isLatestAssistantMessage && !!msg.content;
      
      return {
        id: msg.id,
        content: msg.content || '',
        timestamp: new Date(msg.createdAt || new Date()),
        sender: msg.role === "user" ? "user" : "agent" as "user" | "agent",
        isStreaming: isActivelyStreaming
      };
    });
  }, [aiMessages, status]);
  
  // Add thinking indicator if needed
  const messagesWithThinking = React.useMemo(() => {
    // Only add thinking indicator if:
    // 1. We're in thinking state
    // 2. The last message is from the user (not the agent)
    // 3. We have at least one message
    const lastMessage = displayMessages[displayMessages.length - 1];
    const shouldShowThinking = isThinking && 
                              displayMessages.length > 0 && 
                              (!lastMessage || lastMessage.sender === 'user');
    
    if (shouldShowThinking) {
      console.log("Adding thinking indicator");
      return [
        ...displayMessages,
        {
          id: "thinking",
          content: "", // Empty content to show just the dots
          timestamp: new Date(),
          sender: "agent" as "user" | "agent",
          isThinking: true // This triggers the 3-dot animation in ChatMessage
        }
      ];
    }
    
    return displayMessages;
  }, [displayMessages, isThinking]);
  
  // Group messages by date
  const messagesWithDates = React.useMemo(() => {
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
  }, [messagesWithThinking]);
  
  // Form submission handler
  const handleFormSubmit = React.useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    // Set thinking state immediately for better UX
    setIsThinking(true);
    
    handleSubmit(e);
    
    setInputValue("");
  }, [inputValue, handleSubmit]);
  
  // Input change handler
  const handleLocalInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    handleInputChange(e);
  }, [handleInputChange]);
  
  // Title display
  const displayTitle = title || 
    (displaySessionId ? `Chat #${displaySessionId}` : "New Chat");
  
  return (
    <div 
      className={cn("flex flex-col h-full w-full relative rounded-lg overflow-hidden", className)} 
      style={{ 
        background: "#09090B",
        border: "1px solid transparent",
        borderImageSlice: 1,
        borderImageSource: "linear-gradient(to bottom, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05) 50%, transparent)",
        boxShadow: "0 0 30px rgba(0, 0, 0, 0.3)"
      }}
    >
      {showHeader && <ChatHeader title={displayTitle} onEdit={onEdit} />}
      
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messagesWithDates.map((item, index) => {
          const isFirstItem = index === 0;
          const standardMarginClass = isFirstItem ? "" : "mt-6";
          
          if ('type' in item && item.type === 'date-divider') {
            return (
              <div key={item.id} className={standardMarginClass}>
                <DateDivider date={item.date} />
              </div>
            );
          }
          
          const message = item as Message;
          
          return (
            <div 
              key={message.id} 
              className={standardMarginClass}
            >
              <ChatMessage
                content={message.content}
                timestamp={message.timestamp}
                variant={message.sender}
                isThinking={message.isThinking}
                isStreaming={message.isStreaming}
              />
            </div>
          );
        })}
        
        <div className="h-24"></div>
      </div>
      
      {error && (
        <div className="px-6 py-2 bg-red-500/20 text-red-400 text-xs text-center">
          Error: {error.message || "Something went wrong"}
        </div>
      )}
      
      <div className="px-4 py-2 text-xs text-right text-gray-400">
        Status: {status} | Thinking: {isThinking ? 'yes' : 'no'} | Latest: {
          aiMessages.length > 0 ? 
          (aiMessages[aiMessages.length - 1].role === 'assistant' ? 
            aiMessages[aiMessages.length - 1].content.substring(0, 20) + '...' : 
            '(user message)') : 
          'none'
        }
      </div>
      
      <form onSubmit={handleFormSubmit} className="p-4 border-t border-[rgba(255,255,255,0.1)]">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={handleLocalInputChange}
            placeholder="Type a message..."
            disabled={status === 'submitted' || status === 'streaming'}
            className="flex-1 px-4 py-3 rounded-full font-[var(--font-space-grotesk)] text-[rgba(255,255,255,0.8)] bg-[#17181A] border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[rgba(255,255,255,0.2)]"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || status === 'submitted' || status === 'streaming'}
            className="inline-flex items-center justify-center p-3 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-full"
            style={{
              background: "linear-gradient(92deg, rgba(114, 255, 192, 0.10) 0%, rgba(32, 132, 95, 0.10) 99.74%)",
              border: "1px solid rgba(114, 255, 192, 0.2)",
              backdropFilter: "blur(40px)"
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
            <span className="sr-only">Send message</span>
          </button>
        </div>
      </form>
    </div>
  );
} 