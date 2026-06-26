import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useSession } from "@/lib/auth-client"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { JobStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useAppMode } from "@/lib/app-mode"

export const Route = createFileRoute("/_app/jobs/")({
  component: JobsPage,
})

const STATUS_LABELS: Record<JobStatus, string> = {
  scheduled: "Agendado",
  on_the_way: "En camino",
  arrived: "En destino",
  completed: "Completado",
  cancelled: "Cancelado",
}

const STATUS_COLORS: Record<JobStatus, string> = {
  scheduled: "bg-blue-50 text-blue-600",
  on_the_way: "bg-amber-50 text-amber-700",
  arrived: "bg-orange-50 text-orange-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
}

const VOLUME_LABELS: Record<string, string> = {
  small: "Pequeño",
  medium: "Mediano",
  large: "Grande",
  full_move: "Mudanza completa",
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatPrice(n: number) {
  return `$${n.toLocaleString("es-CL")}`
}

function JobsPage() {
  const { data: session } = useSession()
  const { mode } = useAppMode()
  const userId = session?.user?.id

  const { data: jobs, isLoading } = useQuery({
    queryKey: queryKeys.jobs.my,
    queryFn: api.jobs.my,
    enabled: !!userId,
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[600px] space-y-3 px-4 py-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-[12px] bg-[#F0EDE9]" />
        ))}
      </div>
    )
  }

  const modeJobs = (jobs ?? []).filter((job) =>
    mode === "client" ? job.user.id === userId : job.driver.id === userId
  )

  if (modeJobs.length === 0) {
    const isDriver = mode === "driver"
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-[15px] font-semibold text-[#121715]">Sin trabajos aún</p>
        <p className="text-[13px] text-[#969e9b]">
          {isDriver
            ? "Los trabajos aparecen aquí cuando aceptan una cotización tuya."
            : "Los trabajos aparecen aquí cuando aceptas una cotización."}
        </p>
        <Link
          to={isDriver ? "/available" : "/requests"}
          className="rounded-[8px] bg-primary px-4 py-2 text-[13px] font-semibold text-white"
        >
          {isDriver ? "Ver disponibles" : "Ver mis solicitudes"}
        </Link>
      </div>
    )
  }

  const active = modeJobs.filter((j) => j.status !== "completed" && j.status !== "cancelled")
  const past = modeJobs.filter((j) => j.status === "completed" || j.status === "cancelled")

  return (
    <div className="mx-auto max-w-[600px] space-y-6 px-4 py-6">
      {active.length > 0 && (
        <section>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#969e9b]">En curso</p>
          <div className="space-y-3">
            {active.map((job) => {
              const isClient = userId === job.user.id
              const otherParty = isClient ? job.driver : job.user

              return (
                <Link
                  key={job.id}
                  to="/jobs/$id"
                  params={{ id: job.id }}
                  className="block rounded-[12px] border border-[#EDEAE6] bg-white p-4 transition-shadow hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          STATUS_COLORS[job.status]
                        )}>
                          {STATUS_LABELS[job.status]}
                        </span>
                        <span className="text-[11px] text-[#969e9b]">{formatDate(job.request.scheduledAt)}</span>
                      </div>
                      <p className="mt-2 truncate text-[13px] font-medium text-[#121715]">
                        {job.request.originAddress}
                      </p>
                      <p className="truncate text-[12px] text-[#969e9b]">→ {job.request.destAddress}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-[13px] font-semibold text-primary">{formatPrice(job.agreedPrice)}</span>
                        <span className="text-[11px] text-[#969e9b]">{VOLUME_LABELS[job.request.volumeCategory] ?? job.request.volumeCategory}</span>
                        {!isClient && (
                          <span className="rounded-full bg-[#F0EDE9] px-2 py-0.5 text-[10px] font-medium text-[#485450]">Cliente: {otherParty.name}</span>
                        )}
                        {isClient && (
                          <span className="rounded-full bg-[#F0EDE9] px-2 py-0.5 text-[10px] font-medium text-[#485450]">Conductor: {otherParty.name}</span>
                        )}
                      </div>
                    </div>
                    {job.request.photos[0] && (
                      <img
                        src={job.request.photos[0].url}
                        alt=""
                        className="size-14 shrink-0 rounded-[8px] object-cover"
                      />
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#969e9b]">Historial</p>
          <div className="space-y-3">
            {past.map((job) => {
              const isClient = userId === job.user.id
              const otherParty = isClient ? job.driver : job.user
              const hasReviewed = job.reviews.some((r) => r.reviewerId === userId)

              return (
                <Link
                  key={job.id}
                  to="/jobs/$id"
                  params={{ id: job.id }}
                  className="block rounded-[12px] border border-[#EDEAE6] bg-white p-4 opacity-80 transition-shadow hover:opacity-100 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          STATUS_COLORS[job.status]
                        )}>
                          {STATUS_LABELS[job.status]}
                        </span>
                        <span className="text-[11px] text-[#969e9b]">{formatDate(job.request.scheduledAt)}</span>
                        {!hasReviewed && job.status === "completed" && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                            Pendiente reseña
                          </span>
                        )}
                      </div>
                      <p className="mt-2 truncate text-[13px] font-medium text-[#121715]">
                        {job.request.originAddress}
                      </p>
                      <p className="truncate text-[12px] text-[#969e9b]">→ {job.request.destAddress}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-[13px] font-semibold text-[#485450]">{formatPrice(job.agreedPrice)}</span>
                        <span className="text-[11px] text-[#969e9b]">{VOLUME_LABELS[job.request.volumeCategory] ?? job.request.volumeCategory}</span>
                        <span className="rounded-full bg-[#F0EDE9] px-2 py-0.5 text-[10px] font-medium text-[#485450]">{otherParty.name}</span>
                      </div>
                    </div>
                    {job.request.photos[0] && (
                      <img
                        src={job.request.photos[0].url}
                        alt=""
                        className="size-14 shrink-0 rounded-[8px] object-cover opacity-80"
                      />
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
