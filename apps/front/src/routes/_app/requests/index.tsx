import { createFileRoute, Link, stripSearchParams, useNavigate } from "@tanstack/react-router"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { useMemo } from "react"
import { z } from "zod"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table"
import { Archive, ArrowDown, ArrowUp, ChevronsUpDown, CircleDot, PackagePlus, SearchX } from "lucide-react"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { RequestBucket, RequestSort, RequestSummary, VolumeCategory } from "@/lib/types"
import {
  formatCLP,
  formatCLPRange,
  formatCompactDateTime,
  requestStatusClasses,
  requestStatusLabels,
  shortAddress,
  volumeColors,
  volumeLabels,
} from "@/lib/display"
import { cn } from "@/lib/utils"
import { RequestCard } from "@/components/requests/request-card"
import { MyFletesToolbar } from "@/components/my-fletes-toolbar"
import { TablePagination } from "@/components/table-pagination"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const lifecycleTabSchema = z.enum(["offers", "active", "history"])
const volumeSchema = z.enum(["small", "medium", "large", "full_move"])

const SEARCH_DEFAULTS = { tab: "offers" as const, page: 1, q: "", volume: [] as VolumeCategory[], sort: "recent" as const }

const requestsSearchSchema = z.object({
  tab: lifecycleTabSchema.catch("offers").default("offers"),
  page: z.number().int().positive().catch(1).default(1),
  q: z.string().catch("").default(""),
  volume: z.array(volumeSchema).catch([]).default([]),
  sort: z.enum(["recent", "sched_asc", "sched_desc"]).catch("recent").default("recent"),
})

type RequestsSearch = z.infer<typeof requestsSearchSchema>

export const Route = createFileRoute("/_app/requests/")({
  validateSearch: requestsSearchSchema,
  search: { middlewares: [stripSearchParams(SEARCH_DEFAULTS)] },
  component: RequestsPage,
})

const EMPTY_STATES: Record<
  RequestBucket,
  { icon: typeof CircleDot; title: string; description: string }
> = {
  offers: {
    icon: CircleDot,
    title: "No tienes fletes esperando ofertas",
    description: "Publica un flete para empezar a recibir ofertas de transportistas.",
  },
  active: {
    icon: PackagePlus,
    title: "No tienes fletes en curso",
    description: "Cuando aceptes una oferta, podrás seguir el flete desde aquí.",
  },
  history: {
    icon: Archive,
    title: "Tu historial está vacío",
    description: "Los fletes confirmados y cancelados aparecerán aquí.",
  },
}

// Row → job detail once a quote is accepted, otherwise the request itself.
function rowDestination(req: RequestSummary) {
  return req.job
    ? { to: "/jobs/$id" as const, params: { id: req.job.id } }
    : { to: "/requests/$id" as const, params: { id: req.id } }
}

const SORT_TO_STATE: Record<RequestSort, SortingState> = {
  recent: [],
  sched_asc: [{ id: "scheduledAt", desc: false }],
  sched_desc: [{ id: "scheduledAt", desc: true }],
}

function stateToSort(state: SortingState): RequestSort {
  const col = state[0]
  if (!col || col.id !== "scheduledAt") return "recent"
  return col.desc ? "sched_desc" : "sched_asc"
}

// Ofertas count while open; the agreed/cheapest price once quoted.
function RequestValueCell({ req }: { req: RequestSummary }) {
  const openQuotes = req.quotes.filter((q) => q.status === "pending")
  const priced = req.quotes.filter((q) => q.status !== "cancelled" && q.status !== "expired")
  const shown =
    priced.find((q) => q.status === "accepted") ??
    (priced.length > 0 ? priced.reduce((a, b) => (a.price <= b.price ? a : b)) : null)

  if (req.status === "open" && openQuotes.length > 0) {
    return (
      <Badge variant="secondary">
        {openQuotes.length} {openQuotes.length === 1 ? "oferta" : "ofertas"}
      </Badge>
    )
  }
  if (shown) {
    return (
      <span className="tabular-nums font-semibold text-foreground">
        {shown.priceMin != null && shown.priceMax != null
          ? formatCLPRange(shown.priceMin, shown.priceMax)
          : formatCLP(shown.price)}
      </span>
    )
  }
  return <span className="text-muted-foreground">—</span>
}

const columnHelper = createColumnHelper<RequestSummary>()

function RequestsPage() {
  const { tab, page, q, volume, sort } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  // Filter/sort changes reset to page 1; explicit page changes don't.
  function patch(p: Partial<RequestsSearch>) {
    navigate({
      replace: true,
      search: (prev) => ({ ...prev, ...p, ...("page" in p ? {} : { page: 1 }) }),
    })
  }

  const query = { bucket: tab, page, q: q || undefined, volume, sort }

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: queryKeys.requests.my(query),
    queryFn: () => api.requests.my(query),
    placeholderData: keepPreviousData,
  })

  const rows = data?.data ?? []
  const total = data?.total ?? 0
  const limit = data?.limit ?? 20
  const pageCount = Math.max(1, Math.ceil(total / limit))
  const sorting = SORT_TO_STATE[sort]

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "status",
        header: "Estado",
        cell: ({ row }) => (
          <Badge variant="secondary" className={cn(requestStatusClasses[row.original.status])}>
            {requestStatusLabels[row.original.status]}
          </Badge>
        ),
      }),
      columnHelper.display({
        id: "route",
        header: "Ruta",
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 shrink-0 rounded-full bg-primary" />
              <span className="max-w-[220px] truncate text-[13px] font-medium text-foreground">
                {shortAddress(row.original.originAddress)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground" />
              <span className="max-w-[220px] truncate text-[13px] text-ink-soft">
                {shortAddress(row.original.destAddress)}
              </span>
            </div>
          </div>
        ),
      }),
      columnHelper.display({
        id: "volume",
        header: "Carga",
        cell: ({ row }) => (
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
              volumeColors[row.original.volumeCategory],
            )}
          >
            {volumeLabels[row.original.volumeCategory]}
          </span>
        ),
      }),
      columnHelper.accessor("scheduledAt", {
        id: "scheduledAt",
        header: "Fecha",
        enableSorting: true,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-[13px] text-ink-soft">
            {formatCompactDateTime(row.original.scheduledAt)}
          </span>
        ),
      }),
      columnHelper.display({
        id: "value",
        header: tab === "offers" ? "Ofertas" : "Precio",
        cell: ({ row }) => <RequestValueCell req={row.original} />,
      }),
    ],
    [tab],
  )

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount,
    state: { sorting },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater
      patch({ sort: stateToSort(next) })
    },
  })

  const hasFilters = q.length > 0 || volume.length > 0
  const empty = EMPTY_STATES[tab]
  const EmptyIcon = empty.icon

  return (
    <div className="flex w-full flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Mis fletes</h1>
        <p className="text-sm text-muted-foreground">
          Revisa ofertas, sigue tus fletes activos y consulta tu historial.
        </p>
      </div>

      <MyFletesToolbar
        bucket={{
          value: tab,
          options: [
            { value: "offers", label: "Ofertas" },
            { value: "active", label: "En curso" },
            { value: "history", label: "Historial" },
          ],
          onChange: (value) => patch({ tab: value }),
        }}
        q={q}
        volume={volume}
        searchPlaceholder="Buscar por dirección…"
        onChange={patch}
        onReset={() => navigate({ replace: true, search: { tab } })}
      />

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={n} className="h-14" />
          ))}
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTitle>No pudimos cargar tus fletes</AlertTitle>
          <AlertDescription>Intenta nuevamente en unos minutos.</AlertDescription>
        </Alert>
      ) : rows.length === 0 && hasFilters ? (
        <Empty className="min-h-72 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>Sin resultados</EmptyTitle>
            <EmptyDescription>Prueba con otra búsqueda o quita algún filtro.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => navigate({ replace: true, search: { tab } })}>
              Limpiar filtros
            </Button>
          </EmptyContent>
        </Empty>
      ) : rows.length === 0 ? (
        <Empty className="min-h-72 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <EmptyIcon />
            </EmptyMedia>
            <EmptyTitle>{empty.title}</EmptyTitle>
            <EmptyDescription>{empty.description}</EmptyDescription>
          </EmptyHeader>
          {tab === "offers" && (
            <EmptyContent>
              <Button asChild>
                <Link to="/requests/new">Publicar flete</Link>
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className={cn("grid grid-cols-1 gap-3 transition-opacity md:hidden", isFetching && "opacity-60")}>
            {rows.map((req) => (
              <RequestCard key={req.id} req={req} />
            ))}
          </div>

          {/* Desktop: table */}
          <div className={cn("hidden overflow-hidden rounded-[10px] border border-border transition-opacity md:block", isFetching && "opacity-60")}>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="bg-surface hover:bg-surface">
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      >
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
                  <TableRow
                    key={row.id}
                    className="cursor-pointer border-border hover:bg-surface"
                    onClick={() => navigate(rowDestination(row.original))}
                  >
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

          <TablePagination
            page={page}
            pageCount={pageCount}
            total={total}
            limit={limit}
            onPage={(next) => patch({ page: next })}
          />
        </>
      )}
    </div>
  )
}
