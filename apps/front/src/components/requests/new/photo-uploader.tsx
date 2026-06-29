import { useRef, useState } from "react"
import { Camera, Loader2, X } from "lucide-react"
import { uploadFile } from "@/lib/api"

export function PhotoUploader({ urls, onChange }: { urls: string[]; onChange: (u: string[]) => void }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return
    setError(null)
    setUploading(true)
    try {
      const uploaded = await Promise.all(Array.from(files).slice(0, 8 - urls.length).map(uploadFile))
      onChange([...urls, ...uploaded])
    } catch {
      setError("No pudimos subir las fotos. Intenta nuevamente.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || urls.length >= 8}
        className="flex flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#E9E7E3] bg-[#FAFAF8] py-6 text-center transition-colors hover:border-primary/40 disabled:opacity-50"
      >
        {uploading ? <Loader2 className="size-7 animate-spin text-[#B0ABA5]" /> : <Camera className="size-7 text-[#B0ABA5]" />}
        <span className="text-[13px] text-[#969e9b]">{uploading ? "Subiendo…" : "Subir fotos (opcional)"}</span>
        <span className="text-[12px] text-[#B0ABA5]">Ayuda a los transportistas a entender el tamaño</span>
      </button>
      {error && <p className="text-[13px] text-destructive">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {urls.map((url, i) => (
            <div key={url} className="relative size-16 shrink-0">
              <img src={url} alt="" className="size-16 rounded-[8px] object-cover" />
              <button
                type="button"
                onClick={() => onChange(urls.filter((_, j) => j !== i))}
                className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[#121715] text-white"
              >
                <X className="size-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
