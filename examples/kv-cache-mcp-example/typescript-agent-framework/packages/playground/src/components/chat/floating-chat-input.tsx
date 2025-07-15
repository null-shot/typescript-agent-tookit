import React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import Image from "next/image";

export interface FloatingChatInputProps {
  onSendMessage: (message: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function FloatingChatInput({
  onSendMessage,
  className,
  placeholder = "Describe any task for Vista",
  disabled = false,
}: FloatingChatInputProps) {
  const [message, setMessage] = React.useState("");
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage("");
    }
  };

  return (
    <div className="fixed bottom-6 left-0 right-0 mx-auto w-[calc(100%-48px)] max-w-[800px] z-50 px-6">
      <form
        onSubmit={handleSubmit}
        className={cn(
          "w-full rounded-xl bg-[#17181A] border border-[rgba(255,255,255,0.12)] p-3 shadow-xl",
          className
        )}
      >
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="border-0 bg-transparent text-[rgba(255,255,255,0.8)] placeholder:text-[#71717A] text-sm font-[var(--font-space-grotesk)] focus-visible:ring-0 focus-visible:ring-offset-0 mb-2"
        />
        
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-2 rounded-xl bg-transparent hover:bg-[rgba(255,255,255,0.05)] transition-colors"
              aria-label="Attach file"
            >
              <Image 
                src="/images/paperclip-icon.svg" 
                alt="Attach" 
                width={20} 
                height={20} 
              />
            </button>
            
            <button
              type="button"
              className="p-2 rounded-xl bg-transparent hover:bg-[rgba(255,255,255,0.05)] transition-colors"
              aria-label="Voice input"
            >
              <Image 
                src="/images/mic-icon.svg" 
                alt="Microphone" 
                width={20} 
                height={20} 
              />
            </button>
          </div>
          
          <button
            type="submit"
            disabled={!message.trim() || disabled}
            className="p-2 rounded-xl bg-[#72FFC0] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity ml-auto"
            aria-label="Send message"
          >
            <Image 
              src="/images/send-icon.svg" 
              alt="Send" 
              width={20} 
              height={20} 
            />
          </button>
        </div>
      </form>
    </div>
  );
} 