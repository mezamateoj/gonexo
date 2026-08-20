import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { DetailRow } from "@/components/requests/detail-row"
import { RequestRoute } from "@/components/requests/request-route"
import { formatCLP, formatLongDateTime, volumeLabels } from "@/lib/display"
import type { RequestDetail } from "@/lib/types"

export function RequestOverviewCard({ request }: { request: RequestDetail }) {
  const hasServices =
    request.budgetMax ||
    request.helpersNeeded > 0 ||
    request.hasFragileItems ||
    request.assemblyRequired ||
    request.packingIncluded ||
    request.longCarry ||
    request.flexibleDate

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalles del flete</CardTitle>
        <CardDescription>{request.distanceKm.toLocaleString("es-CL")} km de recorrido estimado</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <RequestRoute
          originAddress={request.originAddress}
          originFloor={request.originFloor}
          originHasElevator={request.originHasElevator}
          destAddress={request.destAddress}
          destFloor={request.destFloor}
          destHasElevator={request.destHasElevator}
        />

        <Separator />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <DetailRow label="Fecha" value={formatLongDateTime(request.scheduledAt)} />
          <DetailRow label="Volumen" value={volumeLabels[request.volumeCategory]} />
          <DetailRow label="Artículos" value={request.itemDescription} />
        </div>

        {hasServices && (
          <div className="flex flex-wrap gap-1.5">
            {request.budgetMax && <Badge variant="secondary">Presupuesto: {formatCLP(request.budgetMax)}</Badge>}
            {request.helpersNeeded > 0 && (
              <Badge variant="secondary">
                {request.helpersNeeded} ayudante{request.helpersNeeded > 1 ? "s" : ""}
              </Badge>
            )}
            {request.hasFragileItems && <Badge variant="outline">Artículos frágiles</Badge>}
            {request.assemblyRequired && <Badge variant="secondary">Requiere desarme</Badge>}
            {request.packingIncluded && <Badge variant="secondary">Incluye embalaje</Badge>}
            {request.longCarry && <Badge variant="secondary">Acarreo largo</Badge>}
            {request.flexibleDate && <Badge variant="outline">Fecha flexible</Badge>}
          </div>
        )}

        {request.notes && (
          <div className="rounded-lg bg-muted px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Notas</p>
            <p className="mt-1 text-sm text-pretty text-foreground">{request.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
