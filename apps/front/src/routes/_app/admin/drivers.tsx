import { useState } from "react"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, stripSearchParams, useNavigate } from "@tanstack/react-router"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type PaginationState,
} from "@tanstack/react-table"
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Inbox,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import { DocumentReviewSheet } from "@/components/admin/document-review-sheet"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import {
  driverVerificationLabels,
  formatShortDate,
  initials,
  vehicleLabels,
} from "@/lib/display"
import { queryKeys } from "@/lib/query-keys"
import { cn } from "@/lib/utils"
import type {
  AdminDocumentReview,
  AdminDriver,
  DocumentReviewDecision,
  DriverVerificationStatus,
} from "@/lib/types"

const PAGE_SIZE = 20
const SEARCH_DEFAULTS = { status: "submitted" as const, page: 1 }

const searchSchema = z.object({
  status: z.enum(["pending", "submitted", "verified"]).catch("submitted").default("submitted"),
  page: z.number().int().positive().catch(1).default(1),
})

export const Route = createFileRoute("/_app/admin/drivers")({
  validateSearch: searchSchema,
  search: { middlewares: [stripSearchParams(SEARCH_DEFAULTS)] },
  component: VerificationPage,
})

const statusTabs: { value: DriverVerificationStatus; label: string }[] = [
  { value: "submitted", label: "Por revisar" },
  { value: "pending", label: "Pendientes" },
  { value: "verified", label: "Verificados" },
]

const columnHelper = createColumnHelper<AdminDriver>()

function VerificationPage() {
  const { status, page } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: queryKeys.admin.drivers(status, page),
    queryFn: () => api.admin.drivers(status, page),
    placeholderData: keepPreviousData,
  })

  const rows = data?.data ?? []
  const total = data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const selected = rows.find((driver) => driver.id === selectedId) ?? null

  const mutation = useMutation({
    mutationFn: (action: {
      type: "decide"
      id: string
      decision: DocumentReviewDecision
      note?: string
    } | {
      type: "reopen"
      id: string
    }) => action.type === "decide"
      ? api.admin.decideReview(action.id, action.decision, action.note)
      : api.admin.reopenReview(action.id),
    onSuccess: (_response, action) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.driversAll })
      setSelectedId(null)
      toast.success(action.type === "reopen"
        ? "Revisión reabierta"
        : action.decision === "verified" ? "Transportista verificado" : "Cambios solicitados")
    },
    onError: (error) => {
      toast.error("No se pudo registrar la decisión", {
        description: error instanceof Error ? error.message : undefined,
      })
    },
  })

  const columns = [
    columnHelper.display({
      id: "driver",
      header: "Transportista",
      cell: ({ row }) => {
        const driver = row.original
        return (
          <div className="flex items-center gap-2.5">
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="bg-accent text-xs font-bold text-primary">
                {initials(driver.user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{driver.user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{driver.user.email}</p>
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor("vehiclePlate", {
      id: "plate",
      header: "Patente",
      cell: ({ row }) => (
        <span className="whitespace-nowrap font-mono text-xs font-semibold tabular-nums">
          {row.original.vehiclePlate}
        </span>
      ),
    }),
    columnHelper.display({
      id: "vehicle",
      header: "Vehículo",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {vehicleLabels[row.original.vehicleType] ?? row.original.vehicleType}
        </span>
      ),
    }),
    columnHelper.display({
      id: "analysis",
      header: "Lectura automática",
      cell: ({ row }) => <AnalysisBadge review={row.original.latestReview} />,
    }),
    columnHelper.accessor("documentsStatus", {
      id: "status",
      header: "Estado",
      cell: ({ row }) => (
        <Badge variant={row.original.documentsStatus === "verified" ? "default" : "secondary"}>
          {row.original.documentsStatus === "verified" && <ShieldCheck data-icon="inline-start" />}
          {driverVerificationLabels[row.original.documentsStatus]}
        </Badge>
      ),
    }),
    columnHelper.accessor("createdAt", {
      id: "createdAt",
      header: "Registrado",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatShortDate(row.original.createdAt)}
        </span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="text-right">
          <Button
            size="sm"
            variant="outline"
            className="min-h-10 transition-transform active:scale-[0.96]"
            onClick={() => setSelectedId(row.original.id)}
          >
            Abrir expediente
          </Button>
        </div>
      ),
    }),
  ]

  const pagination: PaginationState = { pageIndex: page - 1, pageSize: PAGE_SIZE }
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
    state: { pagination },
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater(pagination) : updater
      navigate({ replace: true, search: (previous) => ({ ...previous, page: next.pageIndex + 1 }) })
    },
  })

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="flex flex-col gap-5 p-4 md:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-balance font-heading text-2xl font-semibold">Verificación de transportistas</h1>
        <p className="text-pretty text-sm text-muted-foreground">
          La IA prepara cada expediente; tú confirmas los documentos y tomas la decisión.
        </p>
      </header>

      <Tabs
        value={status}
        onValueChange={(value) => navigate({ replace: true, search: { status: value as DriverVerificationStatus } })}
      >
        <TabsList>
          {statusTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>No se pudo cargar la cola de verificación.</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : rows.length === 0 ? (
        <Empty className="min-h-80 border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Inbox /></EmptyMedia>
            <EmptyTitle>No hay expedientes aquí</EmptyTitle>
            <EmptyDescription>
              {status === "submitted" ? "La cola de revisión está al día." : "No hay transportistas en este estado."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className={cn(
            "overflow-x-auto rounded-xl border bg-card transition-opacity duration-150",
            isFetching && "opacity-60",
          )}>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="bg-muted/50 hover:bg-muted/50">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs tabular-nums text-muted-foreground">{rangeStart}–{rangeEnd} de {total}</p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-lg"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
                aria-label="Página anterior"
              >
                <ChevronLeft />
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground">
                Página {page} de {table.getPageCount()}
              </span>
              <Button
                variant="outline"
                size="icon-lg"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
                aria-label="Página siguiente"
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </>
      )}

      <DocumentReviewSheet
        driver={selected}
        isPending={mutation.isPending}
        onClose={() => setSelectedId(null)}
        onDecision={(decision, note) => {
          if (selected) mutation.mutate({ type: "decide", id: selected.id, decision, note })
        }}
        onReopen={() => {
          if (selected) mutation.mutate({ type: "reopen", id: selected.id })
        }}
      />
    </div>
  )
}

function AnalysisBadge({ review }: { review: AdminDocumentReview | null }) {
  if (!review) return <Badge variant="outline">Sin análisis</Badge>
  if (review.decision === "verified") return <Badge><CheckCircle2 data-icon="inline-start" />Aprobado</Badge>
  if (review.decision === "changes_requested") return <Badge variant="destructive"><AlertCircle data-icon="inline-start" />Cambios</Badge>
  if (["queued", "analyzing"].includes(review.status)) {
    return <Badge variant="secondary"><Clock3 data-icon="inline-start" />Analizando</Badge>
  }
  if (["analysis_failed", "enqueue_failed"].includes(review.status)) {
    return <Badge variant="destructive"><AlertCircle data-icon="inline-start" />Falló</Badge>
  }
  const flags = review.result?.flags.length ?? 0
  return flags === 0
    ? <Badge variant="outline"><Bot data-icon="inline-start" />Sin alertas</Badge>
    : <Badge variant="destructive"><AlertCircle data-icon="inline-start" />{flags} alertas</Badge>
}
