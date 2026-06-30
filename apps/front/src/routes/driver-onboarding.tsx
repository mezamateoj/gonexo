import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { useForm } from "@tanstack/react-form"
import { useState } from "react"
import { z } from "zod"
import { Lock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Field, FieldError, FieldGroup } from "@/components/ui/field"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { useAppMode } from "@/lib/app-mode"
import { queryKeys } from "@/lib/query-keys"
import { GonexoLogo } from "@/components/gonexo-logo"

export const Route = createFileRoute("/driver-onboarding")({
  component: DriverOnboardingPage,
})

type VehicleType = "van" | "pickup" | "truck_small" | "truck_large"

const VEHICLE_TYPES: { key: VehicleType; label: string; emoji: string }[] = [
  { key: "van", label: "Furgón", emoji: "🚐" },
  { key: "pickup", label: "Camioneta", emoji: "🛻" },
  { key: "truck_small", label: "Camión chico", emoji: "🚚" },
  { key: "truck_large", label: "Camión grande", emoji: "🏗️" },
]

const DOCUMENTS = [
  { emoji: "🪪", title: "Licencia de conducir", hint: "Foto frontal y trasera" },
  { emoji: "📷", title: "Fotos del vehículo", hint: "1 a 4 fotos del camión" },
  { emoji: "📄", title: "Papeles del vehículo", hint: "Permiso de circulación / revisión técnica" },
]

const phoneSchema = z.string().min(8, "Ingresa un teléfono válido (+56 9 ...)")
const plateSchema = z.string().min(4, "Ingresa una patente válida").max(10, "Patente demasiado larga")

function DriverOnboardingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { setMode } = useAppMode()
  const [vehicleType, setVehicleType] = useState<VehicleType>("van")
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { phone: "", plate: "", year: "" },
    onSubmit: async ({ value }) => {
      setSubmitError(null)
      try {
        await api.drivers.upsertMe({
          phone: value.phone,
          vehicleType,
          vehiclePlate: value.plate.toUpperCase(),
        })
        const profile = await api.drivers.me()
        queryClient.setQueryData(queryKeys.drivers.me, profile)
        setMode("driver")
        navigate({ to: "/available" })
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Error al activar tu perfil. Intenta de nuevo.")
      }
    },
  })

  return (
    <div className="min-h-screen bg-[#fafaf8]">
      {/* Top bar */}
      <header className="flex h-[60px] items-center border-b border-[#f1f0ee] bg-white px-5 md:px-10">
        <GonexoLogo size="xs" />
      </header>

      {/* Progress bar — half filled */}
      <div className="h-[4px] bg-[#f1f0ee]">
        <div className="h-full w-1/2 bg-primary" />
      </div>

      {/* Content */}
      <div className="mx-auto max-w-[640px] px-5 py-[60px]">
        <form
          onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}
          className="flex flex-col gap-10"
        >
          {/* Page header */}
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[24px] font-bold tracking-[-0.6px] text-[#121715] md:text-[30px]">
              Conviértete en transportista
            </h1>
            <p className="text-[15px] text-[#717d79]">
              Toma ~3 minutos. Necesitas tu vehículo y documentos a mano.
            </p>
          </div>

          {/* Section A: Vehicle */}
          <div className="flex flex-col gap-5">
            <h2 className="text-[18px] font-semibold text-[#121715]">Tu vehículo</h2>

            <FieldGroup>
              {/* Phone */}
              <form.Field
                name="phone"
                validators={{ onChange: phoneSchema, onBlur: phoneSchema }}
              >
                {(field) => {
                  const isInvalid = field.state.meta.errors.length > 0 &&
                    (field.state.meta.isTouched || form.state.submissionAttempts > 0)
                  return (
                    <Field data-invalid={isInvalid || undefined}>
                      <label htmlFor={field.name} className="text-[13px] font-medium text-[#121715]">
                        Teléfono de contacto
                      </label>
                      <Input
                        id={field.name}
                        type="tel"
                        placeholder="+56 9 xxxx xxxx"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  )
                }}
              </form.Field>

              {/* Vehicle type */}
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-medium text-[#121715]">Tipo de vehículo</span>
                <div className="grid grid-cols-2 gap-[10px] sm:grid-cols-4">
                  {VEHICLE_TYPES.map(({ key, label, emoji }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setVehicleType(key)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1.5 rounded-[8px] py-[14px] px-3 transition-colors",
                        vehicleType === key
                          ? "border-2 border-primary bg-[#0c8c5e0d]"
                          : "border border-[#f1f0ee] bg-[#faf8f5] hover:border-border",
                      )}
                    >
                      <span className="text-2xl leading-none">{emoji}</span>
                      <span className={cn(
                        "text-[12px] font-medium",
                        vehicleType === key ? "text-primary" : "text-[#121715]",
                      )}>
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Plate + Year */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <form.Field
                  name="plate"
                  validators={{ onChange: plateSchema, onBlur: plateSchema }}
                >
                  {(field) => {
                    const isInvalid = field.state.meta.errors.length > 0 &&
                      (field.state.meta.isTouched || form.state.submissionAttempts > 0)
                    return (
                      <Field className="w-full sm:w-[240px] sm:shrink-0" data-invalid={isInvalid || undefined}>
                        <label htmlFor={field.name} className="text-[13px] font-medium text-[#121715]">
                          Patente
                        </label>
                        <Input
                          id={field.name}
                          placeholder="AB-CD-12"
                          className="font-semibold uppercase tracking-[0.08em]"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
                          aria-invalid={isInvalid}
                        />
                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    )
                  }}
                </form.Field>

                <form.Field name="year">
                  {(field) => (
                    <Field className="flex-1">
                      <label htmlFor={field.name} className="text-[13px] font-medium text-[#121715]">
                        Año{" "}
                        <span className="font-normal text-[#717d79]">(opcional)</span>
                      </label>
                      <Input
                        id={field.name}
                        placeholder="2019"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      />
                    </Field>
                  )}
                </form.Field>
              </div>
            </FieldGroup>
          </div>

          {/* Section B: Documents — coming soon */}
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-semibold text-[#121715]">Documentos</h2>
                <span className="rounded-full bg-[#f1f0ee] px-[10px] py-[3px] text-[11px] font-semibold uppercase tracking-wide text-[#717d79]">
                  Próximamente
                </span>
              </div>
              <p className="mt-1 text-[13px] text-[#717d79]">
                Tus documentos se revisan para dar confianza a los clientes.
              </p>
            </div>

            <div className="relative">
              {/* Dimmed document rows */}
              <div className="pointer-events-none flex flex-col gap-2 opacity-40">
                {DOCUMENTS.map(({ emoji, title, hint }) => (
                  <div
                    key={title}
                    className="flex items-center gap-[14px] rounded-[10px] border border-[#f1f0ee] bg-[#faf8f5] px-[18px] py-4"
                  >
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-[8px] bg-[#ebe9e6] text-[22px] leading-none">
                      {emoji}
                    </div>
                    <div className="flex flex-1 flex-col gap-0.5">
                      <span className="text-[14px] font-semibold text-[#121715]">{title}</span>
                      <span className="text-[12px] text-[#717d79]">{hint}</span>
                    </div>
                    <div className="rounded-full bg-[#ebe9e6] px-[10px] py-1 text-[12px] font-medium text-[#717d79]">
                      Pendiente
                    </div>
                  </div>
                ))}
              </div>

              {/* Lock overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center gap-2 rounded-[10px] border border-border bg-white px-5 py-3 shadow-sm">
                  <Lock className="size-4 text-muted-foreground" />
                  <span className="text-[13px] font-medium text-foreground">
                    Esta sección estará disponible pronto
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          {submitError && (
            <p className="rounded-[8px] bg-red-50 px-3 py-2.5 text-[13px] text-red-600">
              {submitError}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <form.Subscribe selector={(s) => s.isSubmitting}>
              {(isSubmitting) => (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-[10px] bg-primary py-[14px] text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting ? "Activando perfil…" : "Activar mi perfil de transportista"}
                </button>
              )}
            </form.Subscribe>
            <Link
              to="/requests"
              onClick={() => setMode("client")}
              className="shrink-0 text-[13px] text-[#717d79] transition-colors hover:text-[#485450]"
            >
              Saltar por ahora
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
