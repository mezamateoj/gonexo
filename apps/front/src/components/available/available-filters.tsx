import { ArrowDownWideNarrow, Check, ImageIcon, SlidersHorizontal, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
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
            <ArrowDownWideNarrow className="size-3.5 text-[#969e9b]" />
            {SORT_LABELS[sort]}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuLabel className="text-[11px] text-[#969e9b]">Ordenar por</DropdownMenuLabel>
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
            <SlidersHorizontal className="size-3.5 text-[#969e9b]" />
            Carga
            {volume.length > 0 && (
              <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold tabular-nums text-white">
                {volume.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel className="text-[11px] text-[#969e9b]">Tipo de carga</DropdownMenuLabel>
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
              <button
                type="button"
                onClick={() => onChange({ volume: [] })}
                className="w-full px-2 py-1.5 text-left text-[12px] text-[#969e9b] hover:text-foreground"
              >
                Limpiar carga
              </button>
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
        {hasPhotos ? <Check className="size-3.5" /> : <ImageIcon className="size-3.5 text-[#969e9b]" />}
        Con fotos
      </Button>

      {hasFilters && (
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 px-1 text-[12px] text-[#969e9b] transition-colors hover:text-foreground"
        >
          <X className="size-3.5" />
          Limpiar
        </button>
      )}
    </div>
  )
}
