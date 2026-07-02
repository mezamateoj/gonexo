import { Slider } from "@/components/ui/slider"
import { formatCLP, formatCLPRange } from "@/lib/display"
import type { PriceRange } from "@/lib/types"

// Reusable across the quote form and any future price-editing surface — the
// same fair band + acceptable window feed a green "fair zone" behind the
// driver's own min/max thumbs, so tuning the value shows both bands at once.
export function FairPriceBar({
  fair,
  value,
  onChange,
  disabled,
}: {
  fair: Pick<PriceRange, "min" | "max" | "acceptableMin" | "acceptableMax">
  value: [number, number]
  onChange: (value: [number, number]) => void
  disabled?: boolean
}) {
  const span = fair.acceptableMax - fair.acceptableMin
  const pct = (v: number) => ((v - fair.acceptableMin) / span) * 100

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-semibold tracking-wide text-[#B0ABA5]">
          PRECIO JUSTO SUGERIDO
        </span>
        <span className="text-[15px] font-bold tabular-nums text-[#121715]">
          {formatCLPRange(fair.min, fair.max)}
        </span>
      </div>

      <div className="relative py-2">
        {/* Fair-band zone — advisory only, sits behind the slider's own range fill */}
        <div
          className="pointer-events-none absolute inset-y-0 top-1/2 h-2 -translate-y-1/2 rounded-full border-t border-primary bg-primary/[0.22]"
          style={{ left: `${pct(fair.min)}%`, width: `${pct(fair.max) - pct(fair.min)}%` }}
        />
        <Slider
          value={value}
          min={fair.acceptableMin}
          max={fair.acceptableMax}
          step={1000}
          minStepsBetweenThumbs={1}
          disabled={disabled}
          onValueChange={(v) => onChange([v[0], v[1]] as [number, number])}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] tabular-nums text-[#B0ABA5]">
        <span>{formatCLP(fair.acceptableMin)}</span>
        <span>{formatCLP(fair.acceptableMax)}</span>
      </div>
    </div>
  )
}
