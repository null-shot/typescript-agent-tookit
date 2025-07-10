"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MCPServer } from "@/types/mcp-server";
import { loadMCPConfig } from "@/lib/storage";
import { Star } from "lucide-react";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { ServerActionsDropdown, InstallDropdown } from "./server-dropdown-menu";

export interface MCPServerItemProps {
  server: MCPServer;
  isEnabled?: boolean;
  isInstalled?: boolean;
  isLoading?: boolean;
  serverState?: {
    installationState: 'not-installed' | 'installed-disabled' | 'installed-enabled';
    hasConfiguration: boolean;
    isConfigured: boolean;
    isRunning: boolean;
  };
  onInstall?: (server: MCPServer) => void;
  onConfigure?: (server: MCPServer) => void;
  onToggle?: (server: MCPServer, enabled: boolean) => void;
  className?: string;
}

export function MCPServerItem({
  server,
  isEnabled = false,
  isInstalled = false,
  isLoading = false,
  serverState,
  onInstall,
  onConfigure,
  onToggle,
  className
}: MCPServerItemProps) {
  // Check if server requires configuration and is configured
  const requiresConfiguration = server.inputs && server.inputs.length > 0;
  const configuration = requiresConfiguration ? loadMCPConfig(server.id) : null;
  
  // Track local loading state for toggle operations
  const [isToggleLoading, setIsToggleLoading] = React.useState(false);
  
  // Determine display state based on serverState or fallback to props
  const displayState = serverState?.installationState || 
    (isEnabled ? 'installed-enabled' : 
     isInstalled ? 'installed-disabled' : 'not-installed');

  const handleToggle = async (checked: boolean) => {
    if (isToggleLoading) return; // Prevent multiple clicks during loading
    
    console.log(`Toggle started for ${server.name}: ${checked}, isLoading: ${isLoading}, isToggleLoading: ${isToggleLoading}`);
    
    setIsToggleLoading(true);
    try {
      await onToggle?.(server, checked);
    } catch (error) {
      console.error(`Toggle failed for ${server.name}:`, error);
    } finally {
      // Reset loading state after a delay to show the animation
      // Use a longer delay to ensure the backend operation completes
      setTimeout(() => {
        console.log(`Toggle completed for ${server.name}, resetting loading state`);
        setIsToggleLoading(false);
      }, 1000); // Increased from 500ms to 1000ms
    }
  };

  const handleInstall = () => {
    onInstall?.(server);
  };



  // Map tags to badge variants - using parsedTags from the new format
  const getTagVariant = (tag: string): "raspberry" | "brown" | "violet" | "productivity" | "devtools" | "data" => {
    const tagMap: Record<string, "raspberry" | "brown" | "violet" | "productivity" | "devtools" | "data"> = {
      "design": "violet",
      "dev tools": "devtools", 
      "ai": "raspberry",
      "documentation": "brown",
      "search": "data",
      "cloud": "data",
      "utilities": "productivity",
      "productivity": "productivity",
      "time management": "brown",
      "collaboration": "raspberry",
      "version control": "devtools",
      "data": "data",
    };
    return tagMap[tag.toLowerCase()] || "brown";
  };

  // Use parsedTags if available, fallback to keywords for backward compatibility
  const displayTags = server.parsedTags && server.parsedTags.length > 0 ? server.parsedTags : (server.keywords || []);
  const visibleTags = displayTags.slice(0, 3); // Show only 3 tags to ensure single line
  const remainingTags = displayTags.slice(3);
  const remainingTagsCount = remainingTags.length;

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex flex-col gap-3 p-5 rounded-xl transition-all duration-200 max-w-[400px] w-full",
          "bg-gradient-to-br from-white/[0.08] to-black/[0.08] border border-white/20",
          "hover:border-purple-500",
          displayState === 'installed-enabled' && "border-[#5CC489]",
          className
        )}
      >
        {/* Main content */}
        <div className="flex flex-col gap-3 flex-1">
          {/* Header with title, rating and actions */}
          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col gap-1">
                <h3 className="font-bold text-base text-white leading-tight">
                  {server.name}
                </h3>
                <div className="flex items-center gap-2 text-sm">
                  {server.author && (
                    <>
                      <span className="text-white/60">by {server.author}</span>
                      <div className="w-0 h-4 border-l border-white/12" />
                    </>
                  )}
                  {server.popularity && (
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-[#FFDB70] fill-current" strokeWidth={1.4} />
                      <span className="text-xs text-white/80">{server.popularity}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {displayState === 'installed-enabled' ? (
                // Enabled state: Green switch + 3-dots menu (from Figma design)
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={true}
                    onCheckedChange={handleToggle}
                    disabled={false}
                    isLoading={isToggleLoading || isLoading}
                  />
                  <ServerActionsDropdown
                    server={server}
                    onConfigure={onConfigure}
                    onUninstall={(server) => {
                      if (!isToggleLoading) {
                        onToggle?.(server, false);
                      }
                    }}
                  />
                </div>
              ) : displayState === 'installed-disabled' ? (
                // Installed but disabled: Gray switch + 3-dots menu
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={false}
                    onCheckedChange={handleToggle}
                    disabled={false}
                    isLoading={isToggleLoading || isLoading}
                  />
                  <ServerActionsDropdown
                    server={server}
                    onConfigure={onConfigure}
                    onUninstall={(server) => {
                      if (!isToggleLoading) {
                        onToggle?.(server, false);
                      }
                    }}
                  />
                </div>
              ) : (
                // Not installed: Install button + dropdown + 3-dots menu
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    <Button
                      onClick={handleInstall}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-r-none border-r-0 border-white/20 bg-transparent text-white hover:bg-white/10"
                    >
                      {isLoading ? "Installing..." : "Install"}
                    </Button>
                    <InstallDropdown
                      onInstall={() => onInstall?.(server)}
                      isLoading={isLoading}
                      triggerClassName="h-8 w-8 p-0 rounded-l-none border-white/20 bg-transparent text-white hover:bg-white/10"
                    />
                  </div>
                  <ServerActionsDropdown
                    server={server}
                    onConfigure={onConfigure}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-white/80 leading-[1.4] font-light">
            {server.shortDescription}
          </p>
        </div>



        {/* Tags - Moved to bottom to eliminate empty space */}
        {displayTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-hidden mt-auto">
            {visibleTags.map((tag, index) => (
              <Badge
                key={index}
                variant={getTagVariant(tag)}
                className="h-6 px-3 py-1 text-xs font-medium rounded-md flex-shrink-0"
              >
                {tag}
              </Badge>
            ))}
            {remainingTagsCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="brown"
                    className="h-6 px-2 py-1 text-xs font-medium rounded-md flex-shrink-0 cursor-help"
                  >
                    +{remainingTagsCount}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="flex flex-wrap gap-1">
                    {remainingTags.map((tag, index) => (
                      <span key={index} className="text-xs">
                        {tag}{index < remainingTags.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
} 