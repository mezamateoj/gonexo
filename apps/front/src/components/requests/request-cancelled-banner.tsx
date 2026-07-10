import { Ban, CircleAlert, RefreshCw } from "lucide-react"
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useReopenRequest } from "@/hooks/use-request-mutations"

export function RequestCancelledBanner({ requestId }: { requestId: string }) {
  const mutation = useReopenRequest(requestId)

  return (
    <div className="flex flex-col gap-2">
      <Alert>
        <Ban />
        <AlertTitle>Solicitud cancelada</AlertTitle>
        <AlertDescription>
          Esta solicitud está cerrada. Puedes reabrirla para volver a recibir ofertas.
        </AlertDescription>
        <AlertAction>
          <Button size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            <RefreshCw data-icon="inline-start" />
            {mutation.isPending ? "Reabriendo..." : "Reabrir"}
          </Button>
        </AlertAction>
      </Alert>

      {mutation.isError && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{mutation.error.message}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
