import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useSession } from "@/lib/auth-client"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { cn } from "@/lib/utils"
import { formatLongDateTime, formatPrice, jobStatusClasses, jobStatusLabels, volumeLabels } from "@/lib/display"
import { DeliveryCodeCard } from "@/components/jobs/delivery-code-card"
import { JobTrackingStepper } from "@/components/jobs/job-tracking-stepper"
import { ConfirmReceptionBanner } from "@/components/jobs/confirm-reception-banner"
import { CoordinationRow } from "@/components/jobs/coordination-row"
import { StarRatingPrompt } from "@/components/jobs/star-rating-prompt"
import type { JobDetail } from "@/lib/types"

export const Route = createFileRoute("/_app/jobs/$id")({
  component: JobDetailPage,
})

// Polls while the driver can still be en route so both sides see live progress
// without a refresh; stops once nothing more can change.
function isJobActive(job: JobDetail | undefined) {
  if (!job) return false
  if (job.status === "cancelled") return false
  return job.status !== "completed" || !job.confirmedAt
}

function JobDetailPage() {
  const { id } = Route.useParams()
  const { data: session } = useSession()

  const { data: job, isLoading, error } = useQuery({
    queryKey: queryKeys.jobs.detail(id),
    queryFn: () => api.jobs.get(id),
    refetchInterval: (query) => (isJobActive(query.state.data) ? 12_000 : false),
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
        <p className="text-sm text-muted-foreground">No se encontró el trabajo.</p>
        <Link to="/jobs" className="text-sm text-primary hover:underline">
          Ver mis trabajos
        </Link>
      </div>
    )
  }

  const userId = session?.user?.id
  const isClient = userId === job.userId
  const isDriver = userId === job.driverId
  const hasReviewed = job.reviews.some((r) => r.reviewerId === userId)

  return (
    <div className="mx-auto max-w-[600px] space-y-4 px-4 py-6">
      <Button asChild variant="link" className="h-auto justify-start p-0 text-[13px] text-muted-foreground">
        <Link to="/jobs">
          <ArrowLeft className="size-3.5" data-icon="inline-start" />
          Mis trabajos
        </Link>
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-foreground">Trabajo #{id.slice(-6).toUpperCase()}</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{formatLongDateTime(job.request.scheduledAt)}</p>
        </div>
        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", jobStatusClasses[job.status])}>
          {jobStatusLabels[job.status]}
        </span>
      </div>

      {isClient && <DeliveryCodeCard job={job} />}

      <JobTrackingStepper job={job} isDriver={isDriver} />

      {isClient && <ConfirmReceptionBanner job={job} hasReviewed={hasReviewed} />}

      {isDriver && job.confirmedAt && !hasReviewed && (
        <Card className="rounded-2xl border-border bg-white p-0 ring-0">
          <CardContent className="p-4">
            <StarRatingPrompt jobId={job.id} label="¿Cómo fue el cliente?" />
          </CardContent>
        </Card>
      )}

      <CoordinationRow job={job} isClient={isClient} />

      <Card className="rounded-xl border-border bg-white p-0 ring-0">
        <CardContent className="p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ruta</p>
          <div className="space-y-2">
            <div className="flex items-start gap-2.5">
              <div className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
              <div>
                <p className="text-[11px] text-muted-foreground">Origen</p>
                <p className="text-[13px] font-medium text-foreground">{job.request.originAddress}</p>
              </div>
            </div>
            <div className="ml-[3px] h-5 w-[2px] bg-border" />
            <div className="flex items-start gap-2.5">
              <div className="mt-1 size-2 shrink-0 rounded-full bg-ink-soft" />
              <div>
                <p className="text-[11px] text-muted-foreground">Destino</p>
                <p className="text-[13px] font-medium text-foreground">{job.request.destAddress}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="rounded-xl border-border bg-white p-0 ring-0">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Precio acordado</p>
            <p className="mt-1 text-[20px] font-bold text-foreground">{formatPrice(job.agreedPrice)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border bg-white p-0 ring-0">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Volumen</p>
            <p className="mt-1 text-[14px] font-semibold text-foreground">
              {volumeLabels[job.request.volumeCategory]}
            </p>
          </CardContent>
        </Card>
      </div>

      {job.request.itemDescription && (
        <Card className="rounded-xl border-border bg-white p-0 ring-0">
          <CardContent className="p-4">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Qué se mueve
            </p>
            <p className="text-[13px] text-ink-soft">{job.request.itemDescription}</p>
            {job.request.notes && <p className="mt-2 text-[12px] text-muted-foreground">{job.request.notes}</p>}
          </CardContent>
        </Card>
      )}

      <Button asChild variant="link" className="h-auto w-full text-[13px] text-muted-foreground">
        <Link to="/requests/$id" params={{ id: job.requestId }}>
          Ver solicitud original →
        </Link>
      </Button>
    </div>
  )
}
