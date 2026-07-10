import { createFileRoute, Link, useNavigate, stripSearchParams } from "@tanstack/react-router"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { useState } from "react"
import { z } from "zod"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table"
import {
  MapPin, Info, Image as ImageIcon, Users, AlertTriangle, Wrench, Box, MoveRight,
  Clock, ChevronLeft, ChevronRight, ChevronsUpDown, ArrowUp, ArrowDown, SearchX,
} from "lucide-react"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
import type { AvailableQuery, AvailableSort, OpenRequest } from "@/lib/types"

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
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <Info />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        className="w-[300px] p-0"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="rounded-[12px] border border-border bg-white p-4 shadow-lg">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Ruta · {routeKm(req)}
            {req.routeDurationS != null && <> · {formatDurationMin(req.routeDurationS)}</>}
          </p>
          <div className="mb-3 flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
              <div>
                <p className="text-[12px] font-medium text-foreground">{req.originAddress}</p>
                <p className="text-[11px] text-muted-foreground">{floorLine(req.originFloor, req.originHasElevator)}</p>
              </div>
            </div>
            <div className="ml-[3px] h-3 w-px bg-border" />
            <div className="flex items-start gap-2">
              <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
              <div>
                <p className="text-[12px] font-medium text-foreground">{req.destAddress}</p>
                <p className="text-[11px] text-muted-foreground">{floorLine(req.destFloor, req.destHasElevator)}</p>
              </div>
            </div>
          </div>

          <Separator className="mb-3" />
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Qué se mueve</p>
            <p className="text-[12px] text-ink-soft">{req.itemDescription}</p>
          </div>

          {req.notes && (
            <div className="mt-2 rounded-[6px] bg-surface px-2.5 py-2">
              <p className="text-[11px] italic text-muted-foreground">"{req.notes}"</p>
            </div>
          )}

          {(req.helpersNeeded > 0 || req.hasFragileItems || req.assemblyRequired || req.packingIncluded || req.longCarry) && (
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
              {req.helpersNeeded > 0 && (
                <Badge variant="secondary"><Users /> +{req.helpersNeeded} ayudante{req.helpersNeeded > 1 ? "s" : ""}</Badge>
              )}
              {req.hasFragileItems && (
                <Badge variant="secondary" className="bg-amber-50 text-amber-700"><AlertTriangle /> Frágil</Badge>
              )}
              {req.assemblyRequired && (
                <Badge variant="secondary"><Wrench /> Desarme</Badge>
              )}
              {req.packingIncluded && (
                <Badge variant="secondary"><Box /> Embalaje</Badge>
              )}
              {req.longCarry && (
                <Badge variant="secondary"><MoveRight /> Acarreo largo</Badge>
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
            <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3">
              <ImageIcon className="size-3.5 text-muted-foreground" />
              <p className="text-[11px] text-muted-foreground">
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
    <Badge variant="secondary" className={cls}>
      {n === 0 ? "Sin ofertas" : `${n} oferta${n !== 1 ? "s" : ""}`}
    </Badge>
  )
}

const columnHelper = createColumnHelper<OpenRequest>()

const columns = [
  columnHelper.display({
    id: "client",
    header: "Cliente",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
          {row.original.user.name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <span className="whitespace-nowrap text-[13px] font-medium text-foreground">{row.original.user.name}</span>
      </div>
    ),
  }),
  columnHelper.accessor("distanceKm", {
    id: "route",
    header: "Ruta",
    enableSorting: true,
    sortDescFirst: false,
    cell: ({ row }) => {
      const req = row.original
      return (
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <div className="size-1.5 shrink-0 rounded-full bg-primary" />
              <span className="max-w-[120px] truncate text-[12px] font-medium text-foreground">{shortAddress(req.originAddress)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-1.5 shrink-0 rounded-full bg-muted-foreground" />
              <span className="max-w-[120px] truncate text-[12px] text-ink-soft">{shortAddress(req.destAddress)}</span>
            </div>
          </div>
          <span className="ml-1 whitespace-nowrap rounded-full bg-surface-dim px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
            {routeKm(req)}
          </span>
          <DetailPopover req={req} />
        </div>
      )
    },
  }),
  columnHelper.display({
    id: "volume",
    header: "Carga",
    cell: ({ row }) => (
      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold", volumeColors[row.original.volumeCategory])}>
        {volumeLabels[row.original.volumeCategory]}
      </span>
    ),
  }),
  columnHelper.accessor("scheduledAt", {
    id: "scheduledAt",
    header: "Cuándo",
    enableSorting: true,
    sortDescFirst: false,
    cell: ({ row }) => {
      const { label, urgent } = relativeDate(row.original.scheduledAt)
      return (
        <span className={cn("flex items-center gap-1 whitespace-nowrap text-[12px] font-medium", urgent ? "text-amber-600" : "text-ink-soft")}>
          {urgent && <Clock className="size-3" />}
          {label}
        </span>
      )
    },
  }),
  columnHelper.display({
    id: "competition",
    header: "Competencia",
    cell: ({ row }) => <CompetitionBadge n={row.original.quoteCount} />,
  }),
  columnHelper.display({
    id: "fairPrice",
    header: "Precio justo",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-[13px] font-semibold tabular-nums text-primary">
        ≈ {formatCLP(row.original.fairPrice)}
      </span>
    ),
  }),
  columnHelper.display({
    id: "actions",
    header: "",
    cell: ({ row }) =>
      row.original.myQuoteStatus ? (
        <Badge variant="secondary">Oferta enviada</Badge>
      ) : (
        <div className="text-right">
          <Link to="/available/$id" params={{ id: row.original.id }}>
            <Button size="sm" className="whitespace-nowrap text-[12px] active:scale-[0.96] transition-[scale,opacity]">
              Ofertar →
            </Button>
          </Link>
        </div>
      ),
  }),
]

const SORT_TO_SORTING: Record<AvailableSort, SortingState> = {
  recent: [],
  soonest: [{ id: "scheduledAt", desc: false }],
  distance: [{ id: "route", desc: false }],
}

function sortingToSort(state: SortingState): AvailableSort {
  const col = state[0]
  if (!col || col.desc) return "recent"
  if (col.id === "scheduledAt") return "soonest"
  if (col.id === "route") return "distance"
  return "recent"
}

const SKELETON_HEADS = ["Cliente", "Ruta", "Carga", "Cuándo", "Competencia", "Precio justo"]

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-[10px] border border-border">
      <div className="flex gap-6 bg-surface px-4 py-3">
        {SKELETON_HEADS.map((h) => (
          <Skeleton key={h} className="h-3 w-20" />
        ))}
      </div>
      {[1, 2, 3, 4, 5].map((n) => (
        <div key={n} className="flex items-center gap-6 border-t border-border px-4 py-3.5">
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

  const rows = data?.data ?? []
  const total = data?.total ?? 0
  const limit = data?.limit ?? 20
  const pageCount = Math.max(1, Math.ceil(total / limit))
  const sorting = SORT_TO_SORTING[search.sort]
  const pagination: PaginationState = { pageIndex: search.page - 1, pageSize: limit }

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount,
    state: { sorting, pagination },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater
      patch({ sort: sortingToSort(next) })
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater(pagination) : updater
      patch({ page: next.pageIndex + 1 })
    },
  })

  if (profileLoading) return <div className="p-4 md:p-8"><LoadingState /></div>
  if (!profile) return null

  const hasFilters = search.volume.length > 0 || search.hasPhotos
  const rangeStart = total === 0 ? 0 : (search.page - 1) * limit + 1
  const rangeEnd = Math.min(search.page * limit, total)

  return (
    <div className="p-4 md:p-8">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-foreground">Buscar fletes</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
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
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>No se pudieron cargar las solicitudes. Intenta de nuevo.</AlertDescription>
        </Alert>
      )}

      {requestsLoading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-border bg-white py-16 text-center">
          {hasFilters ? (
            <>
              <SearchX className="mb-3 size-9 text-ink-faint" />
              <p className="text-[15px] font-medium text-foreground">Sin resultados con estos filtros</p>
              <p className="mt-1 text-[13px] text-muted-foreground">Prueba quitar algún filtro.</p>
              <Button
                type="button"
                variant="link"
                onClick={() => navigate({ replace: true, search: {} })}
                className="mt-3"
              >
                Limpiar filtros
              </Button>
            </>
          ) : (
            <>
              <MapPin className="mb-3 size-9 text-ink-faint" />
              <p className="text-[15px] font-medium text-foreground">No hay solicitudes abiertas</p>
              <p className="mt-1 text-[13px] text-muted-foreground">Vuelve pronto — los fletes aparecen aquí en tiempo real.</p>
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
          <div className={cn("hidden overflow-hidden rounded-[10px] border border-border transition-opacity md:block", isFetching && "opacity-60")}>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="bg-surface hover:bg-surface">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-ink-soft"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getIsSorted() === "asc" ? (
                              <ArrowUp className="size-3 text-primary" />
                            ) : header.column.getIsSorted() === "desc" ? (
                              <ArrowDown className="size-3 text-primary" />
                            ) : (
                              <ChevronsUpDown className="size-3 opacity-50" />
                            )}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="border-border hover:bg-surface">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-[12px] tabular-nums text-muted-foreground">
                {rangeStart}–{rangeEnd} de {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-[12px] tabular-nums text-muted-foreground">
                  Página {search.page} de {table.getPageCount()}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.nextPage()}
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
