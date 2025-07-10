"use client";

import React from "react";
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
  Download,
} from "lucide-react";
import { MCPServer } from "@/types/mcp-server";
import { Button } from "./ui/button";

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
  onInstallFromGit?: () => void;
  onInstallFromNpm?: () => void;
  isLoading?: boolean;
  triggerClassName?: string;
}

export function InstallDropdown({
  onInstall,
  onInstallFromGit,
  onInstallFromNpm,
  isLoading = false,
  triggerClassName
}: InstallDropdownProps) {
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
          onClick={onInstall}
          className="text-white hover:bg-white/10 focus:bg-white/10"
        >
          <Download className="mr-2 h-4 w-4" />
          Install from Registry
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={onInstallFromGit}
          className="text-white hover:bg-white/10 focus:bg-white/10"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Install from Git
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={onInstallFromNpm}
          className="text-white hover:bg-white/10 focus:bg-white/10"
        >
          <Download className="mr-2 h-4 w-4" />
          Install from NPM
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 