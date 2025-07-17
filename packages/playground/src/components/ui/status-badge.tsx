import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CheckCircle, AlertCircle } from "lucide-react"

import { cn } from "../../lib/exports/utils"

const statusBadgeVariants = cva(
  "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-normal",
  {
    variants: {
      variant: {
        success: "border-[#5CC489] bg-[rgba(92,196,137,0.12)] text-[#5CC489]",
        warning: "border-[#F7931A] bg-[rgba(247,147,26,0.12)] text-[#F7931A]",
        error: "border-[#FD5353] bg-[rgba(253,83,83,0.12)] text-[#FD5353]",
      },
    },
    defaultVariants: {
      variant: "success",
    },
  }
)

const iconMap = {
  success: CheckCircle,
  warning: AlertCircle,
  error: AlertCircle,
}

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode
}

function StatusBadge({ className, variant = "success", children, ...props }: StatusBadgeProps) {
  const currentVariant = variant || "success"
  const Icon = iconMap[currentVariant]
  
  return (
    <div className={cn(statusBadgeVariants({ variant }), className)} {...props}>
      <Icon className="h-3.5 w-3.5" />
      <span className="opacity-80">{children}</span>
    </div>
  )
}

export { StatusBadge, statusBadgeVariants } 