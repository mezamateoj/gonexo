import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { MapPin, ChevronLeft, ArrowRight, TriangleAlert } from "lucide-react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { DetailRow } from "@/components/requests/detail-row"
import { QuoteCard } from "@/components/requests/quote-card"

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
  const rejectedQuotes = req.quotes.filter((q) => q.status === "rejected")
  const job = req.job

  return (
    <div className="p-4 md:p-8">
      {/* Breadcrumb */}
      <button
        type="button"
        onClick={() => navigate({ to: "/requests" })}
        className="mb-5 flex items-center gap-1.5 text-[13px] text-[#969e9b] transition-colors hover:text-[#485450]"
      >
        <ChevronLeft className="size-4" />
        Mis solicitudes
      </button>

      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-[18px] font-bold text-[#121715] md:text-[20px]">
            {volumeLabels[req.volumeCategory]} · {shortAddress(req.originAddress)} → {shortAddress(req.destAddress)}
          </h1>
          <span className={cn(
            "w-fit rounded-full px-3 py-1 text-[11px] font-semibold",
            requestStatusClasses[req.status] ?? "bg-[#F5F4F0] text-[#969e9b]"
          )}>
            {requestStatusLabels[req.status] ?? req.status}
          </span>
        </div>
        <span className="shrink-0 text-[12px] text-[#B0ABA5]">
          {new Date(req.createdAt).toLocaleDateString("es-CL")}
        </span>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_360px] md:items-start">
        {/* Left: request detail */}
        <div className="flex flex-col gap-4">
          {/* Address + details card */}
          <div className="rounded-[14px] border border-[#E9E7E3] bg-white p-4 md:p-6">
            {/* Route */}
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary">
                  <MapPin className="size-3.5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#B0ABA5]">Origen</p>
                  <p className="text-[14px] font-medium text-[#121715]">{req.originAddress}</p>
                  <p className="text-[12px] text-[#969e9b]">{floorLine(req.originFloor, req.originHasElevator)}</p>
                </div>
              </div>
              <div className="ml-3 h-5 w-px bg-[#E9E7E3]" />
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#F5F4F0]">
                  <MapPin className="size-3.5 text-[#969e9b]" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#B0ABA5]">Destino</p>
                  <p className="text-[14px] font-medium text-[#121715]">{req.destAddress}</p>
                  <p className="text-[12px] text-[#969e9b]">{floorLine(req.destFloor, req.destHasElevator)}</p>
                </div>
              </div>
            </div>

            {/* Detail grid */}
            <div className="mt-5 grid grid-cols-1 gap-4 border-t border-[#F0EEE9] pt-4 sm:grid-cols-3">
              <DetailRow label="Fecha" value={formatLongDateTime(req.scheduledAt)} />
              <DetailRow label="Volumen" value={volumeLabels[req.volumeCategory]} />
              <DetailRow label="Artículos" value={req.itemDescription} />
            </div>

            {/* Service tags */}
            {(req.budgetMax || req.helpersNeeded > 0 || req.hasFragileItems || req.assemblyRequired || req.packingIncluded || req.longCarry || req.flexibleDate) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {req.budgetMax && (
                  <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700">
                    Presupuesto: {formatCLP(req.budgetMax)}
                  </span>
                )}
                {req.helpersNeeded > 0 && (
                  <span className="rounded-full bg-[#F0EEE9] px-2.5 py-1 text-[11px] font-medium text-[#485450]">
                    +{req.helpersNeeded} ayudante{req.helpersNeeded > 1 ? "s" : ""}
                  </span>
                )}
                {req.hasFragileItems && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">Frágil</span>
                )}
                {req.assemblyRequired && (
                  <span className="rounded-full bg-[#F0EEE9] px-2.5 py-1 text-[11px] font-medium text-[#485450]">Sin armar</span>
                )}
                {req.packingIncluded && (
                  <span className="rounded-full bg-[#F0EEE9] px-2.5 py-1 text-[11px] font-medium text-[#485450]">Embalaje</span>
                )}
                {req.longCarry && (
                  <span className="rounded-full bg-[#F0EEE9] px-2.5 py-1 text-[11px] font-medium text-[#485450]">Acarreo largo</span>
                )}
                {req.flexibleDate && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">Fecha flexible</span>
                )}
              </div>
            )}

            {req.notes && (
              <div className="mt-4 rounded-[8px] bg-[#F5F4F0] px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#B0ABA5]">Notas</p>
                <p className="mt-0.5 text-[13px] text-[#485450]">{req.notes}</p>
              </div>
            )}
          </div>

          {/* Photos */}
          {req.photos.length > 0 && (
            <div className="rounded-[14px] border border-[#E9E7E3] bg-white p-5">
              <p className="mb-3 text-[13px] font-semibold text-[#121715]">Fotos</p>
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
            <div className="rounded-[14px] border border-primary/20 bg-[#E7F4EE] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Oferta aceptada</p>
              <p className="mt-1.5 text-[14px] text-[#485450]">
                Acordado con <strong>{acceptedQuote.driver.name}</strong> por{" "}
                <strong>{formatCLP(acceptedQuote.price)}</strong>.
              </p>
              {job && (
                <Button
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => navigate({ to: "/jobs/$id", params: { id: job.id } })}
                >
                  Ver trabajo
                  <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          )}

          {/* Quotes card */}
          {(req.status === "open" || req.status === "accepted") && (
            <div className="rounded-[14px] border border-[#E9E7E3] bg-white">
              <div className="flex items-center justify-between border-b border-[#F0EEE9] px-5 py-4">
                <span className="text-[14px] font-semibold text-[#121715]">Ofertas recibidas</span>
                {req.quoteCount > 0 && (
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                    {req.quoteCount}
                  </span>
                )}
              </div>

              <div className="p-4">
                {req.quoteCount === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-[14px] font-medium text-[#121715]">Esperando cotizaciones</p>
                    <p className="mt-1 text-[13px] text-[#969e9b]">Los transportistas verán tu solicitud pronto.</p>
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
                        onAccept={(qid) => acceptMutation.mutate(qid)}
                        accepting={acceptMutation.isPending && acceptMutation.variables === q.id}
                      />
                    ))}
                    {rejectedQuotes.map((q) => (
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
                <button
                  type="button"
                  disabled={cancelMutation.isPending}
                  className="mt-1 text-center text-[13px] text-[#969e9b] transition-colors hover:text-destructive disabled:opacity-50"
                >
                  {cancelMutation.isPending ? "Cancelando…" : "Cancelar solicitud"}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <div className="mb-2 flex justify-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-red-50">
                    <TriangleAlert className="size-6 text-destructive" />
                  </div>
                </div>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar esta solicitud</AlertDialogTitle>
                  <AlertDialogDescription>
                    Si cancelas, los transportistas que enviaron oferta serán notificados y las ofertas recibidas se eliminarán. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Mantener solicitud</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90"
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
    </div>
  )
}
