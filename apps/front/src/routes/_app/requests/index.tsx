import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { EmptyState } from "@/components/requests/empty-state"
import { PromoCard } from "@/components/requests/promo-card"
import { RequestCard } from "@/components/requests/request-card"
import type { RequestStatus } from "@/lib/types"

export const Route = createFileRoute("/_app/requests/")({
  component: RequestsPage,
})

type FilterTab = "all" | RequestStatus

const FILTERS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "open", label: "Abiertos" },
  { key: "in_progress", label: "En progreso" },
  { key: "completed", label: "Completados" },
]

function RequestsPage() {
  const [filter, setFilter] = useState<FilterTab>("all")

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.requests.my,
    queryFn: api.requests.my,
  })

  const filtered =
    filter === "all"
      ? (data ?? [])
      : (data ?? []).filter((r) => r.status === filter)

  // Split into two columns interleaving
  const col1 = filtered.filter((_, i) => i % 2 === 0)
  const col2 = filtered.filter((_, i) => i % 2 === 1)

  // Truly empty — full-height hero, no header/filters needed
  if (!isLoading && !isError && (data?.length ?? 0) === 0 && filter === "all") {
    return (
      <div className="flex min-h-full items-center justify-center">
        <EmptyState filtered={false} />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-foreground">Mis solicitudes</h1>
            <p className="mt-[2px] text-[13px] text-muted-foreground">
              Gestiona y revisa el estado de tus fletes
            </p>
          </div>

          <div className="flex items-center gap-[6px]">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-full px-[12px] py-[5px] text-[12px] transition-colors",
                  filter === key
                    ? "bg-foreground text-background font-medium"
                    : "border border-[#E5E5E5] bg-white text-[#666666] hover:border-foreground/20"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-[140px] animate-pulse rounded-[10px] bg-[#F0F0F0]"
              />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-[10px] border border-red-100 bg-red-50 p-4 text-sm text-red-600">
            No se pudieron cargar las solicitudes. Intenta de nuevo.
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && filter !== "all" && (
          <div className="grid grid-cols-2 gap-4">
            <EmptyState filtered />
          </div>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-[14px]">
              {col1.map((req) => (
                <RequestCard key={req.id} req={req} />
              ))}
            </div>
            <div className="flex flex-col gap-[14px]">
              {col2.map((req) => (
                <RequestCard key={req.id} req={req} />
              ))}
              {filter === "all" && <PromoCard />}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
