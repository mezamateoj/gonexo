import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, CalendarDays, ChevronLeft, CircleAlert, TriangleAlert } from "lucide-react"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import {
  formatLongDateTime,
  requestStatusClasses,
  requestStatusLabels,
  shortAddress,
  volumeLabels,
} from "@/lib/display"
import { cn } from "@/lib/utils"
import { useCancelRequest } from "@/hooks/use-request-mutations"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { OffersSummaryCard } from "@/components/requests/offers-summary-card"
import { RequestCancelledBanner } from "@/components/requests/request-cancelled-banner"
import { RequestOverviewCard } from "@/components/requests/request-overview-card"

export const Route = createFileRoute("/_app/requests/$id")({
  component: RequestDetailPage,
})

function RequestDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const requestQuery = useQuery({
    queryKey: queryKeys.requests.detail(id),
    queryFn: () => api.requests.get(id),
  })
  const quotesQuery = useQuery({
    queryKey: queryKeys.requests.quotes(id),
    queryFn: () => api.requests.quotes(id),
  })
  const cancelMutation = useCancelRequest(id)

  if (requestQuery.isError) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-8">
        <Button
          type="button"
          variant="link"
          onClick={() => navigate({ to: "/requests" })}
          className="h-10 w-fit justify-start p-0 text-muted-foreground"
        >
          <ChevronLeft data-icon="inline-start" />
          Mis fletes
        </Button>
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>No pudimos cargar este flete</AlertTitle>
          <AlertDescription>Vuelve a Mis fletes e intenta nuevamente.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const request = requestQuery.data
  const job = request?.job

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
      <Button
        type="button"
        variant="link"
        onClick={() => navigate({ to: "/requests" })}
        className="h-10 w-fit justify-start p-0 text-muted-foreground"
      >
        <ChevronLeft data-icon="inline-start" />
        Mis fletes
      </Button>

      {requestQuery.isLoading || !request ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-5 w-80 max-w-full" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
      ) : (
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-balance text-foreground">
              Flete {volumeLabels[request.volumeCategory].toLocaleLowerCase("es-CL")}
            </h1>
            <Badge className={cn(requestStatusClasses[request.status] ?? "bg-muted text-muted-foreground")}>
              {requestStatusLabels[request.status] ?? request.status}
            </Badge>
          </div>
          <p className="text-base font-medium text-pretty text-foreground">
            {shortAddress(request.originAddress)} → {shortAddress(request.destAddress)}
          </p>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4" />
            {formatLongDateTime(request.scheduledAt)}
          </p>
        </header>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_360px] md:items-start">
        <main className="flex min-w-0 flex-col gap-4">
          {requestQuery.isLoading || !request ? (
            <>
              <Skeleton className="h-96 w-full rounded-xl" />
              <Skeleton className="h-44 w-full rounded-xl" />
            </>
          ) : (
            <>
              <RequestOverviewCard request={request} />

              {request.photos.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Fotos del flete</CardTitle>
                    <CardDescription>{request.photos.length} {request.photos.length === 1 ? "imagen" : "imágenes"} adjuntas</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {request.photos.map((photo, index) => (
                      <img
                        key={photo.id}
                        src={photo.url}
                        alt={`Foto ${index + 1} del flete`}
                        className="aspect-[4/3] w-full rounded-lg object-cover ring-1 ring-black/10"
                      />
                    ))}
                  </CardContent>
                </Card>
              )}

              {request.status === "open" && (
                <Card size="sm">
                  <CardHeader>
                    <CardTitle>Gestionar solicitud</CardTitle>
                    <CardDescription>Cancelar cierra la publicación y detiene las ofertas nuevas.</CardDescription>
                  </CardHeader>
                  <CardFooter className="justify-end">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive" disabled={cancelMutation.isPending}>
                          {cancelMutation.isPending ? "Cancelando…" : "Cancelar solicitud"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogMedia><TriangleAlert className="text-destructive" /></AlertDialogMedia>
                          <AlertDialogTitle>Cancelar esta solicitud</AlertDialogTitle>
                          <AlertDialogDescription>
                            Las ofertas pendientes quedarán canceladas y los transportistas serán notificados. Podrás reabrir la solicitud después.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Mantener solicitud</AlertDialogCancel>
                          <AlertDialogAction variant="destructive" onClick={() => cancelMutation.mutate()}>
                            Cancelar solicitud
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              )}
            </>
          )}
        </main>

        <aside className="flex min-w-0 flex-col gap-3 md:sticky md:top-6">
          {request?.status === "cancelled" && <RequestCancelledBanner requestId={request.id} />}

          {job && (
            <Card size="sm">
              <CardHeader>
                <CardTitle>Transportista confirmado</CardTitle>
                <CardDescription>El flete ya pasó a coordinación.</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  className="min-h-10 w-full transition-transform active:scale-[0.96]"
                  onClick={() => navigate({ to: "/jobs/$id", params: { id: job.id } })}
                >
                  Ver trabajo
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </CardFooter>
            </Card>
          )}

          <OffersSummaryCard
            requestId={id}
            requestStatus={request?.status ?? "open"}
            data={quotesQuery.data}
            isLoading={quotesQuery.isLoading}
            isError={quotesQuery.isError}
            onRetry={() => quotesQuery.refetch()}
          />
        </aside>
      </div>
    </div>
  )
}
