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
  onChange: (result: AddressResult) => void
  placeholder?: string
  sessionToken: string
}

export function AddressAutocomplete({ value, onChange, placeholder = "Busca una dirección…", sessionToken }: Props) {
  const id = useId()
  const [query, setQuery] = useState(value?.address ?? "")
  const [suggestions, setSuggestions] = useState<{ mapbox_id: string; name: string; place_formatted: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value?.address && value.address !== query) {
      setQuery(value.address)
    }
  }, [value?.address])

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
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 3) { setSuggestions([]); setOpen(false); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await api.geo.suggest(q, sessionToken)
        setSuggestions(res.suggestions ?? [])
        setOpen(true)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  async function handleSelect(suggestion: { mapbox_id: string; name: string; place_formatted: string }) {
    setOpen(false)
    setLoading(true)
    try {
      const res = await api.geo.retrieve(suggestion.mapbox_id, sessionToken)
      const feature = res.features?.[0]
      if (!feature) return
      const [lng, lat] = feature.geometry.coordinates
      const address = feature.properties.full_address || suggestion.place_formatted
      setQuery(address)
      onChange({ address, lat, lng })
    } catch {
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#B0ABA5]" />
        <input
          id={id}
          type="text"
          autoComplete="off"
          value={query}
          placeholder={placeholder}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          className="h-10 w-full rounded-[8px] border border-[#E9E7E3] bg-white pl-9 pr-9 text-[14px] text-[#121715] placeholder:text-[#B0ABA5] outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-[#B0ABA5]" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-[10px] border border-[#E9E7E3] bg-white shadow-lg">
          {suggestions.map((s) => (
            <li key={s.mapbox_id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s) }}
                className={cn(
                  "flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-[#F5F4F0]",
                  "border-b border-[#F0EEE9] last:border-0"
                )}
              >
                <span className="text-[13px] font-medium text-[#121715]">{s.name}</span>
                <span className="text-[12px] text-[#969e9b]">{s.place_formatted}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
