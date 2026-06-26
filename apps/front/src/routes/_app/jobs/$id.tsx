import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "@/lib/auth-client"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { JobStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_app/jobs/$id")({
  component: JobDetailPage,
})

const STATUS_LABELS: Record<JobStatus, string> = {
  scheduled: "Agendado",
  on_the_way: "En camino",
  arrived: "En destino",
  completed: "Completado",
  cancelled: "Cancelado",
}

const STATUS_ORDER: JobStatus[] = ["scheduled", "on_the_way", "arrived", "completed"]

const NEXT_STATUS: Partial<Record<JobStatus, "on_the_way" | "arrived" | "completed">> = {
  scheduled: "on_the_way",
  on_the_way: "arrived",
  arrived: "completed",
}

const NEXT_STATUS_LABEL: Partial<Record<JobStatus, string>> = {
  scheduled: "Marcar en camino",
  on_the_way: "Marcar llegué",
  arrived: "Marcar completado",
}

function formatPrice(n: number) {
  return `$${n.toLocaleString("es-CL")}`
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const VOLUME_LABELS: Record<string, string> = {
  small: "Pequeño",
  medium: "Mediano",
  large: "Grande",
  full_move: "Mudanza completa",
}

function JobDetailPage() {
  const { id } = Route.useParams()
  const { data: session } = useSession()
  const qc = useQueryClient()

  const { data: job, isLoading, error } = useQuery({
    queryKey: queryKeys.jobs.detail(id),
    queryFn: () => api.jobs.get(id),
  })

  const advanceStatus = useMutation({
    mutationFn: (status: "on_the_way" | "arrived" | "completed") =>
      api.jobs.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.jobs.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.jobs.my })
    },
  })

  const confirmJob = useMutation({
    mutationFn: () => api.jobs.confirm(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.jobs.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.jobs.my })
    },
  })

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-sm text-[#969e9b]">No se encontró el trabajo.</p>
        <Link to="/jobs" className="text-sm text-primary hover:underline">
          Ver mis trabajos
        </Link>
      </div>
    )
  }

  const userId = session?.user?.id
  const isClient = userId === job.userId
  const isDriver = userId === job.driverId
  const currentStatusIdx = STATUS_ORDER.indexOf(job.status)
  const next = NEXT_STATUS[job.status]
  const hasReviewed = job.reviews.some((r) => r.reviewerId === userId)

  const otherParty = isClient ? job.driver : job.user
  const otherLabel = isClient ? "Transportista" : "Cliente"

  return (
    <div className="mx-auto max-w-[600px] space-y-5 px-4 py-6">
      {/* Back link */}
      <Link to="/jobs" className="flex items-center gap-1.5 text-[13px] text-[#969e9b] hover:text-[#485450]">
        <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Mis trabajos
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-[#121715]">Trabajo #{id.slice(-6).toUpperCase()}</h1>
          <p className="mt-0.5 text-[13px] text-[#969e9b]">{formatDate(job.request.scheduledAt)}</p>
        </div>
        <span className={cn(
          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
          job.status === "completed" || job.status === "cancelled"
            ? job.status === "completed" ? "bg-green-100 text-green-700" : "bg-red-50 text-red-600"
            : "bg-amber-50 text-amber-700"
        )}>
          {STATUS_LABELS[job.status]}
        </span>
      </div>

      {/* Status timeline */}
      {job.status !== "cancelled" && (
        <div className="rounded-[12px] border border-[#EDEAE6] bg-white p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#969e9b]">Progreso</p>
          <div className="flex items-center gap-0">
            {STATUS_ORDER.map((s, i) => {
              const done = i <= currentStatusIdx
              const active = i === currentStatusIdx
              return (
                <div key={s} className="flex flex-1 items-center">
                  <div className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    done ? "bg-primary text-white" : "border border-[#EDEAE6] bg-white text-[#C4C0BA]"
                  )}>
                    {done && !active ? (
                      <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span>{i + 1}</span>
                    )}
                  </div>
                  {i < STATUS_ORDER.length - 1 && (
                    <div className={cn("h-[2px] flex-1", i < currentStatusIdx ? "bg-primary" : "bg-[#EDEAE6]")} />
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-2 flex justify-between">
            {STATUS_ORDER.map((s) => (
              <p key={s} className="flex-1 text-center text-[10px] text-[#969e9b]">{STATUS_LABELS[s]}</p>
            ))}
          </div>
        </div>
      )}

      {/* Driver action — advance status */}
      {isDriver && next && (
        <button
          type="button"
          onClick={() => advanceStatus.mutate(next)}
          disabled={advanceStatus.isPending}
          className="w-full rounded-[10px] bg-primary px-4 py-3 text-[14px] font-semibold text-white transition-opacity disabled:opacity-60"
        >
              {advanceStatus.isPending ? "Actualizando…" : NEXT_STATUS_LABEL[job.status]}
        </button>
      )}

      {/* Client action — confirm completion */}
      {isClient && job.status === "completed" && !job.confirmedAt && (
        <div className="rounded-[12px] border border-green-200 bg-green-50 p-4">
          <p className="text-[13px] font-medium text-green-800">
            El transportista marcó el trabajo como completado.
          </p>
          <p className="mt-1 text-[12px] text-green-700">
            Confirma cuando hayas recibido tus cosas.
          </p>
          <button
            type="button"
            onClick={() => confirmJob.mutate()}
            disabled={confirmJob.isPending}
            className="mt-3 rounded-[8px] bg-green-600 px-4 py-2 text-[13px] font-semibold text-white transition-opacity disabled:opacity-60"
          >
            {confirmJob.isPending ? "Confirmando…" : "Confirmar recepción"}
          </button>
        </div>
      )}

      {/* Route card */}
      <div className="rounded-[12px] border border-[#EDEAE6] bg-white p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#969e9b]">Ruta</p>
        <div className="space-y-2">
          <div className="flex items-start gap-2.5">
            <div className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
            <div>
              <p className="text-[11px] text-[#969e9b]">Origen</p>
              <p className="text-[13px] font-medium text-[#121715]">{job.request.originAddress}</p>
            </div>
          </div>
          <div className="ml-[3px] h-5 w-[2px] bg-[#EDEAE6]" />
          <div className="flex items-start gap-2.5">
            <div className="mt-1 size-2 shrink-0 rounded-full bg-[#485450]" />
            <div>
              <p className="text-[11px] text-[#969e9b]">Destino</p>
              <p className="text-[13px] font-medium text-[#121715]">{job.request.destAddress}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Details + price */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[12px] border border-[#EDEAE6] bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#969e9b]">Precio acordado</p>
          <p className="mt-1 text-[20px] font-bold text-[#121715]">{formatPrice(job.agreedPrice)}</p>
        </div>
        <div className="rounded-[12px] border border-[#EDEAE6] bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#969e9b]">Volumen</p>
          <p className="mt-1 text-[14px] font-semibold text-[#121715]">
            {VOLUME_LABELS[job.request.volumeCategory] ?? job.request.volumeCategory}
          </p>
        </div>
      </div>

      {/* Items description */}
      {job.request.itemDescription && (
        <div className="rounded-[12px] border border-[#EDEAE6] bg-white p-4">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#969e9b]">Qué se mueve</p>
          <p className="text-[13px] text-[#485450]">{job.request.itemDescription}</p>
          {job.request.notes && (
            <p className="mt-2 text-[12px] text-[#969e9b]">{job.request.notes}</p>
          )}
        </div>
      )}

      {/* Other party contact */}
      <div className="rounded-[12px] border border-[#EDEAE6] bg-white p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#969e9b]">{otherLabel}</p>
        <div className="flex items-center gap-3">
          {otherParty.image ? (
            <img src={otherParty.image} alt={otherParty.name} className="size-10 rounded-full object-cover" />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-full bg-[#EDEAE6]">
              <span className="text-[15px] font-semibold text-[#485450]">
                {otherParty.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-[#121715]">{otherParty.name}</p>
            {otherParty.phone && (
              <a
                href={`tel:${otherParty.phone}`}
                className="text-[13px] text-primary hover:underline"
              >
                {otherParty.phone}
              </a>
            )}
          </div>
          {otherParty.phone && (
            <a
              href={`https://wa.me/${otherParty.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="flex size-9 items-center justify-center rounded-full bg-[#25D366] text-white"
              title="WhatsApp"
            >
              <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.558 4.118 1.532 5.845L0 24l6.335-1.652A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.804 9.804 0 01-5.032-1.389l-.36-.214-3.732.977.993-3.63-.235-.373A9.775 9.775 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/>
              </svg>
            </a>
          )}
        </div>
      </div>

      {/* Review prompt after confirmation — full review flow coming soon */}
      {job.confirmedAt && !hasReviewed && (
        <div className="rounded-[12px] border border-amber-200 bg-amber-50 p-4">
          <p className="text-[13px] font-medium text-amber-800">¿Cómo fue la experiencia?</p>
          <p className="mt-0.5 text-[12px] text-amber-700">Las reseñas estarán disponibles pronto.</p>
        </div>
      )}

      {/* Request detail link */}
      <Link
        to="/requests/$id"
        params={{ id: job.requestId }}
        className="block text-center text-[13px] text-[#969e9b] hover:text-[#485450]"
      >
        Ver solicitud original →
      </Link>
    </div>
  )
}
