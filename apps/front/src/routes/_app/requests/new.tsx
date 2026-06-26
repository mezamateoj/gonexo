import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useRef, useMemo } from "react"
import { Package, Boxes, Truck, Building2, ArrowRight, ArrowLeft, Loader2, Users, AlertTriangle, Wrench, Box, ParkingCircle, MoveRight, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AddressStep } from "@/components/requests/new/address-step"
import { PhotoUploader } from "@/components/requests/new/photo-uploader"
import { ReviewRow } from "@/components/requests/new/review-row"
import { StepBar } from "@/components/requests/new/step-bar"
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

const PARKING_OPTIONS: { value: Draft["parkingType"]; label: string; sub: string }[] = [
  { value: "street", label: "Calle", sub: "Estacionamiento en la vía pública" },
  { value: "garage", label: "Garage / Estacionamiento", sub: "Acceso cubierto disponible" },
  { value: "loading_dock", label: "Andén de carga", sub: "Zona de carga y descarga" },
]

function Toggle({ value, onChange, children }: { value: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        "flex w-full items-center gap-3 rounded-[10px] border p-3 text-left transition-colors",
        value ? "border-2 border-primary bg-[#E7F4EE]" : "border-[1.5px] border-[#E9E7E3] bg-white"
      )}
    >
      <div className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        value ? "border-primary bg-primary" : "border-[#C4C0BA] bg-white"
      )}>
        {value && <div className="size-2 rounded-full bg-white" />}
      </div>
      <div className="flex-1">{children}</div>
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
  const parkingLabel = PARKING_OPTIONS.find((p) => p.value === draft.parkingType)?.label ?? ""

  return (
    <div className="min-h-full p-8">
      <div className="mx-auto max-w-[540px]">
        <div className="mb-8">
          <h1 className="text-[22px] font-semibold text-[#121715]">Nueva solicitud</h1>
          <div className="mt-4">
            <StepBar step={step} />
          </div>
        </div>

        <div className="rounded-[14px] border border-[#E9E7E3] bg-white p-6">
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
              <Field data-invalid={attempted && !draft.scheduledDate}>
                <FieldLabel className="text-[12px] font-medium text-[#485450]">Fecha</FieldLabel>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-invalid={attempted && !draft.scheduledDate}
                      className={cn(
                        "flex h-10 w-full items-center gap-2 rounded-[8px] border border-[#E9E7E3] bg-white px-3 text-left text-[14px] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 aria-invalid:border-destructive",
                        draft.scheduledDate ? "text-[#121715]" : "text-[#969e9b]"
                      )}
                    >
                      <CalendarDays className="size-4 shrink-0 text-[#969e9b]" />
                      {draft.scheduledDate
                        ? new Date(draft.scheduledDate + "T00:00:00").toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "long", year: "numeric" })
                        : "Selecciona una fecha"
                      }
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
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
              <Field data-invalid={attempted && !draft.scheduledTime}>
                <FieldLabel className="text-[12px] font-medium text-[#485450]">Hora preferida</FieldLabel>
                <input
                  type="time"
                  className="flex h-10 w-full rounded-[8px] border border-[#E9E7E3] bg-white px-3 text-[14px] text-[#121715] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 aria-invalid:border-destructive"
                  aria-invalid={attempted && !draft.scheduledTime}
                  value={draft.scheduledTime}
                  onChange={(e) => set("scheduledTime", e.target.value)}
                />
                {attempted && !draft.scheduledTime && <FieldError>Selecciona una hora</FieldError>}
              </Field>
              <Toggle value={draft.flexibleDate} onChange={(v) => set("flexibleDate", v)}>
                <span className="text-[13px] font-medium text-[#121715]">Fecha flexible</span>
                <p className="text-[11px] text-[#969e9b]">El transportista puede sugerir otro horario</p>
              </Toggle>
            </FieldGroup>
          )}

          {step === 4 && (
            <FieldGroup>
              <Field data-invalid={attempted && !draft.volumeCategory}>
                <FieldLabel className="text-[12px] font-medium text-[#485450]">Volumen estimado</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  {VOLUMES.map(({ value, label, sub, Icon }) => {
                    const active = draft.volumeCategory === value
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => set("volumeCategory", value)}
                        className={cn(
                          "flex items-center gap-3 rounded-[10px] border p-3 text-left transition-colors",
                          active ? "border-2 border-primary bg-[#E7F4EE]" : "border-[1.5px] border-[#E9E7E3] bg-white"
                        )}
                      >
                        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-[8px]", active ? "bg-primary/10" : "bg-[#F5F4F0]")}>
                          <Icon className={cn("size-5", active ? "text-primary" : "text-[#969e9b]")} />
                        </div>
                        <div>
                          <div className={cn("text-[13px] font-semibold", active ? "text-primary" : "text-[#121715]")}>{label}</div>
                          <div className="text-[11px] text-[#969e9b]">{sub}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                {attempted && !draft.volumeCategory && <FieldError>Selecciona un volumen</FieldError>}
              </Field>

              <Field data-invalid={attempted && draft.itemDescription.length < 5}>
                <FieldLabel className="text-[12px] font-medium text-[#485450]">¿Qué vas a mover?</FieldLabel>
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
                <FieldLabel className="text-[12px] font-medium text-[#485450]">Notas adicionales <span className="text-[#B0ABA5]">(opcional)</span></FieldLabel>
                <textarea
                  className="w-full resize-none rounded-[8px] border border-[#E9E7E3] bg-white px-3 py-2.5 text-[14px] text-[#121715] placeholder:text-[#B0ABA5] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  rows={2}
                  placeholder="Frágil, requiere embalaje especial…"
                  value={draft.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </Field>

              <PhotoUploader urls={draft.photoUrls} onChange={(u) => set("photoUrls", u)} />
            </FieldGroup>
          )}

          {step === 5 && (
            <FieldGroup>
              <p className="text-[13px] text-[#969e9b]">
                Estos datos ayudan a los transportistas a cotizar con más precisión. Todos son opcionales.
              </p>

              {/* Budget */}
              <Field>
                <FieldLabel className="text-[12px] font-medium text-[#485450]">
                  Presupuesto máximo <span className="text-[#B0ABA5]">(opcional)</span>
                </FieldLabel>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#969e9b]">$</span>
                  <Input
                    className="pl-6"
                    placeholder="Ej: 50.000"
                    value={draft.budgetMax}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "")
                      set("budgetMax", raw ? parseInt(raw).toLocaleString("es-CL") : "")
                    }}
                  />
                </div>
                <p className="text-[11px] text-[#969e9b]">Los transportistas ven este monto y ajustan su oferta.</p>
              </Field>

              {/* Helpers */}
              <Field>
                <FieldLabel className="text-[12px] font-medium text-[#485450]">¿Cuántos ayudantes necesitas?</FieldLabel>
                <div className="flex gap-2">
                  {[0, 1, 2, 3].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set("helpersNeeded", n)}
                      className={cn(
                        "flex flex-1 flex-col items-center gap-1 rounded-[10px] border py-3 transition-colors",
                        draft.helpersNeeded === n
                          ? "border-2 border-primary bg-[#E7F4EE]"
                          : "border-[1.5px] border-[#E9E7E3] bg-white"
                      )}
                    >
                      <Users className={cn("size-4", draft.helpersNeeded === n ? "text-primary" : "text-[#969e9b]")} />
                      <span className={cn("text-[12px] font-semibold", draft.helpersNeeded === n ? "text-primary" : "text-[#121715]")}>
                        {n === 0 ? "Solo" : `+${n}`}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[#969e9b]">Además del transportista.</p>
              </Field>

              {/* Flags */}
              <div className="flex flex-col gap-2">
                <FieldLabel className="text-[12px] font-medium text-[#485450]">Características especiales</FieldLabel>
                <Toggle value={draft.hasFragileItems} onChange={(v) => set("hasFragileItems", v)}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-3.5 text-amber-500" />
                    <div>
                      <span className="text-[13px] font-medium text-[#121715]">Artículos frágiles</span>
                      <p className="text-[11px] text-[#969e9b]">Vidrios, electrónicos, obras de arte</p>
                    </div>
                  </div>
                </Toggle>
                <Toggle value={draft.assemblyRequired} onChange={(v) => set("assemblyRequired", v)}>
                  <div className="flex items-center gap-2">
                    <Wrench className="size-3.5 text-[#969e9b]" />
                    <div>
                      <span className="text-[13px] font-medium text-[#121715]">Requiere desarme / armado</span>
                      <p className="text-[11px] text-[#969e9b]">Muebles que deben desmontarse</p>
                    </div>
                  </div>
                </Toggle>
                <Toggle value={draft.packingIncluded} onChange={(v) => set("packingIncluded", v)}>
                  <div className="flex items-center gap-2">
                    <Box className="size-3.5 text-[#969e9b]" />
                    <div>
                      <span className="text-[13px] font-medium text-[#121715]">Incluir embalaje</span>
                      <p className="text-[11px] text-[#969e9b]">El transportista lleva materiales y empaca</p>
                    </div>
                  </div>
                </Toggle>
                <Toggle value={draft.longCarry} onChange={(v) => set("longCarry", v)}>
                  <div className="flex items-center gap-2">
                    <MoveRight className="size-3.5 text-[#969e9b]" />
                    <div>
                      <span className="text-[13px] font-medium text-[#121715]">Acarreo largo</span>
                      <p className="text-[11px] text-[#969e9b]">Más de 20 m entre la puerta y el camión</p>
                    </div>
                  </div>
                </Toggle>
              </div>

              {/* Parking */}
              <Field>
                <FieldLabel className="text-[12px] font-medium text-[#485450]">
                  <ParkingCircle className="mr-1 inline size-3.5" />
                  Tipo de estacionamiento en origen
                </FieldLabel>
                <div className="flex flex-col gap-1.5">
                  {PARKING_OPTIONS.map(({ value, label, sub }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => set("parkingType", value)}
                      className={cn(
                        "flex items-center gap-3 rounded-[8px] border p-2.5 text-left transition-colors",
                        draft.parkingType === value
                          ? "border-primary bg-[#E7F4EE]"
                          : "border-[#E9E7E3] bg-white"
                      )}
                    >
                      <div className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                        draft.parkingType === value ? "border-primary bg-primary" : "border-[#C4C0BA]"
                      )}>
                        {draft.parkingType === value && <div className="size-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <span className="text-[12px] font-medium text-[#121715]">{label}</span>
                        <p className="text-[11px] text-[#969e9b]">{sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </Field>
            </FieldGroup>
          )}

          {step === 6 && (
            <div className="flex flex-col gap-1">
              <p className="mb-3 text-[13px] font-semibold text-[#121715]">Revisa tu solicitud</p>
              <ReviewRow label="Origen" value={draft.origin?.address ?? ""} />
              {draft.originFloor && <ReviewRow label="Piso origen" value={draft.originFloor} />}
              <ReviewRow label="Ascensor en origen" value={draft.originHasElevator ? "Sí" : "No"} />
              <ReviewRow label="Destino" value={draft.dest?.address ?? ""} />
              {draft.destFloor && <ReviewRow label="Piso destino" value={draft.destFloor} />}
              <ReviewRow label="Ascensor en destino" value={draft.destHasElevator ? "Sí" : "No"} />
              <ReviewRow
                label="Fecha y hora"
                value={`${new Date(`${draft.scheduledDate}T${draft.scheduledTime}`).toLocaleString("es-CL", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}`}
              />
              {draft.flexibleDate && <ReviewRow label="Fecha flexible" value="Sí" />}
              <ReviewRow label="Volumen" value={volumeLabel} />
              <ReviewRow label="Descripción" value={draft.itemDescription} />
              {draft.notes && <ReviewRow label="Notas" value={draft.notes} />}
              {draft.photoUrls.length > 0 && <ReviewRow label="Fotos" value={`${draft.photoUrls.length} foto${draft.photoUrls.length > 1 ? "s" : ""}`} />}
              {draft.budgetMax && <ReviewRow label="Presupuesto máximo" value={`$${draft.budgetMax}`} />}
              <ReviewRow label="Ayudantes" value={draft.helpersNeeded === 0 ? "Solo transportista" : `+${draft.helpersNeeded} ayudante${draft.helpersNeeded > 1 ? "s" : ""}`} />
              {draft.hasFragileItems && <ReviewRow label="Artículos frágiles" value="Sí" />}
              {draft.assemblyRequired && <ReviewRow label="Desarme/armado" value="Sí" />}
              {draft.packingIncluded && <ReviewRow label="Embalaje incluido" value="Sí" />}
              {draft.longCarry && <ReviewRow label="Acarreo largo" value="Sí" />}
              <ReviewRow label="Estacionamiento" value={parkingLabel} />

              {mutation.error && (
                <p className="mt-3 text-sm text-destructive">
                  {(mutation.error as Error).message}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          {step > 1 ? (
            <Button variant="ghost" onClick={() => setStep((s) => (s - 1) as Step)} className="gap-1.5 text-[#485450]">
              <ArrowLeft className="size-4" /> Atrás
            </Button>
          ) : (
            <div />
          )}

          {step < 6 ? (
            <Button
              onClick={() => {
                if (!canNext()) { setAttempted(true); return }
                setAttempted(false)
                setStep((s) => (s + 1) as Step)
              }}
              className="gap-2"
            >
              {step === 5 ? "Revisar" : "Siguiente"} <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-2">
              {mutation.isPending ? <><Loader2 className="size-4 animate-spin" /> Publicando…</> : <>Publicar solicitud <ArrowRight className="size-4" /></>}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
