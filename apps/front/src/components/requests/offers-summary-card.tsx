import { Link } from "@tanstack/react-router"
import { ArrowRight, CircleAlert, Inbox } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCLP, initials, vehicleLabels } from "@/lib/display"
import type { RequestQuotesResponse, RequestStatus } from "@/lib/types"

export function OffersSummaryCard({
  requestId,
  requestStatus,
  data,
  isLoading,
  isError,
  onRetry,
}: {
  requestId: string
  requestStatus: RequestStatus
  data?: RequestQuotesResponse
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ofertas recibidas</CardTitle>
          <CardDescription>Puedes seguir revisando los datos de tu flete.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>No pudimos cargar las ofertas.</AlertDescription>
          </Alert>
          <Button variant="outline" onClick={onRetry}>Reintentar</Button>
        </CardContent>
      </Card>
    )
  }

  const accepted = data.quotes.find((quote) => quote.status === "accepted")
  const preview = accepted ?? data.quotes.find((quote) => quote.status === "pending") ?? data.quotes[0]
  const profile = preview?.driver.driverProfile

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ofertas recibidas</CardTitle>
        <CardDescription>
          {data.count === 0
            ? "Los transportistas todavía no han cotizado."
            : `${data.count} ${data.count === 1 ? "transportista cotizó" : "transportistas cotizaron"} este flete.`}
        </CardDescription>
        {data.count > 0 && <CardAction><Badge>{data.count}</Badge></CardAction>}
      </CardHeader>

      <CardContent>
        {!preview ? (
          <Empty className="min-h-40 border">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Inbox /></EmptyMedia>
              <EmptyTitle>Esperando ofertas</EmptyTitle>
              <EmptyDescription>Te avisaremos cuando un transportista envíe una.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-lg bg-muted px-3.5 py-3">
              <Avatar size="lg">
                {preview.driver.image && <AvatarImage src={preview.driver.image} alt={preview.driver.name} />}
                <AvatarFallback>{initials(preview.driver.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{preview.driver.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {profile ? vehicleLabels[profile.vehicleType] ?? profile.vehicleType : "Transportista"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-muted-foreground">
                  {accepted ? "Precio acordado" : data.count === 1 ? "Precio ofertado" : "Desde"}
                </p>
                <p className="text-lg font-bold tabular-nums text-foreground">{formatCLP(preview.price)}</p>
              </div>
            </div>

            <Button asChild className="min-h-10 w-full transition-transform active:scale-[0.96]">
              <Link to="/requests/$id/offers" params={{ id: requestId }}>
                {requestStatus === "accepted"
                  ? "Ver oferta elegida"
                  : data.count === 1
                    ? "Revisar oferta"
                    : `Comparar ${data.count} ofertas`}
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
