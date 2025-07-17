"use client";

import React, { useState, useEffect } from "react";
import { cn } from "../lib/exports/utils";
import { MCPServer, MCPServerConfigData, saveMCPConfig, loadMCPConfig } from "../lib/exports/storage";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export interface MCPConfigurationDrawerProps {
  server: MCPServer | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (server: MCPServer, config: MCPServerConfigData) => Promise<void>;
  isLoading?: boolean;
}

export function MCPConfigurationDrawer({
  server,
  isOpen,
  onClose,
  onSave,
  isLoading = false
}: MCPConfigurationDrawerProps) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Load existing configuration when server changes
  useEffect(() => {
    if (server) {
      const existingConfig = loadMCPConfig(server.id);
      if (existingConfig) {
        setInputs(existingConfig.inputs);
      } else {
        // Initialize with empty values
        const initialInputs: Record<string, string> = {};
        server.inputs?.forEach(input => {
          initialInputs[input.id] = '';
        });
        setInputs(initialInputs);
      }
      setErrors({});
    }
  }, [server]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setErrors({});
      setIsSaving(false);
    }
  }, [isOpen]);

  const validateInputs = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    server?.inputs?.forEach(input => {
      const value = inputs[input.id]?.trim();
      if (!value) {
        newErrors[input.id] = `${input.description.split('(')[0].trim()} is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (inputId: string, value: string) => {
    setInputs(prev => ({ ...prev, [inputId]: value }));
    
    // Clear error when user starts typing
    if (errors[inputId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[inputId];
        return newErrors;
      });
    }
  };

  const handleSave = async () => {
    if (!server || !validateInputs()) {
      return;
    }

    setIsSaving(true);

    try {
      const config: MCPServerConfigData = {
        serverId: server.id,
        inputs,
        isConfigured: true,
        isEnabled: false, // Will be enabled after successful installation
        configuredAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      // Save to localStorage
      saveMCPConfig(config);

      // Call the save handler which will install the MCP server
      await onSave(server, config);

      onClose();
    } catch (error) {
      console.error('Error saving MCP configuration:', error);
      setErrors({ general: 'Failed to save configuration. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const isConfigured = server ? loadMCPConfig(server.id)?.isConfigured : false;

  if (!server) return null;

      return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent 
          side="right" 
          className="bg-[#0A0A0B] border-[rgba(255,255,255,0.1)] w-[500px] sm:w-[600px] lg:w-[700px]"
        >
          <SheetHeader className="pb-8 px-6 pt-6">
            <SheetTitle className="text-2xl font-semibold text-white/95 text-left">
              {isConfigured ? 'Update Configuration' : 'Configure MCP Server'}
            </SheetTitle>
            <SheetDescription className="text-white/60 mt-3 text-left">
              {server.name}
            </SheetDescription>
            <p className="text-sm text-white/50 mt-3 leading-relaxed text-left">
              {server.shortDescription}
            </p>
          </SheetHeader>
            
          <div className="px-6 pb-8 space-y-8 flex-1 overflow-y-auto">
            {/* General error */}
            {errors.general && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-sm text-red-400">{errors.general}</p>
              </div>
            )}

            {/* Configuration inputs */}
            {server.inputs?.map((input) => (
              <div key={input.id} className="space-y-3">
                <Label 
                  htmlFor={input.id}
                  className="text-sm font-medium text-white/90 block"
                >
                  {input.description}
                  {input.password && (
                    <span className="ml-2 text-xs text-yellow-400 font-normal">🔒 Secure</span>
                  )}
                </Label>
                <Input
                  id={input.id}
                  type={input.password ? "password" : "text"}
                  value={inputs[input.id] || ''}
                  onChange={(e) => handleInputChange(input.id, e.target.value)}
                  placeholder={`Enter ${input.description.split('(')[0].trim().toLowerCase()}...`}
                  className={cn(
                    "bg-[#17181A] border-[rgba(255,255,255,0.2)] text-white/90 placeholder:text-white/40 h-11",
                    "focus:border-[rgba(114,255,192,0.5)] focus:ring-[rgba(114,255,192,0.2)]",
                    "transition-colors duration-200",
                    errors[input.id] && "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
                  )}
                />
                {errors[input.id] && (
                  <p className="text-sm text-red-400 mt-2">{errors[input.id]}</p>
                )}
              </div>
            ))}

            {/* Documentation link */}
            {server.documentation && (
              <div className="p-4 bg-[rgba(255,255,255,0.02)] rounded-lg border border-[rgba(255,255,255,0.1)]">
                <p className="text-sm text-white/60 mb-3">Need help getting API keys?</p>
                <a
                  href={server.documentation}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#72FFC0] hover:text-[#72FFC0]/80 underline transition-colors"
                >
                  View documentation →
                </a>
              </div>
            )}
          </div>

          <SheetFooter className="flex flex-row gap-4 p-6 border-t border-[rgba(255,255,255,0.1)]">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1 h-11 bg-transparent border-[rgba(255,255,255,0.2)] text-white/80 hover:bg-[rgba(255,255,255,0.05)]"
              disabled={isSaving || isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className={cn(
                "flex-1 h-11 bg-[#72FFC0] text-black font-medium hover:bg-[#72FFC0]/90",
                "disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              )}
            >
              {isSaving || isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  {isConfigured ? 'Updating...' : 'Installing...'}
                </div>
              ) : (
                isConfigured ? 'Update Configuration' : 'Install & Configure'
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
} 