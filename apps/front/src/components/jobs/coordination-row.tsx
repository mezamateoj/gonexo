import { CalendarPlus, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatShortDate, initials, shortAddress } from "@/lib/display"
import type { JobDetail } from "@/lib/types"

function buildIcs(job: JobDetail) {
  const start = new Date(job.request.scheduledAt)
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `UID:${job.id}@gonexo.cl`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:Flete gonexo: ${job.request.originAddress} → ${job.request.destAddress}`,
    `DESCRIPTION:${window.location.origin}/jobs/${job.id}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")
}

export function CoordinationRow({ job, isClient }: { job: JobDetail; isClient: boolean }) {
  if (job.confirmedAt || job.status === "cancelled") return null

  const otherParty = isClient ? job.driver : job.user
  const roleLabel = isClient ? "Transportista" : "Cliente"
  const phoneDigits = otherParty.phone?.replace(/\D/g, "")
  const waMessage = `Hola ${otherParty.name}! Te contacto por el flete de gonexo (${shortAddress(job.request.originAddress)} → ${shortAddress(job.request.destAddress)}, ${formatShortDate(job.request.scheduledAt)}).`
  const waHref = phoneDigits ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(waMessage)}` : null
  const icsHref = `data:text/calendar;charset=utf-8,${encodeURIComponent(buildIcs(job))}`

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
        <div className="flex gap-2.5">
          {waHref && (
            <Button
              asChild
              className="h-11 flex-1 bg-[#25D366] text-[14px] font-semibold text-white hover:bg-[#25D366]/90 active:scale-[0.97]"
            >
              <a href={waHref} target="_blank" rel="noreferrer">
                <MessageCircle className="size-[18px]" data-icon="inline-start" />
                WhatsApp
              </a>
            </Button>
          )}
          <Button asChild variant="outline" className="h-11 flex-1 bg-surface-dim text-[13px] font-medium">
            <a href={icsHref} download={`flete-gonexo-${job.id.slice(-6)}.ics`}>
              <CalendarPlus className="size-[18px]" data-icon="inline-start" />
              Agregar al calendario
            </a>
          </Button>
        </div>
        <p className="mt-2.5 text-center text-[11px] leading-relaxed text-muted-foreground">
          El mensaje incluirá el origen, destino y fecha del flete.
        </p>
      </CardContent>
    </Card>
  )
}
