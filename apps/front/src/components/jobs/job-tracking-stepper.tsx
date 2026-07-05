import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatTime, jobStatusOrder } from "@/lib/display"
import { useAdvanceJobStatus } from "@/hooks/use-request-mutations"
import { ConfirmDeliverySheet } from "./confirm-delivery-sheet"
import type { JobDetail, JobStatus } from "@/lib/types"

function StepDot({ state }: { state: "done" | "active" | "empty" }) {
  return (
    <span className="relative flex size-5 shrink-0 items-center justify-center">
      {state === "active" && (
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/40" />
      )}
      <span
        className={cn(
          "relative size-5 rounded-full border-2 transition-colors duration-300",
          (state === "done" || state === "active") && "border-primary bg-primary",
          state === "empty" && "border-border bg-white"
        )}
      />
    </span>
  )
}

function AdvanceButton({
  jobId,
  label,
  next,
}: {
  jobId: string
  label: string
  next: "on_the_way" | "arrived"
}) {
  const advance = useAdvanceJobStatus(jobId)
  return (
    <Button
      type="button"
      onClick={() => advance.mutate({ status: next })}
      disabled={advance.isPending}
      className="mt-1.5 h-9 w-fit px-4 text-[13px] font-semibold active:scale-[0.97]"
    >
      {advance.isPending ? "Actualizando…" : label}
    </Button>
  )
}

export function JobTrackingStepper({ job, isDriver }: { job: JobDetail; isDriver: boolean }) {
  if (job.status === "cancelled") return null

  const currentIdx = jobStatusOrder.indexOf(job.status)

  const rows: { status: JobStatus; label: string; meta: ReactNode }[] = [
    {
      status: "scheduled",
      label: "Agendado",
      meta: <p className="text-[12px] tabular-nums text-muted-foreground">{formatTime(job.request.scheduledAt)}</p>,
    },
    {
      status: "on_the_way",
      label: "En camino",
      meta:
        currentIdx === 1 && isDriver ? (
          <div className="flex flex-col items-start gap-1">
            {job.onTheWayAt && (
              <p className="text-[12px] tabular-nums text-muted-foreground">
                {formatTime(job.onTheWayAt)} · en curso
              </p>
            )}
            <AdvanceButton jobId={job.id} label="Ya llegué" next="arrived" />
          </div>
        ) : job.onTheWayAt ? (
          <p className="text-[12px] tabular-nums text-muted-foreground">{formatTime(job.onTheWayAt)}</p>
        ) : null,
    },
    {
      status: "arrived",
      label: "Llegó",
      meta:
        currentIdx === 2 && isDriver ? (
          <div className="flex flex-col items-start gap-1">
            {job.arrivedAt && (
              <p className="text-[12px] tabular-nums text-muted-foreground">
                {formatTime(job.arrivedAt)} · en el lugar
              </p>
            )}
            <ConfirmDeliverySheet jobId={job.id} />
          </div>
        ) : job.arrivedAt ? (
          <p className="text-[12px] tabular-nums text-muted-foreground">{formatTime(job.arrivedAt)}</p>
        ) : null,
    },
    {
      status: "completed",
      label: "Entregado",
      meta: job.completedAt ? (
        <p className="text-[12px] tabular-nums text-muted-foreground">{formatTime(job.completedAt)}</p>
      ) : null,
    },
  ]

  return (
    <Card className="rounded-2xl border-border bg-white p-0 ring-0">
      <CardContent className="p-5">
        <p className="mb-4 text-[15px] font-semibold text-foreground">Estado del flete</p>
        {rows.map((row, i) => {
          const isLast = i === rows.length - 1
          const done = i < currentIdx || (i === currentIdx && job.status === "completed")
          const active = i === currentIdx && job.status !== "completed"
          return (
            <div key={row.status} className="flex gap-3">
              <div className="flex flex-col items-center">
                <StepDot state={done ? "done" : active ? "active" : "empty"} />
                {!isLast && (
                  <div
                    className={cn(
                      "my-1 min-h-7 w-0.5 flex-1 transition-colors duration-500",
                      i < currentIdx ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>
              <div className={cn(!isLast && "pb-5")}>
                <p
                  className={cn(
                    "text-[14px] font-semibold transition-colors duration-300",
                    done || active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {row.label}
                </p>
                {row.meta}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
