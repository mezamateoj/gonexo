import { createFileRoute, useNavigate, Link } from "@tanstack/react-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, useStore } from "@tanstack/react-form"
import { useState, useRef, useMemo } from "react"
import { z } from "zod"
import {
  Package, Boxes, Truck, Building2,
  ArrowRight, ArrowLeft, Loader2,
  Users, AlertTriangle, Wrench, Box, MoveRight, CalendarDays,
  MapPin, Calendar, SlidersHorizontal, ClipboardCheck, Check, CircleCheck,
  Car, ParkingCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import {
  canAdvanceRequestStep,
  defaultRequestDraft,
  formatDraftDate,
  formatDraftDateTime,
  getDraftVolumeLabel,
  toCreateRequestInput,
} from "@/lib/request-draft"
import { Input } from "@/components/ui/input"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Calendar as CalendarUI } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AddressStep } from "@/components/requests/new/address-step"
import { PhotoUploader } from "@/components/requests/new/photo-uploader"
import { GonexoLogo } from "@/components/gonexo-logo"
import type { Draft, Step } from "@/components/requests/new/types"
import type { VolumeCategory } from "@/lib/types"

export const Route = createFileRoute("/_app/requests/new")({
  component: NewRequestPage,
})

const VOLUMES: { value: VolumeCategory; label: string; sub: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "small", label: "Pequeño", sub: "Cajas, muebles sueltos", Icon: Package },
  { value: "medium", label: "Mediano", sub: "Pieza amoblada", Icon: Boxes },
  { value: "large", label: "Grande", sub: "Departamento", Icon: Truck },
  { value: "full_move", label: "Mudanza completa", sub: "Casa o más", Icon: Building2 },
]

const TIME_SLOTS = [
  ["09:00", "09:30", "10:00", "11:00"],
  ["12:00", "13:00", "14:00", "15:00"],
  ["16:00", "17:00", "18:00", "19:00"],
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
  originFloor: z.string(),
  originHasElevator: z.boolean(),
  dest: addressSchema.nullable().refine((value) => !!value, "Selecciona una dirección de destino"),
  destFloor: z.string(),
  destHasElevator: z.boolean(),
  scheduledDate: z.string().min(1, "Selecciona una fecha"),
  scheduledTime: z.string().min(1, "Selecciona una hora"),
  flexibleDate: z.boolean(),
  volumeCategory: z.enum(["small", "medium", "large", "full_move"]).or(z.literal("")).refine((value) => value !== "", "Selecciona un volumen"),
  itemDescription: z.string().min(5, "Describe qué vas a mover"),
  notes: z.string(),
  photoUrls: z.array(z.string()),
  budgetMax: z.string(),
  helpersNeeded: z.number().int().min(0).max(3),
  hasFragileItems: z.boolean(),
  assemblyRequired: z.boolean(),
  packingIncluded: z.boolean(),
  parkingType: z.enum(["street", "garage", "loading_dock"]),
  longCarry: z.boolean(),
})

const STEP_META: { n: Step; label: string; sub: string }[] = [
  { n: 1, label: "Origen", sub: "¿Dónde retiramos?" },
  { n: 2, label: "Destino", sub: "¿Adónde lo llevas?" },
  { n: 3, label: "Cuándo", sub: "Fecha y hora" },
  { n: 4, label: "Qué", sub: "Lo que vas a mover" },
  { n: 5, label: "Detalles", sub: "Info extra para cotizar" },
  { n: 6, label: "Confirmar", sub: "Revisa y publica" },
]

const SECTION_ICONS: Record<Step, React.ComponentType<{ className?: string }>> = {
  1: MapPin, 2: MapPin, 3: Calendar, 4: Package, 5: SlidersHorizontal, 6: ClipboardCheck,
}

const SECTION_TITLES: Record<Step, { title: string; sub: string }> = {
  1: { title: "Origen", sub: "¿Dónde retiramos?" },
  2: { title: "Destino", sub: "¿Adónde lo llevas?" },
  3: { title: "Cuándo", sub: "Fecha y hora" },
  4: { title: "Qué", sub: "Lo que vas a mover" },
  5: { title: "Detalles", sub: "Info extra para cotizar" },
  6: { title: "Confirmar", sub: "Revisa y publica" },
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
      isActive && "bg-[#0c8c5e0d]",
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
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#0c8c5e14]">
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
        active ? "border-2 border-primary bg-[#0c8c5e0d]" : "border border-border bg-background",
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
          ? "border-2 border-primary bg-[#0c8c5e0d]"
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
  const today = useMemo(() => new Date().toISOString().split("T")[0], [])

  const [step, setStep] = useState<Step>(1)
  const [attempted, setAttempted] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)

  const mutation = useMutation({
    mutationFn: (draft: Draft) => api.requests.create(toCreateRequestInput(draft)),
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.requests.my })
      navigate({ to: "/requests/$id", params: { id } })
    },
  })

  const form = useForm({
    defaultValues: defaultRequestDraft,
    validators: { onSubmit: requestFormSchema },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value)
    },
  })

  const draft = useStore(form.store, (state) => state.values)

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
    if (!canNext()) {
      setAttempted(true)
      return
    }
    setAttempted(false)
    setStep(nextStep)
  }

  const volumeLabel = getDraftVolumeLabel(draft)
  const dateDisplay = formatDraftDate(draft)
  const dateTimeDisplay = formatDraftDateTime(draft)
  const StepIcon = SECTION_ICONS[step]
  const stepMeta = SECTION_TITLES[step]
  const mutationError = mutation.error instanceof Error ? mutation.error.message : null
  const submit = () => form.handleSubmit()

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      {/* Mobile: wizard nav bar */}
      <div className="sticky top-0 z-10 flex h-14 items-center border-b border-border bg-background px-[18px] md:hidden">
        <div className="flex w-14 items-center">
          {step > 1 ? (
            <button type="button" onClick={goBack} className="text-muted-foreground">
              <ArrowLeft className="size-5" />
            </button>
          ) : (
            <GonexoLogo size="sm" />
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
        <div className="hidden border-b border-border bg-background px-8 py-[22px] md:block">
          <h1 className="text-[26px] font-bold tracking-[-0.5px] text-foreground">Nueva solicitud</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Completa los pasos y recibe cotizaciones de transportistas.
          </p>
        </div>

        {/* Mobile: step header */}
        <div className="flex items-center gap-3 px-[18px] pb-2 pt-5 md:hidden">
          <div className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-[#0c8c5e14]">
            <StepIcon className="size-[18px] text-primary" />
          </div>
          <div>
            <h2 className="text-[20px] font-bold tracking-[-0.3px] text-foreground">{stepMeta.title}</h2>
            <p className="text-[13px] text-muted-foreground">{stepMeta.sub}</p>
          </div>
        </div>

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

            {step === 3 && (
              <FieldGroup>
                {/* Date picker */}
                <Field data-invalid={attempted && !draft.scheduledDate}>
                  <FieldLabel className="text-[14px] font-semibold">Fecha</FieldLabel>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        aria-invalid={attempted && !draft.scheduledDate}
                        className={cn(
                          "flex h-10 w-full items-center justify-between gap-2 rounded-[8px] border border-border bg-white px-[14px] text-left text-[14px] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 aria-invalid:border-destructive",
                          draft.scheduledDate ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        <span>{dateDisplay}</span>
                        <CalendarDays className="size-[15px] shrink-0 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarUI
                        mode="single"
                        selected={draft.scheduledDate ? new Date(draft.scheduledDate + "T00:00:00") : undefined}
                        onSelect={(date) => {
                          if (date) {
                            form.setFieldValue("scheduledDate", date.toLocaleDateString("sv"))
                            setCalendarOpen(false)
                          }
                        }}
                        disabled={(date) => date < new Date(today + "T00:00:00")}
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {attempted && !draft.scheduledDate && <FieldError>Selecciona una fecha</FieldError>}
                </Field>

                {/* Time slot grid */}
                <Field data-invalid={attempted && !draft.scheduledTime}>
                  <FieldLabel className="text-[14px] font-semibold">Hora preferida</FieldLabel>
                  <div className="flex flex-col gap-2">
                    {TIME_SLOTS.map((row, ri) => (
                      <div key={ri} className="grid grid-cols-4 gap-2">
                        {row.map((time) => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => form.setFieldValue("scheduledTime", time)}
                            className={cn(
                              "rounded-[8px] border py-2.5 text-[13px] font-medium transition-colors",
                              draft.scheduledTime === time
                                ? "border-primary bg-primary text-white"
                                : "border-border bg-white text-foreground hover:border-primary/50 hover:bg-primary/5",
                            )}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                  {attempted && !draft.scheduledTime && <FieldError>Selecciona una hora</FieldError>}
                </Field>

                {/* Flexible date */}
                <button
                  type="button"
                  onClick={() => form.setFieldValue("flexibleDate", !draft.flexibleDate)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[8px] border px-4 py-3 text-left transition-colors",
                    draft.flexibleDate ? "border-primary bg-[#0c8c5e0d]" : "border-border bg-card",
                  )}
                >
                  <div className={cn(
                    "flex size-[18px] shrink-0 items-center justify-center rounded-[4px] border-[1.5px] transition-colors",
                    draft.flexibleDate ? "border-primary bg-primary" : "border-border bg-white",
                  )}>
                    {draft.flexibleDate && <Check className="size-3 text-white" strokeWidth={3} />}
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-foreground">Fecha flexible</p>
                    <p className="text-[12px] text-muted-foreground">El transportista puede sugerir otro horario</p>
                  </div>
                </button>
              </FieldGroup>
            )}

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

                <Field data-invalid={attempted && draft.itemDescription.length < 5}>
                  <FieldLabel className="text-[14px] font-semibold">¿Qué vas a mover?</FieldLabel>
                  <Input
                    placeholder="Ej: 2 camas, 1 sofá, cajas de ropa…"
                    value={draft.itemDescription}
                    aria-invalid={attempted && draft.itemDescription.length < 5}
                    onChange={(e) => form.setFieldValue("itemDescription", e.target.value)}
                  />
                  {attempted && draft.itemDescription.length < 5 && (
                    <FieldError>Describe qué vas a mover (mínimo 5 caracteres)</FieldError>
                  )}
                </Field>

                <Field>
                  <FieldLabel className="text-[14px] font-semibold">
                    Notas adicionales{" "}
                    <span className="font-normal text-muted-foreground">(opcional)</span>
                  </FieldLabel>
                  <textarea
                    className="w-full resize-none rounded-[8px] border border-border bg-white px-[14px] py-[11px] text-[14px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    rows={3}
                    placeholder="Frágil, requiere embalaje especial…"
                    value={draft.notes}
                    onChange={(e) => form.setFieldValue("notes", e.target.value)}
                  />
                </Field>

                <div className="rounded-[10px] border border-primary/20 bg-primary/5 p-3">
                  <p className="text-[13px] font-medium text-foreground">Las fotos son opcionales, pero ayudan bastante.</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Con fotos, los transportistas suelen cotizar con menos preguntas y con precios más ajustados.
                  </p>
                </div>

                <PhotoUploader urls={draft.photoUrls} onChange={(u) => form.setFieldValue("photoUrls", u)} />
              </FieldGroup>
            )}

            {step === 5 && (
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between gap-3 rounded-[8px] bg-secondary px-[14px] py-3">
                  <p className="text-[13px] text-muted-foreground">
                    Estos datos ayudan a los transportistas a cotizar con más precisión. Todos son opcionales.
                  </p>
                  <button
                    type="button"
                    onClick={() => goToStep(6)}
                    className="shrink-0 text-[13px] font-semibold text-primary transition-opacity hover:opacity-80"
                  >
                    Omitir
                  </button>
                </div>

                {/* Budget */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[14px] font-semibold text-foreground">Presupuesto máximo</span>
                    <span className="text-[13px] text-muted-foreground">(opcional)</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[14px] text-muted-foreground">$</span>
                    <Input
                      className="pl-7"
                      placeholder="50.000"
                      value={draft.budgetMax}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "")
                        form.setFieldValue("budgetMax", raw ? parseInt(raw).toLocaleString("es-CL") : "")
                      }}
                    />
                  </div>
                  <p className="text-[12px] text-muted-foreground">Los transportistas ven este monto y ajustan su oferta.</p>
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
                            ? "border-2 border-primary bg-[#0c8c5e0d]"
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
                            ? "border-2 border-primary bg-[#0c8c5e0d]"
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
                <div className="flex items-center gap-[10px] rounded-[8px] bg-[#0c8c5e0d] px-4 py-3">
                  <CircleCheck className="size-[18px] shrink-0 text-primary" />
                  <p className="text-[14px] font-medium text-primary">
                    Todo listo. Revisa los detalles y publica tu solicitud.
                  </p>
                </div>

                {/* Summary grid */}
                <div className="grid grid-cols-2 gap-3">
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
                      {draft.flexibleDate && (
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
                  <p className="text-[13px] text-destructive">{mutationError}</p>
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
                disabled={mutation.isPending}
                className="flex items-center gap-1.5 rounded-[9px] bg-primary px-[22px] py-[11px] text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {mutation.isPending ? (
                  <><Loader2 className="size-4 animate-spin" /> Publicando…</>
                ) : (
                  <>Publicar solicitud <CircleCheck className="size-[15px]" /></>
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
            disabled={mutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-[9px] bg-primary py-[13px] text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {mutation.isPending ? (
              <><Loader2 className="size-4 animate-spin" /> Publicando…</>
            ) : (
              <>Publicar solicitud <CircleCheck className="size-[15px]" /></>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
