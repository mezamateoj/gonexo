import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MapPin, Info, Image, Users, AlertTriangle, Wrench, Box, MoveRight } from "lucide-react"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { AvailableRequestCard } from "@/components/available/available-request-card"
import { AvailableCardSkeleton } from "@/components/available/available-card-skeleton"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { queryKeys } from "@/lib/query-keys"
import { distanceKm, floorLine, relativeDate, shortAddress, volumeColors, volumeLabels } from "@/lib/display"
import { useDriverProfileGate } from "@/hooks/use-driver-profile-gate"
import type { OpenRequest } from "@/lib/types"

export const Route = createFileRoute("/_app/available")({
  component: AvailablePage,
})

function DetailPopover({ req }: { req: OpenRequest }) {
  const [open, setOpen] = useState(false)
  const km = distanceKm(req.originLat, req.originLng, req.destLat, req.destLng)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="flex size-6 items-center justify-center rounded-full text-[#B0ABA5] hover:bg-[#F0EEE9] hover:text-[#485450]"
        >
          <Info className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        className="w-[300px] p-0"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="rounded-[12px] border border-[#EDEAE6] bg-white p-4 shadow-lg">
          {/* Route detail */}
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#969e9b]">Ruta · {km.toFixed(1)} km</p>
          <div className="mb-3 space-y-2">
            <div className="flex items-start gap-2">
              <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
              <div>
                <p className="text-[12px] font-medium text-[#121715]">{req.originAddress}</p>
                <p className="text-[11px] text-[#969e9b]">{floorLine(req.originFloor, req.originHasElevator)}</p>
              </div>
            </div>
            <div className="ml-[3px] h-3 w-px bg-[#EDEAE6]" />
            <div className="flex items-start gap-2">
              <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#969e9b]" />
              <div>
                <p className="text-[12px] font-medium text-[#121715]">{req.destAddress}</p>
                <p className="text-[11px] text-[#969e9b]">{floorLine(req.destFloor, req.destHasElevator)}</p>
              </div>
            </div>
          </div>

          {/* What's moving */}
          <div className="border-t border-[#EDEAE6] pt-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#969e9b]">Qué se mueve</p>
            <p className="text-[12px] text-[#485450]">{req.itemDescription}</p>
          </div>

          {/* Notes */}
          {req.notes && (
            <div className="mt-2 rounded-[6px] bg-[#F9F8F6] px-2.5 py-2">
              <p className="text-[11px] italic text-[#969e9b]">"{req.notes}"</p>
            </div>
          )}

          {/* Service flags */}
          {(req.helpersNeeded > 0 || req.hasFragileItems || req.assemblyRequired || req.packingIncluded || req.longCarry) && (
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#EDEAE6] pt-3">
              {req.helpersNeeded > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-[#F0EEE9] px-2 py-0.5 text-[10px] text-[#485450]">
                  <Users className="size-2.5" /> +{req.helpersNeeded} ayudante{req.helpersNeeded > 1 ? "s" : ""}
                </span>
              )}
              {req.hasFragileItems && (
                <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">
                  <AlertTriangle className="size-2.5" /> Frágil
                </span>
              )}
              {req.assemblyRequired && (
                <span className="flex items-center gap-1 rounded-full bg-[#F0EEE9] px-2 py-0.5 text-[10px] text-[#485450]">
                  <Wrench className="size-2.5" /> Desarme
                </span>
              )}
              {req.packingIncluded && (
                <span className="flex items-center gap-1 rounded-full bg-[#F0EEE9] px-2 py-0.5 text-[10px] text-[#485450]">
                  <Box className="size-2.5" /> Embalaje
                </span>
              )}
              {req.longCarry && (
                <span className="flex items-center gap-1 rounded-full bg-[#F0EEE9] px-2 py-0.5 text-[10px] text-[#485450]">
                  <MoveRight className="size-2.5" /> Acarreo largo
                </span>
              )}
            </div>
          )}

          {/* Budget */}
          {req.budgetMax && (
            <div className="mt-2 rounded-[6px] bg-green-50 px-2.5 py-2">
              <p className="text-[11px] font-semibold text-green-700">
                Presupuesto máximo: ${req.budgetMax.toLocaleString("es-CL")}
              </p>
            </div>
          )}

          {/* Photos */}
          {req.photos.length > 0 && (
            <div className="mt-3 flex items-center gap-1.5 border-t border-[#EDEAE6] pt-3">
              <Image className="size-3.5 text-[#969e9b]" />
              <p className="text-[11px] text-[#969e9b]">{req.photos.length} foto{req.photos.length !== 1 ? "s" : ""} disponible{req.photos.length !== 1 ? "s" : ""}</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

const columns: ColumnDef<OpenRequest>[] = [
  {
    id: "cliente",
    accessorFn: (row) => row.user.name,
    header: "Cliente",
    cell: ({ row }) => {
      const req = row.original
      return (
        <div className="flex items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
            {req.user.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <span className="text-[13px] font-medium text-[#121715] whitespace-nowrap">{req.user.name}</span>
        </div>
      )
    },
  },
  {
    id: "ruta",
    accessorFn: (row) => row.originAddress,
    header: ({ column }) => (
      <button
        type="button"
        className="flex items-center gap-1 hover:text-[#121715]"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Ruta <ArrowUpDown className="size-3" />
      </button>
    ),
    cell: ({ row }) => {
      const req = row.original
      const km = distanceKm(req.originLat, req.originLng, req.destLat, req.destLng)
      const from = shortAddress(req.originAddress)
      const to = shortAddress(req.destAddress)
      return (
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <div className="size-1.5 shrink-0 rounded-full bg-primary" />
              <span className="text-[12px] font-medium text-[#121715]">{from}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-1.5 shrink-0 rounded-full bg-[#969e9b]" />
              <span className="text-[12px] text-[#485450]">{to}</span>
            </div>
          </div>
          <span className="ml-1 rounded-full bg-[#F0EEE9] px-1.5 py-0.5 text-[10px] text-[#969e9b] whitespace-nowrap">
            {km.toFixed(1)} km
          </span>
          <DetailPopover req={req} />
        </div>
      )
    },
  },
  {
    accessorKey: "volumeCategory",
    header: "Carga",
    cell: ({ row }) => (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${volumeColors[row.original.volumeCategory]}`}>
        {volumeLabels[row.original.volumeCategory]}
      </span>
    ),
  },
  {
    accessorKey: "scheduledAt",
    header: ({ column }) => (
      <button
        type="button"
        className="flex items-center gap-1 hover:text-[#121715]"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Cuándo <ArrowUpDown className="size-3" />
      </button>
    ),
    cell: ({ row }) => {
      const { label, urgent } = relativeDate(row.original.scheduledAt)
      return (
        <span className={`text-[12px] font-medium whitespace-nowrap ${urgent ? "text-amber-600" : "text-[#485450]"}`}>
          {label}
        </span>
      )
    },
  },
  {
    id: "ofertas",
    accessorFn: (row) => row.quotes.length,
    header: "Competencia",
    cell: ({ row }) => {
      const n = row.original.quotes.length
      const cls =
        n === 0 ? "bg-green-50 text-green-700" :
        n <= 2   ? "bg-amber-50 text-amber-700" :
                   "bg-red-50 text-red-700"
      return (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
          {n === 0 ? "Sin ofertas" : `${n} oferta${n !== 1 ? "s" : ""}`}
        </span>
      )
    },
  },
  {
    id: "acciones",
    cell: ({ row }) => (
      <Link to="/available/$id" params={{ id: row.original.id }}>
        <Button size="sm" className="text-[12px] whitespace-nowrap">
          Cotizar →
        </Button>
      </Link>
    ),
  },
]

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-[10px] border border-[#EDEAE6]">
      <div className="bg-[#F9F8F6] px-4 py-3 flex gap-6">
        {["Cliente", "Ruta", "Carga", "Cuándo", "Competencia"].map((h) => (
          <Skeleton key={h} className="h-3 w-20" />
        ))}
      </div>
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="flex items-center gap-6 border-t border-[#EDEAE6] px-4 py-3.5">
          <Skeleton className="size-7 rounded-full shrink-0" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="ml-auto h-7 w-20 rounded-md" />
        </div>
      ))}
    </div>
  )
}

// Cards on mobile, table skeleton on desktop — mirrors the loaded layout
function LoadingState() {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {[1, 2, 3].map((n) => (
          <AvailableCardSkeleton key={n} />
        ))}
      </div>
      <div className="hidden md:block">
        <TableSkeleton />
      </div>
    </>
  )
}

function AvailablePage() {
  const { data: profile, isLoading: profileLoading } = useDriverProfileGate()

  const { data, isLoading: requestsLoading, isError } = useQuery({
    queryKey: queryKeys.requests.available(1),
    queryFn: () => api.requests.list(),
    enabled: !!profile,
  })

  if (profileLoading) return <div className="p-4 md:p-8"><LoadingState /></div>
  if (!profile) return null

  const requests = data?.data ?? []

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#121715]">Solicitudes disponibles</h1>
        <p className="mt-1 text-[13px] text-[#969e9b]">
          {requests.length > 0
            ? `${requests.length} solicitud${requests.length !== 1 ? "es" : ""} abierta${requests.length !== 1 ? "s" : ""}`
            : "Sin solicitudes por ahora"}
        </p>
      </div>

      {isError && (
        <div className="mb-4 rounded-[10px] border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          No se pudieron cargar las solicitudes. Intenta de nuevo.
        </div>
      )}

      {requestsLoading ? (
        <LoadingState />
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[#E9E7E3] bg-white py-16 text-center">
          <MapPin className="mb-3 size-9 text-[#D0CCC7]" />
          <p className="text-[15px] font-medium text-[#121715]">No hay solicitudes abiertas</p>
          <p className="mt-1 text-[13px] text-[#969e9b]">Vuelve pronto — los fletes aparecen aquí en tiempo real.</p>
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {requests.map((req) => (
              <AvailableRequestCard key={req.id} req={req} />
            ))}
          </div>

          {/* Desktop: sortable/filterable table */}
          <div className="hidden md:block">
            <DataTable
              columns={columns}
              data={requests}
              filterColumn="cliente"
              filterPlaceholder="Buscar por cliente..."
            />
          </div>
        </>
      )}
    </div>
  )
}
