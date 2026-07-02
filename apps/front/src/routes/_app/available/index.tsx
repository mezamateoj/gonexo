import { createFileRoute, Link, useNavigate, stripSearchParams } from "@tanstack/react-router"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { useState } from "react"
import { z } from "zod"
import {
  MapPin, Info, Image as ImageIcon, Users, AlertTriangle, Wrench, Box, MoveRight,
  Clock, ChevronLeft, ChevronRight, SearchX,
} from "lucide-react"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AvailableRequestCard } from "@/components/available/available-request-card"
import { AvailableCardSkeleton } from "@/components/available/available-card-skeleton"
import { AvailableFilters } from "@/components/available/available-filters"
import { queryKeys } from "@/lib/query-keys"
import {
  floorLine, formatCLP, formatDurationMin,
  relativeDate, shortAddress, volumeColors, volumeLabels,
} from "@/lib/display"
import { cn } from "@/lib/utils"
import { useDriverProfileGate } from "@/hooks/use-driver-profile-gate"
import type { AvailableQuery, OpenRequest } from "@/lib/types"

const SEARCH_DEFAULTS = { page: 1, sort: "recent" as const, volume: [], hasPhotos: false }

const availableSearchSchema = z.object({
  page: z.number().int().positive().catch(1).default(1),
  sort: z.enum(["recent", "soonest", "distance"]).catch("recent").default("recent"),
  volume: z.array(z.enum(["small", "medium", "large", "full_move"])).catch([]).default([]),
  hasPhotos: z.boolean().catch(false).default(false),
})

export const Route = createFileRoute("/_app/available/")({
  validateSearch: availableSearchSchema,
  // Keep shareable URLs clean — omit params that equal their default.
  search: { middlewares: [stripSearchParams(SEARCH_DEFAULTS)] },
  component: AvailablePage,
})

// Server-computed display distance (exact coords are withheld from the feed).
function routeKm(req: OpenRequest): string {
  return `${req.distanceKm} km`
}

function DetailPopover({ req }: { req: OpenRequest }) {
  const [open, setOpen] = useState(false)

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
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#969e9b]">
            Ruta · {routeKm(req)}
            {req.routeDurationS != null && <> · {formatDurationMin(req.routeDurationS)}</>}
          </p>
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

          <div className="border-t border-[#EDEAE6] pt-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#969e9b]">Qué se mueve</p>
            <p className="text-[12px] text-[#485450]">{req.itemDescription}</p>
          </div>

          {req.notes && (
            <div className="mt-2 rounded-[6px] bg-[#F9F8F6] px-2.5 py-2">
              <p className="text-[11px] italic text-[#969e9b]">"{req.notes}"</p>
            </div>
          )}

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

          {req.budgetMax && (
            <div className="mt-2 rounded-[6px] bg-green-50 px-2.5 py-2">
              <p className="text-[11px] font-semibold text-green-700">
                Presupuesto máximo: {formatCLP(req.budgetMax)}
              </p>
            </div>
          )}

          {req.photos.length > 0 && (
            <div className="mt-3 flex items-center gap-1.5 border-t border-[#EDEAE6] pt-3">
              <ImageIcon className="size-3.5 text-[#969e9b]" />
              <p className="text-[11px] text-[#969e9b]">
                {req.photos.length} foto{req.photos.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function CompetitionBadge({ n }: { n: number }) {
  const cls =
    n === 0 ? "bg-green-50 text-green-700" :
    n <= 2 ? "bg-amber-50 text-amber-700" :
    "bg-red-50 text-red-700"
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold", cls)}>
      {n === 0 ? "Sin ofertas" : `${n} oferta${n !== 1 ? "s" : ""}`}
    </span>
  )
}

const TABLE_HEADS = ["Cliente", "Ruta", "Carga", "Cuándo", "Competencia", "Precio justo", ""]

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-[10px] border border-[#EDEAE6]">
      <div className="flex gap-6 bg-[#F9F8F6] px-4 py-3">
        {TABLE_HEADS.slice(0, 6).map((h) => (
          <Skeleton key={h} className="h-3 w-20" />
        ))}
      </div>
      {[1, 2, 3, 4, 5].map((n) => (
        <div key={n} className="flex items-center gap-6 border-t border-[#EDEAE6] px-4 py-3.5">
          <Skeleton className="size-7 shrink-0 rounded-full" />
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

function LoadingState() {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {[1, 2, 3].map((n) => <AvailableCardSkeleton key={n} />)}
      </div>
      <div className="hidden md:block"><TableSkeleton /></div>
    </>
  )
}

function AvailablePage() {
  const { data: profile, isLoading: profileLoading } = useDriverProfileGate()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  // Filter/sort changes reset to page 1; explicit page changes don't.
  function patch(p: Partial<typeof search>) {
    navigate({
      replace: true,
      search: (prev) => ({ ...prev, ...p, ...("page" in p ? {} : { page: 1 }) }),
    })
  }

  const query: AvailableQuery = {
    page: search.page,
    sort: search.sort,
    volume: search.volume.length > 0 ? search.volume : undefined,
    hasPhotos: search.hasPhotos || undefined,
  }

  const { data, isLoading: requestsLoading, isFetching, isError } = useQuery({
    queryKey: queryKeys.requests.available(query),
    queryFn: () => api.requests.list(query),
    enabled: !!profile,
    placeholderData: keepPreviousData,
  })

  if (profileLoading) return <div className="p-4 md:p-8"><LoadingState /></div>
  if (!profile) return null

  const rows = data?.data ?? []
  const total = data?.total ?? 0
  const limit = data?.limit ?? 20
  const pageCount = Math.max(1, Math.ceil(total / limit))
  const hasFilters = search.volume.length > 0 || search.hasPhotos
  const rangeStart = total === 0 ? 0 : (search.page - 1) * limit + 1
  const rangeEnd = Math.min(search.page * limit, total)

  return (
    <div className="p-4 md:p-8">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#121715]">Solicitudes disponibles</h1>
          <p className="mt-1 text-[13px] text-[#969e9b]">
            {total > 0
              ? `${total} solicitud${total !== 1 ? "es" : ""} abierta${total !== 1 ? "s" : ""}`
              : "Sin solicitudes por ahora"}
          </p>
        </div>
        <AvailableFilters
          sort={search.sort}
          volume={search.volume}
          hasPhotos={search.hasPhotos}
          onChange={patch}
          onReset={() => navigate({ replace: true, search: {} })}
        />
      </div>

      {isError && (
        <div className="mb-4 rounded-[10px] border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          No se pudieron cargar las solicitudes. Intenta de nuevo.
        </div>
      )}

      {requestsLoading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[#E9E7E3] bg-white py-16 text-center">
          {hasFilters ? (
            <>
              <SearchX className="mb-3 size-9 text-[#D0CCC7]" />
              <p className="text-[15px] font-medium text-[#121715]">Sin resultados con estos filtros</p>
              <p className="mt-1 text-[13px] text-[#969e9b]">Prueba quitar algún filtro.</p>
              <button
                type="button"
                onClick={() => navigate({ replace: true, search: {} })}
                className="mt-3 text-[13px] font-medium text-primary"
              >
                Limpiar filtros
              </button>
            </>
          ) : (
            <>
              <MapPin className="mb-3 size-9 text-[#D0CCC7]" />
              <p className="text-[15px] font-medium text-[#121715]">No hay solicitudes abiertas</p>
              <p className="mt-1 text-[13px] text-[#969e9b]">Vuelve pronto — los fletes aparecen aquí en tiempo real.</p>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className={cn("grid grid-cols-1 gap-3 transition-opacity md:hidden", isFetching && "opacity-60")}>
            {rows.map((req) => <AvailableRequestCard key={req.id} req={req} />)}
          </div>

          {/* Desktop: table */}
          <div className={cn("hidden overflow-hidden rounded-[10px] border border-[#EDEAE6] transition-opacity md:block", isFetching && "opacity-60")}>
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F9F8F6] hover:bg-[#F9F8F6]">
                  {TABLE_HEADS.map((h, i) => (
                    <TableHead key={h || i} className="text-[11px] font-semibold uppercase tracking-wider text-[#969e9b]">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((req) => (
                  <TableRow key={req.id} className="border-[#EDEAE6] hover:bg-[#F9F8F6]">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                          {req.user.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <span className="whitespace-nowrap text-[13px] font-medium text-[#121715]">{req.user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <div className="size-1.5 shrink-0 rounded-full bg-primary" />
                            <span className="max-w-[120px] truncate text-[12px] font-medium text-[#121715]">{shortAddress(req.originAddress)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="size-1.5 shrink-0 rounded-full bg-[#969e9b]" />
                            <span className="max-w-[120px] truncate text-[12px] text-[#485450]">{shortAddress(req.destAddress)}</span>
                          </div>
                        </div>
                        <span className="ml-1 whitespace-nowrap rounded-full bg-[#F0EEE9] px-1.5 py-0.5 text-[10px] tabular-nums text-[#969e9b]">
                          {routeKm(req)}
                        </span>
                        <DetailPopover req={req} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold", volumeColors[req.volumeCategory])}>
                        {volumeLabels[req.volumeCategory]}
                      </span>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const { label, urgent } = relativeDate(req.scheduledAt)
                        return (
                          <span className={cn("flex items-center gap-1 whitespace-nowrap text-[12px] font-medium", urgent ? "text-amber-600" : "text-[#485450]")}>
                            {urgent && <Clock className="size-3" />}
                            {label}
                          </span>
                        )
                      })()}
                    </TableCell>
                    <TableCell><CompetitionBadge n={req.quotes.length} /></TableCell>
                    <TableCell>
                      <span className="whitespace-nowrap text-[13px] font-semibold tabular-nums text-primary">
                        ≈ {formatCLP(req.fairPrice)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to="/available/$id" params={{ id: req.id }}>
                        <Button size="sm" className="whitespace-nowrap text-[12px] active:scale-[0.96] transition-[scale,opacity]">
                          Cotizar →
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-[12px] tabular-nums text-[#969e9b]">
                {rangeStart}–{rangeEnd} de {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={search.page <= 1}
                  onClick={() => patch({ page: search.page - 1 })}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-[12px] tabular-nums text-[#969e9b]">
                  Página {search.page} de {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={search.page >= pageCount}
                  onClick={() => patch({ page: search.page + 1 })}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
