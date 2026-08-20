import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { ChevronLeft, CircleAlert, Inbox, PartyPopper } from "lucide-react"
import { api } from "@/lib/api"
import { fireConfetti } from "@/lib/celebrate"
import {
  formatCLP,
  formatLongDateTime,
  requestStatusClasses,
  requestStatusLabels,
  shortAddress,
  volumeLabels,
} from "@/lib/display"
import { queryKeys } from "@/lib/query-keys"
import { cn } from "@/lib/utils"
import { useAcceptQuote } from "@/hooks/use-request-mutations"
import type { QuoteWithDriver } from "@/lib/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { CelebrationDialog } from "@/components/celebration-dialog"
import { OfferComparisonCard } from "@/components/requests/offer-comparison-card"
import { RequestRoute } from "@/components/requests/request-route"

export const Route = createFileRoute("/_app/requests/$id_/offers")({
  component: RequestOffersPage,
})

function RequestOffersPage() {
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
  const acceptMutation = useAcceptQuote(id)
  const [booked, setBooked] = useState<{ jobId: string; driverName: string; price: number } | null>(null)

  function handleAccept(quote: QuoteWithDriver) {
    acceptMutation.mutate(quote.id, {
      onSuccess: ({ jobId }) => {
        fireConfetti()
        setBooked({ jobId, driverName: quote.driver.name, price: quote.price })
      },
    })
  }

  const request = requestQuery.data
  const quotes = quotesQuery.data?.quotes ?? []
  const activeQuotes = quotes.filter((quote) => quote.status === "pending" || quote.status === "accepted")
  const inactiveQuotes = quotes.filter((quote) => quote.status !== "pending" && quote.status !== "accepted")

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
      <Button
        type="button"
        variant="link"
        onClick={() => navigate({ to: "/requests/$id", params: { id } })}
        className="h-10 w-fit justify-start p-0 text-muted-foreground"
      >
        <ChevronLeft data-icon="inline-start" />
        Volver al flete
      </Button>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-balance text-foreground">Ofertas para tu flete</h1>
          {quotesQuery.data && <Badge>{quotesQuery.data.count}</Badge>}
        </div>
        <p className="max-w-2xl text-sm text-pretty text-muted-foreground">
          Compara el precio, la experiencia y el vehículo antes de elegir transportista.
        </p>
      </header>

      <section aria-label="Resumen del flete">
        {requestQuery.isLoading ? (
          <Card size="sm">
            <CardHeader>
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </CardHeader>
            <CardContent><Skeleton className="h-28 w-full rounded-lg" /></CardContent>
          </Card>
        ) : requestQuery.isError || !request ? (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>No pudimos cargar el flete</AlertTitle>
            <AlertDescription>Puedes revisar las ofertas disponibles e intentar cargar el flete nuevamente.</AlertDescription>
          </Alert>
        ) : (
          <Card size="sm">
            <CardHeader>
              <CardTitle>
                {shortAddress(request.originAddress)} → {shortAddress(request.destAddress)}
              </CardTitle>
              <CardDescription>
                Flete {volumeLabels[request.volumeCategory].toLocaleLowerCase("es-CL")} · {formatLongDateTime(request.scheduledAt)}
              </CardDescription>
              <CardAction>
                <Badge className={cn(requestStatusClasses[request.status] ?? "bg-muted text-muted-foreground")}>
                  {requestStatusLabels[request.status] ?? request.status}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <RequestRoute
                originAddress={request.originAddress}
                originFloor={request.originFloor}
                originHasElevator={request.originHasElevator}
                destAddress={request.destAddress}
                destFloor={request.destFloor}
                destHasElevator={request.destHasElevator}
              />
            </CardContent>
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="offers-heading">
        <div>
          <h2 id="offers-heading" className="text-lg font-semibold text-balance text-foreground">
            {quotesQuery.data
              ? `${quotesQuery.data.count} ${quotesQuery.data.count === 1 ? "oferta recibida" : "ofertas recibidas"}`
              : "Ofertas recibidas"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Los precios están ordenados de menor a mayor.</p>
        </div>

        {quotesQuery.isLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((item) => <Skeleton key={item} className="h-72 w-full rounded-xl" />)}
          </div>
        ) : quotesQuery.isError ? (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>No pudimos cargar las ofertas</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-3">
              La información del flete sigue disponible. Intenta cargar las ofertas nuevamente.
              <Button variant="outline" onClick={() => quotesQuery.refetch()}>Reintentar</Button>
            </AlertDescription>
          </Alert>
        ) : quotes.length === 0 ? (
          <Empty className="min-h-72 border">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Inbox /></EmptyMedia>
              <EmptyTitle>Todavía no hay ofertas</EmptyTitle>
              <EmptyDescription>Los transportistas pueden cotizar mientras el flete permanezca abierto.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            {acceptMutation.isError && (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertTitle>No pudimos elegir al transportista</AlertTitle>
                <AlertDescription>{acceptMutation.error.message}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col gap-4">
              {activeQuotes.map((quote) => (
                <OfferComparisonCard
                  key={quote.id}
                  quote={quote}
                  onAccept={request?.status === "open" ? handleAccept : undefined}
                  accepting={acceptMutation.isPending && acceptMutation.variables === quote.id}
                />
              ))}
            </div>

            {inactiveQuotes.length > 0 && (
              <div className="flex flex-col gap-4 pt-2">
                <Separator />
                <div>
                  <h2 className="text-base font-semibold text-foreground">Historial</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Ofertas que ya no están disponibles.</p>
                </div>
                {inactiveQuotes.map((quote) => <OfferComparisonCard key={quote.id} quote={quote} />)}
              </div>
            )}
          </>
        )}
      </section>

      <CelebrationDialog
        open={booked !== null}
        onOpenChange={(open) => !open && setBooked(null)}
        tone="primary"
        icon={<PartyPopper />}
        title="¡Flete reservado!"
        description="Tu transportista fue confirmado. Coordina los detalles y sigue el avance desde tu flete."
        details={booked ? [
          { label: "Transportista", value: booked.driverName },
          { label: "Precio acordado", value: formatCLP(booked.price) },
        ] : undefined}
      >
        {booked && (
          <Button onClick={() => navigate({ to: "/jobs/$id", params: { id: booked.jobId } })}>
            Ir al trabajo
          </Button>
        )}
      </CelebrationDialog>
    </div>
  )
}
