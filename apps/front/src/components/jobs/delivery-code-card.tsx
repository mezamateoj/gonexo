import { useState } from "react"
import { Check, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatTime } from "@/lib/display"
import { cn } from "@/lib/utils"
import type { JobDetail } from "@/lib/types"

export function DeliveryCodeCard({ job }: { job: JobDetail }) {
  const [copied, setCopied] = useState(false)
  const code = job.confirmCode ?? ""

  if (job.status === "completed") {
    return (
      <Card className="rounded-xl border-border bg-white p-0 ring-0">
        <CardContent className="flex items-center gap-2.5 px-4 py-3.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-green-600">
            <Check className="size-4 text-white" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-foreground">Entrega confirmada con código</p>
            {job.confirmCodeUsedAt && (
              <p className="text-[12px] tabular-nums text-muted-foreground">{formatTime(job.confirmCodeUsedAt)}</p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!code) return null

  const approaching = job.status === "on_the_way" || job.status === "arrived"

  function handleCopy() {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <Card
      className={cn(
        "rounded-2xl bg-white p-0 ring-0 transition-[border-color,box-shadow] duration-300",
        approaching ? "border-2 border-primary shadow-lg shadow-primary/15" : "border-border"
      )}
    >
      <CardContent className="p-5">
        <div className="mb-4 flex items-center gap-2 text-primary">
          <KeyRound className="size-4" />
          <p className="text-[12px] font-semibold tracking-[0.02em]">Código de entrega</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={handleCopy}
          className="mb-4 h-auto w-full justify-center gap-2 p-0 hover:bg-transparent active:scale-[0.97]"
          aria-label="Copiar código"
        >
          {code.split("").map((digit, index) => (
            <span
              key={`${digit}-${index}`}
              className="animate-in fade-in zoom-in-95 flex h-20 w-[68px] items-center justify-center rounded-xl bg-surface text-[44px] font-bold tracking-tight text-foreground tabular-nums duration-300"
            >
              {digit}
            </span>
          ))}
        </Button>
        <p className="text-center text-[13px] leading-relaxed text-muted-foreground">
          {copied
            ? "Copiado"
            : approaching
              ? "El transportista te pedirá este código al entregar."
              : "Muéstrale este código al transportista cuando recibas tu flete."}
        </p>
      </CardContent>
    </Card>
  )
}
