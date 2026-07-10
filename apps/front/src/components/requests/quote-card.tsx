import { Check, MessageSquare, ShieldCheck, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { formatCLP, formatCLPRange, vehicleLabels } from "@/lib/display"
import type { PublicDriverProfile, QuoteWithDriver } from "@/lib/types"

// Distinguishes a document-verified driver from one with a merely complete
// profile — "verified" is a trust signal, "complete" is just onboarded.
function TrustBadge({ profile }: { profile: PublicDriverProfile }) {
  if (profile.isVerified && profile.documentsStatus === "verified") {
    return (
      <Badge className="shrink-0" variant="secondary">
        <ShieldCheck data-icon="inline-start" />
        Verificado
      </Badge>
    )
  }
  if (profile.documentsStatus === "submitted") {
    return <Badge className="shrink-0" variant="outline">Documentos en revisión</Badge>
  }
  return <Badge className="shrink-0" variant="secondary">Sin verificar</Badge>
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
  const isExpired = quote.status === "expired"
  const isCancelled = quote.status === "cancelled"
  const isInactive = isRejected || isExpired || isCancelled

  return (
    <Card className={cn(
      "p-0 transition-colors",
      isAccepted && "border-primary bg-accent",
      isInactive && "opacity-60",
    )}>
      <CardContent className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[12px] font-bold text-primary">
          {driverInitials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[13px] font-semibold text-foreground">{driver.name}</span>
            {profile && <TrustBadge profile={profile} />}
          </div>
          {profile && (
            <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
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
      <Separator className="my-2.5" />
      <div className="flex items-center justify-between gap-2">
        <div className={cn(
          "text-[18px] font-bold tabular-nums",
          isInactive ? "text-muted-foreground" : "text-foreground"
        )}>
          {quote.priceMin != null && quote.priceMax != null
            ? formatCLPRange(quote.priceMin, quote.priceMax)
            : formatCLP(quote.price)}
        </div>
        {isAccepted && (
          <Badge>
            <Check data-icon="inline-start" strokeWidth={3} />
            Aceptado
          </Badge>
        )}
      </div>

      {isExpired && (
        <p className="mt-2 text-[12px] text-muted-foreground">Esta oferta expiró y ya no está disponible.</p>
      )}
      {isCancelled && (
        <p className="mt-2 text-[12px] text-muted-foreground">
          El transportista canceló el trabajo vinculado a esta oferta.
        </p>
      )}

      {quote.message && (
        <div className="mt-3 flex gap-2 rounded-[8px] bg-muted px-3 py-2">
          <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-ink-faint" />
          <p className="text-[12px] leading-relaxed text-ink-soft">{quote.message}</p>
        </div>
      )}

      {quote.status === "pending" && onAccept && (
        <>
          {/* Accepting locks the price at the driver's ceiling (priceMax), not the midpoint */}
          <p className="mt-3 text-[12px] text-muted-foreground">
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
      </CardContent>
    </Card>
  )
}
