import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { MapPin, ChevronLeft, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { formatCLP, formatLongDateTime, requestStatusClasses, requestStatusLabels, volumeLabels } from "@/lib/display"
import { useAcceptQuote, useCancelRequest } from "@/hooks/use-request-mutations"
import { Skeleton } from "@/components/ui/skeleton"
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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-52 w-full rounded-[14px]" />
            <Skeleton className="h-32 w-full rounded-[14px]" />
          </div>
          <Skeleton className="h-48 rounded-[14px]" />
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

  const pendingQuotes = req.quotes.filter((q) => q.status === "pending")
  const acceptedQuote = req.quotes.find((q) => q.status === "accepted")

  return (
    <div className="p-4 md:p-8">
      <button
        type="button"
        onClick={() => navigate({ to: "/requests" })}
        className="mb-6 flex items-center gap-1.5 text-[13px] text-[#969e9b] transition-colors hover:text-[#485450]"
      >
        <ChevronLeft className="size-4" />
        Mis solicitudes
      </button>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_360px] md:items-start">
        {/* Left */}
        <div className="flex flex-col gap-4">
          <div className="rounded-[14px] border border-[#E9E7E3] bg-white p-4 md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <span className={cn("rounded-full px-3 py-1 text-[11px] font-semibold", requestStatusClasses[req.status] ?? "bg-[#F5F4F0] text-[#969e9b]")}>
                {requestStatusLabels[req.status] ?? req.status}
              </span>
              <span className="text-[12px] text-[#B0ABA5]">
                {new Date(req.createdAt).toLocaleDateString("es-CL")}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary">
                  <MapPin className="size-3.5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#B0ABA5]">Origen</p>
                  <p className="text-[14px] font-medium text-[#121715]">{req.originAddress}</p>
                  {(req.originFloor != null || !req.originHasElevator) && (
                    <p className="text-[12px] text-[#969e9b]">
                      {req.originFloor != null ? `Piso ${req.originFloor}` : ""}
                      {req.originFloor != null ? " · " : ""}
                      {req.originHasElevator ? "Con ascensor" : "Sin ascensor"}
                    </p>
                  )}
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
                  {(req.destFloor != null || !req.destHasElevator) && (
                    <p className="text-[12px] text-[#969e9b]">
                      {req.destFloor != null ? `Piso ${req.destFloor}` : ""}
                      {req.destFloor != null ? " · " : ""}
                      {req.destHasElevator ? "Con ascensor" : "Sin ascensor"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 border-t border-[#F0EEE9] pt-4 sm:grid-cols-3">
              <DetailRow label="Fecha" value={formatLongDateTime(req.scheduledAt)} />
              <DetailRow label="Volumen" value={volumeLabels[req.volumeCategory]} />
              <DetailRow label="Artículos" value={req.itemDescription} />
            </div>

            {req.notes && (
              <div className="mt-4 rounded-[8px] bg-[#F5F4F0] px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#B0ABA5]">Notas</p>
                <p className="mt-0.5 text-[13px] text-[#485450]">{req.notes}</p>
              </div>
            )}
          </div>

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

          {/* Quotes — only when open */}
          {req.status === "open" && (
            <div className="rounded-[14px] border border-[#E9E7E3] bg-white p-5">
              <p className="mb-3 text-[13px] font-semibold text-[#121715]">
                Ofertas recibidas
                {pendingQuotes.length > 0 && (
                  <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[11px] text-white">
                    {pendingQuotes.length}
                  </span>
                )}
              </p>
              {req.quotes.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-[14px] font-medium text-[#121715]">Esperando cotizaciones</p>
                  <p className="mt-1 text-[13px] text-[#969e9b]">Los transportistas verán tu solicitud pronto.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {req.quotes.map((q) => (
                    <QuoteCard
                      key={q.id}
                      quote={q}
                      onAccept={(qid) => acceptMutation.mutate(qid)}
                      accepting={acceptMutation.isPending && acceptMutation.variables === q.id}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {req.status === "accepted" && acceptedQuote && (
            <div className="rounded-[14px] border border-primary/20 bg-[#E7F4EE] p-5">
              <p className="text-[13px] font-semibold text-primary">Cotización aceptada</p>
              <p className="mt-1 text-[13px] text-[#485450]">
                Acordaste con <strong>{acceptedQuote.driver.name}</strong> por{" "}
                <strong>{formatCLP(acceptedQuote.price)}</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="flex flex-col gap-4">
          {/* Cancel */}
          {req.status === "open" && !acceptedQuote && (
            <button
              type="button"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-[#E9E7E3] bg-white px-4 py-2.5 text-[13px] text-[#969e9b] transition-colors hover:border-destructive/30 hover:text-destructive disabled:opacity-50"
            >
              <X className="size-4" />
              {cancelMutation.isPending ? "Cancelando…" : "Cancelar solicitud"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
