import { Link } from "@tanstack/react-router"
import { ArrowRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cancelledByRoleLabels, formatCompactDateTime } from "@/lib/display"
import type { JobDetail } from "@/lib/types"

export function JobCancelledBlock({ job }: { job: JobDetail }) {
  if (!job.cancelledByRole) return null

  // Only a driver-initiated cancel reopens the request for new offers; a
  // client-initiated cancel closes the request entirely (see workflows/jobs.ts).
  const reopened = job.cancelledByRole === "driver"

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <X />
        </div>
        <div>
          <CardTitle>Trabajo cancelado</CardTitle>
          <CardDescription>
            Por {cancelledByRoleLabels[job.cancelledByRole]}
            {job.cancelledAt ? ` · ${formatCompactDateTime(job.cancelledAt)}` : ""}
          </CardDescription>
        </div>
      </CardHeader>

      <Separator />

      <CardContent>
        <p className="leading-relaxed text-muted-foreground">
          {reopened
            ? "La solicitud quedó abierta y puede recibir nuevas ofertas."
            : "La solicitud fue cancelada junto con el trabajo."}
        </p>
      </CardContent>

      <CardFooter>
        <Button asChild variant="link" className="px-0">
          <Link to="/requests/$id" params={{ id: job.requestId }}>
            {reopened ? "Ver solicitud abierta" : "Ver solicitud"}
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
