import { Truck } from "lucide-react"
import { cn } from "@/lib/utils"

interface GonexoLogoProps {
  size?: "xs" | "sm" | "md" | "lg"
  className?: string
  wordmarkClassName?: string
}

const SIZE_MAP = {
  xs: { mark: "size-[22px] rounded-[5px]", icon: "size-3", text: "text-[14px]", gap: "gap-1.5" },
  sm: { mark: "size-[26px] rounded-[6px]", icon: "size-3.5", text: "text-[15px]", gap: "gap-2" },
  md: { mark: "size-8 rounded-lg",         icon: "size-4",   text: "text-[19px]", gap: "gap-2" },
  lg: { mark: "size-10 rounded-xl",        icon: "size-5",   text: "text-[22px]", gap: "gap-2.5" },
}

export function GonexoLogo({ size = "md", className, wordmarkClassName }: GonexoLogoProps) {
  const s = SIZE_MAP[size]
  return (
    <div className={cn("flex items-center", s.gap, className)}>
      <div className={cn("flex shrink-0 items-center justify-center bg-primary", s.mark)}>
        <Truck className={cn("text-white", s.icon)} />
      </div>
      <span className={cn("font-bold tracking-tight text-foreground", s.text, wordmarkClassName)}>
        gonexo
      </span>
    </div>
  )
}
