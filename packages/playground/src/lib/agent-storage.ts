/**
 * Local Storage utilities for managing custom agents
 */

import type { Agent } from './config';

const CUSTOM_AGENTS_KEY = 'vibework-custom-agents';

export interface CustomAgent extends Agent {
  isCustom: true;
}

/**
 * Get all custom agents from localStorage
 */
export function getCustomAgents(): CustomAgent[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = localStorage.getItem(CUSTOM_AGENTS_KEY);
    if (!stored) return [];

    const agents = JSON.parse(stored);
    return Array.isArray(agents) ? agents : [];
  } catch (error) {
    console.error('Error loading custom agents:', error);
    return [];
  }
}

/**
 * Save a new custom agent to localStorage
 */
export function saveCustomAgent(name: string, url: string): CustomAgent {
  const customAgents = getCustomAgents();
  
  // Generate a unique ID
  const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const newAgent: CustomAgent = {
    id,
    name: name.trim(),
    url: url.trim(),
    isCustom: true,
  };

  // Check if an agent with the same URL already exists
  const existingAgent = customAgents.find(agent => agent.url === newAgent.url);
  if (existingAgent) {
    throw new Error('An agent with this URL already exists');
  }

  const updatedAgents = [...customAgents, newAgent];
  
  try {
    localStorage.setItem(CUSTOM_AGENTS_KEY, JSON.stringify(updatedAgents));
    return newAgent;
  } catch (error) {
    console.error('Error saving custom agent:', error);
    throw new Error('Failed to save agent to storage');
  }
}

/**
 * Remove a custom agent from localStorage
 */
export function removeCustomAgent(id: string): void {
  const customAgents = getCustomAgents();
  const filteredAgents = customAgents.filter(agent => agent.id !== id);
  
  try {
    localStorage.setItem(CUSTOM_AGENTS_KEY, JSON.stringify(filteredAgents));
  } catch (error) {
    console.error('Error removing custom agent:', error);
    throw new Error('Failed to remove agent from storage');
  }
}

/**
 * Validate agent URL format
 */
export function validateAgentUrl(url: string): { isValid: boolean; error?: string } {
  if (!url || !url.trim()) {
    return { isValid: false, error: 'URL is required' };
  }

  const trimmedUrl = url.trim();

  // Check if URL starts with http:// or https://
  if (!/^https?:\/\/.+/.test(trimmedUrl)) {
    return { isValid: false, error: 'URL must start with http:// or https://' };
  }

  try {
    const urlObj = new URL(trimmedUrl);
    
    // Basic hostname validation
    if (!urlObj.hostname) {
      return { isValid: false, error: 'Invalid URL hostname' };
    }

    // Check if hostname contains at least one dot (for domain.com format)
    // or is localhost
    if (urlObj.hostname !== 'localhost' && !urlObj.hostname.includes('.')) {
      return { isValid: false, error: 'Invalid URL format. Use domain.com or localhost' };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

/**
 * Test connection to an agent URL
 */
export async function testAgentConnection(url: string): Promise<{ isOnline: boolean; error?: string }> {
  try {
    const response = await fetch(`${url}/`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    
    // Agent is considered online if we get any response (including 404)
    return { isOnline: true };
  } catch (error) {
    return { 
      isOnline: false, 
      error: error instanceof Error ? error.message : 'Connection failed'
    };
  }
}
