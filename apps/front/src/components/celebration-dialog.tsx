import { useEffect } from "react"
import type { ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { warmConfetti } from "@/lib/celebrate"
import { cn } from "@/lib/utils"

const toneClasses = {
  primary: { ring: "bg-primary/15", medallion: "bg-primary text-white" },
  success: { ring: "bg-green-500/15", medallion: "bg-green-600 text-white" },
} as const

// Celebratory moment for the two peak client actions (accept quote, confirm
// reception). A toast is too fleeting for these; this owns the screen for a
// beat and hands off to the next step via the footer CTAs.
export function CelebrationDialog({
  open,
  onOpenChange,
  tone = "primary",
  icon,
  title,
  description,
  details,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tone?: keyof typeof toneClasses
  icon: ReactNode
  title: string
  description?: string
  details?: { label: string; value: string }[]
  children?: ReactNode
}) {
  // Warm the confetti worker on mount so the burst is instant when the dialog
  // opens, instead of paying worker-boot cost mid-celebration.
  useEffect(() => {
    warmConfetti()
  }, [])

  const t = toneClasses[tone]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-[400px]">
        <DialogHeader className="items-center pt-2 text-center">
          <div className="relative mb-1 flex size-16 items-center justify-center">
            <span className={cn("absolute inset-0 animate-ping rounded-full opacity-75 [animation-iteration-count:2]", t.ring)} />
            <span
              className={cn(
                "relative flex size-16 items-center justify-center rounded-full duration-500 animate-in zoom-in-50 [&>svg]:size-8",
                t.medallion
              )}
            >
              {icon}
            </span>
          </div>
          <DialogTitle className="text-[19px] font-bold text-foreground">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-[14px] leading-relaxed text-ink-soft">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {details && details.length > 0 && (
          <dl className="space-y-2.5 rounded-[12px] bg-muted/60 px-4 py-3.5">
            {details.map((d) => (
              <div key={d.label} className="flex items-center justify-between gap-3">
                <dt className="text-[13px] text-muted-foreground">{d.label}</dt>
                <dd className="text-right text-[13px] font-semibold text-foreground">{d.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {children && (
          <DialogFooter className="m-0 flex-col gap-2 border-none bg-transparent p-0 sm:flex-col">
            {children}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
