import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { useForm } from "@tanstack/react-form"
import { useState } from "react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { useAppMode } from "@/lib/app-mode"
import { queryKeys } from "@/lib/query-keys"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"

export const Route = createFileRoute("/driver-onboarding")({
  component: DriverOnboardingPage,
})

type VehicleType = "van" | "pickup" | "truck_small" | "truck_large"

const VEHICLE_TYPES: { key: VehicleType; label: string; emoji: string }[] = [
  { key: "van", label: "Furgón", emoji: "🚐" },
  { key: "pickup", label: "Camioneta", emoji: "🛻" },
  { key: "truck_small", label: "Camión chico", emoji: "🚚" },
  { key: "truck_large", label: "Camión grande", emoji: "🚛" },
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
    defaultValues: { phone: "", plate: "" },
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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-[#FAFAF8]">
        <div className="mx-auto max-w-[520px] px-6 py-12">
          <div className="mb-8">
            <p className="text-[12px] font-medium uppercase tracking-wider text-[#969e9b]">Paso final</p>
            <h1 className="mt-1 text-[22px] font-semibold text-[#121715]">Activa tu perfil de transportista</h1>
            <p className="mt-1 text-[13px] text-[#969e9b]">Menos de un minuto. Empieza a recibir solicitudes hoy.</p>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}
            className="flex flex-col gap-6"
          >
            <FieldGroup>
              <div className="grid grid-cols-2 gap-3">
                <form.Field
                  name="phone"
                validators={{ onChange: phoneSchema, onBlur: phoneSchema }}
              >
                {(field) => {
                  const isInvalid = field.state.meta.errors.length > 0 && (field.state.meta.isTouched || form.state.submissionAttempts > 0)
                  return (
                    <Field data-invalid={isInvalid || undefined}>
                        <FieldLabel htmlFor={field.name} className="text-[12px] font-medium text-[#485450]">
                          Teléfono
                        </FieldLabel>
                        <Input
                          id={field.name}
                          type="tel"
                          placeholder="+56 9 1234 5678"
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

                <form.Field
                  name="plate"
                validators={{ onChange: plateSchema, onBlur: plateSchema }}
              >
                {(field) => {
                    const isInvalid = field.state.meta.errors.length > 0 && (field.state.meta.isTouched || form.state.submissionAttempts > 0)
                    return (
                      <Field data-invalid={isInvalid || undefined}>
                        <FieldLabel htmlFor={field.name} className="text-[12px] font-medium text-[#485450]">
                          Patente
                        </FieldLabel>
                        <Input
                          id={field.name}
                          placeholder="KPZF80"
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
              </div>
            </FieldGroup>

            <div>
              <p className="mb-2 text-[12px] font-medium text-[#485450]">Tipo de vehículo</p>
              <div className="grid grid-cols-4 gap-2">
                {VEHICLE_TYPES.map(({ key, label, emoji }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setVehicleType(key)}
                    className={cn(
                      "rounded-[9px] border py-3 text-center transition-colors",
                      vehicleType === key
                        ? "border-2 border-primary bg-white"
                        : "border-[1.5px] border-[#E9E7E3] bg-white hover:border-[#C4C0BA]"
                    )}
                  >
                    <div className="text-xl">{emoji}</div>
                    <div className={cn(
                      "mt-1 text-[11px] font-semibold",
                      vehicleType === key ? "text-primary" : "text-[#485450]"
                    )}>
                      {label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {submitError && (
              <p className="rounded-[8px] bg-red-50 px-3 py-2.5 text-[13px] text-red-600">
                {submitError}
              </p>
            )}

            <div className="flex items-center gap-3">
              <form.Subscribe selector={(s) => s.isSubmitting}>
                {(isSubmitting) => (
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? "Activando perfil…" : "Activar perfil"}
                  </Button>
                )}
              </form.Subscribe>
              <Link
                to="/requests"
                onClick={() => setMode("client")}
                className="text-[13px] text-[#969e9b] transition-colors hover:text-[#485450]"
              >
                Saltar por ahora
              </Link>
            </div>
          </form>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
