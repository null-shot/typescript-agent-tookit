"use client";

import { useParams } from "next/navigation";
import { ChatContainer } from "@/components/chat";

export default function ChatSessionPage() {
  const params = useParams();
  const sessionId = params?.sessionId as string;
  const isNewChat = sessionId === 'new';
  

  // Use the base API URL without the session ID - it will be added by the ChatContainer
  const apiUrl = "http://localhost:8787/agent/chat";

  return (
    <div className="flex flex-col h-screen" style={{ background: "#09090B" }}>
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-[800px] h-[calc(100vh-80px)]">
          <div className="h-full flex flex-col">
            <ChatContainer 
            title={isNewChat ? "New Chat" : `Chat with Vista`}
            apiUrl={apiUrl}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 