import { createFileRoute, Link } from "@tanstack/react-router"
import { useDriverProfile } from "@/hooks/use-driver-profile-gate"
import { vehicleLabels } from "@/lib/display"
import { Car } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute("/_app/vehicle")({
  component: VehiclePage,
})

const VEHICLE_EMOJIS: Record<string, string> = {
  van: "🚐",
  pickup: "🛻",
  truck_small: "🚚",
  truck_large: "🚛",
}

function VehiclePage() {
  const { data: profile, isLoading } = useDriverProfile()

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-[480px] flex-col gap-3 px-4 py-8">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-10 rounded-lg" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-surface-dim">
          <Car className="size-5 text-muted-foreground" />
        </div>
        <p className="text-[15px] font-semibold text-foreground">Sin perfil de transportista</p>
        <p className="text-[13px] text-muted-foreground">Completa tu perfil para comenzar a recibir solicitudes.</p>
        <Button asChild>
          <Link to="/driver-onboarding">Activar perfil</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[480px] px-4 py-8">
      <h1 className="text-[18px] font-semibold text-foreground">Mi vehículo</h1>

      <div className="mt-6 flex flex-col gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <span className="text-4xl">{VEHICLE_EMOJIS[profile.vehicleType] ?? "🚗"}</span>
              <div>
                <CardTitle>{vehicleLabels[profile.vehicleType] ?? profile.vehicleType}</CardTitle>
                <p className="font-mono text-[15px] font-bold tracking-[0.12em] text-ink-soft">
                  {profile.vehiclePlate}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Separator className="mb-4" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Teléfono</p>
                <p className="mt-0.5 text-[13px] text-ink-soft">{profile.phone}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Documentos</p>
                <Badge variant="secondary" className="mt-1 capitalize">{profile.documentsStatus}</Badge>
              </div>
              {profile.totalJobs > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Trabajos</p>
                  <p className="mt-0.5 text-[13px] text-ink-soft">{profile.totalJobs}</p>
                </div>
              )}
              {profile.avgRating != null && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Calificación</p>
                  <p className="mt-0.5 text-[13px] text-ink-soft">⭐ {Number(profile.avgRating).toFixed(1)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Button asChild variant="outline" className="w-full">
          <Link to="/driver-onboarding">Editar información del vehículo</Link>
        </Button>
      </div>
    </div>
  )
}
