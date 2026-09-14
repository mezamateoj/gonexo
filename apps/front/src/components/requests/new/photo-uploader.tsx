import { useRef, useState } from "react"
import { Camera, Loader2, X } from "lucide-react"
import { uploadFile } from "@/lib/api"
import type { UploadedFile } from "@/lib/api"
import { Button } from "@/components/ui/button"

export function PhotoUploader({
  urls,
  onChange,
  onUploaded,
  onRemoved,
  onUploadingChange,
  disabled = false,
}: {
  urls: string[]
  onChange: (urls: string[]) => void
  onUploaded?: (files: UploadedFile[]) => void
  onRemoved?: (url: string) => void
  onUploadingChange?: (uploading: boolean) => void
  disabled?: boolean
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return
    setError(null)
    setUploading(true)
    onUploadingChange?.(true)
    try {
      const uploaded = await Promise.all(Array.from(files).slice(0, 8 - urls.length).map(uploadFile))
      onChange([...urls, ...uploaded.map(({ url }) => url)])
      onUploaded?.(uploaded)
    } catch {
      setError("No pudimos subir las fotos. Intenta nuevamente.")
    } finally {
      setUploading(false)
      onUploadingChange?.(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading || urls.length >= 8}
        className="flex flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-border bg-background py-6 text-center transition-colors hover:border-primary/40 disabled:opacity-50"
      >
        {uploading ? <Loader2 className="size-7 animate-spin text-ink-faint" /> : <Camera className="size-7 text-ink-faint" />}
        <span className="text-[13px] text-muted-foreground">{uploading ? "Subiendo…" : "Subir fotos (opcional)"}</span>
        <span className="text-[12px] text-ink-faint">Ayuda a los transportistas a entender el tamaño</span>
      </button>
      {error && <p className="text-[13px] text-destructive">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" multiple disabled={disabled || uploading} className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {urls.map((url, i) => (
            <div key={url} className="relative size-16 shrink-0">
              <img src={url} alt="" className="size-16 rounded-[8px] object-cover" />
              <Button
                type="button"
                size="icon"
                variant="secondary"
                disabled={disabled || uploading}
                aria-label={`Eliminar foto ${i + 1}`}
                onClick={() => {
                  onChange(urls.filter((_, j) => j !== i))
                  onRemoved?.(url)
                }}
                className="absolute -right-1 -top-1 size-10 rounded-full"
              >
                <X />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
