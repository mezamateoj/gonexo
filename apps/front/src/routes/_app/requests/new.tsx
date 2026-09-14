import { createFileRoute, useNavigate, Link } from "@tanstack/react-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, useStore } from "@tanstack/react-form"
import { useState, useRef } from "react"
import { toast } from "sonner"
import { z } from "zod"
import {
  Package, Boxes, Truck, Building2,
  ArrowRight, ArrowLeft, Loader2,
  Users, AlertTriangle, Wrench, Box, MoveRight,
  MapPin, Calendar, SlidersHorizontal, ClipboardCheck, Check, CircleCheck,
  Car, ParkingCircle,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import {
  canAdvanceRequestStep,
  defaultRequestDraft,
  formatDraftDateTime,
  hasValidDraftSchedule,
  itemDescriptionSchema,
  scheduledDateSchema,
  scheduledTimeSchema,
  getDraftVolumeLabel,
  toCreateRequestInput,
} from "@/lib/request-draft"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { asapBookingDescription } from "@/lib/display"
import { AddressStep } from "@/components/requests/new/address-step"
import { PhotoUploader } from "@/components/requests/new/photo-uploader"
import { RequestIntakeWorkspace } from "@/components/requests/new/request-intake-workspace"
import { CargUpLogo } from "@/components/cargup-logo"
import type { Draft, Step } from "@/components/requests/new/types"
import type { UploadedFile } from "@/lib/api"
import type { VolumeCategory } from "@/lib/types"
import { noContactInfo } from "../../../../../back/src/lib/content-safety"

export const Route = createFileRoute("/_app/requests/new")({
  component: NewRequestPage,
})

const VOLUMES: { value: VolumeCategory; label: string; sub: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "small", label: "Pequeño", sub: "Cajas, muebles sueltos", Icon: Package },
  { value: "medium", label: "Mediano", sub: "Pieza amoblada", Icon: Boxes },
  { value: "large", label: "Grande", sub: "Departamento", Icon: Truck },
  { value: "full_move", label: "Mudanza completa", sub: "Casa o más", Icon: Building2 },
]

const PARKING_OPTIONS: {
  value: Draft["parkingType"]
  label: string
  sub: string
  Icon: React.ComponentType<{ className?: string }>
}[] = [
  { value: "street", label: "Calle", sub: "Estacionamiento en la vía pública", Icon: Car },
  { value: "garage", label: "Garage / Estacionamiento", sub: "Acceso cubierto disponible", Icon: ParkingCircle },
  { value: "loading_dock", label: "Andén de carga", sub: "Zona de carga y descarga", Icon: Truck },
]

const CHARACTERISTICS: {
  key: "hasFragileItems" | "assemblyRequired" | "packingIncluded" | "longCarry"
  label: string
  sub: string
  Icon: React.ComponentType<{ className?: string }>
}[] = [
  { key: "hasFragileItems", label: "Artículos frágiles", sub: "Vidrios, electrónicos, obras de arte", Icon: AlertTriangle },
  { key: "assemblyRequired", label: "Requiere desarme / armado", sub: "Muebles que deben desmontarse", Icon: Wrench },
  { key: "packingIncluded", label: "Incluir embalaje", sub: "El transportista lleva materiales y empaca", Icon: Box },
  { key: "longCarry", label: "Acarreo largo", sub: "Más de 20 m entre la puerta y el camión", Icon: MoveRight },
]

const addressSchema = z.object({
  address: z.string().min(1),
  lat: z.number().min(-90).max(90).refine((value) => value !== 0),
  lng: z.number().min(-180).max(180).refine((value) => value !== 0),
})

const requestFormSchema = z.object({
  origin: addressSchema.nullable().refine((value) => !!value, "Selecciona una dirección de origen"),
  originFloor: z.string().refine((value) => !value || Number.isSafeInteger(Number(value)), "Indica un piso válido"),
  originHasElevator: z.boolean(),
  dest: addressSchema.nullable().refine((value) => !!value, "Selecciona una dirección de destino"),
  destFloor: z.string().refine((value) => !value || Number.isSafeInteger(Number(value)), "Indica un piso válido"),
  destHasElevator: z.boolean(),
  scheduleType: z.enum(["scheduled", "asap"]),
  scheduledDate: z.string(),
  scheduledTime: z.string(),
  flexibleDate: z.boolean(),
  volumeCategory: z.enum(["small", "medium", "large", "full_move"]).or(z.literal("")).refine((value) => value !== "", "Selecciona un volumen"),
  itemDescription: itemDescriptionSchema,
  notes: z.string().refine(noContactInfo.check, noContactInfo.message),
  photoUrls: z.array(z.string()),
  budgetMax: z.string().refine((value) => {
    const amount = Number(value.replace(/\D/g, ""))
    return !value || (Number.isSafeInteger(amount) && amount > 0)
  }, "Indica un presupuesto mayor a cero"),
  helpersNeeded: z.number().int().min(0).max(3),
  hasFragileItems: z.boolean(),
  assemblyRequired: z.boolean(),
  packingIncluded: z.boolean(),
  parkingType: z.enum(["street", "garage", "loading_dock"]),
  longCarry: z.boolean(),
}).refine(hasValidDraftSchedule, {
  path: ["scheduledTime"],
  message: "Selecciona una fecha y hora válidas en el futuro",
})

const STEP_META: { n: Step; label: string; sub: string }[] = [
  { n: 1, label: "Origen", sub: "¿Dónde retiramos?" },
  { n: 2, label: "Destino", sub: "¿Adónde lo llevas?" },
  { n: 3, label: "Cuándo", sub: "Fecha y hora" },
  { n: 4, label: "Qué", sub: "Lo que vas a mover" },
  { n: 5, label: "Detalles", sub: "Info extra para ofertar" },
  { n: 6, label: "Confirmar", sub: "Revisa y solicita" },
]

type RequestMode = "agent" | "manual"

function RequestMethodChoice({ onChoose }: { onChoose: (mode: RequestMode) => void }) {
  return (
    <div className="flex min-h-full flex-col bg-muted/30">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-10 md:py-16">
        <div className="mx-auto mb-8 max-w-xl text-center">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            ¿Cómo quieres solicitar tu flete?
          </h1>
          <p className="mt-3 text-pretty text-base text-muted-foreground">
            Elige cómo quieres contarnos lo que necesitas. Ambas opciones crean la misma solicitud.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="h-full transition-transform hover:-translate-y-0.5 hover:ring-primary/30">
            <CardHeader className="gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="size-5" />
              </div>
              <CardTitle className="text-lg">Con asistente</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Cuéntanos lo que necesitas en una conversación y completaremos el borrador contigo.
              </CardDescription>
            </CardHeader>
            <CardFooter className="mt-auto">
              <Button className="w-full" size="lg" onClick={() => onChoose("agent")}>
                Usar asistente
                <ArrowRight data-icon="inline-end" />
              </Button>
            </CardFooter>
          </Card>

          <Card className="h-full transition-transform hover:-translate-y-0.5 hover:ring-primary/30">
            <CardHeader className="gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-secondary text-foreground">
                <ClipboardCheck className="size-5" />
              </div>
              <CardTitle className="text-lg">Paso a paso</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Completa tú mismo los datos en un formulario guiado de seis pasos.
              </CardDescription>
            </CardHeader>
            <CardFooter className="mt-auto">
              <Button className="w-full" size="lg" variant="outline" onClick={() => onChoose("manual")}>
                Completar formulario
                <ArrowRight data-icon="inline-end" />
              </Button>
            </CardFooter>
          </Card>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Puedes cambiar de método después sin perder los datos ingresados.
        </p>
      </main>
    </div>
  )
}

const SECTION_ICONS: Record<Step, React.ComponentType<{ className?: string }>> = {
  1: MapPin, 2: MapPin, 3: Calendar, 4: Package, 5: SlidersHorizontal, 6: ClipboardCheck,
}

const SECTION_TITLES: Record<Step, { title: string; sub: string }> = {
  1: { title: "Origen", sub: "¿Dónde retiramos?" },
  2: { title: "Destino", sub: "¿Adónde lo llevas?" },
  3: { title: "Cuándo", sub: "Fecha y hora" },
  4: { title: "Qué", sub: "Lo que vas a mover" },
  5: { title: "Detalles", sub: "Info extra para ofertar" },
  6: { title: "Confirmar", sub: "Revisa y solicita" },
}

function previousStep(step: Step): Step {
  return step === 1 ? 1 : ((step - 1) as Step)
}

function nextStep(step: Step): Step {
  return step === 6 ? 6 : ((step + 1) as Step)
}

function isString(value: string | false): value is string {
  return typeof value === "string"
}

const HELPER_OPTIONS = [
  { n: 0, label: "Solo" },
  { n: 1, label: "+1" },
  { n: 2, label: "+2" },
  { n: 3, label: "+3" },
] as const

function SidebarStep({ n, label, sub, currentStep }: { n: Step; label: string; sub: string; currentStep: Step }) {
  const isDone = n < currentStep
  const isActive = n === currentStep
  return (
    <div className={cn(
      "flex items-center gap-[10px] rounded-[8px] px-[10px] py-[9px] transition-colors",
      isActive && "bg-primary/5",
    )}>
      <div className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors",
        isDone || isActive
          ? "bg-primary text-white"
          : "border-[1.5px] border-border text-muted-foreground",
      )}>
        {isDone ? <Check className="size-3" strokeWidth={3} /> : n}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className={cn(
          "text-[13px] font-semibold leading-none",
          isActive || isDone ? "text-foreground" : "text-muted-foreground",
        )}>
          {label}
        </span>
        <span className="text-[11px] leading-none text-muted-foreground">{sub}</span>
      </div>
    </div>
  )
}

function SectionHeader({ step }: { step: Step }) {
  const Icon = SECTION_ICONS[step]
  const { title, sub } = SECTION_TITLES[step]
  return (
    <div className="flex items-center gap-[14px]">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/8">
        <Icon className="size-5 text-primary" />
      </div>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[22px] font-bold tracking-[-0.3px] text-foreground">{title}</h2>
        <p className="text-[14px] text-muted-foreground">{sub}</p>
      </div>
    </div>
  )
}

function VolumeCard({ label, sub, Icon, active, onSelect }: {
  value: VolumeCategory; label: string; sub: string
  Icon: React.ComponentType<{ className?: string }>
  active: boolean; onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 rounded-[10px] border px-[18px] py-4 text-left transition-colors",
        active ? "border-2 border-primary bg-primary/5" : "border border-border bg-background",
      )}
    >
      <div className={cn(
        "flex size-[34px] shrink-0 items-center justify-center rounded-[8px]",
        active ? "bg-primary/10" : "bg-secondary",
      )}>
        <Icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground")} />
      </div>
      <div>
        <p className={cn("text-[14px] font-semibold", active ? "text-primary" : "text-foreground")}>{label}</p>
        <p className="text-[12px] text-muted-foreground">{sub}</p>
      </div>
    </button>
  )
}

function CharacteristicToggle({ value, onChange, label, sub, Icon }: {
  value: boolean; onChange: (v: boolean) => void
  label: string; sub: string
  Icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        "flex w-full items-center gap-[14px] rounded-[10px] px-4 py-[14px] text-left transition-colors",
        value
          ? "border-2 border-primary bg-primary/5"
          : "border border-border bg-background",
      )}
    >
      <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[8px] bg-secondary">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <p className="text-[14px] font-medium text-foreground">{label}</p>
        <p className="text-[12px] text-muted-foreground">{sub}</p>
      </div>
      <div className={cn(
        "size-5 shrink-0 rounded-full border-2 transition-colors",
        value ? "border-primary bg-primary" : "border-border",
      )} />
    </button>
  )
}

function NewRequestPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const sessionTokenRef = useRef<string | null>(null)
  if (sessionTokenRef.current === null) sessionTokenRef.current = crypto.randomUUID()
  const sessionToken = sessionTokenRef.current
  const today = new Date().toLocaleDateString("sv")

  const [step, setStep] = useState<Step>(1)
  const [mode, setMode] = useState<RequestMode | null>(null)
  const [photoUploads, setPhotoUploads] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [attempted, setAttempted] = useState(false)

  const mutation = useMutation({
    mutationFn: (draft: Draft) => api.requests.create(toCreateRequestInput(draft)),
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.requests.myAll })
      toast.success("Solicitud enviada", {
        description: "Los transportistas ya pueden verla y enviarte ofertas.",
        action: {
          label: "Mis fletes",
          onClick: () => navigate({ to: "/requests", search: { tab: "offers", page: 1 } }),
        },
      })
      navigate({ to: "/requests/$id", params: { id } })
    },
    onError: (error) => {
      toast.error("No se pudo enviar la solicitud", {
        description: error instanceof Error ? error.message : "Intenta de nuevo.",
      })
    },
  })

  const form = useForm({
    defaultValues: defaultRequestDraft,
    validators: { onSubmit: requestFormSchema },
    onSubmit: async ({ value }) => {
      if (!isUploading && !mutation.isPending) await mutation.mutateAsync(value)
    },
  })

  const draft = useStore(form.store, (state) => state.values)

  function applyDraftPatch(patch: Partial<Omit<Draft, "origin" | "dest" | "photoUrls">>) {
    if (patch.scheduleType !== undefined) form.setFieldValue("scheduleType", patch.scheduleType)
    if (patch.originFloor !== undefined) form.setFieldValue("originFloor", patch.originFloor)
    if (patch.originHasElevator !== undefined) form.setFieldValue("originHasElevator", patch.originHasElevator)
    if (patch.destFloor !== undefined) form.setFieldValue("destFloor", patch.destFloor)
    if (patch.destHasElevator !== undefined) form.setFieldValue("destHasElevator", patch.destHasElevator)
    if (patch.scheduledDate !== undefined) form.setFieldValue("scheduledDate", patch.scheduledDate)
    if (patch.scheduledTime !== undefined) form.setFieldValue("scheduledTime", patch.scheduledTime)
    if (patch.flexibleDate !== undefined) form.setFieldValue("flexibleDate", patch.flexibleDate)
    if (form.state.values.scheduleType === "asap") form.setFieldValue("flexibleDate", false)
    if (patch.volumeCategory !== undefined) form.setFieldValue("volumeCategory", patch.volumeCategory)
    if (patch.itemDescription !== undefined) form.setFieldValue("itemDescription", patch.itemDescription)
    if (patch.notes !== undefined) form.setFieldValue("notes", patch.notes)
    if (patch.budgetMax !== undefined) form.setFieldValue("budgetMax", patch.budgetMax)
    if (patch.helpersNeeded !== undefined) form.setFieldValue("helpersNeeded", patch.helpersNeeded)
    if (patch.hasFragileItems !== undefined) form.setFieldValue("hasFragileItems", patch.hasFragileItems)
    if (patch.assemblyRequired !== undefined) form.setFieldValue("assemblyRequired", patch.assemblyRequired)
    if (patch.packingIncluded !== undefined) form.setFieldValue("packingIncluded", patch.packingIncluded)
    if (patch.parkingType !== undefined) form.setFieldValue("parkingType", patch.parkingType)
    if (patch.longCarry !== undefined) form.setFieldValue("longCarry", patch.longCarry)
  }

  function addPhotoUploads(files: UploadedFile[]) {
    setPhotoUploads((current) => [...current, ...files])
  }

  function removePhotoUpload(url: string) {
    setPhotoUploads((current) => current.filter((file) => file.url !== url))
  }

  function setCharacteristic(key: (typeof CHARACTERISTICS)[number]["key"], value: boolean) {
    if (key === "hasFragileItems") return form.setFieldValue("hasFragileItems", value)
    if (key === "assemblyRequired") return form.setFieldValue("assemblyRequired", value)
    if (key === "packingIncluded") return form.setFieldValue("packingIncluded", value)
    return form.setFieldValue("longCarry", value)
  }

  function canNext(): boolean {
    return canAdvanceRequestStep(draft, step)
  }

  function goBack() {
    setAttempted(false)
    setStep(previousStep)
  }

  function goToStep(s: Step) {
    setAttempted(false)
    setStep(s)
  }

  function goNext() {
    if (step === 4) void form.validateField("itemDescription", "blur")
    if (!canNext()) {
      setAttempted(true)
      return
    }
    setAttempted(false)
    setStep(nextStep)
  }

  const volumeLabel = getDraftVolumeLabel(draft)
  const dateTimeDisplay = formatDraftDateTime(draft)
  const StepIcon = SECTION_ICONS[step]
  const stepMeta = SECTION_TITLES[step]
  const mutationError = mutation.error instanceof Error ? mutation.error.message : null
  const submit = () => form.handleSubmit()
  const ready = requestFormSchema.safeParse(draft).success

  const cargoFields = (
    <FieldGroup>
      <form.Field name="volumeCategory" validators={{ onBlur: requestFormSchema.shape.volumeCategory }}>
        {(field) => (
          <Field data-invalid={field.state.meta.errors.length > 0}>
            <FieldLabel id="intake-volume-label">Volumen estimado</FieldLabel>
            <ToggleGroup type="single" variant="outline" value={field.state.value}
              onBlur={field.handleBlur} onValueChange={(value) => {
                const volume = VOLUMES.find((option) => option.value === value)
                if (volume) field.handleChange(volume.value)
              }} aria-labelledby="intake-volume-label" className="grid w-full grid-cols-2 gap-2">
              {VOLUMES.map(({ value, label }) => <ToggleGroupItem key={value} value={value} className="h-auto min-h-11 whitespace-normal">{label}</ToggleGroupItem>)}
            </ToggleGroup>
            <FieldError errors={field.state.meta.errors} />
          </Field>
        )}
      </form.Field>
      <form.Field name="itemDescription" validators={{ onBlur: itemDescriptionSchema }}>
        {(field) => (
          <Field data-invalid={field.state.meta.errors.length > 0}>
            <FieldLabel htmlFor="intake-description">¿Qué vas a mover?</FieldLabel>
            <Input id="intake-description" value={field.state.value} onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)} aria-invalid={field.state.meta.errors.length > 0} />
            <FieldDescription>No incluyas teléfono, correo ni redes sociales.</FieldDescription>
            <FieldError errors={field.state.meta.errors} />
          </Field>
        )}
      </form.Field>
    </FieldGroup>
  )

  const scheduleFields = (
    <FieldGroup>
      <form.Field name="scheduleType" validators={{ onBlur: requestFormSchema.shape.scheduleType }}>
        {(field) => (
          <Field>
            <FieldLabel id="schedule-type-label">¿Cuándo necesitas el flete?</FieldLabel>
            <ToggleGroup
              type="single"
              variant="outline"
              value={field.state.value}
              onBlur={field.handleBlur}
              onValueChange={(value) => {
                if (value === "asap" || value === "scheduled") {
                  applyDraftPatch({ scheduleType: value })
                  setAttempted(false)
                }
              }}
              aria-labelledby="schedule-type-label"
              className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2"
            >
              <ToggleGroupItem value="asap" className="min-h-11">Lo antes posible</ToggleGroupItem>
              <ToggleGroupItem value="scheduled" className="min-h-11">Elegir fecha y hora</ToggleGroupItem>
            </ToggleGroup>
            {draft.scheduleType === "asap" && <FieldDescription>{asapBookingDescription}</FieldDescription>}
            <FieldError errors={field.state.meta.errors} />
          </Field>
        )}
      </form.Field>
      {draft.scheduleType === "scheduled" && <>
        <form.Field name="scheduledDate" validators={{ onBlur: scheduledDateSchema }}>
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <FieldLabel htmlFor={field.name}>Fecha</FieldLabel>
              <Input id={field.name} type="date" min={today} value={field.state.value}
                onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={field.state.meta.errors.length > 0} />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <form.Field name="scheduledTime" validators={{ onBlur: scheduledTimeSchema }}>
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <FieldLabel htmlFor={field.name}>Hora preferida</FieldLabel>
              <Input id={field.name} type="time" step={60} value={field.state.value}
                onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={field.state.meta.errors.length > 0} />
              <FieldDescription>Puedes elegir cualquier hora del día o de la noche.</FieldDescription>
              <FieldError errors={field.state.meta.errors} />
              {(attempted || (draft.scheduledDate && draft.scheduledTime)) && !hasValidDraftSchedule(draft) && <FieldError>Selecciona una fecha y hora válidas en el futuro</FieldError>}
            </Field>
          )}
        </form.Field>
        <form.Field name="flexibleDate" validators={{ onBlur: requestFormSchema.shape.flexibleDate }}>
          {(field) => (
            <Field orientation="horizontal">
              <Switch id={field.name} checked={field.state.value} onCheckedChange={field.handleChange} onBlur={field.handleBlur} />
              <div>
                <FieldLabel htmlFor={field.name}>Fecha flexible</FieldLabel>
                <FieldDescription>El transportista puede sugerir otro horario.</FieldDescription>
              </div>
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
      </>}
    </FieldGroup>
  )

  if (mode === null) return <RequestMethodChoice onChoose={setMode} />

  return (
    <>
      <div className={mode === "agent" ? "contents" : "hidden"}>
        <RequestIntakeWorkspace
          draft={draft}
          sessionToken={sessionToken}
          photoKeys={photoUploads.slice(0, 4).map(({ key }) => key)}
          ready={ready}
          isPublishing={mutation.isPending}
          publishError={mutationError}
          onPatch={applyDraftPatch}
          onOriginChange={(address) => form.setFieldValue("origin", address)}
          onDestChange={(address) => form.setFieldValue("dest", address)}
          onPhotosChange={(urls) => form.setFieldValue("photoUrls", urls)}
          onPhotosUploaded={addPhotoUploads}
          onPhotoRemoved={removePhotoUpload}
          onManual={() => setMode("manual")}
          onPublish={submit}
          scheduleFields={mode === "agent" ? scheduleFields : null}
          cargoFields={mode === "agent" ? cargoFields : null}
          isUploading={isUploading}
          onUploadingChange={setIsUploading}
        />
      </div>

      {mode === "manual" && <div className="flex min-h-full flex-col md:flex-row">
      {/* Mobile: wizard nav bar */}
      <div className="sticky top-0 z-10 flex h-14 items-center border-b border-border bg-background px-[18px] md:hidden">
        <div className="flex w-14 items-center">
          {step > 1 ? (
            <button type="button" onClick={goBack} className="text-muted-foreground">
              <ArrowLeft className="size-5" />
            </button>
          ) : (
            <CargUpLogo size="sm" />
          )}
        </div>
        <span className="flex-1 text-center text-[13px] text-muted-foreground">Paso {step} de 6</span>
        <div className="flex w-14 justify-end">
          <Link to="/requests" className="text-[13px] text-muted-foreground">Cancelar</Link>
        </div>
      </div>

      {/* Mobile: 6-segment progress bar */}
      <div className="flex gap-[2px] md:hidden">
        {Array.from({ length: 6 }, (_, i) => i + 1).map((n) => (
          <div key={n} className={cn("h-1 flex-1", n <= step ? "bg-primary" : "bg-secondary")} />
        ))}
      </div>

      {/* Desktop: Step Sidebar */}
      <aside className="hidden w-[260px] shrink-0 flex-col justify-between border-r border-border bg-background md:flex">
        <div className="flex flex-col gap-0.5 p-5">
          {STEP_META.map(({ n, label, sub }) => (
            <SidebarStep key={n} n={n} label={label} sub={sub} currentStep={step} />
          ))}
        </div>
        <div className="m-5 flex flex-col gap-2 rounded-[10px] border border-border bg-card p-4">
          <p className="text-[13px] font-semibold text-foreground">Tiempo estimado</p>
          <p className="text-[12px] text-muted-foreground">~3 minutos para completar</p>
          <div className="relative h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all"
              style={{ width: `${((step - 1) / 5) * 100}%` }}
            />
          </div>
          <p className="text-[12px] text-muted-foreground">Paso {step} de 6</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Desktop: Page Header */}
        <div className="hidden items-center justify-between gap-4 border-b border-border bg-background px-11 py-3 md:flex">
          <div>
            <h1 className="text-2xl font-bold tracking-[-0.5px] text-foreground">Nueva solicitud</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Completa los pasos y recibe ofertas de transportistas.
            </p>
          </div>
          <Button type="button" variant="outline" className="min-h-10" onClick={() => setMode("agent")}>
            <Sparkles data-icon="inline-start" /> Usar asistente
          </Button>
        </div>

        {/* Mobile: step header */}
        <div className="flex items-center gap-3 px-[18px] pb-2 pt-5 md:hidden">
          <div className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-primary/8">
            <StepIcon className="size-[18px] text-primary" />
          </div>
          <div>
            <h2 className="text-[20px] font-bold tracking-[-0.3px] text-foreground">{stepMeta.title}</h2>
            <p className="text-[13px] text-muted-foreground">{stepMeta.sub}</p>
          </div>
        </div>

        <Button type="button" variant="outline" className="mx-[18px] min-h-10 md:hidden" onClick={() => setMode("agent")}>
          <Sparkles data-icon="inline-start" /> Volver al asistente
        </Button>

        {/* Step Content */}
        <div className="flex flex-col gap-4 px-[18px] py-3 md:gap-5 md:px-11 md:py-7">
          {/* Desktop: section header */}
          <div className="hidden md:block">
            <SectionHeader step={step} />
          </div>

          {/* Form Card */}
          <div className="md:rounded-xl md:border md:border-border md:bg-white md:px-7 md:py-6 md:shadow-[0_2px_8px_rgba(0,0,0,0.031)]">
            {step === 1 && (
              <AddressStep
                value={draft.origin}
                onChange={(r) => form.setFieldValue("origin", r)}
                floor={draft.originFloor}
                onFloor={(v) => form.setFieldValue("originFloor", v)}
                elevator={draft.originHasElevator}
                onElevator={(v) => form.setFieldValue("originHasElevator", v)}
                sessionToken={sessionToken}
                attempted={attempted}
              />
            )}

            {step === 2 && (
              <AddressStep
                value={draft.dest}
                onChange={(r) => form.setFieldValue("dest", r)}
                floor={draft.destFloor}
                onFloor={(v) => form.setFieldValue("destFloor", v)}
                elevator={draft.destHasElevator}
                onElevator={(v) => form.setFieldValue("destHasElevator", v)}
                sessionToken={sessionToken}
                attempted={attempted}
              />
            )}

            {step === 3 && scheduleFields}

            {step === 4 && (
              <FieldGroup>
                <Field data-invalid={attempted && !draft.volumeCategory}>
                  <FieldLabel className="text-[14px] font-semibold">Volumen estimado</FieldLabel>
                  <div className="grid grid-cols-2 gap-3">
                    {VOLUMES.map(({ value, label, sub, Icon }) => (
                      <VolumeCard
                        key={value}
                        value={value}
                        label={label}
                        sub={sub}
                        Icon={Icon}
                        active={draft.volumeCategory === value}
                        onSelect={() => form.setFieldValue("volumeCategory", value)}
                      />
                    ))}
                  </div>
                  {attempted && !draft.volumeCategory && <FieldError>Selecciona un volumen</FieldError>}
                </Field>

                <form.Field name="itemDescription" validators={{ onBlur: itemDescriptionSchema }}>
                  {(field) => (
                    <Field data-invalid={field.state.meta.errors.length > 0}>
                      <FieldLabel htmlFor={field.name} className="text-[14px] font-semibold">¿Qué vas a mover?</FieldLabel>
                      <Textarea
                        id={field.name}
                        rows={4}
                        placeholder="Ej: 2 camas, 1 sofá y cajas de ropa. Incluye detalles como artículos frágiles o embalaje especial."
                        value={field.state.value}
                        aria-invalid={field.state.meta.errors.length > 0}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      <FieldDescription>Describe todo en un solo lugar. No incluyas teléfono, correo ni redes sociales.</FieldDescription>
                      <FieldError errors={field.state.meta.errors} />
                    </Field>
                  )}
                </form.Field>

                <div className="rounded-[10px] border border-primary/20 bg-primary/5 p-3">
                  <p className="text-[13px] font-medium text-foreground">Las fotos son opcionales, pero ayudan bastante.</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Con fotos, los transportistas suelen ofertar con menos preguntas y con precios más ajustados.
                  </p>
                </div>

                <PhotoUploader
                  urls={draft.photoUrls}
                  onChange={(urls) => form.setFieldValue("photoUrls", urls)}
                  onUploaded={addPhotoUploads}
                  onRemoved={removePhotoUpload}
                  disabled={mutation.isPending}
                  onUploadingChange={setIsUploading}
                />
              </FieldGroup>
            )}

            {step === 5 && (
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between gap-3 rounded-[8px] bg-secondary px-[14px] py-3">
                  <p className="text-[13px] text-muted-foreground">
                    Estos datos ayudan a los transportistas a ofertar con más precisión. Todos son opcionales.
                  </p>
                  <button
                    type="button"
                    onClick={() => goToStep(6)}
                    className="shrink-0 text-[13px] font-semibold text-primary transition-opacity hover:opacity-80"
                  >
                    Omitir
                  </button>
                </div>

                {/* Helpers */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[14px] font-semibold text-foreground">¿Cuántos ayudantes necesitas?</span>
                  <div className="flex gap-[10px]">
                    {HELPER_OPTIONS.map(({ n, label }) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => form.setFieldValue("helpersNeeded", n)}
                        className={cn(
                          "flex flex-1 flex-col items-center gap-1.5 rounded-[10px] py-[14px] px-3 transition-colors",
                          draft.helpersNeeded === n
                            ? "border-2 border-primary bg-primary/5"
                            : "border border-border bg-background",
                        )}
                      >
                        <Users className={cn("size-4", draft.helpersNeeded === n ? "text-primary" : "text-muted-foreground")} />
                        <span className={cn(
                          "text-[13px] font-semibold",
                          draft.helpersNeeded === n ? "text-primary" : "text-foreground",
                        )}>
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[12px] text-muted-foreground">Además del transportista.</p>
                </div>

                {/* Special characteristics */}
                <div className="flex flex-col gap-2">
                  <span className="text-[14px] font-semibold text-foreground">Características especiales</span>
                  {CHARACTERISTICS.map(({ key, label, sub, Icon }) => (
                    <CharacteristicToggle
                      key={key}
                      value={draft[key]}
                      onChange={(v) => setCharacteristic(key, v)}
                      label={label}
                      sub={sub}
                      Icon={Icon}
                    />
                  ))}
                </div>

                {/* Parking */}
                <div className="flex flex-col gap-2">
                  <span className="text-[14px] font-semibold text-foreground">Tipo de estacionamiento en origen</span>
                  {PARKING_OPTIONS.map(({ value, label, sub, Icon }) => {
                    const active = draft.parkingType === value
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => form.setFieldValue("parkingType", value)}
                        className={cn(
                          "flex w-full items-center gap-[14px] rounded-[10px] px-4 py-[14px] text-left transition-colors",
                          active
                            ? "border-2 border-primary bg-primary/5"
                            : "border border-border bg-background",
                        )}
                      >
                        <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[8px] bg-secondary">
                          <Icon className="size-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[14px] font-medium text-foreground">{label}</p>
                          <p className="text-[12px] text-muted-foreground">{sub}</p>
                        </div>
                        <div className={cn(
                          "size-5 shrink-0 rounded-full border-2 transition-colors",
                          active ? "border-primary bg-primary" : "border-border",
                        )}>
                          {active && <div className="m-auto mt-[3px] size-[10px] rounded-full bg-white" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="flex flex-col gap-4">
                {/* Banner */}
                <div className="flex items-center gap-[10px] rounded-[8px] bg-primary/5 px-4 py-3">
                  <CircleCheck className="size-[18px] shrink-0 text-primary" />
                  <p className="text-[14px] font-medium text-primary">
                    Todo listo. Revisa los detalles y envía tu solicitud.
                  </p>
                </div>

                {/* Summary grid */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Route card */}
                  <div className="flex flex-col gap-3 rounded-[10px] border border-border p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ruta</span>
                      <button type="button" onClick={() => goToStep(1)} className="text-[12px] font-medium text-primary">
                        Editar
                      </button>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start gap-2">
                        <div className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                        <span className="text-[13px] text-foreground leading-tight">{draft.origin?.address ?? "—"}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="mt-1.5 size-2 shrink-0 rounded-full bg-muted-foreground" />
                        <span className="text-[13px] text-foreground leading-tight">{draft.dest?.address ?? "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="flex flex-col gap-3">
                    {/* Date/time */}
                    <div className="flex flex-col gap-1.5 rounded-[10px] border border-border p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fecha y hora</span>
                        <button type="button" onClick={() => goToStep(3)} className="text-[12px] font-medium text-primary">
                          Editar
                        </button>
                      </div>
                      <p className="text-[13px] text-foreground">{dateTimeDisplay}</p>
                      {draft.scheduleType === "asap" && <p className="text-[12px] text-muted-foreground">{asapBookingDescription}</p>}
                      {draft.scheduleType === "scheduled" && draft.flexibleDate && (
                        <p className="text-[12px] text-muted-foreground">Fecha flexible</p>
                      )}
                    </div>

                    {/* Cargo */}
                    <div className="flex flex-col gap-1.5 rounded-[10px] border border-border p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Carga</span>
                        <button type="button" onClick={() => goToStep(4)} className="text-[12px] font-medium text-primary">
                          Editar
                        </button>
                      </div>
                      <p className="text-[13px] font-medium text-foreground">{volumeLabel || "—"}</p>
                      <p className="text-[12px] text-muted-foreground">{draft.itemDescription || "—"}</p>
                    </div>

                    {/* Extras */}
                    <div className="flex flex-col gap-1.5 rounded-[10px] border border-border p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Detalles</span>
                        <button type="button" onClick={() => goToStep(5)} className="text-[12px] font-medium text-primary">
                          Editar
                        </button>
                      </div>
                      <p className="text-[13px] text-foreground">
                        {draft.helpersNeeded === 0
                          ? "Solo transportista"
                          : `+${draft.helpersNeeded} ayudante${draft.helpersNeeded > 1 ? "s" : ""}`}
                      </p>
                      {draft.budgetMax && (
                        <p className="text-[12px] text-muted-foreground">Máx. ${draft.budgetMax}</p>
                      )}
                      {([
                        draft.hasFragileItems && "Artículos frágiles",
                        draft.assemblyRequired && "Desarme/armado",
                        draft.packingIncluded && "Embalaje",
                        draft.longCarry && "Acarreo largo",
                      ] as (string | false)[]).filter(isString).map((f) => (
                        <span key={f} className="text-[12px] text-muted-foreground">• {f}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {mutationError && (
                  <p className="animate-in fade-in slide-in-from-top-1 rounded-[8px] bg-red-50 px-3 py-2.5 text-[13px] text-red-600">
                    {mutationError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Desktop: Nav Buttons */}
          <div className="hidden items-center justify-between md:flex">
            {step > 1 ? (
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-1.5 text-[14px] font-medium text-foreground transition-colors hover:text-foreground/60"
              >
                <ArrowLeft className="size-[15px]" />
                Atrás
              </button>
            ) : (
              <div />
            )}

            {step < 6 ? (
              <button
                type="button"
                onClick={goNext}
                className="flex items-center gap-1.5 rounded-[9px] bg-primary px-[22px] py-[11px] text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Siguiente <ArrowRight className="size-[15px]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={mutation.isPending || isUploading}
                className="flex items-center gap-1.5 rounded-[9px] bg-primary px-[22px] py-[11px] text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {mutation.isPending ? (
                  <><Loader2 className="size-4 animate-spin" /> Enviando…</>
                ) : (
                  <>Solicitar flete <CircleCheck className="size-[15px]" /></>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: sticky bottom CTA */}
      <div className="sticky bottom-0 border-t border-border bg-background px-[18px] pb-6 pt-4 md:hidden">
        {step < 6 ? (
          <button
            type="button"
            onClick={goNext}
            className="w-full rounded-[9px] bg-primary py-[13px] text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Siguiente →
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={mutation.isPending || isUploading}
            className="flex w-full items-center justify-center gap-2 rounded-[9px] bg-primary py-[13px] text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {mutation.isPending ? (
              <><Loader2 className="size-4 animate-spin" /> Enviando…</>
            ) : (
              <>Solicitar flete <CircleCheck className="size-[15px]" /></>
            )}
          </button>
        )}
      </div>
      </div>}
    </>
  )
}
