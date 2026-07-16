import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import {
  CarFront,
  Check,
  Circle,
  Container,
  Phone,
  ShieldCheck,
  Truck,
} from "lucide-react"
import { z } from "zod"
import {
  DriverDocumentUploads,
  type DriverDocumentUpload,
} from "@/components/drivers/document-uploads"
import { GonexoLogo } from "@/components/gonexo-logo"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { api, uploadDriverFile } from "@/lib/api"
import { useAppMode } from "@/lib/app-mode"
import { useSession } from "@/lib/auth-client"
import { queryKeys } from "@/lib/query-keys"
import type { DriverDocumentKind, VehicleType } from "@/lib/types"

export const Route = createFileRoute("/driver-onboarding")({
  component: DriverOnboardingPage,
})

const vehicleTypeSchema = z.enum(["van", "pickup", "truck_small", "truck_large"])
const phoneSchema = z.string().min(8, "Ingresa un teléfono válido (+56 9 ...)")
const plateSchema = z.string().min(4, "Ingresa una patente válida").max(10, "Patente demasiado larga")
const yearSchema = z.string().refine(
  (value) => !value || (Number(value) >= 1990 && Number(value) <= new Date().getFullYear() + 1),
  "Ingresa un año válido",
)

const onboardingSchema = z.object({
  phone: phoneSchema,
  vehicleType: vehicleTypeSchema,
  plate: plateSchema,
  year: yearSchema,
  documents: z.array(z.object({
    kind: z.enum(["license", "papers", "vehicle_photo"]),
    key: z.string(),
    order: z.number(),
  })),
}).superRefine(({ documents }, ctx) => {
  const verificationDocuments = documents.filter((document) => document.kind !== "vehicle_photo")
  if (verificationDocuments.length === 0) return
  const hasLicense = verificationDocuments.some((document) => document.kind === "license")
  const papersCount = verificationDocuments.filter((document) => document.kind === "papers").length
  if (!hasLicense || papersCount !== 3) {
    ctx.addIssue({
      code: "custom",
      path: ["documents"],
      message: "Para enviar tu expediente necesitas la licencia y los 3 documentos del vehículo",
    })
  }
})

const vehicleTypes: {
  value: VehicleType
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { value: "van", label: "Furgón", description: "Carga cerrada", icon: Container },
  { value: "pickup", label: "Camioneta", description: "Carga ligera", icon: CarFront },
  { value: "truck_small", label: "Camión chico", description: "Carga mediana", icon: Truck },
  { value: "truck_large", label: "Camión grande", description: "Mudanzas completas", icon: Truck },
]

function DriverOnboardingPage() {
  const { data: session } = useSession()
  const userId = session?.user.id
  const { data: currentUser } = useQuery({
    queryKey: queryKeys.users.me(userId ?? "anonymous"),
    queryFn: api.users.me,
    enabled: !!userId,
  })

  if (!currentUser || !userId) return null

  return <DriverOnboardingForm userId={userId} accountPhone={currentUser.phone ?? ""} />
}

function DriverOnboardingForm({ userId, accountPhone }: { userId: string; accountPhone: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { setMode } = useAppMode()
  const [uploading, setUploading] = useState<DriverDocumentKind | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      phone: accountPhone,
      vehicleType: "van" as VehicleType,
      plate: "",
      year: "",
      documents: [] as DriverDocumentUpload[],
    },
    validators: { onSubmit: onboardingSchema },
    onSubmit: async ({ value }) => {
      setSubmitError(null)
      const verificationDocuments = value.documents.flatMap((document) =>
        document.kind === "vehicle_photo"
          ? []
          : [{ kind: document.kind, key: document.key, order: document.order }],
      )
      const photos = value.documents.flatMap((document) =>
        document.kind === "vehicle_photo"
          ? [{ kind: "vehicle_photo" as const, key: document.key, order: document.order }]
          : [],
      )

      try {
        await api.drivers.upsertMe({
          phone: value.phone,
          vehicleType: value.vehicleType,
          vehiclePlate: value.plate.toUpperCase(),
          vehicleYear: value.year ? Number(value.year) : undefined,
          documents: verificationDocuments.length > 0 ? verificationDocuments : undefined,
        })
        if (photos.length > 0) await api.drivers.replacePhotos(photos)

        const profile = await api.drivers.me()
        if (profile) queryClient.setQueryData(queryKeys.drivers.me(userId), profile)
        setMode("driver")
        navigate({ to: "/available" })
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "No se pudo activar tu perfil")
      }
    },
  })

  async function upload(kind: DriverDocumentKind, files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    const kindCount = form.state.values.documents.filter((document) => document.kind === kind).length
    const limit = kind === "license" ? 1 : kind === "papers" ? 3 : 8
    if (kindCount >= limit && kind !== "license") return

    setUploading(kind)
    try {
      const uploaded = await uploadDriverFile(file)
      form.setFieldValue("documents", (documents) => {
        const withoutKind = kind === "license"
          ? documents.filter((document) => document.kind !== "license")
          : documents
        const nextOrder = withoutKind
          .filter((document) => document.kind === kind)
          .reduce((highest, document) => Math.max(highest, document.order), -1) + 1
        return [...withoutKind, { kind, key: uploaded.key, order: nextOrder }]
      })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No se pudo subir el archivo")
    } finally {
      setUploading(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <GonexoLogo size="xs" />
          <Badge variant="secondary"><ShieldCheck data-icon="inline-start" />Perfil de transportista</Badge>
        </div>
      </header>

      <form
        className="mx-auto grid max-w-6xl items-start gap-6 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[17rem_minmax(0,1fr)]"
        onSubmit={(event) => {
          event.preventDefault()
          form.handleSubmit()
        }}
      >
        <aside className="flex flex-col gap-5 lg:sticky lg:top-8">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Tu expediente</p>
            <h1 className="text-balance font-heading text-3xl font-semibold tracking-tight">
              Activa tu perfil para empezar a cotizar
            </h1>
            <p className="text-pretty text-sm text-muted-foreground">
              Registra el vehículo y, si tienes los documentos a mano, envíalos para revisión.
            </p>
          </div>

          <form.Subscribe selector={(state) => ({
            documents: state.values.documents,
            plate: state.values.plate,
          })}>
            {({ documents, plate }) => <PacketChecklist documents={documents} vehicleReady={plate.length >= 4} />}
          </form.Subscribe>
        </aside>

        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="bg-muted/40">
            <CardTitle className="text-xl">Datos del vehículo</CardTitle>
            <CardDescription>
              La patente se compara con los documentos que envíes. Escríbela tal como aparece en el padrón.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-8 p-5 sm:p-7">
            <FieldGroup>
              {!accountPhone ? (
                <form.Field name="phone" validators={{ onBlur: phoneSchema }}>
                  {(field) => (
                    <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                      <FieldLabel htmlFor={field.name}>Teléfono de contacto</FieldLabel>
                      <Input
                        id={field.name}
                        type="tel"
                        placeholder="+56 9 xxxx xxxx"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        aria-invalid={field.state.meta.errors.length > 0}
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </Field>
                  )}
                </form.Field>
              ) : (
                <Field>
                  <FieldLabel>Teléfono de contacto</FieldLabel>
                  <div className="flex min-h-10 items-center gap-2 rounded-lg bg-muted px-3 text-sm">
                    <Phone className="size-4 text-muted-foreground" />
                    <span>{accountPhone}</span>
                  </div>
                  <FieldDescription>Usaremos el teléfono asociado a tu cuenta.</FieldDescription>
                </Field>
              )}

              <form.Field name="vehicleType">
                {(field) => (
                  <Field>
                    <FieldLabel>Tipo de vehículo</FieldLabel>
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      value={field.state.value}
                      className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4"
                      onValueChange={(value) => {
                        const parsed = vehicleTypeSchema.safeParse(value)
                        if (parsed.success) field.handleChange(parsed.data)
                      }}
                    >
                      {vehicleTypes.map(({ value, label, description, icon: Icon }) => (
                        <ToggleGroupItem
                          key={value}
                          value={value}
                          className="min-h-20 flex-col items-start px-3 text-left"
                        >
                          <Icon />
                          <span>{label}</span>
                          <span className="text-xs font-normal text-muted-foreground">{description}</span>
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </Field>
                )}
              </form.Field>

              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
                <form.Field name="plate" validators={{ onBlur: plateSchema }}>
                  {(field) => (
                    <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                      <FieldLabel htmlFor={field.name}>Patente</FieldLabel>
                      <Input
                        id={field.name}
                        placeholder="AB-CD-12"
                        className="font-mono font-semibold uppercase tracking-[0.08em]"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value.toUpperCase())}
                        aria-invalid={field.state.meta.errors.length > 0}
                      />
                      <FieldDescription>La compararemos con el padrón, permiso y revisión técnica.</FieldDescription>
                      <FieldError errors={field.state.meta.errors} />
                    </Field>
                  )}
                </form.Field>

                <form.Field name="year" validators={{ onBlur: yearSchema }}>
                  {(field) => (
                    <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                      <FieldLabel htmlFor={field.name}>Año <span className="font-normal text-muted-foreground">(opcional)</span></FieldLabel>
                      <Input
                        id={field.name}
                        inputMode="numeric"
                        placeholder="2019"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
                        aria-invalid={field.state.meta.errors.length > 0}
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </Field>
                  )}
                </form.Field>
              </div>
            </FieldGroup>

            <Separator />

            <form.Field name="documents">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                  <DriverDocumentUploads
                    documents={field.state.value}
                    uploading={uploading}
                    onUpload={upload}
                    onRemove={(key) => field.handleChange(
                      field.state.value.filter((document) => document.key !== key),
                    )}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>

            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button asChild type="button" variant="ghost" className="min-h-10">
                <Link to="/requests" onClick={() => setMode("client")}>Seguir como cliente</Link>
              </Button>
              <form.Subscribe selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}>
                {({ canSubmit, isSubmitting }) => (
                  <Button
                    type="submit"
                    size="lg"
                    className="min-h-11 transition-transform active:scale-[0.96]"
                    disabled={!canSubmit || isSubmitting || uploading !== null}
                  >
                    {isSubmitting ? "Activando perfil…" : "Activar perfil"}
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}

function PacketChecklist({
  documents,
  vehicleReady,
}: {
  documents: DriverDocumentUpload[]
  vehicleReady: boolean
}) {
  const licenseReady = documents.some((document) => document.kind === "license")
  const papersCount = documents.filter((document) => document.kind === "papers").length
  const photosCount = documents.filter((document) => document.kind === "vehicle_photo").length

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card p-4 shadow-sm ring-1 ring-foreground/5">
      <ChecklistItem ready={vehicleReady} label="Vehículo y patente" />
      <ChecklistItem ready={licenseReady} label="Licencia de conducir" />
      <ChecklistItem ready={papersCount === 3} label={`Documentos del vehículo (${papersCount}/3)`} />
      <ChecklistItem ready={photosCount > 0} label="Fotos del vehículo" optional />
    </div>
  )
}

function ChecklistItem({ ready, label, optional = false }: { ready: boolean; label: string; optional?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={ready
        ? "flex size-6 items-center justify-center rounded-full bg-accent text-primary"
        : "flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground"}>
        {ready ? <Check className="size-3.5" /> : <Circle className="size-3" />}
      </span>
      <span className={ready ? "font-medium" : "text-muted-foreground"}>{label}</span>
      {optional && <Badge variant="outline" className="ml-auto">Opcional</Badge>}
    </div>
  )
}
