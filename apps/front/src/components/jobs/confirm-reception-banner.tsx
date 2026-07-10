import { useEffect, useState } from "react"
import { Check, PackageCheck, PartyPopper } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DialogClose } from "@/components/ui/dialog"
import { CelebrationDialog } from "@/components/celebration-dialog"
import { fireConfetti } from "@/lib/celebrate"
import { formatConfirmTime } from "@/lib/display"
import { useConfirmJob } from "@/hooks/use-request-mutations"
import { StarRatingPrompt } from "./star-rating-prompt"
import type { JobDetail } from "@/lib/types"

function useCountdownLabel(target: string | null) {
  const [, forceTick] = useState(0)
  useEffect(() => {
    if (!target) return
    const id = setInterval(() => forceTick((n) => n + 1), 60_000)
    return () => clearInterval(id)
  }, [target])

  if (!target) return null
  const diffMs = new Date(target).getTime() - Date.now()
  if (diffMs <= 0) return "menos de 1 h"
  const hours = Math.floor(diffMs / 3_600_000)
  if (hours >= 1) return `${hours} h`
  return `${Math.max(1, Math.floor(diffMs / 60_000))} min`
}

export function ConfirmReceptionBanner({ job, hasReviewed }: { job: JobDetail; hasReviewed: boolean }) {
  const confirmJob = useConfirmJob(job.id)
  const countdown = useCountdownLabel(job.confirmedAt ? null : job.autoConfirmAt)
  const [celebrate, setCelebrate] = useState(false)

  if (job.status !== "completed") return null

  // The hourly auto-confirm cron only ever sets confirmedAt to a time at or
  // after autoConfirmAt; a manual confirm before the deadline always lands
  // strictly before it. Good enough to tell the two apart without a new column.
  const autoConfirmed =
    job.confirmedAt != null && job.autoConfirmAt != null && new Date(job.confirmedAt) >= new Date(job.autoConfirmAt)

  const card = !job.confirmedAt ? (
    <Card className="rounded-2xl border-amber-300 bg-amber-50 p-0 ring-0">
      <CardContent className="p-[18px]">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-amber-100">
            <PackageCheck className="size-[18px] text-amber-600" />
          </div>
          <p className="text-[16px] font-bold text-foreground">Tu flete fue entregado</p>
        </div>
        <p className="mb-4 text-[14px] leading-relaxed text-ink-soft">
          Confirma que recibiste todo bien.
          {countdown && (
            <>
              {" "}Se confirmará automáticamente en <span className="tabular-nums">{countdown}</span>
            </>
          )}
        </p>
        <Button
          type="button"
          onClick={() => confirmJob.mutate(undefined, {
            onSuccess: () => {
              fireConfetti()
              setCelebrate(true)
            },
          })}
          disabled={confirmJob.isPending}
          className="h-[46px] w-full bg-amber-500 text-[15px] font-semibold text-white hover:bg-amber-500/90 active:scale-[0.98]"
        >
          {confirmJob.isPending ? "Confirmando…" : "Confirmar recepción"}
        </Button>
      </CardContent>
    </Card>
  ) : (
    <Card className="animate-in fade-in slide-in-from-top-1 rounded-2xl border-green-300 bg-green-50 p-0 ring-0">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-green-600">
            <Check className="size-4 text-white" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-green-700">
              {autoConfirmed ? "Confirmado automáticamente" : "Confirmado"} · {formatConfirmTime(job.confirmedAt)}
            </p>
            <p className="text-[12px] text-muted-foreground">
              {autoConfirmed ? "No se recibió confirmación manual" : "Recepción confirmada manualmente"}
            </p>
          </div>
        </div>
        {!hasReviewed && (
          <>
            <div className="h-px bg-green-200" />
            <StarRatingPrompt jobId={job.id} label="¿Cómo fue el servicio?" />
          </>
        )}
      </CardContent>
    </Card>
  )

  return (
    <>
      {card}
      <CelebrationDialog
        open={celebrate}
        onOpenChange={setCelebrate}
        tone="success"
        icon={<PartyPopper />}
        title="¡Flete completado!"
        description="Gracias por confirmar la recepción. Deja una reseña para ayudar a otros clientes."
      >
        <DialogClose asChild>
          <Button className="h-11 w-full bg-green-600 text-[15px] font-semibold text-white hover:bg-green-600/90">
            Dejar una reseña
          </Button>
        </DialogClose>
        <DialogClose asChild>
          <Button variant="ghost" className="h-10 w-full">
            Ahora no
          </Button>
        </DialogClose>
      </CelebrationDialog>
    </>
  )
}
