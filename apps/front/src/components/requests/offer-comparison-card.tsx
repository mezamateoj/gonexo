import { Link } from "@tanstack/react-router"
import { Check, LoaderCircle, MessageSquare, ShieldCheck, Star, Truck } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatCLP, initials, timeAgo, vehicleLabels } from "@/lib/display"
import type { QuoteDriverProfile, QuoteWithDriver } from "@/lib/types"

function TrustBadge({ profile }: { profile: QuoteDriverProfile }) {
  if (profile.isVerified && profile.documentsStatus === "verified") {
    return <Badge variant="secondary"><ShieldCheck data-icon="inline-start" />Verificado</Badge>
  }
  if (profile.documentsStatus === "submitted") return <Badge variant="outline">Documentos en revisión</Badge>
  return <Badge variant="secondary">Sin verificar</Badge>
}

const inactiveLabels: Partial<Record<QuoteWithDriver["status"], string>> = {
  rejected: "No elegida",
  expired: "Expirada",
  cancelled: "Cancelada",
} as const

export function OfferComparisonCard({
  quote,
  onAccept,
  accepting,
}: {
  quote: QuoteWithDriver
  onAccept?: (quote: QuoteWithDriver) => void
  accepting?: boolean
}) {
  const profile = quote.driver.driverProfile
  const isAccepted = quote.status === "accepted"
  const isInactive = quote.status === "rejected" || quote.status === "expired" || quote.status === "cancelled"

  return (
    <Card className={cn(isAccepted && "ring-primary/30", isInactive && "bg-muted/30")}>
      <CardHeader className="border-b">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar size="lg">
            {quote.driver.image && <AvatarImage src={quote.driver.image} alt={quote.driver.name} />}
            <AvatarFallback>{initials(quote.driver.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="truncate">{quote.driver.name}</CardTitle>
              {profile && <TrustBadge profile={profile} />}
            </div>
            <CardDescription>{timeAgo(quote.createdAt)}</CardDescription>
          </div>
        </div>
        <CardAction>
          {isAccepted ? (
            <Badge><Check data-icon="inline-start" />Elegida</Badge>
          ) : isInactive ? (
            <Badge variant="secondary">{inactiveLabels[quote.status]}</Badge>
          ) : null}
        </CardAction>
      </CardHeader>

      <CardContent className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(220px,0.8fr)_auto] lg:items-start">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Mensaje</p>
          {quote.message ? (
            <div className="mt-2 flex gap-2 rounded-lg bg-muted px-3.5 py-3">
              <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p className="text-sm text-pretty text-foreground">{quote.message}</p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No agregó un mensaje a su oferta.</p>
          )}
          {profile?.bio && (
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Sobre su servicio</p>
              <p className="mt-1 text-sm text-pretty text-muted-foreground">{profile.bio}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Transportista</p>
          {profile ? (
            <>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Truck className="size-4 text-muted-foreground" />
                <span>{vehicleLabels[profile.vehicleType] ?? profile.vehicleType}</span>
              </div>
              {profile.vehicleDescription && <p className="text-sm text-pretty text-muted-foreground">{profile.vehicleDescription}</p>}
              {profile.vehicleCapacity && <p className="text-xs text-muted-foreground">Capacidad: {profile.vehicleCapacity}</p>}
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {profile.avgRating != null && (
                  <span className="flex items-center gap-1 tabular-nums">
                    <Star className="size-4" />
                    {Number(profile.avgRating).toFixed(1)}
                  </span>
                )}
                <span>{profile.totalJobs} {profile.totalJobs === 1 ? "viaje completado" : "viajes completados"}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Perfil sin información adicional.</p>
          )}
        </div>

        <div className="min-w-36 lg:text-right">
          <p className="text-[11px] font-medium text-muted-foreground">Precio total</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{formatCLP(quote.price)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Este es el total que pagarás.</p>
        </div>
      </CardContent>

      <CardFooter className="justify-end gap-2">
        {profile && (
          <Button asChild variant="outline" className="min-h-10 transition-transform active:scale-[0.96]">
            <Link to="/drivers/$id" params={{ id: profile.id }}>Ver perfil</Link>
          </Button>
        )}
        {quote.status === "pending" && onAccept && (
          <Button
            className="min-h-10 transition-transform active:scale-[0.96]"
            disabled={accepting}
            onClick={() => onAccept(quote)}
          >
            {accepting && <LoaderCircle className="animate-spin" data-icon="inline-start" />}
            {accepting ? "Eligiendo…" : "Elegir transportista"}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
