import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "@tanstack/react-form"
import { useEffect, useState } from "react"
import { z } from "zod"
import { MapPin, ChevronLeft, Package, Calendar, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { useSession } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Field, FieldError, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import type { VolumeCategory } from "@/lib/types"

export const Route = createFileRoute("/_app/available/$id")({
  component: DriverOpportunityPage,
})

const VOLUME_LABEL: Record<VolumeCategory, string> = {
  small: "Pequeño",
  medium: "Mediano",
  large: "Grande",
  full_move: "Mudanza completa",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-CL", {
    weekday: "long", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit",
  })
}

function formatCLP(n: number) {
  return n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 })
}

const quoteSchema = z.object({
  price: z.string().min(1, "Ingresa un precio").refine(
    (v) => parseInt(v.replace(/\D/g, "")) > 0,
    "El precio debe ser mayor a 0"
  ),
  message: z.string().max(500),
})

function SubmitQuoteForm({ requestId, onSuccess }: { requestId: string; onSuccess: () => void }) {
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { price: "", message: "" },
    validators: { onSubmit: quoteSchema },
    onSubmit: async ({ value }) => {
      setSubmitError(null)
      try {
        await api.requests.submitQuote(requestId, {
          price: parseInt(value.price.replace(/\D/g, "")),
          message: value.message || undefined,
        })
        onSuccess()
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Error al enviar la cotización. Intenta de nuevo.")
      }
    },
  })

  return (
    <div className="rounded-[14px] border border-[#E9E7E3] bg-white p-5">
      <h3 className="mb-1 text-[14px] font-semibold text-[#121715]">Enviar cotización</h3>
      <p className="mb-4 text-[12px] text-[#969e9b]">El cliente verá tu precio y mensaje.</p>
      <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }} className="flex flex-col gap-3">
        <FieldGroup>
          <form.Field
            name="price"
            validators={{ onChange: z.string().min(1, "Ingresa un precio"), onBlur: z.string().min(1) }}
          >
            {(field) => {
              const attempted = form.state.submissionAttempts > 0
              const isInvalid = (field.state.meta.isTouched || attempted) && field.state.meta.errors.length > 0
              return (
                <Field data-invalid={isInvalid || undefined}>
                  <FieldLabel htmlFor={field.name} className="text-[12px] font-medium text-[#485450]">
                    Tu precio (CLP)
                  </FieldLabel>
                  <Input
                    id={field.name}
                    className="font-semibold"
                    placeholder="Ej: 35.000"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "")
                      field.handleChange(raw ? parseInt(raw).toLocaleString("es-CL") : "")
                    }}
                    aria-invalid={isInvalid}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>

          <form.Field name="message">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name} className="text-[12px] font-medium text-[#485450]">
                  Mensaje <span className="font-normal text-[#969e9b]">(opcional)</span>
                </FieldLabel>
                <FieldDescription>Cuéntale algo al cliente sobre tu servicio.</FieldDescription>
                <textarea
                  id={field.name}
                  rows={2}
                  className="w-full resize-none rounded-[8px] border border-[#E9E7E3] bg-white px-3 py-2.5 text-[13px] text-[#121715] placeholder:text-[#B0ABA5] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  placeholder="Tengo experiencia en mudanzas de departamentos…"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </Field>
            )}
          </form.Field>
        </FieldGroup>

        {submitError && (
          <p className="rounded-[8px] bg-red-50 px-3 py-2.5 text-[13px] text-red-600">
            {submitError}
          </p>
        )}

        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enviando…" : "Enviar cotización"}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </div>
  )
}

function DriverOpportunityPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: session } = useSession()

  const { data: req, isLoading, isError } = useQuery({
    queryKey: queryKeys.requests.detail(id),
    queryFn: () => api.requests.get(id),
  })

  const userId = session?.user?.id
  const isOwnRequest = !!userId && req?.userId === userId

  useEffect(() => {
    if (isOwnRequest) {
      navigate({ to: "/requests/$id", params: { id } })
    }
  }, [id, isOwnRequest, navigate])

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="mb-6 h-5 w-40" />
        <div className="grid grid-cols-[1fr_360px] gap-6">
          <div className="space-y-4">
            <Skeleton className="h-52 w-full rounded-[14px]" />
          </div>
          <Skeleton className="h-48 rounded-[14px]" />
        </div>
      </div>
    )
  }

  if (isError || !req) {
    return (
      <div className="p-8">
        <p className="text-sm text-destructive">No se pudo cargar la solicitud.</p>
      </div>
    )
  }

  if (isOwnRequest) return null

  const myQuote = req.quotes.find((q) => q.driverId === userId)
  const isOpen = req.status === "open"

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => navigate({ to: "/available" })}
        className="mb-6 flex items-center gap-1.5 text-[13px] text-[#969e9b] transition-colors hover:text-[#485450]"
      >
        <ChevronLeft className="size-4" />
        Solicitudes disponibles
      </button>

      <div className="grid grid-cols-[1fr_360px] gap-6 items-start">
        {/* Left — request details */}
        <div className="flex flex-col gap-4">
          <div className="rounded-[14px] border border-[#E9E7E3] bg-white p-6">
            <div className="mb-5 flex items-center gap-3 text-[12px] text-[#B0ABA5]">
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                {formatDate(req.scheduledAt)}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Package className="size-3.5" />
                {VOLUME_LABEL[req.volumeCategory]}
              </span>
            </div>

            {/* Route */}
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary">
                  <MapPin className="size-3.5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#B0ABA5]">Origen</p>
                  <p className="text-[14px] font-medium text-[#121715]">{req.originAddress}</p>
                  {(req.originFloor != null || req.originHasElevator) && (
                    <p className="text-[12px] text-[#969e9b]">
                      {req.originFloor != null ? `Piso ${req.originFloor} · ` : ""}
                      {req.originHasElevator ? "Con ascensor" : "Sin ascensor"}
                    </p>
                  )}
                </div>
              </div>
              <div className="ml-3 h-5 w-px bg-[#E9E7E3]" />
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#F5F4F0]">
                  <MapPin className="size-3.5 text-[#969e9b]" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#B0ABA5]">Destino</p>
                  <p className="text-[14px] font-medium text-[#121715]">{req.destAddress}</p>
                  {(req.destFloor != null || req.destHasElevator) && (
                    <p className="text-[12px] text-[#969e9b]">
                      {req.destFloor != null ? `Piso ${req.destFloor} · ` : ""}
                      {req.destHasElevator ? "Con ascensor" : "Sin ascensor"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-[#F0EEE9] pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#B0ABA5]">Qué se mueve</p>
              <p className="mt-1 text-[13px] text-[#121715]">{req.itemDescription}</p>
            </div>

            {/* Service details */}
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#F0EEE9] pt-4">
              {req.budgetMax && (
                <div className="col-span-2 rounded-[8px] bg-green-50 px-3 py-2">
                  <p className="text-[11px] font-semibold text-green-700">
                    Presupuesto máximo: ${req.budgetMax.toLocaleString("es-CL")}
                  </p>
                </div>
              )}
              {req.helpersNeeded > 0 && (
                <div className="rounded-[8px] bg-[#F5F4F0] px-3 py-2">
                  <p className="text-[10px] text-[#969e9b]">Ayudantes</p>
                  <p className="text-[13px] font-medium text-[#121715]">+{req.helpersNeeded}</p>
                </div>
              )}
              {req.parkingType !== "street" && (
                <div className="rounded-[8px] bg-[#F5F4F0] px-3 py-2">
                  <p className="text-[10px] text-[#969e9b]">Estacionamiento</p>
                  <p className="text-[13px] font-medium text-[#121715]">
                    {req.parkingType === "garage" ? "Garage" : "Andén de carga"}
                  </p>
                </div>
              )}
            </div>
            {(req.hasFragileItems || req.assemblyRequired || req.packingIncluded || req.longCarry || req.flexibleDate) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {req.hasFragileItems && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">⚠ Artículos frágiles</span>}
                {req.assemblyRequired && <span className="rounded-full bg-[#F0EEE9] px-2.5 py-1 text-[11px] font-medium text-[#485450]">🔧 Desarme requerido</span>}
                {req.packingIncluded && <span className="rounded-full bg-[#F0EEE9] px-2.5 py-1 text-[11px] font-medium text-[#485450]">📦 Incluye embalaje</span>}
                {req.longCarry && <span className="rounded-full bg-[#F0EEE9] px-2.5 py-1 text-[11px] font-medium text-[#485450]">↔ Acarreo largo</span>}
                {req.flexibleDate && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">📅 Fecha flexible</span>}
              </div>
            )}

            {req.notes && (
              <div className="mt-4 rounded-[8px] bg-[#F5F4F0] px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#B0ABA5]">Notas del cliente</p>
                <p className="mt-0.5 text-[13px] text-[#485450]">{req.notes}</p>
              </div>
            )}
          </div>

          {req.photos.length > 0 && (
            <div className="rounded-[14px] border border-[#E9E7E3] bg-white p-5">
              <p className="mb-3 text-[13px] font-semibold text-[#121715]">Fotos</p>
              <div className="flex flex-wrap gap-2">
                {req.photos.map((p) => (
                  <img key={p.id} src={p.url} alt="" className="h-24 w-24 rounded-[8px] object-cover" />
                ))}
              </div>
            </div>
          )}

          {/* Other quotes count — social proof without revealing prices */}
          {isOpen && req.quotes.length > 0 && (
            <div className="rounded-[10px] border border-[#E9E7E3] bg-[#F9F8F6] px-4 py-3">
              <p className="text-[12px] text-[#969e9b]">
                {req.quotes.length} transportista{req.quotes.length !== 1 ? "s" : ""} ya cotizó este flete.
              </p>
            </div>
          )}
        </div>

        {/* Right — action panel */}
        <div className="flex flex-col gap-4">
          {/* Client info — name only, no phone until job accepted */}
          <div className="rounded-[14px] border border-[#E9E7E3] bg-white p-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#B0ABA5]">Cliente</p>
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[13px] font-bold text-primary">
                {req.user.name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <p className="text-[13px] font-semibold text-[#121715]">{req.user.name}</p>
            </div>
          </div>

          {/* My existing quote */}
          {myQuote && (
            <div className={cn(
              "rounded-[14px] border p-5",
              myQuote.status === "accepted" ? "border-primary bg-[#E7F4EE]" : "border-[#E9E7E3] bg-white"
            )}>
              <p className="mb-1 text-[13px] font-semibold text-[#121715]">Tu cotización</p>
              <p className="text-[24px] font-bold text-primary">{formatCLP(myQuote.price)}</p>
              {myQuote.message && (
                <div className="mt-2 flex gap-2 rounded-[8px] bg-[#F5F4F0] px-3 py-2">
                  <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-[#B0ABA5]" />
                  <p className="text-[12px] text-[#485450]">{myQuote.message}</p>
                </div>
              )}
              <p className="mt-3 text-[12px] text-[#969e9b]">
                {myQuote.status === "accepted"
                  ? "El cliente aceptó tu cotización."
                  : myQuote.status === "rejected"
                  ? "El cliente eligió otro transportista."
                  : "Esperando respuesta del cliente."}
              </p>
              {myQuote.status === "accepted" && (
                <Link
                  to="/jobs"
                  className="mt-3 block rounded-[8px] bg-primary px-4 py-2 text-center text-[13px] font-semibold text-white"
                >
                  Ver trabajo →
                </Link>
              )}
            </div>
          )}

          {/* Quote form — only if open and not yet quoted */}
          {isOpen && !myQuote && (
            <SubmitQuoteForm
              requestId={id}
              onSuccess={() => {
                qc.invalidateQueries({ queryKey: queryKeys.requests.detail(id) })
                qc.invalidateQueries({ queryKey: queryKeys.quotes.my })
              }}
            />
          )}

          {/* Closed state */}
          {!isOpen && !myQuote && (
            <div className="rounded-[14px] border border-[#E9E7E3] bg-[#F5F4F0] p-5 text-center">
              <p className="text-[13px] text-[#969e9b]">Esta solicitud ya no está disponible.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
