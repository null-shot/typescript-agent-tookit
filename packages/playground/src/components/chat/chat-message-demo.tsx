import React from "react";
import { ChatMessage } from "./chat-message";

export function ChatMessageDemo() {
  return (
    <div className="w-full max-w-md mx-auto p-4 bg-[#14161D] min-h-screen">
      <h2 className="text-white text-lg font-bold mb-6">Updated Chat Message Variants</h2>
      
      <div className="space-y-6">
        {/* User Message - Dynamic width */}
        <div>
          <h3 className="text-white text-sm mb-2">User Message (Dynamic Width):</h3>
          <ChatMessage
            variant="user"
            content="Short message"
            timestamp="2:30 PM"
            avatar="/images/default-avatar.png"
          />
          <div className="mt-2">
            <ChatMessage
              variant="user"
              content="This is a much longer message that demonstrates the dynamic width functionality. It should adapt to the content length while maintaining good readability and responsive design principles."
              timestamp="2:31 PM"
              avatar="/images/default-avatar.png"
            />
          </div>
        </div>
        
        {/* Agent Message - Loading State */}
        <div>
          <h3 className="text-white text-sm mb-2">Agent Message (Thinking - 45° Rotation Intervals):</h3>
          <ChatMessage
            variant="agent"
            content=""
            timestamp="2:32 PM"
            isThinking={true}
          />
        </div>
        
        {/* Agent Message - Completion Animation */}
        <div>
          <h3 className="text-white text-sm mb-2">Agent Message (Completion Animation - Scale + Slam Back):</h3>
          <ChatMessage
            variant="agent"
            content=""
            timestamp="2:32 PM"
            isCompleting={true}
          />
        </div>
        
        {/* Agent Message - Normal Response */}
        <div>
          <h3 className="text-white text-sm mb-2">Agent Message (Normal Response):</h3>
          <ChatMessage
            variant="agent"
            content="I've analyzed your request and here's my response. The new 45-degree rotation intervals create a smoother thinking animation, and the completion animation provides satisfying feedback when processing is done."
            timestamp="2:33 PM"
          />
        </div>
        
        {/* Simplified Error Message */}
        <div>
          <h3 className="text-white text-sm mb-2">Simplified Error Message (No X Button):</h3>
          <ChatMessage
            variant="error"
            content="This content won't be shown"
            timestamp="2:34 PM"
          />
        </div>
        
        {/* Streaming Message */}
        <div>
          <h3 className="text-white text-sm mb-2">Agent Message (Streaming):</h3>
          <ChatMessage
            variant="agent"
            content="This message is being streamed in real-time..."
            timestamp="2:35 PM"
            isStreaming={true}
          />
        </div>
      </div>
      
      {/* CSS for animations */}
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