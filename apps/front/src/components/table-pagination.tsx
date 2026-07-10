import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { cn } from "@/lib/utils"

// Server-driven table footer: shows the visible range and prev/next controls.
// Page state lives in the URL, so the caller just maps onPage to a search-param
// update. Hidden entirely when there's a single page of results.
export function TablePagination({
  page,
  pageCount,
  total,
  limit,
  onPage,
}: {
  page: number
  pageCount: number
  total: number
  limit: number
  onPage: (page: number) => void
}) {
  if (total === 0 || pageCount <= 1) return null

  const rangeStart = (page - 1) * limit + 1
  const rangeEnd = Math.min(page * limit, total)
  const canPrev = page > 1
  const canNext = page < pageCount

  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      <p className="text-[12px] tabular-nums text-muted-foreground">
        {rangeStart}–{rangeEnd} de {total}
      </p>
      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              text="Anterior"
              aria-disabled={!canPrev}
              className={cn(!canPrev && "pointer-events-none opacity-50")}
              onClick={() => canPrev && onPage(page - 1)}
            />
          </PaginationItem>
          <PaginationItem>
            <span className="px-2 text-[12px] tabular-nums text-muted-foreground">
              Página {page} de {pageCount}
            </span>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              text="Siguiente"
              aria-disabled={!canNext}
              className={cn(!canNext && "pointer-events-none opacity-50")}
              onClick={() => canNext && onPage(page + 1)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
