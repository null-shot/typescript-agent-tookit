import React from "react";
import { cn } from "@/lib/utils";
import { MenuDropdown, MenuOption, SVGIcon } from "@/components/ui/menu-dropdown";

export interface ChatHeaderProps {
  title?: string;
  className?: string;
  onEdit?: () => void;
  menuOptions?: MenuOption[];
}

export function ChatHeader({ 
  title = "Chat with Vista", 
  className,
  onEdit,
  menuOptions
}: ChatHeaderProps) {
  // Default menu options if not provided
  const defaultMenuOptions: MenuOption[] = [
    { 
      label: "Search", 
      icon: "/images/chat/search-icon.svg",
      onClick: () => console.log("Search clicked") 
    },
    { 
      label: "Chat Logs", 
      icon: "/images/chat/align-justify-icon.svg",
      onClick: () => console.log("Chat Logs clicked") 
    },
    { 
      label: "Share Chat", 
      icon: "/images/chat/share-icon.svg",
      onClick: () => console.log("Share Chat clicked") 
    }
  ];

  const options = menuOptions || defaultMenuOptions;

  return (
    <div 
      className={cn(
        "flex justify-between items-center border-b",
        className
      )}
      style={{
        background: "#151515",
        borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
        padding: "12px 24px"
      }}
    >
      <h2 className="font-bold text-[16px] text-[rgba(255,255,255,0.8)] font-[var(--font-space-grotesk)]">
        {title}
      </h2>
      
      <div className="flex items-center gap-2">
        <button 
          className="flex items-center justify-center rounded-xl"
          onClick={onEdit}
          aria-label="Edit chat"
          style={{ 
            width: '36px', 
            height: '36px',
            padding: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0)'
          }}
        >
          <SVGIcon 
            src="/images/chat/square-pen-icon.svg"
            alt="Edit" 
            width={18} 
            height={18}
          />
        </button>
        
        <MenuDropdown 
          options={options}
          trigger={
            <button
              className="flex items-center justify-center rounded-xl"
              aria-label="Menu options"
              style={{ 
                width: '36px', 
                height: '36px',
                padding: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0)'
              }}
            >
              <SVGIcon 
                src="/images/chat/ellipsis-vertical-icon.svg"
                alt="Menu" 
                width={18} 
                height={18}
              />
            </button>
          }
        />
      </div>
    </div>
  );
} 