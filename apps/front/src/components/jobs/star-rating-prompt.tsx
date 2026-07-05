import { useState } from "react"
import { Check, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSubmitReview } from "@/hooks/use-request-mutations"

export function StarRatingPrompt({ jobId, label }: { jobId: string; label: string }) {
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(0)
  const submitReview = useSubmitReview(jobId)

  if (submitReview.isSuccess) {
    return (
      <div className="animate-in fade-in flex items-center gap-2 text-[13px] text-muted-foreground">
        <Check className="size-3.5 text-green-600" />
        Gracias por tu reseña
      </div>
    )
  }

  if (!expanded) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-[14px] font-medium text-ink-soft">{label}</p>
        <Button
          type="button"
          onClick={() => setExpanded(true)}
          className="h-9 shrink-0 bg-foreground px-3.5 text-[13px] font-semibold text-white hover:bg-foreground/90 active:scale-[0.96]"
        >
          <Star className="size-3.5 fill-white" data-icon="inline-start" />
          Valorar
        </Button>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in zoom-in-95 flex items-center justify-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Button
          key={n}
          type="button"
          variant="ghost"
          size="icon-lg"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => submitReview.mutate({ rating: n })}
          disabled={submitReview.isPending}
          className="size-10 rounded-full p-0 active:scale-[0.9]"
          aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
        >
          <Star
            className={cn(
              "size-6 transition-colors",
              n <= hovered ? "fill-amber-400 text-amber-400" : "fill-none text-ink-faint"
            )}
          />
        </Button>
      ))}
    </div>
  )
}
