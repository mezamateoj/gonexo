import { createFileRoute, stripSearchParams, useNavigate } from "@tanstack/react-router"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { EmptyState } from "@/components/requests/empty-state"
import { PromoCard } from "@/components/requests/promo-card"
import { RequestCard } from "@/components/requests/request-card"

const SEARCH_DEFAULTS = { status: "all" as const }

const requestsSearchSchema = z.object({
  status: z.enum(["all", "open", "in_progress", "completed"]).catch("all").default("all"),
})

export const Route = createFileRoute("/_app/requests/")({
  validateSearch: requestsSearchSchema,
  search: { middlewares: [stripSearchParams(SEARCH_DEFAULTS)] },
  component: RequestsPage,
})

type FilterTab = z.infer<typeof requestsSearchSchema>["status"]

const FILTERS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "open", label: "Abiertos" },
  { key: "in_progress", label: "En progreso" },
  { key: "completed", label: "Completados" },
]

function RequestsPage() {
  const { status } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const filterStatus = status === "all" ? undefined : status
  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: queryKeys.requests.my(filterStatus),
    queryFn: () => api.requests.my(filterStatus),
    placeholderData: keepPreviousData,
  })

  const rows = data ?? []

  // Split into two columns interleaving
  const col1 = rows.filter((_, i) => i % 2 === 0)
  const col2 = rows.filter((_, i) => i % 2 === 1)

  // Truly empty — full-height hero, no header/filters needed
  if (!isLoading && !isError && rows.length === 0 && status === "all") {
    return (
      <div className="flex min-h-full items-center justify-center">
        <EmptyState filtered={false} />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-foreground">Mis solicitudes</h1>
            <p className="mt-[2px] text-[13px] text-muted-foreground">
              Gestiona y revisa el estado de tus fletes
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-[6px]">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => navigate({ replace: true, search: { status: key } })}
                className={cn(
                  "rounded-full px-[12px] py-[5px] text-[12px] transition-colors",
                  status === key
                    ? "bg-foreground text-background font-medium"
                    : "border border-border bg-white text-muted-foreground hover:border-foreground/20"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-[140px] animate-pulse rounded-[10px] bg-muted"
              />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-[10px] border border-red-100 bg-red-50 p-4 text-sm text-red-600">
            No se pudieron cargar las solicitudes. Intenta de nuevo.
          </div>
        )}

        {!isLoading && !isError && rows.length === 0 && status !== "all" && (
          <EmptyState filtered />
        )}

        {!isLoading && !isError && rows.length > 0 && (
          <div className={cn("transition-opacity", isFetching && "opacity-60")}>
            {/* Mobile: single column, natural order */}
            <div className="flex flex-col gap-[14px] md:hidden">
              {rows.map((req) => (
                <RequestCard key={req.id} req={req} />
              ))}
              {status === "all" && <PromoCard />}
            </div>

            {/* Desktop: two-column interleaved layout */}
            <div className="hidden grid-cols-2 gap-4 md:grid">
              <div className="flex flex-col gap-[14px]">
                {col1.map((req) => (
                  <RequestCard key={req.id} req={req} />
                ))}
              </div>
              <div className="flex flex-col gap-[14px]">
                {col2.map((req) => (
                  <RequestCard key={req.id} req={req} />
                ))}
                {status === "all" && <PromoCard />}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
