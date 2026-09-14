import { Card, CardContent } from "@/components/ui/card"
import { initials } from "@/lib/display"
import type { JobDetail } from "@/lib/types"

// Keep contact locked until the API provides verified payment access.
export function CoordinationRow({ job, isClient }: { job: JobDetail; isClient: boolean }) {
  if (job.confirmedAt || job.status === "cancelled") return null

  const otherParty = isClient ? job.driver : job.user
  const roleLabel = isClient ? "Transportista" : "Cliente"

  return (
    <Card className="rounded-2xl border-border bg-white p-0 ring-0">
      <CardContent className="p-4">
        <div className="mb-3.5 flex items-center gap-3">
          {otherParty.image ? (
            <img
              src={otherParty.image}
              alt={otherParty.name}
              className="size-10 rounded-full object-cover outline outline-1 -outline-offset-1 outline-black/10"
            />
          ) : (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-[15px] font-semibold text-white">
              {initials(otherParty.name)}
            </div>
          )}
          <div>
            <p className="text-[14px] font-semibold text-foreground">{otherParty.name}</p>
            <p className="text-[12px] text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
        <p className="text-[13px] text-muted-foreground">
          Información disponible después del pago.
        </p>
      </CardContent>
    </Card>
  )
}
