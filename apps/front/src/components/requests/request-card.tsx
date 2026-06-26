import { Link } from "@tanstack/react-router"
import { Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCLP, formatCompactDateTime, requestStatusClasses, requestStatusLabels, volumeLabels } from "@/lib/display"
import type { RequestSummary } from "@/lib/types"

export function RequestCard({ req }: { req: RequestSummary }) {
  const openQuotes = req.quotes.filter((q) => q.status === "pending")
  const bestPrice = req.quotes.length > 0
    ? Math.min(...req.quotes.map((q) => q.price))
    : null

  return (
    <Link
      to="/requests/$id"
      params={{ id: req.id }}
      className="block rounded-[10px] border border-[#F0F0F0] bg-white p-[18px] shadow-[0_1px_6px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition-shadow"
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-[10px] py-[3px] text-[11px] font-semibold",
            requestStatusClasses[req.status]
          )}
        >
          {requestStatusLabels[req.status]}
        </span>
        <span className="text-[13px] text-[#AAAAAA]">{formatCompactDateTime(req.scheduledAt)}</span>
      </div>

      <div className="mt-[14px] flex flex-col gap-[8px]">
        <div className="flex items-center gap-[8px]">
          <span className="size-[7px] shrink-0 rounded-full bg-[#22C55E]" />
          <span className="text-[13px] font-medium text-foreground leading-snug">
            {req.originAddress}
          </span>
        </div>
        <div className="flex items-center gap-[8px]">
          <span className="size-[7px] shrink-0 rounded-full bg-[#F97316]" />
          <span className="text-[13px] font-medium text-foreground leading-snug">
            {req.destAddress}
          </span>
        </div>
      </div>

      <div className="mt-[14px] flex items-center justify-between border-t border-[#F5F5F5] pt-[12px]">
        <div className="flex items-center gap-[6px] text-[#888888]">
          <Package className="size-[12px]" />
          <span className="text-[12px]">{volumeLabels[req.volumeCategory]}</span>
        </div>

        {req.status === "open" && openQuotes.length > 0 ? (
          <span className="rounded-[8px] bg-[#FFF4ED] px-[10px] py-[4px] text-[12px] font-medium text-[#F97316]">
            {openQuotes.length} {openQuotes.length === 1 ? "cotización" : "cotizaciones"}
          </span>
        ) : bestPrice != null ? (
          <span className="text-[15px] font-bold text-foreground">
            {formatCLP(bestPrice)}
          </span>
        ) : null}
      </div>
    </Link>
  )
}
