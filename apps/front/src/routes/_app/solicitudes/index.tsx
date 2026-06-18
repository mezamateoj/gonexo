import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Package, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import type { RequestSummary, RequestStatus } from "@/lib/types"

export const Route = createFileRoute("/_app/solicitudes/")({
  component: SolicitudesPage,
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<RequestStatus, string> = {
  open: "Abierto",
  accepted: "Aceptado",
  in_progress: "En camino",
  completed: "Completado",
  cancelled: "Cancelado",
}

const STATUS_CLASS: Record<RequestStatus, string> = {
  open: "bg-[#F0FDF4] text-[#22C55E]",
  accepted: "bg-[#FFF4ED] text-[#F97316]",
  in_progress: "bg-[#FFF4ED] text-[#F97316]",
  completed: "bg-[#F5F5F5] text-[#888888]",
  cancelled: "bg-[#FEF2F2] text-[#EF4444]",
}

const VOLUME_LABEL: Record<string, string> = {
  small: "Mudanza pequeña",
  medium: "Mudanza mediana",
  large: "Mudanza grande",
  full_move: "Mudanza completa",
}

type FilterTab = "all" | RequestStatus

const FILTERS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "open", label: "Abiertos" },
  { key: "in_progress", label: "En progreso" },
  { key: "completed", label: "Completados" },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ─── Request card ─────────────────────────────────────────────────────────────

function RequestCard({ req }: { req: RequestSummary }) {
  const openQuotes = req.quotes.filter((q) => q.status === "pending")
  const bestPrice = req.quotes.length > 0
    ? Math.min(...req.quotes.map((q) => q.price))
    : null

  return (
    <Link
      to="/solicitudes/$id"
      params={{ id: req.id }}
      className="block rounded-[10px] border border-[#F0F0F0] bg-white p-[18px] shadow-[0_1px_6px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition-shadow"
    >
      {/* Header: status + date */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-[10px] py-[3px] text-[11px] font-semibold",
            STATUS_CLASS[req.status]
          )}
        >
          {STATUS_LABEL[req.status]}
        </span>
        <span className="text-[13px] text-[#AAAAAA]">{formatDate(req.scheduledAt)}</span>
      </div>

      {/* Route */}
      <div className="mt-[14px] flex flex-col gap-[8px]">
        <div className="flex items-center gap-[8px]">
          <span className="size-[7px] shrink-0 rounded-full bg-[#22C55E]" />
          <span className="text-[13px] font-medium text-foreground leading-snug">
            {req.originAddress}
          </span>
        </div>
        <div className="flex items-center gap-[8px]">
          <span className="size-[7px] shrink-0 rounded-full bg-[#F97316]" />
          <span className="text-[13px] font-medium text-foreground leading-snug">
            {req.destAddress}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-[14px] flex items-center justify-between border-t border-[#F5F5F5] pt-[12px]">
        <div className="flex items-center gap-[6px] text-[#888888]">
          <Package className="size-[12px]" />
          <span className="text-[12px]">{VOLUME_LABEL[req.volumeCategory]}</span>
        </div>

        {/* Right side: quote count OR agreed price */}
        {req.status === "open" && openQuotes.length > 0 ? (
          <span className="rounded-[8px] bg-[#FFF4ED] px-[10px] py-[4px] text-[12px] font-medium text-[#F97316]">
            {openQuotes.length} {openQuotes.length === 1 ? "cotización" : "cotizaciones"}
          </span>
        ) : bestPrice != null ? (
          <span className="text-[15px] font-bold text-foreground">
            {bestPrice.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 })}
          </span>
        ) : null}
      </div>
    </Link>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="col-span-2 flex flex-col items-center justify-center rounded-[10px] border border-dashed border-[#E5E5E5] bg-white py-16 text-center">
      <Package className="size-10 text-[#CCCCCC] mb-4" />
      <p className="text-[15px] font-medium text-foreground">
        {filtered ? "Sin solicitudes en esta categoría" : "Aún no tienes solicitudes"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {filtered
          ? "Prueba otro filtro"
          : "Publica tu primer flete y recibe cotizaciones en minutos"}
      </p>
      {!filtered && (
        <Button className="mt-6" asChild>
          <Link to="/solicitudes/nueva">
            <Plus className="size-4" />
            Publicar flete
          </Link>
        </Button>
      )}
    </div>
  )
}

// ─── Promo card ───────────────────────────────────────────────────────────────

function PromoCard() {
  return (
    <div className="rounded-[10px] bg-[#1A1A1A] p-[18px]">
      <p className="text-[16px] font-bold text-white">¿Necesitas mover algo?</p>
      <p className="mt-[6px] text-[13px] text-[#888888]">
        Publica gratis y recibe cotizaciones de conductores verificados en minutos.
      </p>
      <Button className="mt-[12px]" size="sm" asChild>
        <Link to="/solicitudes/nueva">
          Publicar flete
        </Link>
      </Button>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

function SolicitudesPage() {
  const [filter, setFilter] = useState<FilterTab>("all")

  const { data, isLoading, isError } = useQuery({
    queryKey: ["requests", "my"],
    queryFn: api.requests.my,
  })

  const filtered =
    filter === "all"
      ? (data ?? [])
      : (data ?? []).filter((r) => r.status === filter)

  // Split into two columns interleaving
  const col1 = filtered.filter((_, i) => i % 2 === 0)
  const col2 = filtered.filter((_, i) => i % 2 === 1)

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-foreground">Mis solicitudes</h1>
            <p className="mt-[2px] text-[13px] text-muted-foreground">
              Gestiona y revisa el estado de tus fletes
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-[6px]">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-full px-[12px] py-[5px] text-[12px] transition-colors",
                  filter === key
                    ? "bg-foreground text-background font-medium"
                    : "border border-[#E5E5E5] bg-white text-[#666666] hover:border-foreground/20"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-[140px] animate-pulse rounded-[10px] bg-[#F0F0F0]"
              />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-[10px] border border-red-100 bg-red-50 p-4 text-sm text-red-600">
            No se pudieron cargar las solicitudes. Intenta de nuevo.
          </div>
        )}

        {!isLoading && !isError && (
          <div className="grid grid-cols-2 gap-4">
            {/* Column 1 */}
            <div className="flex flex-col gap-[14px]">
              {col1.map((req) => (
                <RequestCard key={req.id} req={req} />
              ))}
              {col1.length === 0 && col2.length === 0 && (
                <EmptyState filtered={filter !== "all"} />
              )}
            </div>

            {/* Column 2 */}
            <div className="flex flex-col gap-[14px]">
              {col2.map((req) => (
                <RequestCard key={req.id} req={req} />
              ))}
              {/* Show promo card only when there's content and it's the "all" view */}
              {filter === "all" && data && data.length > 0 && (
                <PromoCard />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
