import { MCPServer, MCPServerDirectory, MCPServerInput } from '@/types/mcp-server';

// Registry configuration
const DEFAULT_REGISTRY_URL = 'https://mcp-registry.nullshot.ai/latest.json';
const CACHE_KEY = 'mcp-registry-cache';
const CACHE_TIMESTAMP_KEY = 'mcp-registry-timestamp';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

// Compression utilities using native Web APIs
function compressData(data: string): string {
  try {
    // Simple compression using btoa + deflate-like technique
    // In a real implementation, you might want to use a proper compression library
    return btoa(data);
  } catch (error) {
    console.warn('Failed to compress data, storing uncompressed:', error);
    return data;
  }
}

function decompressData(data: string): string {
  try {
    return atob(data);
  } catch (error) {
    // If decompression fails, assume it's uncompressed data
    console.warn('Failed to decompress data, assuming uncompressed:', error);
    return data;
  }
}

// Types for the official registry response
interface RegistryServer {
  id: string;
  git_repository: string;
  unique_name: string;
  short_description: string;
  versions: Array<{
    tag: string;
    name: string;
    date: string;
    prerelease: boolean;
    commit: string;
  }>;
  keywords: string[];
  license: string;
  license_url: string;
  mcp_server_config?: {
    mcpServers: Record<string, {
      command: string;
      args: string[];
      env: Record<string, string>;
    }>;
  } | null;
  mcp_server_inputs?: Array<{
    type: string;
    id: string;
    description: string;
    password: boolean;
    required: boolean;
    default?: string;
  }>;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface RegistryResponse {
  servers: RegistryServer[];
}

// Check if cached data is still valid
function isCacheValid(): boolean {
  try {
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!timestamp) return false;
    
    const cacheTime = parseInt(timestamp, 10);
    const now = Date.now();
    return (now - cacheTime) < CACHE_DURATION;
  } catch (error) {
    console.warn('Error checking cache validity:', error);
    return false;
  }
}

// Load cached registry data
function loadCachedRegistry(): MCPServerDirectory | null {
  try {
    if (!isCacheValid()) {
      console.log('🕐 Cache expired, will fetch fresh data');
      return null;
    }

    const compressed = localStorage.getItem(CACHE_KEY);
    if (!compressed) {
      console.log('📭 No cached registry data found');
      return null;
    }

    const data = decompressData(compressed);
    const registry = JSON.parse(data) as MCPServerDirectory;
    
    console.log('✅ Loaded cached registry data:', {
      serverCount: registry.servers.length,
      cacheAge: Math.round((Date.now() - parseInt(localStorage.getItem(CACHE_TIMESTAMP_KEY) || '0', 10)) / 1000 / 60)
    });
    
    return registry;
  } catch (error) {
    console.error('❌ Error loading cached registry:', error);
    // Clear invalid cache
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    return null;
  }
}

// Save registry data to cache with compression
function saveCachedRegistry(registry: MCPServerDirectory): void {
  try {
    const data = JSON.stringify(registry);
    const compressed = compressData(data);
    
    localStorage.setItem(CACHE_KEY, compressed);
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    
    const originalSize = new Blob([data]).size;
    const compressedSize = new Blob([compressed]).size;
    const savings = Math.round((1 - compressedSize / originalSize) * 100);
    
    console.log('💾 Registry cached successfully:', {
      servers: registry.servers.length,
      originalSize: `${Math.round(originalSize / 1024)}KB`,
      compressedSize: `${Math.round(compressedSize / 1024)}KB`,
      compressionSavings: `${savings}%`
    });
  } catch (error) {
    console.error('❌ Error saving registry to cache:', error);
  }
}

// Transform registry server to our MCPServer format
function transformRegistryServer(server: RegistryServer): MCPServer {
  // Parse inputs array and ensure proper type casting
  const rawInputs = server.mcp_server_inputs || [];
  const inputs: MCPServerInput[] = rawInputs.map(input => ({
    ...input,
    type: "promptString" as const // Cast to the expected literal type
  }));
  
  // Parse tags array (it should already be an array in the new format)
  const parsedTags = server.tags || [];

  // Get the main server config with null safety
  const configKeys = server.mcp_server_config?.mcpServers ? Object.keys(server.mcp_server_config.mcpServers) : [];
  const mainConfigKey = configKeys[0];
  const mcpServerConfig = (mainConfigKey && server.mcp_server_config?.mcpServers) 
    ? server.mcp_server_config.mcpServers[mainConfigKey]
    : { command: '', args: [], env: {} };

  return {
    id: server.id,
    git_repository: server.git_repository,
    unique_name: server.unique_name,
    short_description: server.short_description,
    versions: server.versions.map(v => ({
      tag: v.tag,
      hash: v.commit,
      date: v.date
    })),
    keywords: server.keywords,
    license: server.license,
    license_url: server.license_url,
    mcp_server_config: server.mcp_server_config || { mcpServers: {} },
    created_at: server.created_at,
    updated_at: server.updated_at,
    mcp_server_inputs: JSON.stringify(inputs),
    tags: JSON.stringify(parsedTags),
    
    // Computed fields for backward compatibility
    name: server.unique_name.split('/')[1] || server.unique_name,
    shortDescription: server.short_description,
    mcpServerConfig,
    inputs,
    parsedTags,
    licenses: [server.license],
    category: parsedTags[0] || 'Dev Tools',
    author: server.unique_name.split('/')[0],
    homepage: server.git_repository.replace('.git', ''),
    documentation: `${server.git_repository.replace('.git', '')}/blob/main/README.md`,
    lastUpdated: server.updated_at,
    searchText: `${server.unique_name} ${server.short_description} ${server.keywords.join(' ')} ${parsedTags.join(' ')}`.toLowerCase(),
    popularity: Math.floor(Math.random() * 100) + 1 // Random popularity for now
  };
}

// Filter servers to only include NPX-compatible ones
function filterNpxServers(servers: MCPServer[]): MCPServer[] {
  return servers.filter(server => {
    const command = server.mcpServerConfig?.command?.toLowerCase();
    return command === 'npx';
  });
}

// Main function to fetch and process registry data
export async function fetchMCPRegistry(): Promise<MCPServerDirectory> {
  console.log('🚀 Fetching MCP registry data...');
  
  // Try to load from cache first
  const cachedRegistry = loadCachedRegistry();
  if (cachedRegistry) {
    return cachedRegistry;
  }

  // Fetch fresh data from API
  const registryUrl = process.env.NEXT_PUBLIC_MCP_REGISTRY_URL || DEFAULT_REGISTRY_URL;
  console.log('🌐 Fetching from:', registryUrl);

  try {
    const response = await fetch(registryUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const registryData: RegistryResponse = await response.json();
    console.log('📦 Raw registry data received:', {
      totalServers: registryData.servers.length
    });

    // Transform servers to our format
    const transformedServers = registryData.servers.map(transformRegistryServer);
    
    // Filter for NPX-only servers
    const npxServers = filterNpxServers(transformedServers);
    
    console.log('🔍 Registry processing complete:', {
      totalReceived: registryData.servers.length,
      npxSupported: npxServers.length,
      filtered: registryData.servers.length - npxServers.length,
      supportRate: `${Math.round((npxServers.length / registryData.servers.length) * 100)}%`
    });

    const processedRegistry: MCPServerDirectory = {
      servers: npxServers,
      lastFetched: new Date().toISOString(),
      version: '1.0'
    };

    // Cache the processed data
    saveCachedRegistry(processedRegistry);

    return processedRegistry;
  } catch (error) {
    console.error('❌ Error fetching MCP registry:', error);
    
    // Fallback to any cached data, even if expired
    try {
      const compressed = localStorage.getItem(CACHE_KEY);
      if (compressed) {
        const data = decompressData(compressed);
        const fallbackRegistry = JSON.parse(data) as MCPServerDirectory;
        console.log('⚠️ Using stale cached data as fallback');
        return fallbackRegistry;
      }
    } catch (fallbackError) {
      console.error('❌ Error loading fallback cache:', fallbackError);
    }
    
    throw new Error(`Failed to fetch MCP registry: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Clear cached registry data (useful for testing)
export function clearRegistryCache(): void {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  console.log('🧹 Registry cache cleared');
}

// Check if registry data is cached
export function isRegistryCached(): boolean {
  return isCacheValid() && localStorage.getItem(CACHE_KEY) !== null;
} 