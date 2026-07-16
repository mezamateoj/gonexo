import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "@tanstack/react-form"
import { Link, createFileRoute } from "@tanstack/react-router"
import {
  CalendarDays,
  Camera,
  ExternalLink,
  FileCheck2,
  IdCard,
  Mail,
  Phone,
  ShieldCheck,
  Trash2,
  Truck,
} from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
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
import { Textarea } from "@/components/ui/textarea"
import { api, cdnUrl, uploadDriverFile } from "@/lib/api"
import { useSession } from "@/lib/auth-client"
import { vehicleLabels } from "@/lib/display"
import { queryKeys } from "@/lib/query-keys"
import type {
  DriverDocument,
  DriverDocumentKind,
  DriverProfile,
} from "@/lib/types"

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
})

const accountSchema = z.object({
  name: z.string().min(1, "Ingresa tu nombre").max(100),
})

const driverSchema = z.object({
  phone: z.string().min(8, "Ingresa un teléfono válido"),
  bio: z.string().max(500, "Máximo 500 caracteres"),
  documents: z.array(
    z.object({
      id: z.string(),
      driverProfileId: z.string(),
      kind: z.enum(["license", "papers", "vehicle_photo"]),
      key: z.string(),
      order: z.number(),
      createdAt: z.string(),
    }),
  ),
})

function verificationLabel(profile: DriverProfile) {
  if (profile.isVerified) return "Identidad verificada"
  if (profile.documentsStatus === "submitted") return "Verificación en revisión"
  return "Verificación pendiente"
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function ProfilePage() {
  const { data: session } = useSession()
  const userId = session?.user.id
  const { data: user } = useQuery({
    queryKey: queryKeys.users.me(userId ?? "anonymous"),
    queryFn: api.users.me,
    enabled: !!userId,
  })
  const { data: profile } = useQuery({
    queryKey: queryKeys.drivers.me(userId ?? "anonymous"),
    queryFn: api.drivers.me,
    enabled: !!userId,
  })

  if (!user || !userId) return null

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-balance text-2xl font-semibold">Configuración</h1>
        <p className="text-pretty text-sm text-muted-foreground">
          Tu identidad, tus datos de contacto y la información que ven otros usuarios.
        </p>
      </header>

      <Card className="[--card-spacing:--spacing(6)]">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              <AvatarFallback>{initials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <CardTitle className="truncate">{user.name}</CardTitle>
              <CardDescription className="truncate">{user.email}</CardDescription>
            </div>
          </div>
          {profile && (
            <CardAction>
              <Badge variant={profile.isVerified ? "default" : "secondary"}>
                <ShieldCheck data-icon="inline-start" />
                {verificationLabel(profile)}
              </Badge>
            </CardAction>
          )}
        </CardHeader>

        <CardContent className="flex flex-col gap-8">
          <SettingsSection
            title="Cuenta"
            description="Los datos con los que te identificas en Gonexo."
          >
            <AccountSettings
              userId={userId}
              name={user.name}
              email={user.email}
              phone={user.phone}
            />
          </SettingsSection>

          <Separator />

          {profile ? (
            <SettingsSection
              title="Actividad de transportista"
              description="Tu vehículo, presentación y documentos viven aquí, junto a tu cuenta."
            >
              <DriverSettings profile={profile} />
            </SettingsSection>
          ) : (
            <SettingsSection
              title="Actividad de transportista"
              description="Activa esta opción si también quieres cotizar fletes."
            >
              <div className="flex flex-col items-start gap-3 rounded-lg bg-muted p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background text-primary ring-1 ring-foreground/10">
                    <Truck className="size-5" />
                  </div>
                  <div>
                    <p className="font-medium">¿También transportas cargas?</p>
                    <p className="text-pretty text-sm text-muted-foreground">
                      Registra tu vehículo para buscar y cotizar fletes.
                    </p>
                  </div>
                </div>
                <Button asChild className="min-h-10 active:scale-[0.96] transition-transform">
                  <Link to="/driver-onboarding">Activar perfil</Link>
                </Button>
              </div>
            </SettingsSection>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="grid gap-5 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-balance font-medium">{title}</h2>
        <p className="text-pretty text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

function AccountSettings({
  userId,
  name,
  email,
  phone,
}: {
  userId: string
  name: string
  email: string
  phone: string | null
}) {
  const queryClient = useQueryClient()
  const form = useForm({
    defaultValues: { name },
    validators: { onSubmit: accountSchema },
    onSubmit: async ({ value }) => {
      await api.users.updateMe(value)
      form.reset(value)
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.me(userId) })
      toast.success("Nombre actualizado")
    },
  })

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <IdentityFact icon={Mail} label="Email" value={email} />
        <IdentityFact icon={Phone} label="Teléfono" value={phone ?? "No registrado"} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          form.handleSubmit()
        }}
      >
        <FieldGroup>
          <form.Field name="name" validators={{ onBlur: accountSchema.shape.name }}>
            {(field) => (
              <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                <FieldLabel htmlFor={field.name}>Nombre visible</FieldLabel>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
          <FieldDescription>
            El email y el teléfono de tu cuenta son datos de identidad. Para cambiarlos,
            contacta a soporte.
          </FieldDescription>
          <form.Subscribe
            selector={(state) => ({
              isDirty: state.isDirty,
              canSubmit: state.canSubmit,
              isSubmitting: state.isSubmitting,
            })}
          >
            {({ isDirty, canSubmit, isSubmitting }) =>
              isDirty && (
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    className="min-h-10 active:scale-[0.96] transition-transform"
                    disabled={!canSubmit || isSubmitting}
                  >
                    {isSubmitting ? "Guardando…" : "Guardar nombre"}
                  </Button>
                </div>
              )
            }
          </form.Subscribe>
        </FieldGroup>
      </form>
    </div>
  )
}

function IdentityFact({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg bg-muted p-3">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}

function DriverSettings({ profile }: { profile: DriverProfile }) {
  const queryClient = useQueryClient()
  const [uploading, setUploading] = useState<DriverDocumentKind | null>(null)
  const form = useForm({
    defaultValues: {
      phone: profile.phone,
      bio: profile.bio ?? "",
      documents: profile.documents,
    },
    validators: { onSubmit: driverSchema },
    onSubmit: async ({ value }) => {
      const verificationDocuments = value.documents.filter(
        (document) => document.kind !== "vehicle_photo",
      )
      const originalVerificationDocuments = profile.documents.filter(
        (document) => document.kind !== "vehicle_photo",
      )
      const photos = value.documents.filter(
        (document) => document.kind === "vehicle_photo",
      )
      const originalPhotos = profile.documents.filter(
        (document) => document.kind === "vehicle_photo",
      )
      const documentsChanged =
        JSON.stringify(
          verificationDocuments.map(({ kind, key, order }) => ({ kind, key, order })),
        ) !==
        JSON.stringify(
          originalVerificationDocuments.map(({ kind, key, order }) => ({ kind, key, order })),
        )
      const photosChanged =
        JSON.stringify(photos.map(({ key, order }) => ({ key, order }))) !==
        JSON.stringify(originalPhotos.map(({ key, order }) => ({ key, order })))

      await api.drivers.upsertMe({
        phone: value.phone,
        vehicleType: profile.vehicleType,
        vehiclePlate: profile.vehiclePlate,
        vehicleYear: profile.vehicleYear ?? undefined,
        bio: value.bio || undefined,
        ...(documentsChanged
          ? {
              documents: verificationDocuments.map(({ kind, key, order }) => ({
                kind,
                key,
                order,
              })),
            }
          : {}),
      })
      if (photosChanged) {
        await api.drivers.replacePhotos(
          photos.map(({ key, order }) => ({ kind: "vehicle_photo", key, order })),
        )
      }

      form.reset(value)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.drivers.me(profile.userId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.users.me(profile.userId) }),
      ])
      toast.success("Datos de transportista actualizados")
    },
  })

  async function upload(kind: DriverDocumentKind, files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    if (
      kind === "vehicle_photo" &&
      form.state.values.documents.filter((document) => document.kind === kind).length >= 8
    ) {
      toast.error("Puedes subir hasta 8 fotos del vehículo")
      return
    }

    setUploading(kind)
    try {
      const uploaded = await uploadDriverFile(file)
      form.setFieldValue("documents", (documents) => {
        const withoutKind =
          kind === "vehicle_photo"
            ? documents
            : documents.filter((document) => document.kind !== kind)
        return [
          ...withoutKind,
          {
            id: crypto.randomUUID(),
            driverProfileId: profile.id,
            kind,
            key: uploaded.key,
            order: kind === "vehicle_photo" ? withoutKind.length : 0,
            createdAt: new Date().toISOString(),
          },
        ]
      })
    } catch {
      toast.error("No pudimos subir el archivo")
    } finally {
      setUploading(null)
    }
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        form.handleSubmit()
      }}
    >
      <VehicleIdentity profile={profile} />

      <FieldGroup>
        <form.Field name="phone" validators={{ onBlur: driverSchema.shape.phone }}>
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
              <FieldLabel htmlFor={field.name}>Teléfono de coordinación</FieldLabel>
              <Input
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldDescription>Lo usamos para coordinar tus fletes activos.</FieldDescription>
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <form.Field name="bio" validators={{ onBlur: driverSchema.shape.bio }}>
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
              <FieldLabel htmlFor={field.name}>Presentación</FieldLabel>
              <Textarea
                id={field.name}
                rows={4}
                placeholder="Cuenta brevemente tu experiencia y cómo trabajas."
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldDescription>{field.state.value.length}/500 caracteres</FieldDescription>
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
      </FieldGroup>

      <Separator />

      <form.Subscribe selector={(state) => state.values.documents}>
        {(documents) => (
          <DocumentUploads
            documents={documents}
            uploading={uploading}
            onUpload={upload}
            onRemove={(key) =>
              form.setFieldValue("documents", (items) =>
                items.filter((document) => document.key !== key),
              )
            }
          />
        )}
      </form.Subscribe>

      <form.Subscribe
        selector={(state) => ({
          isDirty: state.isDirty,
          canSubmit: state.canSubmit,
          isSubmitting: state.isSubmitting,
        })}
      >
        {({ isDirty, canSubmit, isSubmitting }) =>
          isDirty && (
            <div className="flex items-center justify-between gap-4 rounded-lg bg-muted p-3">
              <p className="text-pretty text-sm text-muted-foreground">
                Tienes cambios sin guardar.
              </p>
              <Button
                type="submit"
                className="min-h-10 active:scale-[0.96] transition-transform"
                disabled={!canSubmit || isSubmitting || uploading !== null}
              >
                {isSubmitting ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          )
        }
      </form.Subscribe>
    </form>
  )
}

function VehicleIdentity({ profile }: { profile: DriverProfile }) {
  return (
    <div className="overflow-hidden rounded-xl bg-accent ring-1 ring-primary/15">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-background text-primary shadow-sm">
          <Truck className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">Vehículo registrado</p>
          <p className="text-balance text-lg font-semibold">
            {vehicleLabels[profile.vehicleType] ?? profile.vehicleType}
          </p>
          <p className="text-pretty text-sm text-muted-foreground">
            Estos datos forman parte de tu identidad de transportista.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Badge variant="outline" className="bg-background">
            <IdCard data-icon="inline-start" />
            {profile.vehiclePlate}
          </Badge>
          {profile.vehicleYear && (
            <Badge variant="outline" className="bg-background">
              <CalendarDays data-icon="inline-start" />
              {profile.vehicleYear}
            </Badge>
          )}
        </div>
      </div>
      <div className="border-t border-primary/15 px-4 py-2.5">
        <p className="text-pretty text-xs text-muted-foreground">
          Si cambias de vehículo, contacta a soporte para actualizar la patente, el tipo y
          el año sin perder tu historial.
        </p>
      </div>
    </div>
  )
}

function DocumentUploads({
  documents,
  uploading,
  onUpload,
  onRemove,
}: {
  documents: DriverDocument[]
  uploading: DriverDocumentKind | null
  onUpload: (kind: DriverDocumentKind, files: FileList | null) => void
  onRemove: (key: string) => void
}) {
  const slots: {
    kind: "license" | "papers"
    label: string
    description: string
  }[] = [
    {
      kind: "license",
      label: "Licencia de conducir",
      description: "Acredita que puedes conducir el vehículo registrado.",
    },
    {
      kind: "papers",
      label: "Papeles del vehículo",
      description: "Permiso de circulación o revisión técnica vigente.",
    },
  ]
  const photos = documents.filter((document) => document.kind === "vehicle_photo")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <FileCheck2 className="size-4 text-primary" />
          <h3 className="font-medium">Verificación</h3>
        </div>
        <p className="text-pretty text-sm text-muted-foreground">
          Reemplazar o quitar estos archivos envía tu identidad nuevamente a revisión.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {slots.map((slot) => {
          const document = documents.find((item) => item.kind === slot.kind)
          return (
            <div key={slot.kind} className="flex flex-col gap-3 rounded-lg bg-muted p-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{slot.label}</p>
                  <Badge variant={document ? "secondary" : "outline"}>
                    {document ? "Cargado" : "Pendiente"}
                  </Badge>
                </div>
                <p className="text-pretty text-xs text-muted-foreground">
                  {slot.description}
                </p>
              </div>
              {document && (
                <div className="flex items-center gap-2">
                  <Button asChild type="button" variant="outline" size="sm">
                    <a href={cdnUrl(document.key)} target="_blank" rel="noreferrer">
                      <ExternalLink data-icon="inline-start" />
                      Ver archivo
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(document.key)}
                  >
                    <Trash2 data-icon="inline-start" />
                    Quitar
                  </Button>
                </div>
              )}
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading === slot.kind}
                onChange={(event) => onUpload(slot.kind, event.target.files)}
                aria-label={`Subir ${slot.label.toLowerCase()}`}
              />
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Camera className="size-4 text-primary" />
              <h3 className="font-medium">Fotos del vehículo</h3>
              <Badge variant="secondary">Opcional</Badge>
            </div>
            <p className="text-pretty text-sm text-muted-foreground">
              Ayudan a elegirte y no afectan tu estado de verificación.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">{photos.length}/8 fotos</span>
        </div>
        <Input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={uploading === "vehicle_photo" || photos.length >= 8}
          onChange={(event) => onUpload("vehicle_photo", event.target.files)}
          aria-label="Subir foto del vehículo"
        />
        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((document) => (
              <div key={document.key} className="group relative overflow-hidden rounded-lg">
                <img
                  src={cdnUrl(document.key)}
                  alt="Vehículo"
                  className="aspect-[4/3] w-full object-cover outline -outline-offset-1 outline-black/10 dark:outline-white/10"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-2 size-10 shadow-sm active:scale-[0.96] transition-transform"
                  onClick={() => onRemove(document.key)}
                  aria-label="Quitar foto"
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
