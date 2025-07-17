"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "../../lib/exports/utils"

interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  isLoading?: boolean;
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, isLoading = false, disabled, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      // Cursor and interaction states
      isLoading 
        ? "cursor-default" // Not clickable when loading
        : disabled 
          ? "cursor-not-allowed opacity-50" 
          : "cursor-pointer",
      // Loading state: yellow/orange background
      isLoading 
        ? "bg-[#F7931A] border-[#F7931A]" 
        : "data-[state=checked]:bg-[#5CC489] data-[state=unchecked]:bg-[#323546] data-[state=unchecked]:border-[#323546]",
      className
    )}
    {...props}
    // Only disable if not loading - loading state takes priority
    disabled={isLoading ? false : disabled}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-[0px_4px_6px_-2px_rgba(0,0,0,0.05),0px_10px_15px_-3px_rgba(0,0,0,0.1)] ring-0 transition-transform",
        // Loading animation: show spinner instead of normal thumb movement
        isLoading 
          ? "translate-x-2.5" // Center the thumb when loading
          : "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
      )}
    >
      {/* Loading spinner inside the thumb when loading */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="w-3 h-3 animate-spin text-[#F7931A]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      )}
    </SwitchPrimitives.Thumb>
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch } 