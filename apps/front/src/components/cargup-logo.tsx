import { cn } from "@/lib/utils"

interface CargUpLogoProps {
  size?: "xs" | "sm" | "md" | "lg"
  className?: string
  wordmarkClassName?: string
}

const SIZE_MAP = {
  xs: { mark: "h-7 w-6", text: "text-[14px]", gap: "gap-1.5" },
  sm: { mark: "h-8 w-7", text: "text-[16px]", gap: "gap-2" },
  md: { mark: "h-9 w-8", text: "text-[20px]", gap: "gap-2" },
  lg: { mark: "h-11 w-10", text: "text-[24px]", gap: "gap-2.5" },
}

function CargUpMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 60" aria-hidden="true" className={className}>
      <path d="M10 19v15c0 9 12 11 15 2l2-7c3-8 13-7 13 2 0 8-9 10-14 5v14" fill="none" stroke="currentColor" strokeWidth="9" />
      <path d="M10 19v15c0 9 12 11 15 2l2-7c3-8 13-7 13 2 0 8-9 10-14 5v14" fill="none" stroke="white" strokeWidth="1.7" strokeDasharray="4 4" />
      <path d="M10 1 2 13h5v7h6v-7h5L10 1Z" fill="#e51920" />
      <circle cx="26" cy="56" r="3.5" fill="currentColor" />
    </svg>
  )
}

export function CargUpLogo({ size = "md", className, wordmarkClassName }: CargUpLogoProps) {
  const styles = SIZE_MAP[size]
  return (
    <div className={cn("flex items-center", styles.gap, className)} aria-label="CargUp">
      <CargUpMark className={cn("shrink-0 text-foreground", styles.mark)} />
      <span className={cn("font-heading font-bold tracking-[-0.045em] text-foreground", styles.text, wordmarkClassName)}>
        Carg<span className="text-primary">Up</span>
      </span>
    </div>
  )
}
