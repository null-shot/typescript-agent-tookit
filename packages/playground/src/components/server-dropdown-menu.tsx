"use client";

import React, { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MoreVertical, 
  Settings, 
  ExternalLink,
  Trash2,
  ChevronDown,
  Check,
} from "lucide-react";
import { MCPServer } from "@/types/mcp-server";
import { Button } from "./ui/button";
import { 
  InstallerType, 
  getInstallerPreference, 
  saveInstallerPreference 
} from "@/lib/storage";
import Image from "next/image";

// Docker icon component (SVG whale logo)
function DockerIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        d="M13.5 8.5h2v2h-2v-2zm-3 0h2v2h-2v-2zm-3 0h2v2h-2v-2zm6-3h2v2h-2v-2zm-3 0h2v2h-2v-2zm12.5 5.8c-.3-.2-.9-.3-1.4-.2-.1-.5-.4-.9-.8-1.2l-.3-.2-.2.3c-.4.5-.5 1.3-.1 1.9.1.2.2.3.3.4-.1 0-.3.1-.6.1H3.8l-.1.6c-.1.7.1 1.5.5 2.2.4.6 1 1.1 1.7 1.3.3.1.7.2 1.1.2 2.1 0 3.7-.9 4.7-2.6.6.1 1.9 0 2.6-1.4h.2c1 0 1.8-.3 2.3-1l.2-.3-.2-.2zm-19.3-2.1h2v2h-2v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2z" 
        fill="currentColor"
      />
    </svg>
  );
}

// Cursor icon component using the provided logo (made much lighter)
function CursorIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <Image 
      src="/images/cursor-logo.svg"
      alt="Cursor"
      width={16}
      height={16}
      className={className}
      style={{ filter: 'brightness(2.5) contrast(1.2) saturate(1.5)' }} // Much brighter and more visible
    />
  );
}

interface ServerActionsDropdownProps {
  server: MCPServer;
  onConfigure?: (server: MCPServer) => void;
  onUninstall?: (server: MCPServer) => void;
}

export function ServerActionsDropdown({
  server,
  onConfigure,
  onUninstall
}: ServerActionsDropdownProps) {
  const handleOpenDocumentation = () => {
    // Open GitHub repository in new tab
    const githubUrl = server.git_repository || server.homepage;
    if (githubUrl) {
      window.open(githubUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 text-white hover:bg-white/10"
        >
          <MoreVertical className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-48 bg-[#17181A] border-white/20"
      >
        <DropdownMenuItem 
          onClick={() => onConfigure?.(server)}
          className="text-white hover:bg-white/10 focus:bg-white/10"
        >
          <Settings className="mr-2 h-4 w-4" />
          Configure
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleOpenDocumentation}
          className="text-white hover:bg-white/10 focus:bg-white/10"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Open Documentation
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem 
          onClick={() => onUninstall?.(server)}
          className="text-red-400 hover:bg-red-500/10 focus:bg-red-500/10"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Uninstall
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface InstallDropdownProps {
  server: MCPServer;
  onInstall?: () => void;
  onInstallWithCursor?: () => void;
  onInstallerPreferenceChange?: (installerType: InstallerType) => void;
  isLoading?: boolean;
  triggerClassName?: string;
}

export function InstallDropdown({
  server,
  onInstall,
  onInstallWithCursor,
  onInstallerPreferenceChange,
  isLoading = false,
  triggerClassName
}: InstallDropdownProps) {
  const [currentInstaller, setCurrentInstaller] = useState<InstallerType>('local-toolbox');

  // Load installer preference on component mount - now per server
  useEffect(() => {
    setCurrentInstaller(getInstallerPreference(server.id));
  }, [server.id]);

  const handleInstallerChange = (installerType: InstallerType) => {
    setCurrentInstaller(installerType);
    saveInstallerPreference(server.id, installerType); // Save per server
    
    // Notify parent component of the preference change
    onInstallerPreferenceChange?.(installerType);
    
    // Execute the appropriate install action immediately
    if (installerType === 'local-toolbox') {
      onInstall?.();
    } else if (installerType === 'cursor') {
      onInstallWithCursor?.();
    }
  };



  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          disabled={isLoading}
          variant="outline"
          size="sm"
          className={triggerClassName}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-56 bg-[#17181A] border-white/20"
      >
        <DropdownMenuItem 
          onClick={() => handleInstallerChange('local-toolbox')}
          className="text-white hover:bg-white/10 focus:bg-white/10"
        >
          <DockerIcon className="mr-2 h-4 w-4" />
          <span className="flex-1">Local Toolbox</span>
          {currentInstaller === 'local-toolbox' && (
            <Check className="ml-2 h-4 w-4" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleInstallerChange('cursor')}
          className="text-white hover:bg-white/10 focus:bg-white/10"
        >
          <CursorIcon className="mr-2 h-4 w-4" />
          <span className="flex-1">Cursor</span>
          {currentInstaller === 'cursor' && (
            <Check className="ml-2 h-4 w-4" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 