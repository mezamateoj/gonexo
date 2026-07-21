import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import {
  AnalysisSummary,
  DecisionPanel,
  DocumentGallery,
  DriverIdentity,
} from "@/components/admin/expediente"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import { reviewStatusLabel, reviewStatusVariant } from "@/lib/display"
import { queryKeys } from "@/lib/query-keys"
import type { DocumentReviewDecision } from "@/lib/types"

export const Route = createFileRoute("/_app/admin/drivers/$id")({
  component: ExpedientePage,
})

function ExpedientePage() {
  const { id } = Route.useParams()
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.admin.driver(id),
    queryFn: () => api.admin.driver(id),
  })
  const driver = data?.driver ?? null

  const mutation = useMutation({
    mutationFn: (action:
      | { type: "decide"; decision: DocumentReviewDecision; note?: string }
      | { type: "reopen" },
    ) => action.type === "decide"
      ? api.admin.decideReview(id, action.decision, action.note)
      : api.admin.reopenReview(id),
    onSuccess: (_response, action) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.driversAll })
      toast.success(action.type === "reopen"
        ? "Revisión reabierta"
        : action.decision === "verified" ? "Transportista verificado" : "Cambios solicitados")
    },
    onError: (error) => {
      toast.error("No se pudo registrar la decisión", {
        description: error instanceof Error ? error.message : undefined,
      })
    },
  })

  return (
    <div className="flex w-full flex-col gap-5 p-4 md:p-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/admin/drivers">
            <ArrowLeft data-icon="inline-start" />
            Volver a verificación
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
            <Skeleton className="h-72 w-full rounded-xl" />
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
        </div>
      ) : isError || !driver ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>No se pudo cargar el expediente</AlertTitle>
          <AlertDescription>El transportista no existe o hubo un error de red.</AlertDescription>
        </Alert>
      ) : (
        <>
          <header className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-balance font-heading text-2xl font-semibold">
                Expediente de {driver.user.name}
              </h1>
              {driver.latestReview && (
                <Badge variant={reviewStatusVariant(driver.latestReview)}>
                  {reviewStatusLabel(driver.latestReview)}
                </Badge>
              )}
            </div>
            <p className="text-pretty text-sm text-muted-foreground">
              La lectura automática ordena la información. La decisión final siempre es humana.
            </p>
          </header>

          <DriverIdentity driver={driver} />

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
            <DocumentGallery documents={driver.documents} review={driver.latestReview} />
            <div className="flex flex-col gap-4 lg:sticky lg:top-6">
              <AnalysisSummary review={driver.latestReview} />
              {driver.latestReview && (
                <DecisionPanel
                  key={driver.latestReview.id}
                  review={driver.latestReview}
                  isPending={mutation.isPending}
                  onDecision={(decision, note) => mutation.mutate({ type: "decide", decision, note })}
                  onReopen={() => mutation.mutate({ type: "reopen" })}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
