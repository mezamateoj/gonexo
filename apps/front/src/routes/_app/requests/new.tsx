import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useRef } from "react"
import { z } from "zod"
import {
  Package,
  Boxes,
  Truck,
  Building2,
  Camera,
  Info,
  ArrowRight,
  X,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { api, uploadFile } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { VolumeCategory } from "@/lib/types"

export const Route = createFileRoute("/_app/requests/new")({
  component: NewRequestPage,
})

const volumeCategories = ["small", "medium", "large", "full_move"] as const satisfies readonly VolumeCategory[]

const volumeCategorySchema = z
  .union([z.enum(volumeCategories), z.literal("")])
  .refine((value): value is VolumeCategory => value !== "", {
    message: "Selecciona un volumen",
  })

const schema = z.object({
  originAddress: z.string().min(1, "Dirección requerida"),
  originFloor: z.number().int().optional(),
  originHasElevator: z.boolean(),
  destAddress: z.string().min(1, "Dirección requerida"),
  destFloor: z.number().int().optional(),
  destHasElevator: z.boolean(),
  volumeCategory: volumeCategorySchema,
  itemDescription: z.string().min(5, "Mínimo 5 caracteres"),
  scheduledAt: z.string().min(1, "Selecciona fecha y hora"),
  notes: z.string().optional(),
})

type FormValues = z.input<typeof schema>

const VOLUMES: {
  value: VolumeCategory
  label: string
  Icon: React.ComponentType<{ className?: string }>
}[] = [
  { value: "small", label: "Pequeño", Icon: Package },
  { value: "medium", label: "Mediano", Icon: Boxes },
  { value: "large", label: "Grande", Icon: Truck },
  { value: "full_move", label: "Mudanza completa", Icon: Building2 },
]

function FieldError({ error }: { error?: string }) {
  if (!error) return null
  return <p className="text-[12px] text-destructive">{error}</p>
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-[12px] border border-[#F0F0F0] bg-white p-5 flex flex-col gap-4">
      <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  )
}

function PhotoUploader({
  urls,
  onChange,
}: {
  urls: string[]
  onChange: (urls: string[]) => void
}) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const uploaded = await Promise.all(
        Array.from(files)
          .slice(0, 8 - urls.length)
          .map(uploadFile)
      )
      onChange([...urls, ...uploaded])
    } catch {
      // TODO: surface upload error
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
        className="flex flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#E5E5E5] bg-[#FAFAFA] py-6 text-center transition-colors hover:border-[#CCCCCC] disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 className="size-7 animate-spin text-[#CCCCCC]" />
        ) : (
          <Camera className="size-7 text-[#CCCCCC]" />
        )}
        <span className="text-[13px] text-[#AAAAAA]">
          {uploading ? "Subiendo..." : "Arrastra o haz clic para subir"}
        </span>
        <span className="text-[12px] text-[#CCCCCC]">
          JPEG, PNG o WebP · Máx 10 MB
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {urls.map((url, i) => (
            <div key={i} className="relative size-16 shrink-0">
              <img
                src={url}
                alt=""
                className="size-16 rounded-[8px] object-cover"
              />
              <button
                type="button"
                onClick={() => onChange(urls.filter((_, j) => j !== i))}
                className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-foreground text-background"
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

function NewRequestPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const defaultValues: FormValues = {
    originAddress: "",
    originFloor: undefined,
    originHasElevator: false,
    destAddress: "",
    destFloor: undefined,
    destHasElevator: false,
    volumeCategory: "",
    itemDescription: "",
    scheduledAt: "",
    notes: "",
  }

  const mutation = useMutation({
    mutationFn: api.requests.create,
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({ queryKey: ["requests", "my"] })
      navigate({ to: "/requests/$id", params: { id } })
    },
  })

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: schema,
    },
    onSubmit: async ({ value }) => {
      const parsed = schema.parse(value)
      await mutation.mutateAsync({
        ...parsed,
        // Coordinates: placeholder 0,0 — replace with Mapbox geocoder later
        originLat: 0,
        originLng: 0,
        destLat: 0,
        destLng: 0,
        photoUrls,
      })
    },
  })

  return (
    <div className="p-8">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <div className="flex gap-8 items-start">
          <div className="flex flex-1 flex-col gap-6">
            <div>
              <h1 className="text-[24px] font-bold text-foreground">
                Nueva solicitud de flete
              </h1>
              <p className="mt-1 text-[14px] text-muted-foreground">
                Completa los detalles y recibe cotizaciones en minutos
              </p>
            </div>

            <Section title="Origen">
              <form.Field
                name="originAddress"
                validators={{ onBlur: z.string().min(1, "Dirección requerida") }}
              >
                {(field) => (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="originAddress" className="text-[13px] font-medium text-[#444444]">
                      Dirección de origen
                    </Label>
                    <Input
                      id="originAddress"
                      placeholder="Ej: Av. Providencia 1234, Providencia"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="h-10"
                    />
                    <FieldError error={field.state.meta.errors[0]?.toString()} />
                  </div>
                )}
              </form.Field>

              <div className="flex gap-3">
                <form.Field name="originFloor">
                  {(field) => (
                    <div className="flex flex-col gap-1.5 w-28">
                      <Label className="text-[13px] font-medium text-[#444444]">Piso</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={field.state.value ?? ""}
                        onBlur={field.handleBlur}
                        onChange={(e) =>
                          field.handleChange(
                            e.target.value === "" ? undefined : Number(e.target.value)
                          )
                        }
                        className="h-10"
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="originHasElevator">
                  {(field) => (
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Label className="text-[13px] font-medium text-[#444444]">Ascensor</Label>
                      <div className="flex h-10 items-center justify-between rounded-[8px] border border-[#E5E5E5] bg-white px-3">
                        <span className="text-[14px] text-foreground">
                          {field.state.value ? "Sí" : "No"}
                        </span>
                        <Switch
                          checked={field.state.value}
                          onCheckedChange={field.handleChange}
                        />
                      </div>
                    </div>
                  )}
                </form.Field>
              </div>
            </Section>

            <Section title="Destino">
              <form.Field
                name="destAddress"
                validators={{ onBlur: z.string().min(1, "Dirección requerida") }}
              >
                {(field) => (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[13px] font-medium text-[#444444]">
                      Dirección de destino
                    </Label>
                    <Input
                      placeholder="Ej: Las Condes 2345"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="h-10"
                    />
                    <FieldError error={field.state.meta.errors[0]?.toString()} />
                  </div>
                )}
              </form.Field>

              <div className="flex gap-3">
                <form.Field name="destFloor">
                  {(field) => (
                    <div className="flex flex-col gap-1.5 w-28">
                      <Label className="text-[13px] font-medium text-[#444444]">Piso</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={field.state.value ?? ""}
                        onBlur={field.handleBlur}
                        onChange={(e) =>
                          field.handleChange(
                            e.target.value === "" ? undefined : Number(e.target.value)
                          )
                        }
                        className="h-10"
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="destHasElevator">
                  {(field) => (
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Label className="text-[13px] font-medium text-[#444444]">Ascensor</Label>
                      <div className="flex h-10 items-center justify-between rounded-[8px] border border-[#E5E5E5] bg-white px-3">
                        <span className="text-[14px] text-foreground">
                          {field.state.value ? "Sí" : "No"}
                        </span>
                        <Switch
                          checked={field.state.value}
                          onCheckedChange={field.handleChange}
                        />
                      </div>
                    </div>
                  )}
                </form.Field>
              </div>
            </Section>

            <Section title="Detalles del envío">
              <form.Field
                name="volumeCategory"
                validators={{ onBlur: volumeCategorySchema }}
              >
                {(field) => (
                  <div className="flex flex-col gap-2">
                    <Label className="text-[13px] font-medium text-[#444444]">
                      Volumen estimado
                    </Label>
                    <div className="grid grid-cols-4 gap-[10px]">
                      {VOLUMES.map(({ value, label, Icon }) => {
                        const active = field.state.value === value
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => field.handleChange(value)}
                            className={cn(
                              "flex flex-col items-center gap-2 rounded-[10px] border p-[14px] transition-all",
                              active
                                ? "border-[2px] border-[#F97316] bg-[#FFF4ED]"
                                : "border border-[#E5E5E5] bg-[#FAFAFA] hover:border-[#CCCCCC]"
                            )}
                          >
                            <Icon
                              className={cn(
                                "size-5",
                                active ? "text-[#F97316]" : "text-[#888888]"
                              )}
                            />
                            <span
                              className={cn(
                                "text-center text-[12px] leading-tight",
                                active
                                  ? "font-semibold text-[#F97316]"
                                  : "text-[#666666]"
                              )}
                            >
                              {label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    <FieldError error={field.state.meta.errors[0]?.toString()} />
                  </div>
                )}
              </form.Field>

              <form.Field
                name="itemDescription"
                validators={{
                  onBlur: z.string().min(5, "Mínimo 5 caracteres"),
                }}
              >
                {(field) => (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[13px] font-medium text-[#444444]">
                      Descripción de artículos
                    </Label>
                    <Input
                      placeholder="Ej: 2 camas, 1 sofá, cajas de ropa..."
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="h-10"
                    />
                    <FieldError error={field.state.meta.errors[0]?.toString()} />
                  </div>
                )}
              </form.Field>

              <form.Field
                name="scheduledAt"
                validators={{ onBlur: z.string().min(1, "Selecciona fecha y hora") }}
              >
                {(field) => (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[13px] font-medium text-[#444444]">
                      Fecha y hora preferida
                    </Label>
                    <input
                      type="datetime-local"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        const iso = e.target.value
                          ? new Date(e.target.value).toISOString()
                          : ""
                        field.handleChange(iso)
                      }}
                      className="flex h-10 w-full rounded-[8px] border border-[#E5E5E5] bg-white px-3 py-2 text-[14px] text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                    <FieldError error={field.state.meta.errors[0]?.toString()} />
                  </div>
                )}
              </form.Field>
            </Section>
          </div>

          <div className="flex w-[300px] shrink-0 flex-col gap-5">
            <div className="rounded-[12px] border border-[#F0F0F0] bg-white p-5 flex flex-col gap-3">
              <h2 className="text-[15px] font-semibold text-foreground">
                Fotos <span className="text-[13px] font-normal text-muted-foreground">(opcional)</span>
              </h2>
              <p className="text-[13px] text-muted-foreground">
                Ayuda a los conductores a entender el tamaño del envío
              </p>
              <PhotoUploader urls={photoUrls} onChange={setPhotoUrls} />
            </div>

            <form.Field name="notes">
              {(field) => (
                <div className="rounded-[12px] border border-[#F0F0F0] bg-white p-5 flex flex-col gap-3">
                  <h2 className="text-[15px] font-semibold text-foreground">
                    Notas adicionales
                  </h2>
                  <Textarea
                    placeholder="Ej: Frágil, requiere embalaje especial..."
                    rows={3}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="resize-none text-[14px]"
                  />
                </div>
              )}
            </form.Field>

            <div className="flex gap-2.5 rounded-[10px] bg-[#FFF4ED] p-4">
              <Info className="mt-px size-4 shrink-0 text-[#F97316]" />
              <p className="text-[13px] text-[#B45309] leading-snug">
                Las cotizaciones expiran en 48 horas. Puedes cancelar antes de aceptar una.
              </p>
            </div>

            {mutation.error && (
              <p className="text-[13px] text-destructive">
                {(mutation.error as Error).message}
              </p>
            )}

            <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  disabled={!canSubmit || isSubmitting || mutation.isPending}
                  className="h-[48px] w-full rounded-[10px] text-[15px] font-semibold"
                >
                  {isSubmitting || mutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      Publicar solicitud
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </div>
      </form>
    </div>
  )
}
