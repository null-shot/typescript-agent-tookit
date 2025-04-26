import React from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

export interface ChatMessageProps {
  content: string;
  timestamp: string | Date;
  variant: "user" | "agent";
  className?: string;
  isThinking?: boolean;
  isStreaming?: boolean;
}

export function ChatMessage({
  content,
  timestamp,
  variant,
  className,
  isThinking = false,
  isStreaming = false,
}: ChatMessageProps) {
  // Use a fixed time format instead of locale-dependent formatting
  const formattedTime = typeof timestamp === 'string' 
    ? timestamp 
    : `${String(timestamp.getHours()).padStart(2, '0')}:${String(timestamp.getMinutes()).padStart(2, '0')}`;

  // Consistent border radius for message bubbles
  const userBubbleStyle = {
    background: "linear-gradient(99deg, rgba(255, 255, 255, 0.08) -23.82%, rgba(0, 0, 0, 0.08) 128.39%)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "12px",
    padding: "14px 16px"
  };
  
  const agentBubbleStyle = {
    background: "linear-gradient(92deg, rgba(114, 255, 192, 0.10) 0%, rgba(32, 132, 95, 0.10) 99.74%)",
    border: "1px solid rgba(114, 255, 192, 0.2)",
    backdropFilter: "blur(40px)",
    borderRadius: "12px",
    padding: "14px 16px"
  };

  // New style for thinking state with pulsing animation
  const thinkingBubbleStyle = {
    ...agentBubbleStyle,
    animation: "pulse 1.5s infinite ease-in-out",
  };

  // Determine which style to use
  const bubbleStyle = variant === "user" 
    ? userBubbleStyle 
    : (isThinking ? thinkingBubbleStyle : agentBubbleStyle);

  return (
    <div
      className={cn(
        "flex",
        variant === "user" ? "justify-end" : "justify-start",
        "gap-3 items-start",
        className
      )}
    >
      {variant === "agent" && (
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded overflow-hidden mt-1",
          isThinking && "animate-pulse"
        )}>
          <Image 
            src="/images/agent-avatar.png" 
            alt="Agent" 
            width={32} 
            height={32}
            className="object-cover"
          />
        </div>
      )}
      
      <div className="flex flex-col max-w-[75%]">
        <div
          className={cn(
            "font-[var(--font-space-grotesk)] text-[rgba(255,255,255,0.8)]",
            isThinking && "chat-thinking-animation",
            isStreaming && "chat-text-streaming"
          )}
          style={bubbleStyle}
        >
          {isThinking ? (
            <div className="flex items-center space-x-1 h-5 mb-1">
              <div className="w-2 h-2 bg-[rgba(114,255,192,0.5)] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
              <div className="w-2 h-2 bg-[rgba(114,255,192,0.5)] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
              <div className="w-2 h-2 bg-[rgba(114,255,192,0.5)] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
            </div>
          ) : (
            <div className={cn(
              "mb-1 text-[13px] leading-[1.4]",
              isStreaming && "chat-text-typing"
            )}>{content}</div>
          )}
          <div
            className="text-[10px] text-[rgba(255,255,255,0.4)] text-right font-medium"
          >
            {formattedTime}
          </div>
        </div>
      </div>
      
      {variant === "user" && (
        <div className="flex-shrink-0 w-8 h-8 rounded overflow-hidden mt-1">
          <Image 
            src="/images/user-avatar.png" 
            alt="User" 
            width={32} 
            height={32}
            className="object-cover"
          />
        </div>
      )}
    </div>
  );
} 