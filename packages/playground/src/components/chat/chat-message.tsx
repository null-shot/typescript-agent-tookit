import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface ChatMessageProps {
  content: string;
  timestamp: string | Date;
  variant: "user" | "agent" | "error";
  className?: string;
  isThinking?: boolean;
  isCompleting?: boolean; // New prop for completion animation
  avatar?: string;
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

export function ChatMessage({
  content,
  timestamp: _timestamp,
  variant,
  className,
  isThinking = false,
  isCompleting = false,
  avatar = "/images/default-avatar.png",
  showTaskList = false,
  taskSteps = [],
  error,
}: ChatMessageProps) {
  // Timestamp is required by interface but not currently used in rendering
  
  // User message component with dynamic width
  const UserMessage = () => (
    <div 
      style={{
        display: "flex",
        justifyContent: "flex-end",
        alignSelf: "stretch",
        gap: "12px",
        width: "100%"
      }}
    >
      <div 
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "-14px", // Negative gap from Figma
          maxWidth: "70%", // Dynamic width - max 70% of container
          minWidth: "120px" // Minimum width for readability
        }}
      >
        <div 
          style={{
            background: "linear-gradient(90deg, rgba(120, 73, 239, 0.15) 0%, rgba(50, 108, 216, 0.2) 100%)",
            border: "1px solid rgba(120, 73, 239, 0.15)",
            borderRadius: "4px",
            padding: "8px 12px",
            fontFamily: "Space Grotesk",
            fontSize: "14px",
            fontWeight: 400,
            lineHeight: "1.4",
            textAlign: "left",
            color: "rgba(255, 255, 255, 0.8)",
            width: "fit-content", // Dynamic width based on content
            boxSizing: "border-box",
            wordWrap: "break-word",
            overflowWrap: "break-word",
            hyphens: "auto"
          }}
        >
          {content}
        </div>
      </div>
      {/* User avatar */}
      <div 
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "4px",
          backgroundColor: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0
        }}
      >
        <div 
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "4px",
            backgroundImage: `url(${avatar})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundColor: "#FFFFFF"
          }}
        />
      </div>
    </div>
  );

  // Agent message component with animated loading state
  const AgentMessage = () => (
    <div 
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        width: "100%"
      }}
    >
      {/* Agent avatar with animated logo when thinking */}
      <div 
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "4px",
          backgroundColor: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0
        }}
      >
        <Image 
          src="/images/badge_light_bg.png" 
          alt="Agent"
          width={32}
          height={32}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "4px",
            // Add sophisticated animation when thinking or completing
            animation: isThinking 
              ? "iconThinking 1.6s infinite ease-in-out" 
              : isCompleting 
                ? "iconComplete 0.6s ease-out" 
                : "none",
            filter: (isThinking || isCompleting) ? "drop-shadow(0 0 8px rgba(120, 73, 239, 0.6))" : "none",
            transition: "filter 0.3s ease"
          }}
        />
      </div>
      
      <div 
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          maxWidth: "324px"
        }}
      >
        {/* Show content (thinking state is handled by icon animation) */}
        {!isThinking && (
          /* Main message content - NO background, just text */
          <div style={{ width: "100%" }}>
            <p 
              style={{
                fontFamily: "Space Grotesk",
                fontWeight: 400,
                fontSize: "14px",
                lineHeight: "1.4",
                color: "rgba(255, 255, 255, 0.8)",
                margin: 0,
                textAlign: "left",
                wordWrap: "break-word",
                overflowWrap: "break-word",
                hyphens: "auto"
              }}
            >
              {content}
            </p>
          </div>
        )}

        {/* Task list if provided */}
        {false && showTaskList && taskSteps.length > 0 && (
          <div 
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              width: "100%"
            }}
          >
            {/* Task items */}
            <div 
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px"
              }}
            >
              {taskSteps.map((step, index) => (
                <div 
                  key={step.id} 
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    position: "relative"
                  }}
                >
                  {/* Vertical line connector (except for last item) */}
                  {index < taskSteps.length - 1 && (
                    <div 
                      style={{
                        position: "absolute",
                        left: "12px",
                        top: "24px",
                        width: "1px",
                        height: "16px",
                        backgroundColor: "#EDF0F5"
                      }}
                    />
                  )}
                  
                  {/* Task status icon */}
                  <div 
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: "linear-gradient(90deg, rgb(120, 73, 239) 0%, rgb(50, 108, 216) 100%)",
                      border: "1px solid transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      zIndex: 10
                    }}
                  >
                    {step.status === "completed" && (
                      <svg width="9.33" height="6.42" viewBox="0 0 10 7" fill="none">
                        <path 
                          d="M1 3.5L3.5 6L9 1" 
                          stroke="#FFFFFF" 
                          strokeWidth="1" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  
                  {/* Task text */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span 
                      style={{
                        fontFamily: "Space Grotesk",
                        fontWeight: 400,
                        fontSize: "12px",
                        lineHeight: "1.33",
                        color: "rgba(255, 255, 255, 0.8)"
                      }}
                    >
                      {step.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional content if provided */}
        {error && (
          <div style={{ width: "100%" }}>
            <p 
              style={{
                fontFamily: "Space Grotesk",
                fontWeight: 400,
                fontSize: "14px",
                lineHeight: "1.4",
                color: "rgba(255, 255, 255, 0.8)",
                margin: 0,
                wordWrap: "break-word",
                overflowWrap: "break-word",
                hyphens: "auto"
              }}
            >
              {error.userMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // Simplified error message component
  const ErrorMessage = () => (
    <div 
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        width: "100%"
      }}
    >
      <div 
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "4px",
          backgroundColor: "rgba(253, 83, 83, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: "4px"
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path 
            d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
            stroke="rgba(255, 114, 114, 0.8)" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </div>
      
      <div 
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          maxWidth: "324px"
        }}
      >
        {/* Simplified error message - just show "An error occurred" */}
        <p 
          style={{
            fontFamily: "Space Grotesk",
            fontWeight: 400,
            fontSize: "14px",
            lineHeight: "1.4",
            color: "rgba(255, 255, 255, 0.8)",
            margin: 0,
            wordWrap: "break-word",
            overflowWrap: "break-word",
            hyphens: "auto"
          }}
        >
          An error occurred
        </p>
      </div>
    </div>
  );

  // Render based on variant
  return (
    <div className={cn("w-full py-2", className)}>
      {variant === "user" && <UserMessage />}
      {variant === "agent" && <AgentMessage />}
      {variant === "error" && <ErrorMessage />}
      
      {/* Add CSS animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes iconThinking {
            0% {
              transform: scale(1) rotate(0deg);
              opacity: 1;
            }
            12.5% {
              transform: scale(1.08) rotate(45deg);
              opacity: 0.85;
            }
            25% {
              transform: scale(1.05) rotate(90deg);
              opacity: 0.9;
            }
            37.5% {
              transform: scale(1.08) rotate(135deg);
              opacity: 0.85;
            }
            50% {
              transform: scale(1.02) rotate(180deg);
              opacity: 0.95;
            }
            62.5% {
              transform: scale(1.08) rotate(225deg);
              opacity: 0.85;
            }
            75% {
              transform: scale(1.05) rotate(270deg);
              opacity: 0.9;
            }
            87.5% {
              transform: scale(1.08) rotate(315deg);
              opacity: 0.85;
            }
            100% {
              transform: scale(1) rotate(360deg);
              opacity: 1;
            }
          }
          
          @keyframes iconComplete {
            0% {
              transform: scale(1) rotate(0deg);
              opacity: 1;
            }
            50% {
              transform: scale(1.3) rotate(180deg);
              opacity: 0.7;
            }
            100% {
              transform: scale(1) rotate(0deg);
              opacity: 1;
            }
          }
        `
      }} />
    </div>
  );
} 