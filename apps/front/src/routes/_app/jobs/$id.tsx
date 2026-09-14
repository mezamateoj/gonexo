import { useEffect, useRef } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { z } from "zod"
import { ArrowLeft, ArrowRight, CircleAlert, CircleCheck, Clock3 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useSession } from "@/lib/auth-client"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { cn } from "@/lib/utils"
import { approximateAddress, formatLongDateTime, formatPrice, formatSchedule, jobStatusClasses, jobStatusLabels, volumeLabels } from "@/lib/display"
import { DeliveryCodeCard } from "@/components/jobs/delivery-code-card"
import { JobTrackingStepper } from "@/components/jobs/job-tracking-stepper"
import { JobPhotosCard } from "@/components/jobs/job-photos-card"
import { JobCancelledBlock } from "@/components/jobs/job-cancelled-block"
import { CancelJobAction } from "@/components/jobs/cancel-job-action"
import { ConfirmReceptionBanner } from "@/components/jobs/confirm-reception-banner"
import { CoordinationRow } from "@/components/jobs/coordination-row"
import { JobPaymentCard } from "@/components/jobs/job-payment-card"
import { StarRatingPrompt } from "@/components/jobs/star-rating-prompt"
import { useReconcileJobPayment } from "@/hooks/use-request-mutations"
import type { JobDetail } from "@/lib/types"

const jobSearchSchema = z.object({
  checkout: z.enum(["success", "pending", "failure"]).optional().catch(undefined),
  payment_id: z.string().regex(/^\d+$/).optional().catch(undefined),
})

export const Route = createFileRoute("/_app/jobs/$id")({
  validateSearch: jobSearchSchema,
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
  const search = Route.useSearch()
  const { data: session } = useSession()
  const jobsHome = session?.user.accountType === "driver" ? "/jobs" : "/requests"
  const reconciliation = useReconcileJobPayment(id)
  const reconciledPaymentId = useRef<string | null>(null)

  const { data: job, isLoading, error } = useQuery({
    queryKey: queryKeys.jobs.detail(id),
    queryFn: () => api.jobs.get(id),
    refetchInterval: (query) => (isJobActive(query.state.data) ? 12_000 : false),
  })

  const isClient = session?.user?.id === job?.userId

  useEffect(() => {
    if (!isClient || !search.payment_id || reconciledPaymentId.current === search.payment_id) return
    reconciledPaymentId.current = search.payment_id
    reconciliation.mutate(search.payment_id)
  }, [isClient, reconciliation.mutate, search.payment_id])

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <Skeleton className="mb-6 h-5 w-28" />
        <Skeleton className="mb-6 h-8 w-52" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_360px] md:items-start md:gap-6">
          <Skeleton className="h-80 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">No se encontró el trabajo.</p>
        <Link to={jobsHome} className="text-sm text-primary hover:underline">
          Ver mis fletes
        </Link>
      </div>
    )
  }

  const userId = session?.user?.id
  const isClientUser = userId === job.userId
  const isDriver = userId === job.driverId
  const hasReviewed = job.reviews.some((r) => r.reviewerId === userId)
  const paymentRequired = isClientUser && job.paymentStatus === "pending" && job.status === "scheduled"
  const coordinationUnlocked = job.canCoordinate

  return (
    <div className="p-4 md:p-8">
      <Button asChild variant="link" className="mb-4 h-auto justify-start p-0 text-[13px] text-muted-foreground">
        <Link to={jobsHome}>
          <ArrowLeft data-icon="inline-start" />
          Mis fletes
        </Link>
      </Button>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold text-foreground md:text-[22px]">
            Trabajo #{id.slice(-6).toUpperCase()}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{formatSchedule(job.request, formatLongDateTime)}</p>
        </div>
        <Badge className={cn("shrink-0", jobStatusClasses[job.status])}>
          {jobStatusLabels[job.status]}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_360px] md:items-start md:gap-6">
        {/* Left: the live flow — code, timeline, confirmation, review */}
        <div className="flex flex-col gap-4">
          {search.checkout === "success" && (
            <Alert>
              {job.paymentStatus === "approved" ? <CircleCheck /> : <Clock3 />}
              <AlertTitle>{job.paymentStatus === "approved" ? "Pago confirmado" : "Estamos verificando tu pago"}</AlertTitle>
              <AlertDescription>
                {job.paymentStatus === "approved"
                  ? "El transportista ya puede ver los datos de coordinación."
                  : "Actualizaremos este trabajo cuando Mercado Pago confirme el resultado."}
              </AlertDescription>
            </Alert>
          )}

          {search.checkout === "pending" && (
            <Alert>
              <Clock3 />
              <AlertTitle>Pago pendiente</AlertTitle>
              <AlertDescription>Mercado Pago todavía está procesando el pago. Puedes volver a intentarlo si es rechazado.</AlertDescription>
            </Alert>
          )}

          {search.checkout === "failure" && (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertTitle>No se completó el pago</AlertTitle>
              <AlertDescription>Puedes intentarlo nuevamente desde esta página.</AlertDescription>
            </Alert>
          )}

          {reconciliation.isError && (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertTitle>No pudimos verificar el pago</AlertTitle>
              <AlertDescription>{reconciliation.error.message}</AlertDescription>
            </Alert>
          )}

          {isDriver && !coordinationUnlocked && job.paymentStatus === "pending" && (
            <Alert>
              <Clock3 />
              <AlertTitle>Esperando el pago del cliente</AlertTitle>
              <AlertDescription>
                Podrás ver los datos de coordinación e iniciar el trabajo cuando confirmemos el pago.
              </AlertDescription>
            </Alert>
          )}

          {paymentRequired && <JobPaymentCard jobId={job.id} amount={job.agreedPrice} />}

          {isClientUser && coordinationUnlocked && <DeliveryCodeCard job={job} />}

          {job.status === "cancelled" ? (
            <JobCancelledBlock job={job} />
          ) : (
            <JobTrackingStepper job={job} isDriver={isDriver && coordinationUnlocked} />
          )}

          <JobPhotosCard job={job} />

          {isClientUser && coordinationUnlocked && <ConfirmReceptionBanner job={job} hasReviewed={hasReviewed} />}

          {isDriver && job.confirmedAt && !hasReviewed && (
            <Card className="rounded-2xl border-border bg-white p-0 ring-0">
              <CardContent className="p-4">
                <StarRatingPrompt jobId={job.id} label="¿Cómo fue el cliente?" />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: facts + secondary actions, kept in view while the timeline scrolls */}
        <div className="flex flex-col gap-4 md:sticky md:top-8">
          <CoordinationRow job={job} isClient={isClientUser} />

          <Card className="rounded-xl border-border bg-white p-0 ring-0">
            <CardContent className="p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ruta</p>
              {!isClientUser && !coordinationUnlocked && <p className="mb-3 text-[12px] text-muted-foreground">Direcciones exactas disponibles después del pago.</p>}
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">Origen</p>
                    <p className="text-[13px] font-medium text-foreground">{isClientUser || coordinationUnlocked ? job.request.originAddress : approximateAddress(job.request.originAddress)}</p>
                  </div>
                </div>
                <div className="ml-[3px] h-5 w-[2px] bg-border" />
                <div className="flex items-start gap-2.5">
                  <div className="mt-1 size-2 shrink-0 rounded-full bg-ink-soft" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">Destino</p>
                    <p className="text-[13px] font-medium text-foreground">{isClientUser || coordinationUnlocked ? job.request.destAddress : approximateAddress(job.request.destAddress)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card className="rounded-xl border-border bg-white p-0 ring-0">
              <CardContent className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {job.status === "cancelled" ? "Precio que se había acordado" : "Precio acordado"}
                </p>
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
              Ver solicitud original
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>

          {job.status === "scheduled" && (
            <CancelJobAction jobId={job.id} requestId={job.requestId} isDriver={isDriver} />
          )}
        </div>
      </div>
    </div>
  )
}
