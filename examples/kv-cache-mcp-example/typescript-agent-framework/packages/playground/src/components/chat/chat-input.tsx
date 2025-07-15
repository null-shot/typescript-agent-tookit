import React from "react";
import { cn } from "@/lib/utils";

export interface ChatInputProps {
  onSendMessage: (message: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({
  onSendMessage,
  className,
  placeholder = "Type a message...",
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = React.useState("");
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const buttonStyle = {
    background: "linear-gradient(92deg, rgba(114, 255, 192, 0.10) 0%, rgba(32, 132, 95, 0.10) 99.74%)",
    border: "1px solid rgba(114, 255, 192, 0.2)",
    backdropFilter: "blur(40px)",
    borderRadius: "50%" // Fully rounded for the circular button
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex items-center gap-2 p-4 bg-transparent",
        className
      )}
    >
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 px-4 py-3 rounded-full font-[var(--font-space-grotesk)] text-[rgba(255,255,255,0.8)] bg-[#17181A] border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[rgba(255,255,255,0.2)]"
      />
      <button
        type="submit"
        disabled={!message.trim() || disabled}
        className="inline-flex items-center justify-center p-3 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        style={buttonStyle}
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
    </form>
  );
} 