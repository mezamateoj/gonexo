import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Step } from "@/components/requests/new/types"

const STEPS = [
  { n: 1 as Step, label: "Origen" },
  { n: 2 as Step, label: "Destino" },
  { n: 3 as Step, label: "Cuándo" },
  { n: 4 as Step, label: "Qué" },
  { n: 5 as Step, label: "Detalles" },
  { n: 6 as Step, label: "Confirmar" },
]

export function StepBar({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map(({ n, label }, i) => (
        <div key={n} className="flex items-center gap-2">
          {i > 0 && <div className={cn("h-px w-8", n <= step ? "bg-primary" : "bg-[#E9E7E3]")} />}
          <div className="flex items-center gap-1.5">
            <div className={cn(
              "flex size-[22px] items-center justify-center rounded-full text-[10px] font-bold transition-colors",
              n < step ? "bg-primary text-white" : n === step ? "bg-primary text-white" : "bg-[#F0EEE9] text-[#B0ABA5]"
            )}>
              {n < step ? <Check className="size-3" strokeWidth={3} /> : n}
            </div>
            <span className={cn(
              "text-[12px] font-medium transition-colors",
              n <= step ? "text-[#121715]" : "text-[#B0ABA5]"
            )}>{label}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
