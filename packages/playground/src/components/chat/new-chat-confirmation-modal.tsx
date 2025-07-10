"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { X, MessageSquare, AlertTriangle } from "lucide-react";

interface NewChatConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  className?: string;
}

export function NewChatConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  className 
}: NewChatConfirmationModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className={cn(
          "fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50",
          "bg-[#14161D] border border-[rgba(255,255,255,0.12)] rounded-xl shadow-xl",
          "w-full max-w-md mx-4",
          className
        )}
      >
        {/* Header */}
        <div className="flex justify-between items-center gap-6 p-6 border-b border-[rgba(255,255,255,0.12)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[rgba(255,165,0,0.2)] flex items-center justify-center">
              <AlertTriangle size={20} className="text-[#FFA500]" />
            </div>
            <span className="text-white font-bold text-lg">Start New Chat</span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center text-white hover:bg-white/10 rounded transition-colors"
          >
            <X size={16} strokeWidth={1.2} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MessageSquare size={20} className="text-white/60 mt-1 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-white text-sm leading-relaxed">
                  You currently have an active chat session with message history. 
                </p>
                <p className="text-white/80 text-sm leading-relaxed">
                  Starting a new chat will create a fresh conversation, and your current chat history will remain saved but you'll navigate away from it.
                </p>
              </div>
            </div>
            
            <div className="bg-[rgba(255,165,0,0.1)] border border-[rgba(255,165,0,0.2)] rounded-lg p-3">
              <p className="text-[#FFA500] text-xs font-medium">
                Your previous chat history will be preserved and accessible later.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-[rgba(255,255,255,0.12)]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-white/20 text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-[#7849EF] to-[#326CD8] text-white rounded-xl hover:opacity-90 transition-opacity"
          >
            Start New Chat
          </button>
        </div>
      </div>
    </>
  );
} 