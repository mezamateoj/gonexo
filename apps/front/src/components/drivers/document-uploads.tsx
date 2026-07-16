import {
  Camera,
  CheckCircle2,
  FileCheck2,
  FileText,
  IdCard,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cdnUrl } from "@/lib/api"
import type { DriverDocumentKind, DriverVerificationStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

export type DriverDocumentUpload = {
  kind: DriverDocumentKind
  key: string
  order: number
}

export function DriverDocumentUploads({
  documents,
  uploading,
  verificationStatus,
  onUpload,
  onRemove,
}: {
  documents: readonly DriverDocumentUpload[]
  uploading: DriverDocumentKind | null
  verificationStatus?: DriverVerificationStatus
  onUpload: (kind: DriverDocumentKind, files: FileList | null) => void
  onRemove: (key: string) => void
}) {
  const license = documents.find((document) => document.kind === "license")
  const papers = documents
    .filter((document) => document.kind === "papers")
    .sort((left, right) => left.order - right.order)
  const photos = documents
    .filter((document) => document.kind === "vehicle_photo")
    .sort((left, right) => left.order - right.order)

  return (
    <div className="flex flex-col gap-6">
      {verificationStatus && <VerificationStatus status={verificationStatus} />}

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <FileCheck2 className="size-4 text-primary" />
          <h3 className="font-heading text-lg font-semibold">Expediente de verificación</h3>
        </div>
        <p className="text-pretty text-sm text-muted-foreground">
          Revisamos que tu nombre y la patente coincidan, y que los documentos estén vigentes.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <IdCard className="size-4 text-primary" />
                <CardTitle>Licencia de conducir</CardTitle>
              </div>
              <Badge variant={license ? "secondary" : "outline"}>{license ? "Lista" : "Falta"}</Badge>
            </div>
            <CardDescription>Una foto nítida donde se lean tu nombre y vencimiento.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {license && <DocumentThumbnail document={license} label="Licencia" onRemove={onRemove} />}
            <UploadButton
              kind="license"
              label={license ? "Reemplazar licencia" : "Subir licencia"}
              disabled={uploading !== null}
              uploading={uploading === "license"}
              onUpload={onUpload}
            />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                <CardTitle>Documentos del vehículo</CardTitle>
              </div>
              <Badge variant={papers.length === 3 ? "secondary" : "outline"} className="tabular-nums">
                {papers.length}/3
              </Badge>
            </div>
            <CardDescription>Padrón, permiso de circulación y revisión técnica.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {papers.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {papers.map((document, index) => (
                  <DocumentThumbnail
                    key={document.key}
                    document={document}
                    label={`Documento ${index + 1}`}
                    compact
                    onRemove={onRemove}
                  />
                ))}
              </div>
            )}
            <UploadButton
              kind="papers"
              label={papers.length === 0 ? "Subir documentos" : "Agregar documento"}
              disabled={uploading !== null || papers.length >= 3}
              uploading={uploading === "papers"}
              onUpload={onUpload}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Camera className="size-4 text-primary" />
              <CardTitle>Fotos del vehículo</CardTitle>
              <Badge variant="secondary">Recomendado</Badge>
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">{photos.length}/8</span>
          </div>
          <CardDescription>
            No forman parte de la verificación. Sirven para que los clientes conozcan tu vehículo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {photos.map((document, index) => (
                <DocumentThumbnail
                  key={document.key}
                  document={document}
                  label={`Foto del vehículo ${index + 1}`}
                  compact
                  onRemove={onRemove}
                />
              ))}
            </div>
          )}
          <UploadButton
            kind="vehicle_photo"
            label={photos.length === 0 ? "Subir primera foto" : "Agregar foto"}
            disabled={uploading !== null || photos.length >= 8}
            uploading={uploading === "vehicle_photo"}
            onUpload={onUpload}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function VerificationStatus({ status }: { status: DriverVerificationStatus }) {
  if (status === "verified") {
    return (
      <Alert>
        <ShieldCheck />
        <AlertTitle>Identidad verificada</AlertTitle>
        <AlertDescription>
          Tus documentos fueron aprobados. Si los reemplazas, volveremos a revisarlos.
        </AlertDescription>
      </Alert>
    )
  }

  if (status === "submitted") {
    return (
      <Alert>
        <CheckCircle2 />
        <AlertTitle>Documentos enviados</AlertTitle>
        <AlertDescription>
          Estamos preparando tu expediente para una revisión humana. Puedes seguir usando Gonexo.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert>
      <FileCheck2 />
      <AlertTitle>Completa tu expediente</AlertTitle>
      <AlertDescription>
        Envía tu licencia y los tres documentos del vehículo para iniciar la revisión.
      </AlertDescription>
    </Alert>
  )
}

function UploadButton({
  kind,
  label,
  disabled,
  uploading,
  onUpload,
}: {
  kind: DriverDocumentKind
  label: string
  disabled: boolean
  uploading: boolean
  onUpload: (kind: DriverDocumentKind, files: FileList | null) => void
}) {
  return (
    <Button
      asChild
      variant="outline"
      className={cn(
        "min-h-10 w-fit transition-transform active:scale-[0.96]",
        disabled && "pointer-events-none opacity-50",
      )}
      aria-disabled={disabled}
    >
      <label>
        <Upload data-icon="inline-start" />
        {uploading ? "Subiendo…" : label}
        <input
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          onChange={(event) => {
            onUpload(kind, event.target.files)
            event.currentTarget.value = ""
          }}
        />
      </label>
    </Button>
  )
}

function DocumentThumbnail({
  document,
  label,
  compact = false,
  onRemove,
}: {
  document: DriverDocumentUpload
  label: string
  compact?: boolean
  onRemove: (key: string) => void
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-muted p-1.5 shadow-sm">
      <img
        src={cdnUrl(document.key)}
        alt={label}
        className={compact
          ? "aspect-square w-full rounded-lg object-cover outline -outline-offset-1 outline-black/10 dark:outline-white/10"
          : "aspect-[16/9] w-full rounded-lg object-cover outline -outline-offset-1 outline-black/10 dark:outline-white/10"}
      />
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="absolute right-3 top-3 size-10 shadow-sm transition-transform active:scale-[0.96]"
        onClick={() => onRemove(document.key)}
        aria-label={`Quitar ${label.toLowerCase()}`}
      >
        <Trash2 />
      </Button>
    </div>
  )
}
