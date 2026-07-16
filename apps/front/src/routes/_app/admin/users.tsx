import { createFileRoute, useNavigate, stripSearchParams } from "@tanstack/react-router"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { z } from "zod"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type PaginationState,
} from "@tanstack/react-table"
import { Search, ChevronLeft, ChevronRight, Users as UsersIcon } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { queryKeys } from "@/lib/query-keys"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { initials } from "@/lib/display"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 20
const SEARCH_DEFAULTS = { q: "", page: 1 }

const searchSchema = z.object({
  q: z.string().catch("").default(""),
  page: z.number().int().positive().catch(1).default(1),
})

export const Route = createFileRoute("/_app/admin/users")({
  validateSearch: searchSchema,
  search: { middlewares: [stripSearchParams(SEARCH_DEFAULTS)] },
  component: UsersPage,
})

// Element type of the admin listUsers response — kept in sync with the client.
type AdminUser = NonNullable<
  Awaited<ReturnType<typeof authClient.admin.listUsers>>["data"]
>["users"][number]

const columnHelper = createColumnHelper<AdminUser>()

const columns = [
  columnHelper.display({
    id: "name",
    header: "Nombre",
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-primary/10 text-[11px] font-bold text-primary">
            {initials(row.original.name)}
          </AvatarFallback>
        </Avatar>
        <span className="truncate text-[13px] font-medium text-foreground">{row.original.name}</span>
      </div>
    ),
  }),
  columnHelper.accessor("email", {
    id: "email",
    header: "Email",
    cell: ({ row }) => <span className="text-[12px] text-ink-soft">{row.original.email}</span>,
  }),
  columnHelper.accessor("role", {
    id: "role",
    header: "Rol",
    cell: ({ row }) =>
      row.original.role === "admin" ? (
        <Badge>Admin</Badge>
      ) : (
        <Badge variant="secondary">Usuario</Badge>
      ),
  }),
  columnHelper.accessor("createdAt", {
    id: "createdAt",
    header: "Registrado",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-[12px] text-muted-foreground">
        {new Date(row.original.createdAt).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}
      </span>
    ),
  }),
]

function UsersPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [searchInput, setSearchInput] = useState(search.q)

  function patch(p: Partial<typeof search>) {
    navigate({
      replace: true,
      search: (prev) => ({ ...prev, ...p, ...("page" in p ? {} : { page: 1 }) }),
    })
  }

  // Debounce the search box into the URL param that keys the query. Guarding on
  // equality lets the URL-driven rerun (once q lands) short-circuit instead of
  // looping. navigate from useNavigate is stable, so deps stay honest.
  useEffect(() => {
    if (searchInput === search.q) return
    const t = setTimeout(() => {
      navigate({ replace: true, search: (prev) => ({ ...prev, q: searchInput, page: 1 }) })
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput, search.q, navigate])

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: queryKeys.admin.users(search.q, search.page),
    queryFn: async () => {
      const res = await authClient.admin.listUsers({
        query: {
          limit: PAGE_SIZE,
          offset: (search.page - 1) * PAGE_SIZE,
          sortBy: "createdAt",
          sortDirection: "desc",
          ...(search.q
            ? { searchValue: search.q, searchField: "email" as const, searchOperator: "contains" as const }
            : {}),
        },
      })
      if (res.error) throw new Error(res.error.message ?? "No se pudieron cargar los usuarios")
      return res.data
    },
    placeholderData: keepPreviousData,
  })

  const rows = data?.users ?? []
  const total = data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pagination: PaginationState = { pageIndex: search.page - 1, pageSize: PAGE_SIZE }

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
    state: { pagination },
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater(pagination) : updater
      patch({ page: next.pageIndex + 1 })
    },
  })

  const rangeStart = total === 0 ? 0 : (search.page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(search.page * PAGE_SIZE, total)

  return (
    <div className="p-4 md:p-8">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-foreground">Usuarios</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {total > 0 ? `${total} usuario${total !== 1 ? "s" : ""}` : "Sin usuarios"}
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por email…"
            className="pl-9"
          />
        </div>
      </div>

      {isError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>No se pudieron cargar los usuarios.</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((n) => <Skeleton key={n} className="h-14 w-full rounded-[10px]" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-border bg-white py-16 text-center">
          <UsersIcon className="mb-3 size-9 text-ink-faint" />
          <p className="text-[15px] font-medium text-foreground">Sin resultados</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {search.q ? "Prueba con otro término de búsqueda." : "Aún no hay usuarios registrados."}
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
                  Página {search.page} de {table.getPageCount()}
                </span>
                <Button variant="outline" size="sm" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
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
