import { Link } from "@tanstack/react-router"
import { Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCLP, formatCLPRange, formatCompactDateTime, requestStatusClasses, requestStatusLabels, volumeLabels } from "@/lib/display"
import type { RequestSummary } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export function RequestCard({ req }: { req: RequestSummary }) {
  const openQuotes = req.quotes.filter((q) => q.status === "pending")
  const pricedQuotes = req.quotes.filter((q) => q.status !== "cancelled" && q.status !== "expired")
  // Cheapest by representative price (priceMax); shown as its own range when present.
  const cheapest = pricedQuotes.length > 0
    ? pricedQuotes.reduce((a, b) => (a.price <= b.price ? a : b))
    : null
  const destination = req.job
    ? { to: "/jobs/$id" as const, params: { id: req.job.id } }
    : { to: "/requests/$id" as const, params: { id: req.id } }

  return (
    <Link {...destination} className="block">
      <Card className="h-full transition-shadow hover:shadow-sm">
        <CardContent>
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className={cn(requestStatusClasses[req.status])}>
              {requestStatusLabels[req.status]}
            </Badge>
            <span className="text-[13px] text-ink-faint">{formatCompactDateTime(req.scheduledAt)}</span>
          </div>

          <div className="mt-[14px] flex flex-col gap-[8px]">
            <div className="flex items-center gap-[8px]">
              <span className="size-[7px] shrink-0 rounded-full bg-primary" />
              <span className="text-[13px] font-medium leading-snug text-foreground">
                {req.originAddress}
              </span>
            </div>
            <div className="flex items-center gap-[8px]">
              <span className="size-[7px] shrink-0 rounded-full bg-muted-foreground" />
              <span className="text-[13px] font-medium leading-snug text-foreground">
                {req.destAddress}
              </span>
            </div>
          </div>

          <Separator className="my-[12px]" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[6px] text-ink-muted">
              <Package className="size-[12px]" />
              <span className="text-[12px]">{volumeLabels[req.volumeCategory]}</span>
            </div>

            {req.status === "open" && openQuotes.length > 0 ? (
              <Badge variant="secondary">
                {openQuotes.length} {openQuotes.length === 1 ? "oferta" : "ofertas"}
              </Badge>
            ) : cheapest != null ? (
              <span className="text-[15px] font-bold tabular-nums text-foreground">
                {cheapest.priceMin != null && cheapest.priceMax != null
                  ? formatCLPRange(cheapest.priceMin, cheapest.priceMax)
                  : formatCLP(cheapest.price)}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
