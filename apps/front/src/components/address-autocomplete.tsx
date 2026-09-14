import { useState, useRef, useEffect, useId } from "react"
import { MapPin, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"

export interface AddressResult {
  address: string
  lat: number
  lng: number
}

interface Props {
  value: AddressResult | null
  onChange: (result: AddressResult | null) => void
  disabled?: boolean
  placeholder?: string
  sessionToken: string
}

export function AddressAutocomplete({ value, onChange, placeholder = "Busca una dirección…", sessionToken, disabled = false }: Props) {
  const id = useId()
  const [typedQuery, setTypedQuery] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<{ mapbox_id: string; name: string; place_formatted: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestVersion = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const query = value?.address ?? typedQuery ?? ""
  const emptyMessage = error ?? "Sin resultados. Intenta con calle y comuna."

  useEffect(() => {
    requestVersion.current += 1
    return () => {
      requestVersion.current += 1
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [disabled])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function handleInput(q: string) {
    const version = ++requestVersion.current
    setTypedQuery(q)
    onChange(null)
    setError(null)
    setSuggestions([])
    setOpen(false)
    setLoading(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 3) { setSuggestions([]); setOpen(false); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await api.geo.suggest(q, sessionToken)
        if (version !== requestVersion.current) return
        setSuggestions(res.suggestions ?? [])
        setOpen(true)
      } catch {
        if (version !== requestVersion.current) return
        setSuggestions([])
        setError("No pudimos buscar direcciones. Intenta nuevamente.")
        setOpen(true)
      } finally {
        if (version === requestVersion.current) setLoading(false)
      }
    }, 300)
  }

  async function handleSelect(suggestion: { mapbox_id: string; name: string; place_formatted: string }) {
    const version = ++requestVersion.current
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setOpen(false)
    setLoading(true)
    try {
      const res = await api.geo.retrieve(suggestion.mapbox_id, sessionToken)
      if (version !== requestVersion.current) return
      const feature = res.features?.[0]
      if (!feature) {
        setError("No pudimos confirmar esa dirección. Elige otra sugerencia.")
        return
      }
      const [lng, lat] = feature.geometry.coordinates
      const address = feature.properties.full_address || suggestion.place_formatted
      setTypedQuery(null)
      setError(null)
      setSuggestions([])
      onChange({ address, lat, lng })
    } catch {
      if (version !== requestVersion.current) return
      setError("No pudimos confirmar esa dirección. Elige otra sugerencia.")
      setOpen(true)
    } finally {
      if (version === requestVersion.current) setLoading(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-faint" />
        <input
          id={id}
          type="text"
          autoComplete="off"
          disabled={disabled}
          aria-label={placeholder}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          value={query}
          placeholder={placeholder}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          className="h-11 w-full rounded-[8px] border border-border bg-background pl-9 pr-9 text-base text-foreground placeholder:text-ink-faint outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20 md:text-sm"
        />
        {loading && !disabled && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-ink-faint" />
        )}
      </div>

      {error && <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
      {open && !disabled && (
        <ul className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-64 overflow-y-auto overscroll-contain rounded-[10px] border border-border bg-background shadow-lg">
          {suggestions.length === 0 && <li className="px-4 py-3 text-[13px] text-muted-foreground">{emptyMessage}</li>}
          {suggestions.map((s) => (
            <li key={s.mapbox_id}>
              <button
                type="button"
                onClick={() => handleSelect(s)}
                className={cn(
                  "flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-muted",
                  "border-b border-surface-dim last:border-0"
                )}
              >
                <span className="text-[13px] font-medium text-foreground">{s.name}</span>
                <span className="text-[12px] text-muted-foreground">{s.place_formatted}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
