import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cdnUrl } from "@/lib/api"
import type { JobDetail } from "@/lib/types"

export function JobPhotosCard({ job }: { job: JobDetail }) {
  const photos = [
    job.beforePhotoKey
      ? { key: job.beforePhotoKey, label: "Al iniciar", alt: "Carga al iniciar el flete" }
      : null,
    job.afterPhotoKey
      ? { key: job.afterPhotoKey, label: "Al finalizar", alt: "Carga al finalizar el flete" }
      : null,
  ].filter((photo): photo is { key: string; label: string; alt: string } => photo !== null)

  if (photos.length === 0) return null

  return (
    <Card className="rounded-2xl border-border bg-white ring-0">
      <CardHeader>
        <CardTitle>Fotos del flete</CardTitle>
        <CardDescription>Registro de la carga al iniciar y finalizar el servicio.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {photos.map((photo) => (
          <figure key={photo.key} className="flex flex-col gap-2">
            <a
              href={cdnUrl(photo.key)}
              target="_blank"
              rel="noreferrer"
              aria-label={`Abrir foto ${photo.label.toLowerCase()}`}
              className="overflow-hidden rounded-xl transition-transform active:scale-[0.96]"
            >
              <img
                src={cdnUrl(photo.key)}
                alt={photo.alt}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover outline -outline-offset-1 outline-black/10 dark:outline-white/10"
              />
            </a>
            <figcaption className="text-sm font-medium text-foreground">{photo.label}</figcaption>
          </figure>
        ))}
      </CardContent>
    </Card>
  )
}
