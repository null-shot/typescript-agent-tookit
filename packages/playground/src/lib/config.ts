/**
 * Agent Configuration
 *
 * Environment Variables needed:
 * - NEXT_PUBLIC_DEFAULT_AGENT_URL: Default agent URL (default: http://localhost:8787)
 * - NEXT_PUBLIC_DEFAULT_AGENT_NAME: Default agent name (default: Local Agent)
 * - NEXT_PUBLIC_ADDITIONAL_AGENTS: Additional agents in format "Name|URL,Name2|URL2"
 */

export interface Agent {
  name: string;
  url: string;
  id: string;
}

export const DEFAULT_AGENT: Agent = {
  id: "default",
  name: process.env.NEXT_PUBLIC_DEFAULT_AGENT_NAME || "Local Agent",
  url: process.env.NEXT_PUBLIC_DEFAULT_AGENT_URL || "http://localhost:8787",
};

export function parseAdditionalAgents(): Agent[] {
  const additionalAgents = process.env.NEXT_PUBLIC_ADDITIONAL_AGENTS;
  if (!additionalAgents) return [];

  return additionalAgents
    .split(",")
    .map((agentStr, index) => {
      const [name, url] = agentStr.split("|");
      return {
        id: `agent-${index + 1}`,
        name: name?.trim() || `Agent ${index + 1}`,
        url: url?.trim() || "",
      };
    })
    .filter((agent) => agent.url);
}

export function getAllAgents(): Agent[] {
  // Dynamically import storage functions to avoid SSR issues
  let customAgents: Agent[] = [];
  
  if (typeof window !== 'undefined') {
    try {
      // Dynamic import to avoid SSR issues
      const { getCustomAgents } = require('./agent-storage');
      customAgents = getCustomAgents();
    } catch (error) {
      console.error('Error loading custom agents:', error);
    }
  }
  
  return [DEFAULT_AGENT, ...parseAdditionalAgents(), ...customAgents];
}

