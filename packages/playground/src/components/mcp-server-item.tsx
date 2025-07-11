"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MCPServer } from "@/types/mcp-server";
import { Star, Package, ExternalLink, Download } from "lucide-react";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { ServerActionsDropdown, InstallDropdown } from "./server-dropdown-menu";
import { 
  InstallerType, 
  getInstallerPreference, 
  generateCursorDeeplink,
  loadMCPConfig 
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
  // Track local loading state for toggle operations
  const [isToggleLoading, setIsToggleLoading] = React.useState(false);
  const [currentInstaller, setCurrentInstaller] = React.useState<InstallerType>('local-toolbox');
  
  // Load installer preference on component mount
  React.useEffect(() => {
    setCurrentInstaller(getInstallerPreference());
  }, []);
  
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

  const handleInstallWithCursor = () => {
    try {
      // Get any existing configuration for this server
      const existingConfig = loadMCPConfig(server.id);
      
      // Generate the Cursor deeplink
      const deeplink = generateCursorDeeplink(server, existingConfig || undefined);
      
      // Open the deeplink
      window.open(deeplink, '_blank');
      
      console.log(`Generated Cursor deeplink for ${server.name}:`, deeplink);
    } catch (error) {
      console.error('Failed to generate Cursor deeplink:', error);
      // Fallback to showing an alert with manual instructions
      alert(`Failed to generate Cursor deeplink. Please install the MCP server manually in Cursor.`);
    }
  };

  const getInstallerIcon = () => {
    switch (currentInstaller) {
      case 'local-toolbox':
        return <Package className="w-3 h-3" />;
      case 'cursor':
        return <CursorIcon className="w-3 h-3" />;
      default:
        return <Package className="w-3 h-3" />;
    }
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
                      className="h-8 rounded-r-none border-r-0 border-white/20 bg-transparent text-white hover:bg-white/10 flex items-center gap-1.5"
                    >
                      {getInstallerIcon()}
                      {isLoading ? "Installing..." : "Install"}
                    </Button>
                    <InstallDropdown
                      onInstall={() => onInstall?.(server)}
                      onInstallWithCursor={handleInstallWithCursor}
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