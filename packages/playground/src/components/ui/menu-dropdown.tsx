import React from "react";
import Image from "next/image";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface MenuOption {
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface MenuDropdownProps {
  options: MenuOption[];
  trigger: React.ReactNode;
  className?: string;
  align?: "start" | "end" | "center";
  withSeparators?: boolean;
}

// Simple SVG renderer component
export const SVGIcon = ({ 
  src, 
  alt, 
  width, 
  height, 
  className 
}: { 
  src: string, 
  alt: string, 
  width?: number, 
  height?: number, 
  className?: string 
}) => {
  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 16}
      height={height ?? 16}
      className={className}
      style={{ display: "inline-block" }}
    />
  );
};

export function MenuDropdown({
  options,
  trigger,
  className,
  align = "end",
  withSeparators = false
}: MenuDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger}
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align={align}
        className={cn("py-1 min-w-[160px]", className)}
        sideOffset={5}
        style={{
          background: "#1F2937",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "8px",
          padding: "4px"
        }}
      >
        {options.map((option, index) => (
          <React.Fragment key={index}>
            <DropdownMenuItem
              onClick={option.onClick}
              disabled={option.disabled}
              className="flex items-center px-2 py-1 text-[13px] rounded-md"
            >
              <div className="flex items-center justify-center mr-2">
                <SVGIcon 
                  src={option.icon}
                  alt=""
                  width={16}
                  height={16}
                />
              </div>
              <span className="text-[13px] leading-tight">
                {option.label}
              </span>
            </DropdownMenuItem>
            
            {withSeparators && index < options.length - 1 && (
              <DropdownMenuSeparator />
            )}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 