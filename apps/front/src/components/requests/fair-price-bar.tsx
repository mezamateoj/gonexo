import { Slider } from "@/components/ui/slider"
import { formatCLP, formatCLPRange } from "@/lib/display"
import type { PriceRange } from "@/lib/types"

export function FairPriceBar({
  fair,
  value,
  onChange,
  disabled,
}: {
  fair: Pick<PriceRange, "min" | "max" | "acceptableMin" | "acceptableMax">
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}) {
  const span = fair.acceptableMax - fair.acceptableMin
  const pct = (v: number) => ((v - fair.acceptableMin) / span) * 100

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[11px] font-medium text-muted-foreground">
          Referencia para este flete
        </span>
        <span className="text-[15px] font-bold tabular-nums text-foreground">
          {formatCLPRange(fair.min, fair.max)}
        </span>
      </div>

      <div className="relative py-2">
        <div
          className="pointer-events-none absolute inset-y-0 top-1/2 h-2 -translate-y-1/2 rounded-full border-t border-primary bg-primary/[0.22]"
          style={{ left: `${pct(fair.min)}%`, width: `${pct(fair.max) - pct(fair.min)}%` }}
        />
        <Slider
          value={[value]}
          min={fair.acceptableMin}
          max={fair.acceptableMax}
          step={1000}
          disabled={disabled}
          onValueChange={(v) => onChange(v[0])}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] tabular-nums text-ink-faint">
        <span>{formatCLP(fair.acceptableMin)}</span>
        <span>{formatCLP(fair.acceptableMax)}</span>
      </div>
    </div>
  )
}
