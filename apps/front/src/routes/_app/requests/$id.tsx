import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { MapPin, ChevronLeft, ArrowRight, TriangleAlert, PartyPopper } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import {
  floorLine,
  formatCLP,
  formatLongDateTime,
  requestStatusClasses,
  requestStatusLabels,
  shortAddress,
  volumeLabels,
} from "@/lib/display"
import { useAcceptQuote, useCancelRequest } from "@/hooks/use-request-mutations"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
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
import { DetailRow } from "@/components/requests/detail-row"
import { QuoteCard } from "@/components/requests/quote-card"
import { RequestCancelledBanner } from "@/components/requests/request-cancelled-banner"
import { CelebrationDialog } from "@/components/celebration-dialog"
import { fireConfetti } from "@/lib/celebrate"

export const Route = createFileRoute("/_app/requests/$id")({
  component: RequestDetailPage,
})

function RequestDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()

  const { data: req, isLoading, isError } = useQuery({
    queryKey: queryKeys.requests.detail(id),
    queryFn: () => api.requests.get(id),
  })

  const acceptMutation = useAcceptQuote(id)
  const cancelMutation = useCancelRequest(id)

  // Details are captured from the accepted quote at click time so the
  // celebration dialog can show them before we route to the new job.
  const [booked, setBooked] = useState<{ jobId: string; driverName: string; price: number } | null>(null)

  function handleAccept(quote: { id: string; price: number; driver: { name: string } }) {
    acceptMutation.mutate(quote.id, {
      onSuccess: ({ jobId }) => {
        fireConfetti()
        setBooked({ jobId, driverName: quote.driver.name, price: quote.price })
      },
    })
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <Skeleton className="mb-6 h-5 w-40" />
        <Skeleton className="mb-6 h-7 w-64" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_360px] md:items-start">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-52 w-full rounded-[14px]" />
            <Skeleton className="h-32 w-full rounded-[14px]" />
          </div>
          <Skeleton className="h-64 rounded-[14px]" />
        </div>
      </div>
    )
  }

  if (isError || !req) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-sm text-destructive">No se pudo cargar la solicitud.</p>
      </div>
    )
  }

  const acceptedQuote = req.quotes.find((q) => q.status === "accepted")
  const pendingQuotes = req.quotes.filter((q) => q.status === "pending")
  const inactiveQuotes = req.quotes.filter((q) =>
    q.status === "rejected" || q.status === "expired" || q.status === "cancelled"
  )
  const job = req.job

  return (
    <div className="p-4 md:p-8">
      {/* Breadcrumb */}
      <Button
        type="button"
        variant="link"
        onClick={() => navigate({ to: "/requests" })}
        className="mb-5 h-auto justify-start p-0 text-[13px] text-muted-foreground"
      >
        <ChevronLeft data-icon="inline-start" />
        Mis fletes
      </Button>

      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-[18px] font-bold text-foreground md:text-[20px]">
            {volumeLabels[req.volumeCategory]} · {shortAddress(req.originAddress)} → {shortAddress(req.destAddress)}
          </h1>
          <Badge className={cn("w-fit", requestStatusClasses[req.status] ?? "bg-muted text-muted-foreground")}>
            {requestStatusLabels[req.status] ?? req.status}
          </Badge>
        </div>
        <span className="shrink-0 text-[12px] text-ink-faint">
          {new Date(req.createdAt).toLocaleDateString("es-CL")}
        </span>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_360px] md:items-start">
        {/* Left: request detail */}
        <div className="flex flex-col gap-4">
          {/* Address + details card */}
          <div className="rounded-[14px] border border-border bg-white p-4 md:p-6">
            {/* Route */}
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary">
                  <MapPin className="size-3.5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Origen</p>
                  <p className="text-[14px] font-medium text-foreground">{req.originAddress}</p>
                  <p className="text-[12px] text-muted-foreground">{floorLine(req.originFloor, req.originHasElevator)}</p>
                </div>
              </div>
              <div className="ml-3 h-5 w-px bg-border" />
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
                  <MapPin className="size-3.5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Destino</p>
                  <p className="text-[14px] font-medium text-foreground">{req.destAddress}</p>
                  <p className="text-[12px] text-muted-foreground">{floorLine(req.destFloor, req.destHasElevator)}</p>
                </div>
              </div>
            </div>

            {/* Detail grid */}
            <Separator className="my-4" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <DetailRow label="Fecha" value={formatLongDateTime(req.scheduledAt)} />
              <DetailRow label="Volumen" value={volumeLabels[req.volumeCategory]} />
              <DetailRow label="Artículos" value={req.itemDescription} />
            </div>

            {/* Service tags */}
            {(req.budgetMax || req.helpersNeeded > 0 || req.hasFragileItems || req.assemblyRequired || req.packingIncluded || req.longCarry || req.flexibleDate) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {req.budgetMax && (
                  <Badge variant="secondary">
                    Presupuesto: {formatCLP(req.budgetMax)}
                  </Badge>
                )}
                {req.helpersNeeded > 0 && (
                  <Badge variant="secondary">
                    +{req.helpersNeeded} ayudante{req.helpersNeeded > 1 ? "s" : ""}
                  </Badge>
                )}
                {req.hasFragileItems && (
                  <Badge variant="outline">Frágil</Badge>
                )}
                {req.assemblyRequired && (
                  <Badge variant="secondary">Sin armar</Badge>
                )}
                {req.packingIncluded && (
                  <Badge variant="secondary">Embalaje</Badge>
                )}
                {req.longCarry && (
                  <Badge variant="secondary">Acarreo largo</Badge>
                )}
                {req.flexibleDate && (
                  <Badge variant="outline">Fecha flexible</Badge>
                )}
              </div>
            )}

            {req.notes && (
              <div className="mt-4 rounded-[8px] bg-muted px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Notas</p>
                <p className="mt-0.5 text-[13px] text-ink-soft">{req.notes}</p>
              </div>
            )}
          </div>

          {/* Photos */}
          {req.photos.length > 0 && (
            <div className="rounded-[14px] border border-border bg-white p-5">
              <p className="mb-3 text-[13px] font-semibold text-foreground">Fotos</p>
              <div className="flex flex-wrap gap-2">
                {req.photos.map((p) => (
                  <img key={p.id} src={p.url} alt="" className="h-24 w-24 rounded-[8px] object-cover" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: quotes panel */}
        <div className="flex flex-col gap-3">
          {/* Accepted banner */}
          {req.status === "accepted" && acceptedQuote && (
            <div className="rounded-[14px] border border-primary/20 bg-accent p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Oferta aceptada</p>
              <p className="mt-1.5 text-[14px] text-ink-soft">
                Acordado con <strong>{acceptedQuote.driver.name}</strong> — precio acordado máximo:{" "}
                <strong className="tabular-nums">{formatCLP(acceptedQuote.price)}</strong>.
              </p>
              {job && (
                <Button
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => navigate({ to: "/jobs/$id", params: { id: job.id } })}
                >
                  Ver trabajo
                  <ArrowRight data-icon="inline-end" />
                </Button>
              )}
            </div>
          )}

          {req.status === "cancelled" && (
            <>
              <RequestCancelledBanner requestId={req.id} />
              {inactiveQuotes.length > 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Historial de ofertas
                  </p>
                  {inactiveQuotes.map((q) => <QuoteCard key={q.id} quote={q} />)}
                </div>
              )}
            </>
          )}

          {/* Quotes card */}
          {(req.status === "open" || req.status === "accepted") && (
            <div className="rounded-[14px] border border-border bg-white">
              <div className="flex items-center justify-between border-b border-surface-dim px-5 py-4">
                <span className="text-[14px] font-semibold text-foreground">Ofertas recibidas</span>
                {req.quoteCount > 0 && (
                  <Badge>{req.quoteCount}</Badge>
                )}
              </div>

              <div className="p-4">
                {req.quoteCount === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-[14px] font-medium text-foreground">Esperando ofertas</p>
                    <p className="mt-1 text-[13px] text-muted-foreground">Los transportistas verán tu solicitud pronto.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {acceptedQuote && (
                      <QuoteCard quote={acceptedQuote} />
                    )}
                    {pendingQuotes.map((q) => (
                      <QuoteCard
                        key={q.id}
                        quote={q}
                        onAccept={() => handleAccept(q)}
                        accepting={acceptMutation.isPending && acceptMutation.variables === q.id}
                      />
                    ))}
                    {inactiveQuotes.map((q) => (
                      <QuoteCard key={q.id} quote={q} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cancel */}
          {req.status === "open" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={cancelMutation.isPending}
                  className="mt-1 text-destructive"
                >
                  {cancelMutation.isPending ? "Cancelando…" : "Cancelar solicitud"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogMedia>
                    <TriangleAlert className="text-destructive" />
                  </AlertDialogMedia>
                  <AlertDialogTitle>Cancelar esta solicitud</AlertDialogTitle>
                  <AlertDialogDescription>
                    Si cancelas, los transportistas que enviaron oferta serán notificados y las ofertas recibidas se eliminarán. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Mantener solicitud</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => cancelMutation.mutate()}
                  >
                    Cancelar solicitud
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <CelebrationDialog
        open={booked !== null}
        onOpenChange={(open) => !open && setBooked(null)}
        tone="primary"
        icon={<PartyPopper />}
        title="¡Flete reservado!"
        description="Tu transportista fue confirmado. Coordina los detalles y sigue el avance desde tu flete."
        details={
          booked
            ? [
                { label: "Transportista", value: booked.driverName },
                { label: "Precio acordado", value: formatCLP(booked.price) },
                { label: "Fecha", value: formatLongDateTime(req.scheduledAt) },
              ]
            : undefined
        }
      >
        <Button
          className="h-11 w-full text-[15px] font-semibold"
          onClick={() => booked && navigate({ to: "/jobs/$id", params: { id: booked.jobId } })}
        >
          Ver mi flete
          <ArrowRight data-icon="inline-end" />
        </Button>
        <Button variant="ghost" className="h-10 w-full" onClick={() => setBooked(null)}>
          Seguir aquí
        </Button>
      </CelebrationDialog>
    </div>
  )
}
