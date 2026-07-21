import { useForm } from "@tanstack/react-form"
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ExternalLink,
  FileQuestion,
  RotateCcw,
  ShieldCheck,
} from "lucide-react"
import { z } from "zod"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { cdnUrl } from "@/lib/api"
import { documentKindLabels, formatLongDateTime, vehicleLabels } from "@/lib/display"
import type {
  AdminDocumentReview,
  AdminDriver,
  DocumentReviewDecision,
  DocumentTriageResult,
  DriverDocument,
} from "@/lib/types"

const decisionSchema = z.object({
  note: z.string().trim().min(1, "Explica qué debe corregir el transportista").max(1000),
})

const documentTypeLabels: Record<DocumentTriageResult["documents"][number]["documentType"], string> = {
  license: "Licencia de conducir",
  vehicle_registration: "Padrón del vehículo",
  circulation_permit: "Permiso de circulación",
  technical_inspection: "Revisión técnica",
  other: "Otro documento",
}

export function DriverIdentity({ driver }: { driver: AdminDriver }) {
  return (
    <Card className="overflow-hidden bg-muted/45 shadow-none">
      <div className="grid sm:grid-cols-[1fr_auto] sm:items-center">
        <CardHeader>
          <CardTitle className="truncate font-heading text-lg">{driver.user.name}</CardTitle>
          <CardDescription className="flex flex-col">
            <span className="truncate">{driver.user.email}</span>
            <span>{driver.user.phone ?? driver.phone}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 sm:justify-end">
          <Badge variant="outline" className="bg-background font-mono tabular-nums">
            {driver.vehiclePlate}
          </Badge>
          <Badge variant="outline" className="bg-background">
            {vehicleLabels[driver.vehicleType] ?? driver.vehicleType}
            {driver.vehicleYear ? ` · ${driver.vehicleYear}` : ""}
          </Badge>
        </CardContent>
      </div>
      {driver.bio && (
        <>
          <Separator />
          <CardContent className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground">Presentación del transportista</p>
            <p className="text-pretty text-sm">{driver.bio}</p>
          </CardContent>
        </>
      )}
    </Card>
  )
}

export function DocumentGallery({
  documents,
  review,
}: {
  documents: DriverDocument[]
  review: AdminDocumentReview | null
}) {
  const analyzedDocuments = review?.result?.documents ?? []
  const verificationDocuments = documents.filter((document) => document.kind !== "vehicle_photo")
  const vehiclePhotos = documents.filter((document) => document.kind === "vehicle_photo")

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-balance font-heading text-lg font-semibold">Documentos enviados</h2>
          <p className="text-pretty text-sm text-muted-foreground">
            Abre la imagen original cuando una lectura o una alerta no sea concluyente.
          </p>
        </div>

        {analyzedDocuments.length > 0 ? (
          <div className="flex flex-col gap-4">
            {analyzedDocuments.map((document) => (
              <AnalyzedDocumentCard key={document.key} document={document} />
            ))}
          </div>
        ) : verificationDocuments.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {verificationDocuments.map((document) => (
              <RawDocumentCard key={document.key} document={document} />
            ))}
          </div>
        ) : (
          <Empty className="min-h-48 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileQuestion />
              </EmptyMedia>
              <EmptyTitle>Sin documentos</EmptyTitle>
              <EmptyDescription>
                Este transportista todavía no envía documentos de verificación.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>

      {vehiclePhotos.length > 0 && <VehiclePhotoGallery photos={vehiclePhotos} />}
    </div>
  )
}

function VehiclePhotoGallery({ photos }: { photos: DriverDocument[] }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-balance font-heading text-lg font-semibold">Fotos del vehículo</h2>
        <p className="text-pretty text-sm text-muted-foreground">
          Evidencia visual de apoyo. Estas fotos no forman parte del análisis automático.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {photos.map((photo, index) => (
          <Card key={photo.key} size="sm" className="shadow-sm">
            <CardHeader>
              <CardTitle>Vista {index + 1}</CardTitle>
              <CardDescription>Foto declarada por el transportista</CardDescription>
            </CardHeader>
            <CardContent>
              <a
                href={cdnUrl(photo.key)}
                target="_blank"
                rel="noreferrer"
                className="group relative block overflow-hidden rounded-lg bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <img
                  src={cdnUrl(photo.key)}
                  alt={`Vista ${index + 1} del vehículo`}
                  className="aspect-[4/3] w-full object-cover ring-1 ring-inset ring-foreground/10 transition-opacity duration-150 group-hover:opacity-85"
                />
                <span className="absolute right-2 top-2 flex size-10 items-center justify-center rounded-lg bg-background/90 text-foreground shadow-sm">
                  <ExternalLink className="size-4" />
                </span>
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

function AnalyzedDocumentCard({
  document,
}: {
  document: DocumentTriageResult["documents"][number]
}) {
  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{documentTypeLabels[document.documentType]}</CardTitle>
          <Badge variant={document.readable ? "secondary" : "destructive"}>
            {document.readable ? "Legible" : "Poco legible"}
          </Badge>
        </div>
        <CardDescription>
          Confianza de lectura: <span className="font-medium tabular-nums">{Math.round(document.confidence * 100)}%</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-[12rem_1fr]">
        <a
          href={cdnUrl(document.key)}
          target="_blank"
          rel="noreferrer"
          className="group relative block overflow-hidden rounded-lg bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <img
            src={cdnUrl(document.key)}
            alt={documentTypeLabels[document.documentType]}
            className="aspect-[4/3] w-full object-cover outline -outline-offset-1 outline-black/10 transition-opacity duration-150 group-hover:opacity-85 dark:outline-white/10"
          />
          <span className="absolute right-2 top-2 flex size-10 items-center justify-center rounded-lg bg-background/90 text-foreground shadow-sm">
            <ExternalLink className="size-4" />
          </span>
        </a>
        <dl className="grid content-start gap-3 sm:grid-cols-2">
          <ExtractedValue label="Nombre" value={document.name} />
          <ExtractedValue label="RUT" value={document.rut} mono />
          <ExtractedValue label="Patente" value={document.plate} mono />
          <ExtractedValue label="Vencimiento" value={document.expiryDate} />
          {document.notes.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-muted-foreground">Notas de lectura</dt>
              <dd className="mt-1 text-pretty text-sm">{document.notes.join(" · ")}</dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  )
}

function RawDocumentCard({ document }: { document: DriverDocument }) {
  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader>
        <CardTitle>{documentKindLabels[document.kind]}</CardTitle>
        <CardDescription>Sin extracción disponible</CardDescription>
      </CardHeader>
      <CardContent>
        <a href={cdnUrl(document.key)} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-lg">
          <img
            src={cdnUrl(document.key)}
            alt="Documento enviado"
            className="aspect-[4/3] w-full object-cover outline -outline-offset-1 outline-black/10 transition-opacity duration-150 group-hover:opacity-85 dark:outline-white/10"
          />
        </a>
      </CardContent>
    </Card>
  )
}

function ExtractedValue({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={mono ? "mt-0.5 font-mono text-sm tabular-nums" : "mt-0.5 text-sm"}>
        {value ?? "No detectado"}
      </dd>
    </div>
  )
}

export function AnalysisSummary({ review }: { review: AdminDocumentReview | null }) {
  if (!review) {
    return (
      <Alert>
        <FileQuestion />
        <AlertTitle>Sin análisis</AlertTitle>
        <AlertDescription>Este perfil no tiene una revisión de documentos asociada.</AlertDescription>
      </Alert>
    )
  }

  if (["queued", "analyzing"].includes(review.status)) {
    return (
      <Alert>
        <Bot />
        <AlertTitle>Lectura automática en curso</AlertTitle>
        <AlertDescription>
          El expediente aparecerá aquí cuando termine el análisis. Intento {review.analysisAttempts || 1}.
        </AlertDescription>
      </Alert>
    )
  }

  if (["analysis_failed", "enqueue_failed"].includes(review.status)) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>No hubo lectura automática</AlertTitle>
        <AlertDescription>
          Revisa los originales manualmente. Todavía puedes tomar una decisión humana.
        </AlertDescription>
      </Alert>
    )
  }

  const flags = review.result?.flags ?? []
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-primary" />
          <CardTitle>Resumen automático</CardTitle>
        </div>
        <CardDescription>
          {flags.length === 0
            ? "No encontró diferencias en los datos declarados."
            : `${flags.length} observaciones para revisar antes de decidir.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {flags.length === 0 ? (
          <Alert>
            <CheckCircle2 />
            <AlertTitle>Sin alertas</AlertTitle>
            <AlertDescription>Confirma visualmente los originales antes de verificar.</AlertDescription>
          </Alert>
        ) : (
          flags.map((flag, index) => (
            <Alert key={`${flag.code}-${flag.documentKey ?? index}`} variant="destructive">
              <AlertCircle />
              <AlertTitle>{flag.message}</AlertTitle>
              <AlertDescription>{flag.code.replaceAll("_", " ")}</AlertDescription>
            </Alert>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export function DecisionPanel({
  review,
  isPending,
  onDecision,
  onReopen,
}: {
  review: AdminDocumentReview
  isPending: boolean
  onDecision: (decision: DocumentReviewDecision, note?: string) => void
  onReopen: () => void
}) {
  const form = useForm({
    defaultValues: { note: "" },
    validators: { onSubmit: decisionSchema },
    onSubmit: ({ value }) => onDecision("changes_requested", value.note),
  })

  if (review.decision) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Decisión registrada</CardTitle>
          <CardDescription>
            {review.reviewer?.name ?? "Administrador"}
            {review.reviewedAt ? ` · ${formatLongDateTime(review.reviewedAt)}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Badge variant={review.decision === "verified" ? "default" : "destructive"}>
            {review.decision === "verified" ? "Transportista verificado" : "Cambios solicitados"}
          </Badge>
          {review.note && <p className="text-pretty text-sm text-muted-foreground">{review.note}</p>}
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            variant="outline"
            className="min-h-10 w-full transition-transform active:scale-[0.96]"
            disabled={isPending}
            onClick={onReopen}
          >
            <RotateCcw data-icon="inline-start" />
            Reabrir revisión
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const canDecide = ["ready", "analysis_failed", "enqueue_failed"].includes(review.status)
  if (!canDecide) return null

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Decisión humana</CardTitle>
        <CardDescription>
          La nota es obligatoria solo cuando solicitas correcciones.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.Field name="note" validators={{ onBlur: decisionSchema.shape.note }}>
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                  <FieldLabel htmlFor={field.name}>Nota para el expediente</FieldLabel>
                  <Textarea
                    id={field.name}
                    rows={4}
                    placeholder="Ej.: La patente del padrón no coincide con la registrada."
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  <FieldDescription>{field.state.value.length}/1000 caracteres</FieldDescription>
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>

            <form.Subscribe selector={(state) => state.values.note}>
              {(note) => (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="submit"
                    variant="outline"
                    className="min-h-10 transition-transform active:scale-[0.96]"
                    disabled={isPending}
                  >
                    <AlertCircle data-icon="inline-start" />
                    Solicitar cambios
                  </Button>
                  <Button
                    type="button"
                    className="min-h-10 transition-transform active:scale-[0.96]"
                    disabled={isPending}
                    onClick={() => onDecision("verified", note.trim() || undefined)}
                  >
                    <ShieldCheck data-icon="inline-start" />
                    Verificar identidad
                  </Button>
                </div>
              )}
            </form.Subscribe>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
