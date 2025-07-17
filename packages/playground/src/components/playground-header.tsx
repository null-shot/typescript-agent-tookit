"use client";

import React from "react";
import Image from "next/image";
import { Package } from "lucide-react";
import { Button } from "./ui/button";
import { LocalToolboxStatusBadge, LocalToolboxStatus } from "./ui/local-toolbox-status";
import { cn } from "../lib/exports/utils";

export interface PlaygroundHeaderProps {
  className?: string;
  onInstallClick?: () => void;
  // Local toolbox state management
  isToolboxInstalled?: boolean;
  toolboxStatus?: LocalToolboxStatus;
}

export function PlaygroundHeader({ 
  className, 
  onInstallClick,
  isToolboxInstalled = false,
  toolboxStatus = "disconnected"
}: PlaygroundHeaderProps) {
  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-xl border border-white/20 flex justify-between items-center gap-6",
        className
      )}
      style={{
        background: 'transparent',
        padding: '40px',
        minHeight: '158px'
      }}
    >
      {/* Elliptical gradient background decoration using SVG */}
      <div 
        className="absolute z-0 pointer-events-none opacity-80" 
        style={{
          left: '-30.62px',
          top: '-123.92px',
          width: '308.34px',
          height: '342.59px'
        }}
      >
        <Image
          src="/images/ellipse.svg"
          alt=""
          width={308}
          height={343}
          className="w-full h-full"
          style={{ 
            width: '308.34px', 
            height: '342.59px' 
          }}
        />
      </div>

      {/* Left side content */}
      <div className="flex items-center gap-6 z-10">
        {/* Gears icon */}
        <div className="w-20 h-20 flex items-center justify-center flex-shrink-0">
          <Image
            src="/images/gears.png"
            alt="Gears Icon"
            width={80}
            height={80}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Text content */}
        <div className="flex flex-col gap-3">
          {/* Title row with status indicator */}
          <div className="flex items-center gap-3">
            <h1 className="text-white font-bold text-2xl leading-none font-['Space_Grotesk']">
              Playground
            </h1>
            {/* Show status badge next to title if toolbox is installed */}
            {isToolboxInstalled && (
              <LocalToolboxStatusBadge 
                status={toolboxStatus}
                showTooltip={true}
              />
            )}
          </div>
          <p className="text-white/80 text-base leading-[1.4] font-['Space_Grotesk'] max-w-[418px]">
            Control AI providers securely with your own API keys. Full flexibility, 
            transparent costs, and powerful multi-provider chat — running right on your machine.
          </p>
        </div>
      </div>

      {/* Right side - Install button only when not installed */}
      <div className="z-10">
        {!isToolboxInstalled && (
          <Button
            onClick={onInstallClick}
            variant="secondary"
            className="h-10 px-4 gap-2 font-['Space_Grotesk'] font-bold text-base rounded-xl"
            style={{
              backgroundColor: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF'
            }}
          >
            <Package className="h-4 w-4" />
            Install Local Toolbox
          </Button>
        )}
      </div>
    </div>
  );
} 