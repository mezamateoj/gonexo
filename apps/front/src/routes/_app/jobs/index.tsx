import {
  createFileRoute,
  Link,
  Navigate,
  stripSearchParams,
  useNavigate,
} from "@tanstack/react-router"
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
import { Archive, ArrowDown, ArrowUp, ChevronsUpDown, SearchX, Truck } from "lucide-react"
import { useSession } from "@/lib/auth-client"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { JobSort, JobSummary, VolumeCategory } from "@/lib/types"
import { useAppMode } from "@/lib/app-mode"
import {
  cancelledByRoleLabels,
  formatPrice,
  formatCompactDateTime,
  jobStatusClasses,
  jobStatusLabels,
  shortAddress,
  volumeColors,
  volumeLabels,
} from "@/lib/display"
import { cn } from "@/lib/utils"
import { MyFletesToolbar } from "@/components/my-fletes-toolbar"
import { TablePagination } from "@/components/table-pagination"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const jobsTabSchema = z.enum(["active", "history"])
const volumeSchema = z.enum(["small", "medium", "large", "full_move"])

const jobsSearchSchema = z.object({
  tab: jobsTabSchema.catch("active").default("active"),
  page: z.number().int().positive().catch(1).default(1),
  q: z.string().catch("").default(""),
  volume: z.array(volumeSchema).catch([]).default([]),
  sort: z.enum(["recent", "price_asc", "price_desc"]).catch("recent").default("recent"),
})

type JobsSearch = z.infer<typeof jobsSearchSchema>

const SEARCH_DEFAULTS = { tab: "active" as const, page: 1, q: "", volume: [] as VolumeCategory[], sort: "recent" as const }

export const Route = createFileRoute("/_app/jobs/")({
  validateSearch: jobsSearchSchema,
  search: { middlewares: [stripSearchParams(SEARCH_DEFAULTS)] },
  component: JobsPage,
})

const SORT_TO_STATE: Record<JobSort, SortingState> = {
  recent: [],
  price_asc: [{ id: "agreedPrice", desc: false }],
  price_desc: [{ id: "agreedPrice", desc: true }],
}

function stateToSort(state: SortingState): JobSort {
  const col = state[0]
  if (!col || col.id !== "agreedPrice") return "recent"
  return col.desc ? "price_desc" : "price_asc"
}

// Mobile card — richer than a table row for small screens.
function DriverJobCard({
  job,
  userId,
  history,
}: {
  job: JobSummary
  userId: string
  history: boolean
}) {
  const hasReviewed = job.reviews.some((review) => review.reviewerId === userId)

  return (
    <Link to="/jobs/$id" params={{ id: job.id }} className="block">
      <Card className={cn("h-full transition-shadow hover:shadow-sm", history && "opacity-80 hover:opacity-100")}>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn(jobStatusClasses[job.status])}>
              {jobStatusLabels[job.status]}
            </Badge>
            {!hasReviewed && job.status === "completed" && (
              <Badge variant="outline">Pendiente reseña</Badge>
            )}
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatCompactDateTime(job.request.scheduledAt)}
          </span>
        </CardHeader>
        <CardContent className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {job.request.originAddress}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              → {job.request.destAddress}
            </p>
            {job.status === "cancelled" && job.cancelledByRole && (
              <p className="mt-2 text-xs text-muted-foreground">
                Cancelado por {cancelledByRoleLabels[job.cancelledByRole]}
              </p>
            )}
          </div>
          {job.request.photos[0] && (
            <img
              src={job.request.photos[0].url}
              alt=""
              className="size-14 shrink-0 rounded-md object-cover"
            />
          )}
        </CardContent>
        <CardFooter className="flex-wrap justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-primary">{formatPrice(job.agreedPrice)}</span>
            <span className="text-xs text-muted-foreground">
              {volumeLabels[job.request.volumeCategory]}
            </span>
          </div>
          <Badge variant="secondary">Cliente: {job.user.name}</Badge>
        </CardFooter>
      </Card>
    </Link>
  )
}

const columnHelper = createColumnHelper<JobSummary>()

function JobsPage() {
  const { tab, page, q, volume, sort } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { data: session } = useSession()
  const { mode } = useAppMode()
  const userId = session?.user.id

  // Filter/sort changes reset to page 1; explicit page changes don't.
  function patch(p: Partial<JobsSearch>) {
    navigate({
      replace: true,
      search: (prev) => ({ ...prev, ...p, ...("page" in p ? {} : { page: 1 }) }),
    })
  }

  const query = { role: "driver" as const, bucket: tab, page, q: q || undefined, volume, sort }

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: queryKeys.jobs.my(userId ?? "", query),
    queryFn: () => api.jobs.my(query),
    enabled: !!userId && mode === "driver",
    placeholderData: keepPreviousData,
  })

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "status",
        header: "Estado",
        cell: ({ row }) => {
          const job = row.original
          const hasReviewed = job.reviews.some((review) => review.reviewerId === userId)
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge className={cn(jobStatusClasses[job.status])}>
                {jobStatusLabels[job.status]}
              </Badge>
              {!hasReviewed && job.status === "completed" && (
                <Badge variant="outline">Reseña</Badge>
              )}
            </div>
          )
        },
      }),
      columnHelper.display({
        id: "route",
        header: "Ruta",
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 shrink-0 rounded-full bg-primary" />
              <span className="max-w-[220px] truncate text-[13px] font-medium text-foreground">
                {shortAddress(row.original.request.originAddress)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground" />
              <span className="max-w-[220px] truncate text-[13px] text-ink-soft">
                {shortAddress(row.original.request.destAddress)}
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
              volumeColors[row.original.request.volumeCategory],
            )}
          >
            {volumeLabels[row.original.request.volumeCategory]}
          </span>
        ),
      }),
      columnHelper.accessor((row) => row.request.scheduledAt, {
        id: "scheduledAt",
        header: "Fecha",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-[13px] text-ink-soft">
            {formatCompactDateTime(row.original.request.scheduledAt)}
          </span>
        ),
      }),
      columnHelper.display({
        id: "client",
        header: "Cliente",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-[13px] text-foreground">{row.original.user.name}</span>
        ),
      }),
      columnHelper.accessor("agreedPrice", {
        id: "agreedPrice",
        header: "Precio",
        enableSorting: true,
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums font-semibold text-primary">
            {formatPrice(row.original.agreedPrice)}
          </span>
        ),
      }),
    ],
    [userId],
  )

  const rows = data?.data ?? []
  const total = data?.total ?? 0
  const limit = data?.limit ?? 20
  const pageCount = Math.max(1, Math.ceil(total / limit))
  const sorting = SORT_TO_STATE[sort]

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

  if (mode === "client") {
    return <Navigate to="/requests" search={{ tab: "active", page: 1 }} replace />
  }

  const hasFilters = q.length > 0 || volume.length > 0
  const history = tab === "history"

  return (
    <div className="flex w-full flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Mis fletes</h1>
        <p className="text-sm text-muted-foreground">
          Sigue tus fletes activos y consulta los trabajos anteriores.
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) =>
          navigate({
            replace: true,
            search: (prev) => ({ ...prev, tab: jobsTabSchema.parse(value), page: 1 }),
          })
        }
      >
        <TabsList variant="line">
          <TabsTrigger value="active">En curso</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>
      </Tabs>

      <MyFletesToolbar
        q={q}
        volume={volume}
        searchPlaceholder="Buscar por cliente o dirección…"
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
      ) : rows.length === 0 || !userId ? (
        <Empty className="min-h-72 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">{history ? <Archive /> : <Truck />}</EmptyMedia>
            <EmptyTitle>
              {history ? "Tu historial está vacío" : "No tienes fletes en curso"}
            </EmptyTitle>
            <EmptyDescription>
              {history
                ? "Los fletes completados y cancelados aparecerán aquí."
                : "Cuando un cliente acepte una oferta tuya, el flete aparecerá aquí."}
            </EmptyDescription>
          </EmptyHeader>
          {!history && (
            <EmptyContent>
              <Button asChild>
                <Link to="/available">Buscar fletes</Link>
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className={cn("grid grid-cols-1 gap-3 transition-opacity md:hidden", isFetching && "opacity-60")}>
            {rows.map((job) => (
              <DriverJobCard key={job.id} job={job} userId={userId} history={history} />
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
                    onClick={() => navigate({ to: "/jobs/$id", params: { id: row.original.id } })}
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
