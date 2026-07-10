import { useState } from "react"
import { CircleAlert, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useCancelJob } from "@/hooks/use-request-mutations"

export function CancelJobAction({
  jobId,
  requestId,
  isDriver,
}: {
  jobId: string
  requestId: string
  isDriver: boolean
}) {
  const [open, setOpen] = useState(false)
  const mutation = useCancelJob(jobId, requestId)

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) mutation.reset()
      }}
    >
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="mx-auto text-destructive">
          <X data-icon="inline-start" />
          Cancelar trabajo
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cancelar este trabajo?</AlertDialogTitle>
          <AlertDialogDescription>
            {isDriver
              ? "El cliente recibirá una notificación y la solicitud quedará abierta para nuevas ofertas."
              : "El transportista recibirá una notificación y la solicitud se cancelará."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {mutation.isError && (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>{mutation.error.message}</AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Mantener trabajo</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending}
            onClick={(e) => {
              e.preventDefault()
              mutation.mutate(undefined, { onSuccess: () => setOpen(false) })
            }}
          >
            {mutation.isPending ? "Cancelando…" : "Cancelar trabajo"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
