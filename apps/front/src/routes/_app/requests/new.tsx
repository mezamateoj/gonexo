import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useRef, useMemo } from "react"
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
import { Input } from "@/components/ui/input"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Calendar as CalendarUI } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AddressStep } from "@/components/requests/new/address-step"
import { PhotoUploader } from "@/components/requests/new/photo-uploader"
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

function VolumeCard({ value, label, sub, Icon, active, onSelect }: {
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
  const [draft, setDraft] = useState<Draft>({
    origin: null,
    originFloor: "",
    originHasElevator: false,
    dest: null,
    destFloor: "",
    destHasElevator: false,
    scheduledDate: "",
    scheduledTime: "",
    flexibleDate: false,
    volumeCategory: "",
    itemDescription: "",
    notes: "",
    photoUrls: [],
    budgetMax: "",
    helpersNeeded: 0,
    hasFragileItems: false,
    assemblyRequired: false,
    packingIncluded: false,
    parkingType: "street",
    longCarry: false,
  })

  function set<K extends keyof Draft>(key: K, val: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: val }))
  }

  function canNext(): boolean {
    if (step === 1) return !!draft.origin
    if (step === 2) return !!draft.dest
    if (step === 3) return !!draft.scheduledDate && !!draft.scheduledTime
    if (step === 4) return !!draft.volumeCategory && draft.itemDescription.length >= 5
    return true
  }

  function goBack() {
    setAttempted(false)
    setStep((s) => (s - 1) as Step)
  }

  function goToStep(s: Step) {
    setAttempted(false)
    setStep(s)
  }

  const mutation = useMutation({
    mutationFn: () => {
      const scheduledAt = new Date(`${draft.scheduledDate}T${draft.scheduledTime}`).toISOString()
      if (!draft.volumeCategory) throw new Error("Selecciona un volumen")
      return api.requests.create({
        originAddress: draft.origin!.address,
        originLat: draft.origin!.lat,
        originLng: draft.origin!.lng,
        originFloor: draft.originFloor ? parseInt(draft.originFloor) : undefined,
        originHasElevator: draft.originHasElevator,
        destAddress: draft.dest!.address,
        destLat: draft.dest!.lat,
        destLng: draft.dest!.lng,
        destFloor: draft.destFloor ? parseInt(draft.destFloor) : undefined,
        destHasElevator: draft.destHasElevator,
        scheduledAt,
        flexibleDate: draft.flexibleDate,
        volumeCategory: draft.volumeCategory,
        itemDescription: draft.itemDescription,
        notes: draft.notes || undefined,
        photoUrls: draft.photoUrls,
        budgetMax: draft.budgetMax ? parseInt(draft.budgetMax.replace(/\D/g, "")) : undefined,
        helpersNeeded: draft.helpersNeeded,
        hasFragileItems: draft.hasFragileItems,
        assemblyRequired: draft.assemblyRequired,
        packingIncluded: draft.packingIncluded,
        parkingType: draft.parkingType,
        longCarry: draft.longCarry,
      })
    },
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.requests.my })
      navigate({ to: "/requests/$id", params: { id } })
    },
  })

  const volumeLabel = VOLUMES.find((v) => v.value === draft.volumeCategory)?.label ?? ""

  const dateDisplay = draft.scheduledDate
    ? new Date(draft.scheduledDate + "T00:00:00").toLocaleDateString("es-CL", {
        weekday: "short", day: "numeric", month: "long", year: "numeric",
      })
    : "Selecciona una fecha"

  const dateTimeDisplay = draft.scheduledDate && draft.scheduledTime
    ? new Date(`${draft.scheduledDate}T${draft.scheduledTime}`).toLocaleString("es-CL", {
        weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
      })
    : "—"

  return (
    <div className="flex min-h-full">
      {/* Step Sidebar */}
      <aside className="flex w-[260px] shrink-0 flex-col justify-between border-r border-border bg-background">
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
        {/* Page Header */}
        <div className="border-b border-border bg-background px-8 py-[22px]">
          <h1 className="text-[26px] font-bold tracking-[-0.5px] text-foreground">Nueva solicitud</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Completa los pasos y recibe cotizaciones de transportistas.
          </p>
        </div>

        {/* Step Content */}
        <div className="flex flex-col gap-5 px-11 py-7">
          <SectionHeader step={step} />

          {/* Form Card */}
          <div className="rounded-xl border border-border bg-white px-7 py-6 shadow-[0_2px_8px_rgba(0,0,0,0.031)]">
            {step === 1 && (
              <AddressStep
                value={draft.origin}
                onChange={(r) => set("origin", r)}
                floor={draft.originFloor}
                onFloor={(v) => set("originFloor", v)}
                elevator={draft.originHasElevator}
                onElevator={(v) => set("originHasElevator", v)}
                sessionToken={sessionToken}
                attempted={attempted}
              />
            )}

            {step === 2 && (
              <AddressStep
                value={draft.dest}
                onChange={(r) => set("dest", r)}
                floor={draft.destFloor}
                onFloor={(v) => set("destFloor", v)}
                elevator={draft.destHasElevator}
                onElevator={(v) => set("destHasElevator", v)}
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
                            set("scheduledDate", date.toLocaleDateString("sv"))
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
                            onClick={() => set("scheduledTime", time)}
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
                  onClick={() => set("flexibleDate", !draft.flexibleDate)}
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
                        onSelect={() => set("volumeCategory", value)}
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
                    onChange={(e) => set("itemDescription", e.target.value)}
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
                    onChange={(e) => set("notes", e.target.value)}
                  />
                </Field>

                <PhotoUploader urls={draft.photoUrls} onChange={(u) => set("photoUrls", u)} />
              </FieldGroup>
            )}

            {step === 5 && (
              <div className="flex flex-col gap-5">
                <div className="rounded-[8px] bg-secondary px-[14px] py-3">
                  <p className="text-[13px] text-muted-foreground">
                    Estos datos ayudan a los transportistas a cotizar con más precisión. Todos son opcionales.
                  </p>
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
                        set("budgetMax", raw ? parseInt(raw).toLocaleString("es-CL") : "")
                      }}
                    />
                  </div>
                  <p className="text-[12px] text-muted-foreground">Los transportistas ven este monto y ajustan su oferta.</p>
                </div>

                {/* Helpers */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[14px] font-semibold text-foreground">¿Cuántos ayudantes necesitas?</span>
                  <div className="flex gap-[10px]">
                    {([
                      { n: 0, label: "Solo" },
                      { n: 1, label: "+1" },
                      { n: 2, label: "+2" },
                      { n: 3, label: "+3" },
                    ] as const).map(({ n, label }) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => set("helpersNeeded", n)}
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
                      value={draft[key] as boolean}
                      onChange={(v) => set(key, v)}
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
                        onClick={() => set("parkingType", value)}
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
                      ] as (string | false)[]).filter(Boolean).map((f) => (
                        <span key={f as string} className="text-[12px] text-muted-foreground">• {f}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {mutation.error && (
                  <p className="text-[13px] text-destructive">{(mutation.error as Error).message}</p>
                )}
              </div>
            )}
          </div>

          {/* Nav Buttons */}
          <div className="flex items-center justify-between">
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
                onClick={() => {
                  if (!canNext()) { setAttempted(true); return }
                  setAttempted(false)
                  setStep((s) => (s + 1) as Step)
                }}
                className="flex items-center gap-1.5 rounded-[9px] bg-primary px-[22px] py-[11px] text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Siguiente <ArrowRight className="size-[15px]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => mutation.mutate()}
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
    </div>
  )
}
