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
  onAccept?: (id: string) => void
  accepting?: boolean
}) {
  const driver = quote.driver
  const profile = driver.driverProfile
  const driverInitials = driver.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?"
  const isAccepted = quote.status === "accepted"
  const isRejected = quote.status === "rejected"

  return (
    <div className={cn(
      "rounded-[12px] border p-4 transition-colors",
      isAccepted ? "border-primary bg-[#E7F4EE]" :
      isRejected ? "border-[#E9E7E3] bg-[#F9F8F6] opacity-60" :
      "border-[#E9E7E3] bg-white"
    )}>
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[12px] font-bold text-primary">
          {driverInitials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-semibold text-[#121715]">{driver.name}</span>
            {profile && (
              <span className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                profile.isVerified ? "bg-green-50 text-green-700" : "bg-[#F5F4F0] text-[#969e9b]"
              )}>
                {profile.isVerified ? "Verificado" : "Sin verificar"}
              </span>
            )}
          </div>
          {profile && (
            <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-[#969e9b]">
              {profile.avgRating != null && (
                <>
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                  <span>{Number(profile.avgRating).toFixed(1)}</span>
                  <span>·</span>
                </>
              )}
              <span>{profile.totalJobs} viajes</span>
              <span>·</span>
              <span>{vehicleLabels[profile.vehicleType] ?? profile.vehicleType}</span>
              {profile.vehicleCapacity && (
                <>
                  <span>·</span>
                  <span>{profile.vehicleCapacity}</span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="shrink-0 text-right">
          <div className={cn(
            "text-[18px] font-bold",
            isRejected ? "text-[#969e9b]" : "text-[#121715]"
          )}>
            {formatCLP(quote.price)}
          </div>
          {isAccepted && (
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

      {quote.status === "pending" && onAccept && (
        <Button
          size="sm"
          className="mt-3 w-full"
          disabled={accepting}
          onClick={() => onAccept(quote.id)}
        >
          {accepting ? "Aceptando..." : "Aceptar oferta"}
        </Button>
      )}
    </div>
  )
}
