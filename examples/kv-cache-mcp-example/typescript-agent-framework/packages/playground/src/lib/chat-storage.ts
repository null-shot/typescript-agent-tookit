/**
 * Client-side storage utility for chat messages
 */
import { type Message } from "@ai-sdk/react";

// Key prefix for localStorage
const CHAT_STORAGE_PREFIX = "chat-";

/**
 * Save chat messages to localStorage
 */
export const saveChat = (sessionId: string, messages: Message[]): void => {
  if (!sessionId) return;
  
  try {
    localStorage.setItem(
      `${CHAT_STORAGE_PREFIX}${sessionId}`,
      JSON.stringify(messages)
    );
  } catch (error) {
    console.error("Error saving chat to localStorage:", error);
  }
};

/**
 * Load chat messages from localStorage
 */
export const loadChat = (sessionId: string): Message[] => {
  if (!sessionId) return [];
  
  try {
    const stored = localStorage.getItem(`${CHAT_STORAGE_PREFIX}${sessionId}`);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error loading chat from localStorage:", error);
    return [];
  }
};

/**
 * Create a new chat session with a unique ID
 */
export const createChat = (): string => {
  const id = Math.random().toString(36).substring(2, 9);
  saveChat(id, []);
  return id;
};

/**
 * Delete a chat session
 */
export const deleteChat = (sessionId: string): void => {
  if (!sessionId) return;
  
  try {
    localStorage.removeItem(`${CHAT_STORAGE_PREFIX}${sessionId}`);
  } catch (error) {
    console.error("Error deleting chat from localStorage:", error);
  }
};

/**
 * Get all chat session IDs
 */
export const getAllChatIds = (): string[] => {
  try {
    return Object.keys(localStorage)
      .filter(key => key.startsWith(CHAT_STORAGE_PREFIX))
      .map(key => key.replace(CHAT_STORAGE_PREFIX, ""));
  } catch (error) {
    console.error("Error getting all chat IDs:", error);
    return [];
  }
}; 