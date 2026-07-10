import { ArrowDownWideNarrow, Check, ImageIcon, SlidersHorizontal, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { volumeLabels } from "@/lib/display"
import type { AvailableSort, VolumeCategory } from "@/lib/types"

const SORT_LABELS: Record<AvailableSort, string> = {
  recent: "Recientes",
  soonest: "Más pronto",
  distance: "Más cerca",
}

const VOLUME_ORDER: VolumeCategory[] = ["small", "medium", "large", "full_move"]

export function AvailableFilters({
  sort,
  volume,
  hasPhotos,
  onChange,
  onReset,
}: {
  sort: AvailableSort
  volume: VolumeCategory[]
  hasPhotos: boolean
  onChange: (patch: { sort?: AvailableSort; volume?: VolumeCategory[]; hasPhotos?: boolean }) => void
  onReset: () => void
}) {
  const hasFilters = volume.length > 0 || hasPhotos || sort !== "recent"

  function toggleVolume(v: VolumeCategory) {
    const next = volume.includes(v) ? volume.filter((x) => x !== v) : [...volume, v]
    onChange({ volume: next })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Sort */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowDownWideNarrow data-icon="inline-start" />
            {SORT_LABELS[sort]}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuLabel className="text-[11px] text-muted-foreground">Ordenar por</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={sort} onValueChange={(v) => onChange({ sort: v as AvailableSort })}>
            <DropdownMenuRadioItem value="recent">Recientes</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="soonest">Fecha más pronta</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="distance">Distancia más corta</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Volume multi-select */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <SlidersHorizontal data-icon="inline-start" />
            Carga
            {volume.length > 0 && (
              <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold tabular-nums text-white">
                {volume.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel className="text-[11px] text-muted-foreground">Tipo de carga</DropdownMenuLabel>
          {VOLUME_ORDER.map((v) => (
            <DropdownMenuCheckboxItem
              key={v}
              checked={volume.includes(v)}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={() => toggleVolume(v)}
            >
              {volumeLabels[v]}
            </DropdownMenuCheckboxItem>
          ))}
          {volume.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onChange({ volume: [] })}
              >
                Limpiar carga
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Has photos toggle */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-pressed={hasPhotos}
        onClick={() => onChange({ hasPhotos: !hasPhotos })}
        className={cn(
          "gap-1.5 active:scale-[0.96] transition-[scale,color,background-color]",
          hasPhotos && "border-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
        )}
      >
        {hasPhotos ? <Check data-icon="inline-start" /> : <ImageIcon data-icon="inline-start" />}
        Con fotos
      </Button>

      {hasFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
        >
          <X data-icon="inline-start" />
          Limpiar
        </Button>
      )}
    </div>
  )
}
