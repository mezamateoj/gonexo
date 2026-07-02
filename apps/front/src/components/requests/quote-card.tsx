import { Check, MessageSquare, ShieldCheck, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatCLP, formatCLPRange, vehicleLabels } from "@/lib/display"
import type { PublicDriverProfile, QuoteWithDriver } from "@/lib/types"

// Distinguishes a document-verified driver from one with a merely complete
// profile — "verified" is a trust signal, "complete" is just onboarded.
function TrustBadge({ profile }: { profile: PublicDriverProfile }) {
  if (profile.isVerified && profile.documentsStatus === "verified") {
    return (
      <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
        <ShieldCheck className="size-2.5" /> Verificado
      </span>
    )
  }
  if (profile.documentsStatus === "submitted") {
    return (
      <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
        Documentos en revisión
      </span>
    )
  }
  return (
    <span className="shrink-0 rounded-full bg-[#F5F4F0] px-2 py-0.5 text-[10px] font-medium text-[#969e9b]">
      Sin verificar
    </span>
  )
}

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
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[13px] font-semibold text-[#121715]">{driver.name}</span>
            {profile && <TrustBadge profile={profile} />}
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
      </div>

      {/* Own row, not squeezed beside the name/badge — a range string can run wide */}
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-black/[0.04] pt-2.5">
        <div className={cn(
          "text-[18px] font-bold tabular-nums",
          isRejected ? "text-[#969e9b]" : "text-[#121715]"
        )}>
          {quote.priceMin != null && quote.priceMax != null
            ? formatCLPRange(quote.priceMin, quote.priceMax)
            : formatCLP(quote.price)}
        </div>
        {isAccepted && (
          <div className="flex items-center gap-1 text-[11px] font-semibold text-primary">
            <Check className="size-3" strokeWidth={3} /> Aceptado
          </div>
        )}
      </div>

      {quote.message && (
        <div className="mt-3 flex gap-2 rounded-[8px] bg-[#F5F4F0] px-3 py-2">
          <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-[#B0ABA5]" />
          <p className="text-[12px] leading-relaxed text-[#485450]">{quote.message}</p>
        </div>
      )}

      {quote.status === "pending" && onAccept && (
        <>
          {/* Accepting locks the price at the driver's ceiling (priceMax), not the midpoint */}
          <p className="mt-3 text-[12px] text-[#969e9b]">
            Si aceptas, pagas hasta {formatCLP(quote.price)}
          </p>
          <Button
            size="sm"
            className="mt-1.5 w-full active:scale-[0.96] transition-[scale,opacity]"
            disabled={accepting}
            onClick={() => onAccept(quote.id)}
          >
            {accepting ? "Aceptando..." : "Aceptar oferta"}
          </Button>
        </>
      )}
    </div>
  )
}
