"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { 
  Dialog, 
  DialogContent, 
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Download, Copy, Check, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";

interface DockerInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstallationComplete?: () => void;
  proxyId?: string; // Optional proxyId to use instead of generating one
  reason?: 'initial' | 'mismatch'; // Reason for showing the modal
}

// Generate a random UUID for proxy-id
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function DockerInstallModal({ 
  isOpen, 
  onClose, 
  onInstallationComplete,
  proxyId: providedProxyId,
  reason = 'initial'
}: DockerInstallModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [currentProxyId, setCurrentProxyId] = useState<string>("");
  const [dockerCommand, setDockerCommand] = useState<string>("");
  const [copied, setCopied] = useState(false);
  
  // Step completion states
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'connected' | 'failed' | 'timeout'>('idle');
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // Initialize proxy ID and docker command
  useEffect(() => {
    if (isOpen) {
      let finalProxyId: string;
      
      if (providedProxyId) {
        // Use provided proxyId (for mismatch scenarios)
        finalProxyId = providedProxyId;
        // Update localStorage to match
        localStorage.setItem('playground_proxy_id', finalProxyId);
      } else {
        // Check if we already have a proxy ID stored
        const existingProxyId = localStorage.getItem('playground_proxy_id');
        finalProxyId = existingProxyId || generateUUID();
        
        if (!existingProxyId) {
          localStorage.setItem('playground_proxy_id', finalProxyId);
        }
      }
      
      setCurrentProxyId(finalProxyId);
      setDockerCommand(`docker run -d -p 11990:11990 --name mcp-toolbox -e PROXY_ID=${finalProxyId} ghcr.io/null-shot/typescript-agent-framework/mcp-toolbox:pr-41`);
    }
  }, [isOpen, providedProxyId]);

  // Check connection status
  const checkConnection = async () => {
    try {
      console.log('🔍 Checking connection to http://localhost:11990/health');
      const response = await fetch('http://localhost:11990/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json() as { status?: string };
        console.log('✅ Health check response:', data);
        if (data.status === 'ok') {
          setConnectionStatus('connected');
          setIsConnecting(false);
          onInstallationComplete?.();
          return true;
        }
      } else {
        console.log('❌ Health check failed with status:', response.status);
      }
    } catch (error) {
      console.log('❌ Connection check failed:', error);
    }
    return false;
  };

  // Start connection monitoring with better timeout handling
  const startConnectionCheck = () => {
    console.log('🚀 Starting connection check...');
    setIsConnecting(true);
    setConnectionStatus('checking');
    setConnectionAttempts(0);
    setCurrentStep(3);
    
    let attempts = 0;
    const maxQuickAttempts = 2; // Try 2 times quickly (10 seconds total)
    const maxTotalAttempts = 12; // Then continue for 1 more minute (5 second intervals)
    
    const checkInterval = setInterval(async () => {
      attempts++;
      setConnectionAttempts(attempts);
      console.log(`🔄 Connection attempt ${attempts}/${maxTotalAttempts}`);
      
      const isConnected = await checkConnection();
      if (isConnected) {
        console.log('🎉 Connection successful!');
        clearInterval(checkInterval);
        return;
      }
      
      // After quick attempts, show timeout option
      if (attempts >= maxQuickAttempts && attempts < maxTotalAttempts) {
        setConnectionStatus('timeout');
      }
      
      // Stop after max attempts
      if (attempts >= maxTotalAttempts) {
        console.log('⏰ Max attempts reached, stopping...');
        clearInterval(checkInterval);
        setConnectionStatus('failed');
        setIsConnecting(false);
      }
    }, 5000);

    // Initial immediate check
    checkConnection().then(isConnected => {
      if (isConnected) {
        console.log('🎉 Immediate connection successful!');
        clearInterval(checkInterval);
      }
    });
  };

  const retryConnection = () => {
    console.log('🔄 Retrying connection...');
    setConnectionStatus('checking');
    setConnectionAttempts(0);
    startConnectionCheck();
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(dockerCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      startConnectionCheck();
    }
  };

  const handleBack = () => {
    if (currentStep > 1 && !isConnecting) {
      setCurrentStep(currentStep - 1);
      if (currentStep === 3) {
        setConnectionStatus('idle');
        setConnectionAttempts(0);
      }
    }
  };

  const handleClose = () => {
    // Reset all states
    setCurrentStep(1);
    setIsConnecting(false);
    setConnectionStatus('idle');
    setConnectionAttempts(0);
    onClose();
  };

  const steps = [
    { id: 1, title: "Install Docker", description: "Download Docker Desktop" },
    { id: 2, title: "Start Toolbox", description: "Execute Docker command" },
    { id: 3, title: "Connect", description: "Verify connection" }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="p-0 border-none text-white rounded-xl overflow-hidden"
        style={{
          backgroundColor: '#14161D',
          borderRadius: '12px',
          width: '680px',
          maxWidth: '90vw',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column'
        }}
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Install Local Toolbox</DialogTitle>
        
        {/* Header */}
        <div className="w-full flex items-center justify-between" style={{ padding: '24px 32px 12px' }}>
          <h2 
            className="text-white font-bold" 
            style={{ 
              fontFamily: 'Space Grotesk', 
              fontWeight: 700, 
              fontSize: '20px', 
              lineHeight: '1em' 
            }}
          >
            {reason === 'mismatch' ? 'Restart Local Toolbox' : 'Install Local Toolbox'}
          </h2>
          <button 
            onClick={handleClose}
            className="flex items-center justify-center hover:opacity-80 focus:outline-none transition-opacity"
            style={{ 
              width: '24px', 
              height: '24px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer'
            }}
            aria-label="Close"
          >
            <X className="w-3 h-3 text-white" strokeWidth={1.2} />
          </button>
        </div>

        {/* Mismatch Warning */}
        {reason === 'mismatch' && (
          <div className="w-full" style={{ padding: '0 32px 16px' }}>
            <div 
              className="rounded-lg p-4 border-l-4"
              style={{
                backgroundColor: '#2D1B69',
                borderLeftColor: '#7849EF'
              }}
            >
              <p 
                className="text-white/90 text-sm"
                style={{
                  fontFamily: 'Space Grotesk',
                  fontWeight: 400,
                  fontSize: '14px',
                  lineHeight: '1.5em'
                }}
              >
                <strong>ProxyId Mismatch Detected:</strong> Your local server is running with a different ProxyId than expected. 
                Please restart your Docker container with the correct ProxyId shown below to ensure proper connection.
              </p>
            </div>
          </div>
        )}

        {/* Progress Stepper */}
        <div className="w-full flex items-center justify-center" style={{ padding: '0 32px 24px' }}>
          <div className="flex items-center" style={{ gap: '20px' }}>
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                {/* Step */}
                <div className="flex items-center" style={{ gap: '8px' }}>
                  <div 
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                      currentStep > step.id ? "bg-green-500 text-white" : 
                      currentStep === step.id ? "bg-blue-500 text-white" : 
                      "bg-gray-600 text-white"
                    )}
                  >
                    {currentStep > step.id ? "✓" : step.id}
                  </div>
                  <span 
                    className={cn(
                      "text-sm font-medium",
                      currentStep >= step.id ? "text-white" : "text-gray-400"
                    )}
                    style={{
                      fontFamily: 'Space Grotesk',
                      fontWeight: 500,
                      fontSize: '14px'
                    }}
                  >
                    {step.title}
                  </span>
                </div>

                {/* Connector line (not after last step) */}
                {index < steps.length - 1 && (
                  <div 
                    className={cn(
                      "h-px",
                      currentStep > step.id ? "bg-green-500" : "bg-gray-600"
                    )}
                    style={{ width: '60px' }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '0 32px' }}>
          <div style={{ width: '100%' }}>
            {/* Step 1: Install Docker Desktop */}
            {currentStep === 1 && (
              <div 
                className="rounded-lg"
                style={{ 
                  backgroundColor: '#323546',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px'
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Download className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 
                      className="font-semibold text-white text-lg"
                      style={{
                        fontFamily: 'Space Grotesk',
                        fontWeight: 600,
                        fontSize: '18px'
                      }}
                    >
                      Install Docker Desktop
                    </h3>
                    <p 
                      className="text-white/60 text-sm mt-1"
                      style={{
                        fontFamily: 'Space Grotesk',
                        fontWeight: 400,
                        fontSize: '14px'
                      }}
                    >
                      Docker Desktop is required to run the MCP toolbox container locally
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <p 
                    className="text-white/80"
                    style={{
                      fontFamily: 'Space Grotesk',
                      fontWeight: 400,
                      fontSize: '14px',
                      lineHeight: '1.5em'
                    }}
                  >
                    Click the button below to visit the official Docker installation page and download Docker Desktop for your operating system.
                  </p>
                  
                  <div className="flex items-center gap-4">
                    <Button 
                      onClick={() => window.open('https://docs.docker.com/get-started/get-docker/', '_blank')}
                      className="flex items-center gap-2"
                      style={{
                        background: 'linear-gradient(90deg, #7849EF 0%, #326CD8 100%)',
                        fontFamily: 'Space Grotesk',
                        fontWeight: 600
                      }}
                    >
                      <Download className="w-4 h-4" />
                      Download Docker Desktop
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Start MCP Toolbox */}
            {currentStep === 2 && (
              <div 
                className="rounded-lg"
                style={{ 
                  backgroundColor: '#323546',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px'
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Copy className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 
                      className="font-semibold text-white text-lg"
                      style={{
                        fontFamily: 'Space Grotesk',
                        fontWeight: 600,
                        fontSize: '18px'
                      }}
                    >
                      {reason === 'mismatch' ? 'Restart MCP Toolbox' : 'Start MCP Toolbox'}
                    </h3>
                    <p 
                      className="text-white/60 text-sm mt-1"
                      style={{
                        fontFamily: 'Space Grotesk',
                        fontWeight: 400,
                        fontSize: '14px'
                      }}
                    >
                      {reason === 'mismatch' 
                        ? 'Stop the current container and run this command with the correct ProxyId'
                        : 'Copy and run this command in your terminal to start the MCP toolbox'
                      }
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="relative">
                      <Input
                        value={dockerCommand}
                        readOnly
                        className="pr-12 text-sm font-mono bg-[#1a1b23] border-white/10 text-white"
                        style={{
                          fontFamily: 'Monaco, Consolas, monospace',
                          fontSize: '12px',
                          padding: '12px'
                        }}
                      />
                      <Button
                        onClick={copyToClipboard}
                        size="sm"
                        variant="ghost"
                        className="absolute right-2 top-2 h-8 w-8 p-0 hover:bg-white/10"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-white/60" />
                        )}
                      </Button>
                    </div>
                    
                    <div 
                      className="text-xs text-white/50 font-mono"
                      style={{
                        fontFamily: 'Monaco, Consolas, monospace'
                      }}
                    >
                      Proxy ID: {currentProxyId}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Connection Status */}
            {currentStep === 3 && (
              <div 
                className="rounded-lg"
                style={{ 
                  backgroundColor: '#323546',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px'
                }}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center",
                    connectionStatus === 'connected' ? "bg-green-500/20" :
                    connectionStatus === 'failed' ? "bg-red-500/20" :
                    connectionStatus === 'timeout' ? "bg-orange-500/20" :
                    "bg-yellow-500/20"
                  )}>
                    {connectionStatus === 'checking' ? (
                      <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                    ) : connectionStatus === 'connected' ? (
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    ) : connectionStatus === 'failed' ? (
                      <AlertCircle className="w-6 h-6 text-red-400" />
                    ) : connectionStatus === 'timeout' ? (
                      <AlertCircle className="w-6 h-6 text-orange-400" />
                    ) : (
                      <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                  <div>
                    <h3 
                      className="font-semibold text-white text-lg"
                      style={{
                        fontFamily: 'Space Grotesk',
                        fontWeight: 600,
                        fontSize: '18px'
                      }}
                    >
                      {connectionStatus === 'checking' && "Checking Connection..."}
                      {connectionStatus === 'connected' && "Successfully Connected!"}
                      {connectionStatus === 'failed' && "Connection Failed"}
                      {connectionStatus === 'timeout' && "Connection Taking Longer Than Expected"}
                      {connectionStatus === 'idle' && "Connecting..."}
                    </h3>
                    <p 
                      className="text-white/60 text-sm mt-1"
                      style={{
                        fontFamily: 'Space Grotesk',
                        fontWeight: 400,
                        fontSize: '14px'
                      }}
                    >
                      {connectionStatus === 'checking' && `Attempt ${connectionAttempts} - Waiting for Docker container to start...`}
                      {connectionStatus === 'connected' && "Your local MCP toolbox is now running and ready to use"}
                      {connectionStatus === 'failed' && "Please check that Docker is running and try again"}
                      {connectionStatus === 'timeout' && "The container may still be starting up. You can wait or try again."}
                      {connectionStatus === 'idle' && "Establishing connection to the toolbox"}
                    </p>
                  </div>
                </div>

                {/* Status Cards */}
                <div className="space-y-4">
                  {connectionStatus === 'checking' && (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <div>
                        <p 
                          className="text-blue-400 font-medium"
                          style={{
                            fontFamily: 'Space Grotesk',
                            fontWeight: 500,
                            fontSize: '14px'
                          }}
                        >
                          Checking connection... (Attempt {connectionAttempts})
                        </p>
                        <p 
                          className="text-blue-400/80 text-sm"
                          style={{
                            fontFamily: 'Space Grotesk',
                            fontWeight: 400,
                            fontSize: '12px'
                          }}
                        >
                          This may take a few moments while Docker starts the container
                        </p>
                      </div>
                    </div>
                  )}

                  {connectionStatus === 'timeout' && (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <AlertCircle className="w-5 h-5 text-orange-500" />
                      <div className="flex-1">
                        <p 
                          className="text-orange-400 font-medium"
                          style={{
                            fontFamily: 'Space Grotesk',
                            fontWeight: 500,
                            fontSize: '14px'
                          }}
                        >
                          Connection taking longer than expected
                        </p>
                        <p 
                          className="text-orange-400/80 text-sm"
                          style={{
                            fontFamily: 'Space Grotesk',
                            fontWeight: 400,
                            fontSize: '12px'
                          }}
                        >
                          The Docker container may still be starting. You can wait or retry.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={retryConnection}
                          size="sm"
                          className="bg-orange-500 hover:bg-orange-600 text-white"
                          style={{
                            fontFamily: 'Space Grotesk',
                            fontWeight: 600
                          }}
                        >
                          Retry
                        </Button>
                      </div>
                    </div>
                  )}

                  {connectionStatus === 'connected' && (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <p 
                          className="text-green-400 font-medium"
                          style={{
                            fontFamily: 'Space Grotesk',
                            fontWeight: 500,
                            fontSize: '14px'
                          }}
                        >
                          Connection successful!
                        </p>
                        <p 
                          className="text-green-400/80 text-sm"
                          style={{
                            fontFamily: 'Space Grotesk',
                            fontWeight: 400,
                            fontSize: '12px'
                          }}
                        >
                          Your local MCP toolbox is now running and ready to use
                        </p>
                      </div>
                    </div>
                  )}

                  {connectionStatus === 'failed' && (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      <div className="flex-1">
                        <p 
                          className="text-red-400 font-medium"
                          style={{
                            fontFamily: 'Space Grotesk',
                            fontWeight: 500,
                            fontSize: '14px'
                          }}
                        >
                          Connection failed
                        </p>
                        <p 
                          className="text-red-400/80 text-sm"
                          style={{
                            fontFamily: 'Space Grotesk',
                            fontWeight: 400,
                            fontSize: '12px'
                          }}
                        >
                          Please check that Docker is running and the command was executed correctly
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={retryConnection}
                          size="sm"
                          className="bg-red-500 hover:bg-red-600 text-white"
                          style={{
                            fontFamily: 'Space Grotesk',
                            fontWeight: 600
                          }}
                        >
                          Try Again
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div 
          className="w-full flex items-center justify-between border-t border-white/10"
          style={{ 
            padding: '16px 32px',
            marginTop: '24px'
          }}
        >
          {/* Left side - Back button */}
          <div>
            {currentStep > 1 && !isConnecting && (
              <Button 
                onClick={handleBack}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/5"
                style={{
                  fontFamily: 'Space Grotesk',
                  fontWeight: 600
                }}
              >
                Back
              </Button>
            )}
          </div>
          
          {/* Right side - Next/Done buttons */}
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleClose}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/5"
              style={{
                fontFamily: 'Space Grotesk',
                fontWeight: 600
              }}
            >
              {connectionStatus === 'connected' ? 'Done' : 'Cancel'}
            </Button>
            
            {currentStep < 3 && (
              <Button 
                onClick={handleNext}
                className="transition-opacity"
                style={{
                  background: 'linear-gradient(90deg, #7849EF 0%, #326CD8 100%)',
                  fontFamily: 'Space Grotesk',
                  fontWeight: 600
                }}
              >
                {currentStep === 1 ? "I've Installed Docker" : 'Start Connection Check'}
              </Button>
            )}
            
            {connectionStatus === 'connected' && (
              <Button 
                onClick={handleClose}
                style={{
                  background: 'linear-gradient(90deg, #7849EF 0%, #326CD8 100%)',
                  fontFamily: 'Space Grotesk',
                  fontWeight: 600
                }}
              >
                Continue to Playground
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 