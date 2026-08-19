import { MapPin } from "lucide-react"
import { floorLine } from "@/lib/display"

export function RequestRoute({
  originAddress,
  originFloor,
  originHasElevator,
  destAddress,
  destFloor,
  destHasElevator,
}: {
  originAddress: string
  originFloor: number | null
  originHasElevator: boolean
  destAddress: string
  destFloor: number | null
  destHasElevator: boolean
}) {
  return (
    <div className="flex flex-col">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <MapPin className="size-3.5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Origen</p>
          <p className="text-sm font-medium text-pretty text-foreground">{originAddress}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{floorLine(originFloor, originHasElevator)}</p>
        </div>
      </div>

      <div className="ml-3.5 h-6 w-px bg-border" />

      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <MapPin className="size-3.5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Destino</p>
          <p className="text-sm font-medium text-pretty text-foreground">{destAddress}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{floorLine(destFloor, destHasElevator)}</p>
        </div>
      </div>
    </div>
  )
}
