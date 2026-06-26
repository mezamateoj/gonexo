import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { MyQuote, VolumeCategory } from "@/lib/types"
import { cn } from "@/lib/utils"
import { MessageSquare, MapPin } from "lucide-react"

export const Route = createFileRoute("/_app/quotes/")({
  component: QuotesPage,
})

const STATUS_LABEL: Record<MyQuote["status"], string> = {
  pending: "Esperando",
  accepted: "Aceptado",
  rejected: "No elegido",
  expired: "Expirado",
}

const STATUS_CLASS: Record<MyQuote["status"], string> = {
  pending: "bg-amber-50 text-amber-700",
  accepted: "bg-green-50 text-green-700",
  rejected: "bg-[#F5F4F0] text-[#969e9b]",
  expired: "bg-[#F5F4F0] text-[#969e9b]",
}

const VOLUME_LABEL: Record<VolumeCategory, string> = {
  small: "Pequeño",
  medium: "Mediano",
  large: "Grande",
  full_move: "Mudanza completa",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatCLP(n: number) {
  return n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 })
}

function QuoteRow({ q }: { q: MyQuote }) {
  const isActive = q.status === "pending" || q.status === "accepted"

  return (
    <Link
      to="/available/$id"
      params={{ id: q.request.id }}
      className={cn(
        "flex items-start gap-4 rounded-[12px] border border-[#EDEAE6] bg-white p-4 transition-shadow hover:shadow-sm",
        !isActive && "opacity-70"
      )}
    >
      {q.request.photos[0] ? (
        <img
          src={q.request.photos[0].url}
          alt=""
          className="size-14 shrink-0 rounded-[8px] object-cover"
        />
      ) : (
        <div className="flex size-14 shrink-0 items-center justify-center rounded-[8px] bg-[#F0EDE9]">
          <MapPin className="size-5 text-[#C4C0BA]" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-[#121715]">{q.request.originAddress}</p>
            <p className="truncate text-[12px] text-[#969e9b]">→ {q.request.destAddress}</p>
          </div>
          <span className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
            STATUS_CLASS[q.status]
          )}>
            {STATUS_LABEL[q.status]}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-3">
          <span className="text-[14px] font-bold text-primary">{formatCLP(q.price)}</span>
          <span className="text-[11px] text-[#969e9b]">{VOLUME_LABEL[q.request.volumeCategory]}</span>
          <span className="text-[11px] text-[#969e9b]">{formatDate(q.request.scheduledAt)}</span>
        </div>

        {q.message && (
          <div className="mt-2 flex items-start gap-1.5 text-[11px] text-[#969e9b]">
            <MessageSquare className="mt-px size-3 shrink-0" />
            <span className="line-clamp-1">{q.message}</span>
          </div>
        )}
      </div>
    </Link>
  )
}

function QuotesPage() {
  const { data: quotes, isLoading } = useQuery({
    queryKey: queryKeys.quotes.my,
    queryFn: api.quotes.my,
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[640px] space-y-3 px-4 py-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-[12px] bg-[#F0EDE9]" />
        ))}
      </div>
    )
  }

  if (!quotes || quotes.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-[#F0EDE9]">
          <MessageSquare className="size-5 text-[#969e9b]" />
        </div>
        <p className="text-[15px] font-semibold text-[#121715]">Sin cotizaciones aún</p>
        <p className="max-w-[240px] text-[13px] text-[#969e9b]">
          Cuando envíes una cotización aparecerá aquí con su estado.
        </p>
        <Link
          to="/available"
          className="rounded-[8px] bg-primary px-4 py-2 text-[13px] font-semibold text-white"
        >
          Ver solicitudes disponibles
        </Link>
      </div>
    )
  }

  const active = quotes.filter((q) => q.status === "pending" || q.status === "accepted")
  const past = quotes.filter((q) => q.status === "rejected" || q.status === "expired")

  return (
    <div className="mx-auto max-w-[640px] space-y-6 px-4 py-6">
      {active.length > 0 && (
        <section>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#969e9b]">
            Activas
          </p>
          <div className="space-y-3">
            {active.map((q) => <QuoteRow key={q.id} q={q} />)}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#969e9b]">
            Historial
          </p>
          <div className="space-y-3">
            {past.map((q) => <QuoteRow key={q.id} q={q} />)}
          </div>
        </section>
      )}
    </div>
  )
}
