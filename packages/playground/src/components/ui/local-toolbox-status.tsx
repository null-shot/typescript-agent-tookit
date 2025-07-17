"use client";

import React from "react";
import { CheckCircle, AlertCircle, AlertTriangle } from "lucide-react";
import { cn } from "../../lib/exports/utils";

export type LocalToolboxStatus = "online" | "offline" | "cannot_connect" | "error" | "disconnected";

export interface LocalToolboxStatusBadgeProps {
  status: LocalToolboxStatus;
  className?: string;
  showTooltip?: boolean;
}

const statusConfig = {
  online: {
    icon: CheckCircle,
    text: "Local Toolbox Online",
    bgColor: "rgba(92, 196, 137, 0.12)",
    borderColor: "#5CC489",
    textColor: "#5CC489",
    iconColor: "#5CC489",
    tooltip: "Docker Toolbox is running and MCP Proxy is connected"
  },
  offline: {
    icon: AlertTriangle,
    text: "Local Toolbox Offline", 
    bgColor: "rgba(247, 147, 26, 0.12)",
    borderColor: "#F7931A",
    textColor: "#F7931A",
    iconColor: "#F7931A",
    tooltip: "Docker Toolbox container is not running. Start the Docker container to enable tools."
  },
  cannot_connect: {
    icon: AlertCircle,
    text: "Local Toolbox - Cannot Connect",
    bgColor: "rgba(253, 83, 83, 0.12)",
    borderColor: "#FD5353",
    textColor: "#FD5353",
    iconColor: "#FD5353",
    tooltip: "Docker Toolbox is running but the MCP Proxy service (port 6050) is not available. Check if the MCP Proxy is started."
  },
  error: {
    icon: AlertCircle,
    text: "Local Toolbox Error",
    bgColor: "rgba(253, 83, 83, 0.12)",
    borderColor: "#FD5353",
    textColor: "#FD5353",
    iconColor: "#FD5353",
    tooltip: "An error occurred while checking toolbox status"
  },
  // Legacy status for backward compatibility
  disconnected: {
    icon: AlertCircle,
    text: "Local Toolbox Disconnected", 
    bgColor: "rgba(247, 147, 26, 0.12)",
    borderColor: "#F7931A",
    textColor: "#F7931A",
    iconColor: "#F7931A",
    tooltip: "Local toolbox is not installed or configured"
  }
};

export function LocalToolboxStatusBadge({ 
  status, 
  className,
  showTooltip = true
}: LocalToolboxStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const badge = (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-3 font-['Space_Grotesk'] text-xs font-normal opacity-80",
        className
      )}
      style={{
        backgroundColor: config.bgColor,
        border: `1px solid ${config.borderColor}`,
        height: '24px',
        color: config.textColor
      }}
    >
      <Icon 
        className="w-3.5 h-3.5" 
        style={{ color: config.iconColor }}
        strokeWidth={1.2}
      />
      <span>{config.text}</span>
    </div>
  );

  if (showTooltip && config.tooltip) {
    return (
      <div className="relative group">
        {badge}
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 max-w-xs">
          {config.tooltip}
          {/* Arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    );
  }

  return badge;
} 