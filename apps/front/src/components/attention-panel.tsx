import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import {
  ArrowRight,
  FileWarning,
  ListChecks,
  MapPinCheck,
  MessageSquareMore,
  Navigation,
  PackageCheck,
  Star,
} from "lucide-react"
import { useSession } from "@/lib/auth-client"
import { formatCompactDateTime } from "@/lib/display"
import { useAttentionQueries } from "@/hooks/use-attention-queries"
import type { ClientAttentionJob, DriverAttentionJob } from "@/lib/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

function ActionRow({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-muted/50 p-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-background shadow-sm">
          <Icon className="size-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-pretty text-sm font-medium text-foreground">{title}</p>
          <p className="text-pretty text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="w-full shrink-0 sm:w-auto">{action}</div>
    </div>
  )
}

function ActionSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
      <Skeleton className="size-9 shrink-0 rounded-md" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-48 max-w-full" />
        <Skeleton className="h-3 w-64 max-w-full" />
      </div>
      <Skeleton className="hidden h-8 w-24 sm:block" />
    </div>
  )
}

function JobRow({
  job,
  accountType,
}: {
  job: ClientAttentionJob | DriverAttentionJob
  accountType: "client" | "driver"
}) {
  const content = {
    confirm_reception: {
      icon: PackageCheck,
      title: "Confirma que recibiste tu flete",
      description: "El transportista marcó el trabajo como entregado.",
      label: "Confirmar",
    },
    start_job: {
      icon: Navigation,
      title: "Tienes un flete por iniciar",
      description: job.type === "start_job"
        ? `Programado para ${formatCompactDateTime(job.scheduledAt)}.`
        : "",
      label: "Ver trabajo",
    },
    mark_arrived: {
      icon: MapPinCheck,
      title: "Avisa cuando llegues",
      description: "Actualiza el estado para que el cliente pueda seguir el flete.",
      label: "Actualizar estado",
    },
    complete_job: {
      icon: PackageCheck,
      title: "Completa la entrega",
      description: "Pide el código al cliente y cierra el trabajo.",
      label: "Completar",
    },
    review_job: {
      icon: Star,
      title: accountType === "client"
        ? "Cuéntanos cómo salió el flete"
        : "Evalúa al cliente",
      description: accountType === "client"
        ? "Tu reseña ayuda a que otros clientes elijan con más confianza."
        : "Comparte cómo fue la coordinación de este flete.",
      label: "Dejar reseña",
    },
  }[job.type]

  return (
    <ActionRow
      icon={content.icon}
      title={content.title}
      description={content.description}
      action={
        <Button
          asChild
          variant={job.type === "review_job" ? "outline" : "default"}
          size="sm"
          className="w-full sm:w-auto"
        >
          <Link to="/jobs/$id" params={{ id: job.jobId }}>
            {content.label}
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      }
    />
  )
}

export function AttentionPanel({ className }: { className?: string }) {
  const { data: session } = useSession()
  const accountType = session?.user.accountType
  const { offers, jobs, verification } = useAttentionQueries(
    accountType,
    session?.user.id,
  )
  const clientJobs = jobs.data?.jobs.filter(
    (job): job is ClientAttentionJob =>
      job.type === "confirm_reception" || job.type === "review_job",
  ) ?? []
  const driverJobs = jobs.data?.jobs.filter(
    (job): job is DriverAttentionJob => job.type !== "confirm_reception",
  ) ?? []
  const hasActions = accountType === "client"
    ? (offers.data?.count ?? 0) + clientJobs.length > 0
    : driverJobs.length > 0 || !!verification.data?.verification
  const isLoading = jobs.isLoading ||
    (accountType === "client" ? offers.isLoading : verification.isLoading)
  const hasError = jobs.isError ||
    (accountType === "client" ? offers.isError : verification.isError)

  if (!accountType || (!hasActions && !isLoading && !hasError)) return null

  return (
    <Card size="sm" className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ListChecks className="size-4 text-primary" />
          <CardTitle>Lo que sigue</CardTitle>
        </div>
        <CardDescription>Acciones que mantienen tus fletes avanzando.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {accountType === "client" && offers.data?.offers.map((offer) => (
          <ActionRow
            key={offer.requestId}
            icon={MessageSquareMore}
            title={`${offer.quoteCount} ${offer.quoteCount === 1 ? "oferta lista" : "ofertas listas"} para comparar`}
            description="Revisa precio, vehículo y experiencia antes de elegir."
            action={
              <Button asChild size="sm" className="w-full sm:w-auto">
                <Link to="/requests/$id/offers" params={{ id: offer.requestId }}>
                  Ver ofertas
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            }
          />
        ))}
        {accountType === "client" && clientJobs.map((job) => (
          <JobRow key={`${job.type}-${job.jobId}`} job={job} accountType="client" />
        ))}
        {accountType === "driver" && verification.data?.verification && (
          <ActionRow
            icon={FileWarning}
            title="Corrige tus documentos"
            description={verification.data.verification.note}
            action={
              <Button asChild size="sm" className="w-full sm:w-auto">
                <Link to="/profile">
                  Revisar
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            }
          />
        )}
        {accountType === "driver" && driverJobs.map((job) => (
          <JobRow key={`${job.type}-${job.jobId}`} job={job} accountType="driver" />
        ))}

        {jobs.isLoading && <ActionSkeleton />}
        {accountType === "client" && offers.isLoading && <ActionSkeleton />}
        {accountType === "driver" && verification.isLoading && <ActionSkeleton />}

        {hasError && (
          <Alert variant="destructive">
            <AlertDescription>
              No pudimos cargar todas tus acciones. Vuelve a intentarlo en unos minutos.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
