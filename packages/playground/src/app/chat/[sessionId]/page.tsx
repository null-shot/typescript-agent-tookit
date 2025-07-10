"use client";

import React from "react";
import { useParams } from "next/navigation";
import { ChatContainer } from "@/components/chat";

export default function ChatPage() {
  const params = useParams();
  const sessionId = params?.sessionId as string;

  return (
    <div className="h-screen w-full bg-[#14161D]">
      <ChatContainer 
        sessionId={sessionId}
        enableSessionManagement={true}
        showHeader={true}
        className="h-full"
      />
    </div>
  );
}