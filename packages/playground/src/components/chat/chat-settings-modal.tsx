"use client";

import React, { useState, useEffect } from "react";
import { cn } from "../../lib/exports/utils";
import { X, Info, ChevronDown, Settings, RefreshCw, Database, Clock, Hash, Container, Copy, Check } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { 
  loadAIModelConfig, 
  saveAIModelConfig,
  AIModelConfig,
  generateDockerCommand,
  getOrCreateProxyId,
  getModels,
  refreshModelsCache,
  fetchMCPRegistry,
  clearRegistryCache,
  isRegistryCached
} from "../../lib/exports/storage";

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdate?: (config: AIModelConfig) => void;
  className?: string;
}

interface FormData {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: string;
}

const PROVIDER_OPTIONS = [
  { id: 'openai', name: 'OpenAI' },
  { id: 'anthropic', name: 'Anthropic' }
];

const MODEL_OPTIONS = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
  ],
  anthropic: [
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' }
  ]
};

export function ChatSettingsModal({ 
  isOpen, 
  onClose, 
  onConfigUpdate,
  className 
}: ChatSettingsModalProps) {
  const [activeTab, setActiveTab] = useState('ai-model');
  const [formData, setFormData] = useState<FormData>({
    provider: 'openai',
    apiKey: '',
    model: '',
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: '2000'
  });
  
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [refreshingModels, setRefreshingModels] = useState(false);

  // Registry state
  const [registryStats, setRegistryStats] = useState<{
    serverCount: number;
    lastFetched: string | null;
    isCached: boolean;
  }>({
    serverCount: 0,
    lastFetched: null,
    isCached: false
  });
  const [refreshingRegistry, setRefreshingRegistry] = useState(false);

  // Docker state
  const [dockerCommand, setDockerCommand] = useState<string>("");
  const [proxyId, setProxyId] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Load existing configuration on mount
  useEffect(() => {
    if (isOpen) {
      const config = loadAIModelConfig();
      if (config) {
        setFormData({
          provider: config.provider,
          apiKey: config.apiKey || '',
          model: config.model || '',
          systemPrompt: config.systemPrompt || '',
          temperature: config.temperature || 0.7,
          maxTokens: (config.maxTokens || 2000).toString()
        });
      }
      
      // Load registry stats
      loadRegistryStats();
      
      // Initialize Docker state
      const currentProxyId = getOrCreateProxyId();
      setProxyId(currentProxyId);
      setDockerCommand(generateDockerCommand(currentProxyId));
    }
  }, [isOpen]);

  // Fetch available models when provider or API key changes
  useEffect(() => {
    const fetchModels = async () => {
      if (!formData.apiKey || !formData.provider) {
        setAvailableModels(MODEL_OPTIONS[formData.provider] || []);
        return;
      }

      setLoadingModels(true);
      try {
        const models = await getModels(formData.provider, formData.apiKey);
        setAvailableModels(models.map(model => ({
          id: model.id,
          name: model.name
        })));
        setErrors(prev => ({ ...prev, apiKey: '' }));
      } catch (error) {
        console.error('Error fetching models:', error);
        setAvailableModels(MODEL_OPTIONS[formData.provider] || []);
        setErrors(prev => ({ ...prev, apiKey: 'Failed to connect to API. Please check your key.' }));
      } finally {
        setLoadingModels(false);
      }
    };

    const timeoutId = setTimeout(fetchModels, 500); // Debounce API calls
    return () => clearTimeout(timeoutId);
  }, [formData.provider, formData.apiKey]);

  const handleProviderChange = (provider: 'openai' | 'anthropic') => {
    setFormData(prev => ({
      ...prev,
      provider,
      model: '', // Reset model when provider changes
    }));
    setShowProviderDropdown(false);
  };

  const handleModelChange = (modelId: string) => {
    setFormData(prev => ({
      ...prev,
      model: modelId
    }));
    setShowModelDropdown(false);
  };

  const handleTemperatureChange = (value: number) => {
    setFormData(prev => ({
      ...prev,
      temperature: Math.max(0, Math.min(2, value))
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.apiKey.trim()) {
      newErrors.apiKey = 'API key is required';
    }

    if (!formData.model) {
      newErrors.model = 'Please select a model';
    }

    const maxTokens = parseInt(formData.maxTokens);
    if (isNaN(maxTokens) || maxTokens <= 0) {
      newErrors.maxTokens = 'Max tokens must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const config: AIModelConfig = {
      provider: formData.provider,
      apiKey: formData.apiKey,
      model: formData.model,
      systemPrompt: formData.systemPrompt || undefined,
      temperature: formData.temperature,
      maxTokens: parseInt(formData.maxTokens)
    };

    saveAIModelConfig(config);
    onConfigUpdate?.(config);
    onClose();
  };

  const handleCancel = () => {
    // Reset form to saved values
    const config = loadAIModelConfig();
    if (config) {
      setFormData({
        provider: config.provider,
        apiKey: config.apiKey || '',
        model: config.model || '',
        systemPrompt: config.systemPrompt || '',
        temperature: config.temperature || 0.7,
        maxTokens: (config.maxTokens || 2000).toString()
      });
    }
    setErrors({});
    onClose();
  };

  const handleRefreshModels = async () => {
    if (!formData.apiKey || !formData.provider) return;
    
    setRefreshingModels(true);
    try {
      const models = await refreshModelsCache(formData.provider, formData.apiKey);
      setAvailableModels(models.map(model => ({
        id: model.id,
        name: model.name
      })));
      setErrors(prev => ({ ...prev, apiKey: '' }));
    } catch (error) {
      console.error('Error refreshing models:', error);
      setErrors(prev => ({ ...prev, apiKey: 'Failed to refresh models. Please check your key.' }));
    } finally {
      setRefreshingModels(false);
    }
  };

  // Load registry statistics
  const loadRegistryStats = async () => {
    try {
      const isCached = isRegistryCached();
      let serverCount = 0;
      let lastFetched = null;

      // Try to get cached data info
      const timestamp = localStorage.getItem('mcp-registry-timestamp');
      if (timestamp) {
        lastFetched = new Date(parseInt(timestamp, 10)).toISOString();
      }

      // Get server count from cached data if available
      const cached = localStorage.getItem('mcp-registry-cache');
      if (cached) {
        try {
          const data = JSON.parse(atob(cached));
          const registry = JSON.parse(data);
          serverCount = registry.servers?.length || 0;
        } catch {
          // If decompression fails, try direct parsing
          try {
            const registry = JSON.parse(cached);
            serverCount = registry.servers?.length || 0;
          } catch {
            // Ignore parse errors
          }
        }
      }

      setRegistryStats({
        serverCount,
        lastFetched,
        isCached
      });
    } catch (error) {
      console.error('Failed to load registry stats:', error);
    }
  };

  // Copy Docker command to clipboard
  const copyDockerCommand = async () => {
    try {
      await navigator.clipboard.writeText(dockerCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy Docker command:', err);
    }
  };

  // Force refresh registry data
  const handleRefreshRegistry = async () => {
    setRefreshingRegistry(true);
    try {
      // Clear existing cache
      clearRegistryCache();
      
      // Fetch fresh data
      const registry = await fetchMCPRegistry();
      
      // Update stats
      setRegistryStats({
        serverCount: registry.servers.length,
        lastFetched: registry.lastFetched,
        isCached: true
      });
      
      console.log('✅ Registry refreshed successfully');
    } catch (error) {
      console.error('❌ Failed to refresh registry:', error);
    } finally {
      setRefreshingRegistry(false);
    }
  };

  if (!isOpen) return null;

  const selectedProvider = PROVIDER_OPTIONS.find(p => p.id === formData.provider);
  const selectedModel = availableModels.find(m => m.id === formData.model);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-all duration-500",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      
      {/* Side Drawer */}
      <div 
        className={cn(
          "fixed right-0 top-0 h-full bg-[#14161D] border-l border-[rgba(255,255,255,0.12)] z-50 flex flex-col",
          "transform transition-all duration-500 ease-out shadow-2xl",
          isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
          className
        )}
        style={{ width: "520px" }}
      >
        {/* Header */}
        <div className={cn(
          "flex justify-between items-center gap-6 p-6 border-b border-[rgba(255,255,255,0.12)] flex-shrink-0",
          "transform transition-all duration-700 delay-100",
          isOpen ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
        )}>
          <div className="flex items-center gap-3">
            <Settings size={20} className="text-white" />
            <span className="text-white font-bold text-xl">Settings</span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center text-white hover:bg-white/10 rounded transition-colors"
          >
            <X size={16} strokeWidth={1.2} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className={cn(
              "px-6 pt-4 flex-shrink-0",
              "transform transition-all duration-700 delay-200",
              isOpen ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
            )}>
              <TabsList className="grid w-full grid-cols-3 bg-[#323546] text-white">
                <TabsTrigger 
                  value="ai-model" 
                  className="data-[state=active]:bg-[#14161D] data-[state=active]:text-white"
                >
                  AI Model
                </TabsTrigger>
                <TabsTrigger 
                  value="docker" 
                  className="data-[state=active]:bg-[#14161D] data-[state=active]:text-white"
                >
                  Docker
                </TabsTrigger>
                <TabsTrigger 
                  value="storage" 
                  className="data-[state=active]:bg-[#14161D] data-[state=active]:text-white"
                >
                  Storage
                </TabsTrigger>
              </TabsList>
            </div>

            {/* AI Model Tab */}
            <TabsContent value="ai-model" className="flex-1 flex flex-col min-h-0">
              {/* Scrollable Content */}
              <div className={cn(
                "flex-1 overflow-y-auto px-6 py-6",
                "transform transition-all duration-700 delay-300",
                isOpen ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
              )}>
                <div className="flex flex-col gap-6">
                  {/* Provider Selection */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1">
                      <label className="text-white text-sm font-medium">Provider</label>
                      <span className="text-[#FD5353] text-sm">*</span>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                        className="w-full bg-[#323546] border border-transparent rounded-lg px-3 py-2.5 text-white text-sm flex items-center justify-between hover:bg-[#3a3d52] transition-colors"
                      >
                        <span className="text-white/80">{selectedProvider?.name || 'Select Provider'}</span>
                        <ChevronDown size={16} className="text-white" />
                      </button>
                      
                      {showProviderDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#323546] border border-white/20 rounded-lg shadow-lg z-10">
                          {PROVIDER_OPTIONS.map((provider) => (
                            <button
                              key={provider.id}
                              onClick={() => handleProviderChange(provider.id as 'openai' | 'anthropic')}
                              className="w-full px-3 py-2 text-left text-white/80 hover:bg-white/10 first:rounded-t-lg last:rounded-b-lg transition-colors"
                            >
                              {provider.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* API Key */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1">
                      <label className="text-white text-sm font-medium">API Key</label>
                      <span className="text-[#FD5353] text-sm">*</span>
                    </div>
                    <input
                      type="password"
                      value={formData.apiKey}
                      onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="Enter API Key"
                      className="w-full bg-[#323546] border border-transparent rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.apiKey && (
                      <div className="flex items-center gap-1 text-[#FD5353] text-xs">
                        <Info size={12} />
                        <span>{errors.apiKey}</span>
                      </div>
                    )}
                  </div>

                  {/* Model Selection */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <label className="text-white text-sm font-medium">Model</label>
                        <span className="text-[#FD5353] text-sm">*</span>
                      </div>
                      <button
                        onClick={handleRefreshModels}
                        disabled={refreshingModels || loadingModels || !formData.apiKey}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Refresh models"
                      >
                        <RefreshCw size={12} className={refreshingModels ? "animate-spin" : ""} />
                        <span>Refresh</span>
                      </button>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setShowModelDropdown(!showModelDropdown)}
                        disabled={loadingModels}
                        className="w-full bg-[#323546] border border-transparent rounded-lg px-3 py-2.5 text-white text-sm flex items-center justify-between hover:bg-[#3a3d52] transition-colors disabled:opacity-50"
                      >
                        <span className="text-white/80">
                          {loadingModels ? 'Loading models...' : (selectedModel?.name || 'Select Model')}
                        </span>
                        <ChevronDown size={16} className="text-white" />
                      </button>
                      
                      {showModelDropdown && !loadingModels && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#323546] border border-white/20 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                          {availableModels.map((model) => (
                            <button
                              key={model.id}
                              onClick={() => handleModelChange(model.id)}
                              className="w-full px-3 py-2 text-left text-white/80 hover:bg-white/10 first:rounded-t-lg last:rounded-b-lg transition-colors"
                            >
                              {model.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-white/60 text-xs">
                      <Info size={12} />
                      <span>{availableModels.length} Models Available</span>
                    </div>
                  </div>

                  {/* Advanced Settings */}
                  <div className="border-t border-white/12 pt-6">
                    <h3 className="text-white/80 text-base font-medium mb-6">Advanced Settings</h3>
                    
                    {/* System Prompt */}
                    <div className="flex flex-col gap-2 mb-6">
                      <label className="text-white text-sm font-medium">System Prompt</label>
                      <textarea
                        value={formData.systemPrompt}
                        onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                        placeholder="Enter your prompt"
                        rows={3}
                        className="w-full bg-[#323546] border border-transparent rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                      <div className="flex items-center gap-1 text-white/60 text-xs">
                        <Info size={12} />
                        <span>The system prompt sets the behavior and context for the AI assistant.</span>
                      </div>
                    </div>

                    {/* Temperature Slider */}
                    <div className="flex flex-col gap-2 mb-6">
                      <label className="text-white text-sm font-medium">Temperature: {formData.temperature.toFixed(1)}</label>
                      <div className="flex flex-col gap-1">
                        <div className="relative h-6 bg-[#EAECF0] rounded">
                          <div 
                            className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#7849EF] to-[#326CD8] rounded"
                            style={{ width: `${(formData.temperature / 2) * 100}%` }}
                          />
                          <div 
                            className="absolute w-5 h-5 bg-white border-2 border-gradient-to-r from-[#7849EF] to-[#326CD8] rounded-full shadow-lg cursor-pointer transform -translate-y-0.5"
                            style={{ left: `calc(${(formData.temperature / 2) * 100}% - 10px)` }}
                            onMouseDown={(e) => {
                              const slider = e.currentTarget.parentElement;
                              if (!slider) return;
                              
                              const handleMouseMove = (e: MouseEvent) => {
                                const rect = slider.getBoundingClientRect();
                                const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                                handleTemperatureChange(percentage * 2);
                              };
                              
                              const handleMouseUp = () => {
                                document.removeEventListener('mousemove', handleMouseMove);
                                document.removeEventListener('mouseup', handleMouseUp);
                              };
                              
                              document.addEventListener('mousemove', handleMouseMove);
                              document.addEventListener('mouseup', handleMouseUp);
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-white text-xs">
                          <span>Precise</span>
                          <span>Creative</span>
                        </div>
                      </div>
                    </div>

                    {/* Max Tokens */}
                    <div className="flex flex-col gap-2">
                      <label className="text-white text-sm font-medium">Max Tokens</label>
                      <input
                        type="number"
                        value={formData.maxTokens}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxTokens: e.target.value }))}
                        placeholder="e.g., 4096"
                        className="w-full bg-[#323546] border border-transparent rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {errors.maxTokens && (
                        <div className="flex items-center gap-1 text-[#FD5353] text-xs">
                          <Info size={12} />
                          <span>{errors.maxTokens}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-white/60 text-xs">
                        <Info size={12} />
                        <span>Maximum number of tokens to generate. Leave empty for model default</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fixed Action Buttons */}
              <div className={cn(
                "flex gap-4 p-6 border-t border-white/12 flex-shrink-0",
                "transform transition-all duration-700 delay-400",
                isOpen ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
              )}>
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 border border-white/20 text-white rounded-xl hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#7849EF] to-[#326CD8] text-white rounded-xl hover:opacity-90 transition-opacity"
                >
                  Confirm Changes
                </button>
              </div>
            </TabsContent>

            {/* Docker Tab */}
            <TabsContent value="docker" className="flex-1 flex flex-col min-h-0">
              {/* Scrollable Content */}
              <div className={cn(
                "flex-1 overflow-y-auto p-6",
                "transform transition-all duration-700 delay-300",
                isOpen ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
              )}>
                <div className="space-y-4">
                  <div className="text-white text-lg font-semibold">Docker Configuration</div>
                  
                  {/* Docker Run Command */}
                  <div className="bg-[#323546] rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Container size={16} className="text-white" />
                      <div className="text-white font-medium">Docker Run Command</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs text-white/60">
                        Copy and run this command to start the MCP Toolbox container:
                      </div>
                      <div className="relative">
                        <div className="bg-[#1a1b23] rounded-lg p-3 pr-12 font-mono text-sm text-white border border-white/10">
                          {dockerCommand}
                        </div>
                        <button
                          onClick={copyDockerCommand}
                          className="absolute right-2 top-2 p-1 hover:bg-white/10 rounded transition-colors"
                          title="Copy to clipboard"
                        >
                          {copied ? (
                            <Check size={16} className="text-green-500" />
                          ) : (
                            <Copy size={16} className="text-white/60" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Proxy ID Information */}
                  <div className="bg-[#323546] rounded-lg p-4 space-y-3">
                    <div className="text-white font-medium">Proxy Configuration</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/60">Proxy ID:</span>
                        <span className="text-white font-mono">{proxyId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Access Path:</span>
                        <span className="text-white font-mono">@/playground</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Port:</span>
                        <span className="text-white">11990</span>
                      </div>
                    </div>
                    <div className="text-xs text-white/40 leading-relaxed">
                      Use the proxy ID <code className="bg-white/10 px-1 rounded">@/playground</code> to access this toolbox instance in the future. 
                      The container will be accessible at <code className="bg-white/10 px-1 rounded">localhost:11990</code>.
                    </div>
                  </div>

                  {/* Docker Image Information */}
                  <div className="bg-[#323546] rounded-lg p-4 space-y-3">
                    <div className="text-white font-medium">Image Information</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/60">Registry:</span>
                        <span className="text-white">GitHub Container Registry</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Image:</span>
                        <span className="text-white font-mono text-xs">ghcr.io/null-shot/typescript-agent-framework/mcp-toolbox:pr-41</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Container Name:</span>
                        <span className="text-white">mcp-toolbox</span>
                      </div>
                    </div>
                    <div className="text-xs text-white/40 leading-relaxed">
                      The Docker image is hosted on GitHub Container Registry and will be updated in future releases.
                    </div>
                  </div>

                  {/* Quick Start Instructions */}
                  <div className="bg-[#323546] rounded-lg p-4 space-y-3">
                    <div className="text-white font-medium">Quick Start</div>
                    <div className="space-y-2 text-sm text-white/80">
                      <div className="flex items-start gap-2">
                        <span className="text-white/60 font-mono">1.</span>
                        <span>Ensure Docker Desktop is installed and running</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-white/60 font-mono">2.</span>
                        <span>Copy the Docker run command above</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-white/60 font-mono">3.</span>
                        <span>Run the command in your terminal</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-white/60 font-mono">4.</span>
                        <span>Access the toolbox using proxy ID <code className="bg-white/10 px-1 rounded">@/playground</code></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fixed Action Buttons for Docker Tab */}
              <div className={cn(
                "flex gap-4 p-6 border-t border-white/12 flex-shrink-0",
                "transform transition-all duration-700 delay-400",
                isOpen ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
              )}>
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 border border-white/20 text-white rounded-xl hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#7849EF] to-[#326CD8] text-white rounded-xl hover:opacity-90 transition-opacity"
                >
                  Confirm Changes
                </button>
              </div>
            </TabsContent>

            {/* Storage Tab */}
            <TabsContent value="storage" className="flex-1 flex flex-col min-h-0">
              {/* Scrollable Content */}
              <div className={cn(
                "flex-1 overflow-y-auto p-6",
                "transform transition-all duration-700 delay-300",
                isOpen ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
              )}>
                <div className="space-y-4">
                  <div className="text-white text-lg font-semibold">Storage Information</div>
                  
                  {/* Current Config Display */}
                  <div className="bg-[#323546] rounded-lg p-4 space-y-3">
                    <div className="text-white font-medium">Current AI Configuration</div>
                    {(() => {
                      const config = loadAIModelConfig();
                      if (config) {
                        return (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-white/60">Provider:</span>
                              <span className="text-white">{config.provider}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/60">Model:</span>
                              <span className="text-white">{config.model}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/60">Temperature:</span>
                              <span className="text-white">{config.temperature}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/60">Max Tokens:</span>
                              <span className="text-white">{config.maxTokens}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/60">API Key:</span>
                              <span className="text-white">
                                {config.apiKey ? '••••••••' : 'Not set'}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className="text-white/60 text-sm">No configuration found</div>
                      );
                    })()}
                  </div>

                  {/* Storage Stats */}
                  <div className="bg-[#323546] rounded-lg p-4 space-y-3">
                    <div className="text-white font-medium">Storage Usage</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/60">Total Items:</span>
                        <span className="text-white">{typeof window !== 'undefined' ? localStorage.length : 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Storage Used:</span>
                        <span className="text-white">
                          {typeof window !== 'undefined' ? 
                            Math.round(JSON.stringify(localStorage).length / 1024) + ' KB' : 
                            '0 KB'
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* MCP Registry Stats */}
                  <div className="bg-[#323546] rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database size={16} className="text-white" />
                        <div className="text-white font-medium">MCP Registry</div>
                      </div>
                      <button
                        onClick={handleRefreshRegistry}
                        disabled={refreshingRegistry}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Force refresh registry data"
                      >
                        <RefreshCw size={12} className={refreshingRegistry ? "animate-spin" : ""} />
                        <span>Refresh</span>
                      </button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-white/60 flex items-center gap-1">
                          <Hash size={12} />
                          Indexed Servers:
                        </span>
                        <span className="text-white font-medium">{registryStats.serverCount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/60 flex items-center gap-1">
                          <Clock size={12} />
                          Last Updated:
                        </span>
                        <span className="text-white text-xs">
                          {registryStats.lastFetched ? 
                            new Date(registryStats.lastFetched).toLocaleString() : 
                            'Never'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/60">Cache Status:</span>
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full",
                          registryStats.isCached ? 
                            "bg-green-500/20 text-green-400" : 
                            "bg-yellow-500/20 text-yellow-400"
                        )}>
                          {registryStats.isCached ? 'Cached' : 'Not Cached'}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-white/40 leading-relaxed">
                      Registry data shows NPX-compatible MCP servers. Data is cached for 15 minutes to improve performance.
                    </div>
                  </div>

                  {/* Clear Storage Button */}
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to clear all stored data? This will reset all settings.')) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Clear All Storage
                  </button>
                </div>
              </div>

              {/* Fixed Action Buttons for Storage Tab */}
              <div className={cn(
                "flex gap-4 p-6 border-t border-white/12 flex-shrink-0",
                "transform transition-all duration-700 delay-400",
                isOpen ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
              )}>
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 border border-white/20 text-white rounded-xl hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#7849EF] to-[#326CD8] text-white rounded-xl hover:opacity-90 transition-opacity"
                >
                  Confirm Changes
                </button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
} 