import { Check, MessageSquare, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatCLP, vehicleLabels } from "@/lib/display"
import type { QuoteWithDriver } from "@/lib/types"

export function QuoteCard({
  quote,
  onAccept,
  accepting,
}: {
  quote: QuoteWithDriver
  onAccept: (id: string) => void
  accepting: boolean
}) {
  const driver = quote.driver
  const profile = driver.driverProfile
  const initials = driver.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?"

  return (
    <div className={cn(
      "rounded-[12px] border p-4 transition-colors",
      quote.status === "accepted" ? "border-primary bg-[#E7F4EE]" : "border-[#E9E7E3] bg-white"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[12px] font-bold text-primary">
            {initials}
          </div>
          <div>
            <div className="text-[13px] font-semibold text-[#121715]">{driver.name}</div>
            {profile && (
              <div className="flex items-center gap-1 text-[11px] text-[#969e9b]">
                {profile.avgRating != null && (
                  <>
                    <Star className="size-3 fill-amber-400 text-amber-400" />
                    <span>{Number(profile.avgRating).toFixed(1)}</span>
                    <span>·</span>
                  </>
                )}
                <span>{vehicleLabels[profile.vehicleType] ?? profile.vehicleType}</span>
                <span>·</span>
                <span className="font-mono uppercase tracking-wider">{profile.vehiclePlate}</span>
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[18px] font-bold text-[#121715]">{formatCLP(quote.price)}</div>
          {quote.status === "accepted" && (
            <div className="flex items-center justify-end gap-1 text-[11px] font-semibold text-primary">
              <Check className="size-3" strokeWidth={3} /> Aceptado
            </div>
          )}
        </div>
      </div>

      {quote.message && (
        <div className="mt-3 flex gap-2 rounded-[8px] bg-[#F5F4F0] px-3 py-2">
          <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-[#B0ABA5]" />
          <p className="text-[12px] leading-relaxed text-[#485450]">{quote.message}</p>
        </div>
      )}

      {quote.status === "pending" && (
        <Button
          size="sm"
          className="mt-3 w-full"
          disabled={accepting}
          onClick={() => onAccept(quote.id)}
        >
          {accepting ? "Aceptando..." : "Aceptar esta cotización"}
        </Button>
      )}
    </div>
  )
}
