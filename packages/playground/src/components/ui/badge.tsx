import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/exports/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Tag variants matching Figma design
        raspberry: "border-transparent bg-[#67394F] text-white",
        brown: "border-transparent bg-[#785030] text-white", 
        violet: "border-transparent bg-[#4B3562] text-white",
        // Status badge variants
        success: "border-[#5CC489] bg-[rgba(92,196,137,0.12)] text-[#5CC489]",
        warning: "border-[#F7931A] bg-[rgba(247,147,26,0.12)] text-[#F7931A]",
        error: "border-[#FD5353] bg-[rgba(253,83,83,0.12)] text-[#FD5353]",
        // General tag variants for categories
        devtools: "border-transparent bg-[#6366F1]/20 text-[#6366F1] hover:bg-[#6366F1]/30",
        data: "border-transparent bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/30",
        analytics: "border-transparent bg-[#F59E0B]/20 text-[#F59E0B] hover:bg-[#F59E0B]/30",
        security: "border-transparent bg-[#EF4444]/20 text-[#EF4444] hover:bg-[#EF4444]/30",
        defi: "border-transparent bg-[#8B5CF6]/20 text-[#8B5CF6] hover:bg-[#8B5CF6]/30",
        ecommerce: "border-transparent bg-[#EC4899]/20 text-[#EC4899] hover:bg-[#EC4899]/30",
        compliance: "border-transparent bg-[#64748B]/20 text-[#64748B] hover:bg-[#64748B]/30",
        socialmedia: "border-transparent bg-[#3B82F6]/20 text-[#3B82F6] hover:bg-[#3B82F6]/30",
        marketing: "border-transparent bg-[#F97316]/20 text-[#F97316] hover:bg-[#F97316]/30",
        contentcreation: "border-transparent bg-[#06B6D4]/20 text-[#06B6D4] hover:bg-[#06B6D4]/30",
        collaboration: "border-transparent bg-[#84CC16]/20 text-[#84CC16] hover:bg-[#84CC16]/30",
        customerservice: "border-transparent bg-[#14B8A6]/20 text-[#14B8A6] hover:bg-[#14B8A6]/30",
        education: "border-transparent bg-[#8B5CF6]/20 text-[#8B5CF6] hover:bg-[#8B5CF6]/30",
        travel: "border-transparent bg-[#0EA5E9]/20 text-[#0EA5E9] hover:bg-[#0EA5E9]/30",
        productivity: "border-transparent bg-[#22C55E]/20 text-[#22C55E] hover:bg-[#22C55E]/30",
        research: "border-transparent bg-[#A855F7]/20 text-[#A855F7] hover:bg-[#A855F7]/30",
        entertainment: "border-transparent bg-[#F472B6]/20 text-[#F472B6] hover:bg-[#F472B6]/30",
        gaming: "border-transparent bg-[#EF4444]/20 text-[#EF4444] hover:bg-[#EF4444]/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants } 