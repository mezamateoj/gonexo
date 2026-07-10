import { useEffect, useRef, useState } from "react"
import { Search, SlidersHorizontal, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { volumeLabels } from "@/lib/display"
import type { VolumeCategory } from "@/lib/types"

const VOLUME_ORDER: VolumeCategory[] = ["small", "medium", "large", "full_move"]

// Search + volume filter bar for the "Mis fletes" tables. Search is debounced so
// typing doesn't fire a request per keystroke; sort lives on the table headers.
export function MyFletesToolbar({
  q,
  volume,
  searchPlaceholder,
  onChange,
  onReset,
}: {
  q: string
  volume: VolumeCategory[]
  searchPlaceholder: string
  onChange: (patch: { q?: string; volume?: VolumeCategory[] }) => void
  onReset: () => void
}) {
  const [text, setText] = useState(q)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const qRef = useRef(q)
  qRef.current = q

  // Reflect external URL changes (reset, back button) into the input.
  useEffect(() => setText(q), [q])

  // Push the debounced term only when it actually differs from the URL.
  useEffect(() => {
    const id = setTimeout(() => {
      if (text !== qRef.current) onChangeRef.current({ q: text })
    }, 300)
    return () => clearTimeout(id)
  }, [text])

  const hasFilters = q.length > 0 || volume.length > 0

  function toggleVolume(v: VolumeCategory) {
    const next = volume.includes(v) ? volume.filter((x) => x !== v) : [...volume, v]
    onChange({ volume: next })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-64">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-9 pl-8"
        />
      </div>

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
              <DropdownMenuItem onClick={() => onChange({ volume: [] })}>Limpiar carga</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {hasFilters && (
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          <X data-icon="inline-start" />
          Limpiar
        </Button>
      )}
    </div>
  )
}
