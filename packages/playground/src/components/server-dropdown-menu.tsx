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
  Package,
  Check,
} from "lucide-react";
import { MCPServer } from "@/types/mcp-server";
import { Button } from "./ui/button";
import { 
  InstallerType, 
  getInstallerPreference, 
  saveInstallerPreference 
} from "@/lib/storage";

// Cursor icon component (using SVG since Lucid doesn't have it)
function CursorIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M12 2L2 7v10c0 5.55 3.84 10 9 10s9-4.45 9-10V7l-10-5z"/>
      <path d="M12 22V12"/>
      <path d="M17 13L12 8L7 13"/>
    </svg>
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
  onInstall?: () => void;
  onInstallWithCursor?: () => void;
  isLoading?: boolean;
  triggerClassName?: string;
}

export function InstallDropdown({
  onInstall,
  onInstallWithCursor,
  isLoading = false,
  triggerClassName
}: InstallDropdownProps) {
  const [currentInstaller, setCurrentInstaller] = useState<InstallerType>('local-toolbox');

  // Load installer preference on component mount
  useEffect(() => {
    setCurrentInstaller(getInstallerPreference());
  }, []);

  const handleInstallerChange = (installerType: InstallerType) => {
    setCurrentInstaller(installerType);
    saveInstallerPreference(installerType);
    
    // Execute the appropriate install action
    if (installerType === 'local-toolbox') {
      onInstall?.();
    } else if (installerType === 'cursor') {
      onInstallWithCursor?.();
    }
  };

  const getInstallerIcon = (installerType: InstallerType) => {
    switch (installerType) {
      case 'local-toolbox':
        return <Package className="mr-2 h-4 w-4" />;
      case 'cursor':
        return <CursorIcon className="mr-2 h-4 w-4" />;
      default:
        return <Package className="mr-2 h-4 w-4" />;
    }
  };

  const getInstallerLabel = (installerType: InstallerType) => {
    switch (installerType) {
      case 'local-toolbox':
        return 'Local Toolbox';
      case 'cursor':
        return 'Cursor';
      default:
        return 'Local Toolbox';
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
          <Package className="mr-2 h-4 w-4" />
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