import { createFileRoute, useNavigate, stripSearchParams } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { useState } from "react"
import { z } from "zod"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type PaginationState,
} from "@tanstack/react-table"
import { toast } from "sonner"
import { ShieldCheck, ShieldX, FileText, ExternalLink, Inbox, ChevronLeft, ChevronRight } from "lucide-react"
import { api, cdnUrl } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet"
import {
  documentKindLabels, driverVerificationClasses, driverVerificationLabels,
  formatShortDate, initials, vehicleLabels,
} from "@/lib/display"
import { cn } from "@/lib/utils"
import type { AdminDriver, DriverDocumentKind, DriverVerificationStatus } from "@/lib/types"

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

const STATUS_TABS: { value: DriverVerificationStatus; label: string }[] = [
  { value: "submitted", label: "En revisión" },
  { value: "pending", label: "Sin documentos" },
  { value: "verified", label: "Verificados" },
]

const DOC_ORDER: DriverDocumentKind[] = ["license", "papers", "vehicle_photo"]

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
  const selected = rows.find((d) => d.id === selectedId) ?? null

  const mutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "verify" | "reset" }) =>
      api.admin.setVerification(id, action),
    onSuccess: (_res, { action }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.driversAll })
      // The driver just left this status filter — close the review panel.
      setSelectedId(null)
      toast.success(action === "verify" ? "Transportista verificado" : "Verificación restablecida")
    },
    onError: (err) => {
      toast.error("No se pudo actualizar", { description: err instanceof Error ? err.message : undefined })
    },
  })

  const columns = [
    columnHelper.display({
      id: "driver",
      header: "Transportista",
      cell: ({ row }) => {
        const d = row.original
        return (
          <div className="flex items-center gap-2.5">
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="bg-primary/10 text-[11px] font-bold text-primary">
                {initials(d.user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-foreground">{d.user.name}</p>
              <p className="truncate text-[12px] text-muted-foreground">{d.user.email}</p>
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor("vehiclePlate", {
      id: "plate",
      header: "Patente",
      cell: ({ row }) => (
        <span className="whitespace-nowrap font-mono text-[12px] font-semibold tabular-nums text-foreground">
          {row.original.vehiclePlate}
        </span>
      ),
    }),
    columnHelper.display({
      id: "vehicle",
      header: "Vehículo",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-[12px] text-ink-soft">
          {vehicleLabels[row.original.vehicleType] ?? row.original.vehicleType}
        </span>
      ),
    }),
    columnHelper.display({
      id: "documents",
      header: "Documentos",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] text-muted-foreground">
          <FileText className="size-3.5" />
          {row.original.documents.length}
        </span>
      ),
    }),
    columnHelper.accessor("documentsStatus", {
      id: "status",
      header: "Estado",
      cell: ({ row }) => (
        <span className={cn("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold", driverVerificationClasses[row.original.documentsStatus])}>
          {driverVerificationLabels[row.original.documentsStatus]}
        </span>
      ),
    }),
    columnHelper.accessor("createdAt", {
      id: "createdAt",
      header: "Registrado",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-[12px] text-muted-foreground">
          {formatShortDate(row.original.createdAt)}
        </span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="text-right">
          <Button size="sm" variant="outline" onClick={() => setSelectedId(row.original.id)}>
            Revisar
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
      navigate({ replace: true, search: (prev) => ({ ...prev, page: next.pageIndex + 1 }) })
    },
  })

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="p-4 md:p-8">
      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-foreground">Verificación de transportistas</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Revisa los documentos y decide si el transportista queda verificado.
        </p>
      </div>

      <Tabs
        value={status}
        onValueChange={(v) => navigate({ replace: true, search: { status: v as DriverVerificationStatus } })}
        className="mb-4"
      >
        <TabsList>
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>No se pudo cargar la cola de verificación.</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-14 w-full rounded-[10px]" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-border bg-white py-16 text-center">
          <Inbox className="mb-3 size-9 text-ink-faint" />
          <p className="text-[15px] font-medium text-foreground">No hay transportistas aquí</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {status === "submitted" ? "La cola de revisión está vacía." : "Nada en este estado por ahora."}
          </p>
        </div>
      ) : (
        <>
          <div className={cn("overflow-hidden rounded-[10px] border border-border transition-opacity", isFetching && "opacity-60")}>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id} className="bg-surface hover:bg-surface">
                  {hg.headers.map((header) => (
                    <TableHead key={header.id} className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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

          {total > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-[12px] tabular-nums text-muted-foreground">
                {rangeStart}–{rangeEnd} de {total}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-[12px] tabular-nums text-muted-foreground">
                  Página {page} de {table.getPageCount()}
                </span>
                <Button variant="outline" size="sm" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ReviewSheet
        driver={selected}
        onClose={() => setSelectedId(null)}
        onAction={(action) => selected && mutation.mutate({ id: selected.id, action })}
        isPending={mutation.isPending}
      />
    </div>
  )
}

function ReviewSheet({
  driver,
  onClose,
  onAction,
  isPending,
}: {
  driver: AdminDriver | null
  onClose: () => void
  onAction: (action: "verify" | "reset") => void
  isPending: boolean
}) {
  return (
    <Sheet open={!!driver} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        {driver && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {driver.user.name}
                <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold", driverVerificationClasses[driver.documentsStatus])}>
                  {driverVerificationLabels[driver.documentsStatus]}
                </span>
              </SheetTitle>
              <SheetDescription>{driver.user.email}</SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-6 px-4 pb-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
                <Field label="Patente">
                  <span className="font-mono font-semibold tabular-nums">{driver.vehiclePlate}</span>
                </Field>
                <Field label="Vehículo">
                  {vehicleLabels[driver.vehicleType] ?? driver.vehicleType}
                  {driver.vehicleYear ? ` · ${driver.vehicleYear}` : ""}
                </Field>
                <Field label="Teléfono">{driver.phone}</Field>
                <Field label="Registrado">{formatShortDate(driver.createdAt)}</Field>
                {driver.bio && (
                  <div className="col-span-2">
                    <Field label="Descripción">{driver.bio}</Field>
                  </div>
                )}
              </dl>

              <div className="flex flex-col gap-4">
                {DOC_ORDER.map((kind) => {
                  const docs = driver.documents.filter((d) => d.kind === kind)
                  return (
                    <div key={kind}>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {documentKindLabels[kind]}
                      </p>
                      {docs.length === 0 ? (
                        <p className="text-[12px] text-ink-faint">No adjuntado</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {docs.map((doc) => (
                            <a
                              key={doc.id}
                              href={cdnUrl(doc.key)}
                              target="_blank"
                              rel="noreferrer"
                              className="group relative overflow-hidden rounded-[8px] border border-border"
                            >
                              <img
                                src={cdnUrl(doc.key)}
                                alt={documentKindLabels[kind]}
                                className="size-28 object-cover transition-opacity group-hover:opacity-80"
                              />
                              <span className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
                                <ExternalLink className="size-3" />
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <SheetFooter className="flex-row gap-2">
              <Button
                className="flex-1"
                disabled={isPending || driver.documentsStatus !== "submitted"}
                onClick={() => onAction("verify")}
              >
                <ShieldCheck data-icon="inline-start" />
                Verificar
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={isPending || driver.documentsStatus === "pending"}
                onClick={() => onAction("reset")}
              >
                <ShieldX data-icon="inline-start" />
                Restablecer
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-foreground">{children}</dd>
    </div>
  )
}
