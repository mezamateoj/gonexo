import { createFileRoute, Link, useNavigate, stripSearchParams } from "@tanstack/react-router"
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
import {
  BadgeCheck,
  Ban,
  ChevronLeft,
  ChevronRight,
  Search,
  Users as UsersIcon,
} from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { queryKeys } from "@/lib/query-keys"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { formatShortDate, initials } from "@/lib/display"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 20
const SEARCH_DEFAULTS = { q: "", page: 1 }

const searchSchema = z.object({
  q: z.string().catch("").default(""),
  page: z.number().int().positive().catch(1).default(1),
})

export const Route = createFileRoute("/_app/admin/users/")({
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
    id: "user",
    header: "Usuario",
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-accent text-xs font-bold text-primary">
            {initials(row.original.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="flex items-center gap-1 truncate text-sm font-medium">
            {row.original.name}
            {row.original.emailVerified && (
              <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-label="Email verificado" />
            )}
          </p>
          <p className="truncate text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor("phone", {
    id: "phone",
    header: "Teléfono",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
        {row.original.phone ?? "—"}
      </span>
    ),
  }),
  columnHelper.accessor("role", {
    id: "role",
    header: "Rol",
    cell: ({ row }) =>
      row.original.role === "admin"
        ? <Badge>Admin</Badge>
        : <Badge variant="secondary">Usuario</Badge>,
  }),
  columnHelper.accessor("banned", {
    id: "status",
    header: "Estado",
    cell: ({ row }) =>
      row.original.banned
        ? <Badge variant="destructive"><Ban data-icon="inline-start" />Suspendido</Badge>
        : <Badge variant="outline">Activo</Badge>,
  }),
  columnHelper.accessor("createdAt", {
    id: "createdAt",
    header: "Registrado",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-xs text-muted-foreground">
        {formatShortDate(String(row.original.createdAt))}
      </span>
    ),
  }),
  columnHelper.display({
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="text-right">
        <Button
          asChild
          size="sm"
          variant="outline"
          className="min-h-10 transition-transform active:scale-[0.96]"
        >
          <Link to="/admin/users/$id" params={{ id: row.original.id }}>
            Ver perfil
          </Link>
        </Button>
      </div>
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
    <div className="flex flex-col gap-5 p-4 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <header className="flex flex-col gap-1">
          <h1 className="text-balance font-heading text-2xl font-semibold">Usuarios</h1>
          <p className="text-pretty text-sm text-muted-foreground">
            {total > 0 ? `${total} cuenta${total !== 1 ? "s" : ""} en la plataforma` : "Sin usuarios registrados"}
          </p>
        </header>
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
        <Alert variant="destructive">
          <AlertDescription>No se pudieron cargar los usuarios.</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map((n) => <Skeleton key={n} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : rows.length === 0 ? (
        <Empty className="min-h-80 border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon"><UsersIcon /></EmptyMedia>
            <EmptyTitle>Sin resultados</EmptyTitle>
            <EmptyDescription>
              {search.q ? "Prueba con otro término de búsqueda." : "Aún no hay usuarios registrados."}
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
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="bg-muted/50 hover:bg-muted/50">
                    {hg.headers.map((header) => (
                      <TableHead key={header.id} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => navigate({ to: "/admin/users/$id", params: { id: row.original.id } })}
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

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs tabular-nums text-muted-foreground">
              {rangeStart}–{rangeEnd} de {total}
            </p>
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
                Página {search.page} de {table.getPageCount()}
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
    </div>
  )
}
