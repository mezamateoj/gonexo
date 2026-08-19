import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Ban,
  Mail,
  Phone,
  ShieldCheck,
  Star,
  Truck,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import {
  driverVerificationLabels,
  formatCLP,
  formatShortDate,
  initials,
  jobStatusClasses,
  jobStatusLabels,
  requestStatusClasses,
  requestStatusLabels,
  shortAddress,
  timeAgo,
  vehicleLabels,
  volumeLabels,
} from "@/lib/display"
import { queryKeys } from "@/lib/query-keys"
import { cn } from "@/lib/utils"
import type { AdminUserDetail } from "@/lib/types"

export const Route = createFileRoute("/_app/admin/users/$id")({
  component: AdminUserPage,
})

function AdminUserPage() {
  const { id } = Route.useParams()

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.admin.user(id),
    queryFn: () => api.admin.user(id),
  })

  return (
    <div className="flex w-full flex-col gap-5 p-4 md:p-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/admin/users">
            <ArrowLeft data-icon="inline-start" />
            Volver a usuarios
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-14 w-80" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
            <Skeleton className="h-72 w-full rounded-xl" />
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
        </div>
      ) : isError || !data ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>No se pudo cargar el perfil</AlertTitle>
          <AlertDescription>El usuario no existe o hubo un error de red.</AlertDescription>
        </Alert>
      ) : (
        <UserProfile detail={data} />
      )}
    </div>
  )
}

function UserProfile({ detail }: { detail: AdminUserDetail }) {
  const { user, stats, recentRequests, recentJobs } = detail
  const driver = user.driverProfile

  return (
    <>
      <header className="flex items-center gap-4">
        <Avatar className="size-14 shrink-0">
          <AvatarFallback className="bg-accent font-heading text-lg font-bold text-primary">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-balance font-heading text-2xl font-semibold">{user.name}</h1>
            {user.role === "admin" && <Badge>Admin</Badge>}
            <Badge variant="secondary">
              {user.accountType === "driver" ? "Transportista" : "Cliente"}
            </Badge>
            {driver?.isVerified && (
              <Badge>
                <ShieldCheck data-icon="inline-start" />
                Verificado
              </Badge>
            )}
            {user.banned && <Badge variant="destructive"><Ban data-icon="inline-start" />Suspendido</Badge>}
          </div>
          <p className="text-pretty text-sm text-muted-foreground">
            Registrado el {formatShortDate(user.createdAt)}
            {user.lastActiveAt && <> · Última actividad {timeAgo(user.lastActiveAt)}</>}
          </p>
        </div>
      </header>

      {user.banned && (
        <Alert variant="destructive">
          <Ban />
          <AlertTitle>Cuenta suspendida</AlertTitle>
          <AlertDescription>
            {user.banReason ?? "Sin motivo registrado."}
            {user.banExpires && <> Vence el {formatShortDate(user.banExpires)}.</>}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
        <div className="flex min-w-0 flex-col gap-4">
          <ActivityStats stats={stats} isDriver={user.accountType === "driver"} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Solicitudes recientes</CardTitle>
            </CardHeader>
            <CardContent>
              {recentRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">Este usuario todavía no publica solicitudes.</p>
              ) : (
                <ul className="divide-y">
                  {recentRequests.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {shortAddress(r.originAddress)}
                          <ArrowRight className="mx-1 inline size-3.5 text-muted-foreground" aria-label="hacia" />
                          {shortAddress(r.destAddress)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {volumeLabels[r.volumeCategory]} · agendada para el {formatShortDate(r.scheduledAt)}
                        </p>
                      </div>
                      <Badge variant="secondary" className={cn(requestStatusClasses[r.status])}>
                        {requestStatusLabels[r.status]}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fletes recientes</CardTitle>
            </CardHeader>
            <CardContent>
              {recentJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Este usuario todavía no participa en fletes.</p>
              ) : (
                <ul className="divide-y">
                  {recentJobs.map((j) => (
                    <li key={j.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {shortAddress(j.request.originAddress)}
                          <ArrowRight className="mx-1 inline size-3.5 text-muted-foreground" aria-label="hacia" />
                          {shortAddress(j.request.destAddress)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {j.role === "driver" ? "Como transportista" : "Como cliente"} · {formatCLP(j.agreedPrice)} · {formatShortDate(j.createdAt)}
                        </p>
                      </div>
                      <Badge className={cn(jobStatusClasses[j.status])}>
                        {jobStatusLabels[j.status]}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contacto</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 truncate">{user.email}</span>
                {user.emailVerified ? (
                  <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Email verificado" />
                ) : (
                  <Badge variant="outline" className="shrink-0">Sin verificar</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Phone className="size-4 shrink-0 text-muted-foreground" />
                <span className="tabular-nums">{user.phone ?? "Sin teléfono"}</span>
              </div>
            </CardContent>
          </Card>

          {driver && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Perfil de transportista</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="size-4 shrink-0 text-muted-foreground" />
                  <span>
                    {vehicleLabels[driver.vehicleType] ?? driver.vehicleType}
                    {driver.vehicleYear && ` ${driver.vehicleYear}`}
                  </span>
                  <span className="ml-auto font-mono text-xs font-semibold tabular-nums">{driver.vehiclePlate}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={driver.documentsStatus === "verified" ? "default" : "secondary"}>
                    {driver.documentsStatus === "verified" && <ShieldCheck data-icon="inline-start" />}
                    {driverVerificationLabels[driver.documentsStatus]}
                  </Badge>
                  <Badge variant="outline">{driver.isAvailable ? "Disponible" : "No disponible"}</Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {driver.avgRating !== null && (
                    <span className="flex items-center gap-1">
                      <Star className="size-3.5 fill-current text-primary" />
                      <span className="tabular-nums text-foreground">{driver.avgRating.toFixed(1)}</span>
                    </span>
                  )}
                  <span className="tabular-nums">{driver.totalJobs} flete{driver.totalJobs !== 1 && "s"} completado{driver.totalJobs !== 1 && "s"}</span>
                </div>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link to="/admin/drivers/$id" params={{ id: driver.id }}>
                    Abrir expediente
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}

function ActivityStats({ stats, isDriver }: { stats: AdminUserDetail["stats"]; isDriver: boolean }) {
  return (
    <Card>
      <CardContent className={cn("grid grid-cols-2 gap-4", isDriver && "sm:grid-cols-3 xl:grid-cols-5")}>
        <StatBlock
          label="Solicitudes"
          value={stats.requests.total}
          hint={statHint(stats.requests)}
        />
        <StatBlock
          label="Fletes como cliente"
          value={stats.jobsAsClient.total}
          hint={statHint(stats.jobsAsClient)}
        />
        {isDriver && (
          <>
            <StatBlock
              label="Fletes como transportista"
              value={stats.jobsAsDriver.total}
              hint={statHint(stats.jobsAsDriver)}
            />
            <StatBlock label="Cotizaciones enviadas" value={stats.quotesSent} />
            <StatBlock
              label="Calificación recibida"
              value={stats.reviewsReceived.avgRating !== null ? stats.reviewsReceived.avgRating.toFixed(1) : "—"}
              hint={stats.reviewsReceived.count > 0
                ? `${stats.reviewsReceived.count} reseña${stats.reviewsReceived.count !== 1 ? "s" : ""}`
                : "Sin reseñas"}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}

function statHint({ completed, cancelled }: { completed: number; cancelled: number }) {
  const parts = []
  if (completed > 0) parts.push(`${completed} completado${completed !== 1 ? "s" : ""}`)
  if (cancelled > 0) parts.push(`${cancelled} cancelado${cancelled !== 1 ? "s" : ""}`)
  return parts.length > 0 ? parts.join(" · ") : undefined
}

function StatBlock({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-heading text-2xl font-semibold tabular-nums">{value}</span>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {hint && <span className="text-xs text-muted-foreground/70">{hint}</span>}
    </div>
  )
}
