import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useForm } from "@tanstack/react-form"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { MapPin, ChevronLeft, Package, Calendar, MessageSquare, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { api, ApiError } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { useSession } from "@/lib/auth-client"
import { floorLine, formatCLP, formatCLPRange, formatLongDateTime, initials, volumeLabels } from "@/lib/display"
import { useSubmitQuote } from "@/hooks/use-request-mutations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Field, FieldError, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { FairPriceBar } from "@/components/requests/fair-price-bar"
import type { PriceRange } from "@/lib/types"

export const Route = createFileRoute("/_app/available/$id")({
  component: DriverOpportunityPage,
})

// Parses a formatted "80.000" input back to a plain integer, following the
// same raw-digit-strip pattern used elsewhere in the codebase for CLP inputs.
function parseCLPInput(raw: string): number {
  const digits = raw.replace(/\D/g, "")
  return digits ? parseInt(digits, 10) : 0
}

function QuoteRangeForm({ requestId, fair }: { requestId: string; fair: PriceRange }) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const submitQuote = useSubmitQuote(requestId)

  const quoteSchema = z
    .object({
      priceMin: z.number().int().min(fair.acceptableMin, `Mínimo permitido: ${formatCLP(fair.acceptableMin)}`),
      priceMax: z.number().int().max(fair.acceptableMax, `Máximo permitido: ${formatCLP(fair.acceptableMax)}`),
      message: z.string().max(500),
    })
    .refine((v) => v.priceMin <= v.priceMax, {
      message: "El máximo debe ser mayor o igual al mínimo.",
      path: ["priceMax"],
    })

  const form = useForm({
    defaultValues: { priceMin: fair.min, priceMax: fair.max, message: "" },
    validators: { onSubmit: quoteSchema },
    onSubmit: async ({ value }) => {
      setSubmitError(null)
      try {
        await submitQuote.mutateAsync({
          priceMin: value.priceMin,
          priceMax: value.priceMax,
          message: value.message || undefined,
        })
      } catch (err) {
        const message =
          err instanceof ApiError && err.status === 409
            ? "Ya enviaste una cotización para esta solicitud."
            : // Backend returns a clear Spanish message (out-of-band or contact info) for 400s.
              err instanceof Error
              ? err.message
              : "Error al enviar la cotización. Intenta de nuevo."
        setSubmitError(message)
        toast.error("No se pudo enviar la cotización", { description: message })
      }
    },
  })

  return (
    <div className="rounded-[14px] border border-border bg-white p-5">
      <h3 className="mb-1 text-[14px] font-semibold text-foreground">Enviar cotización</h3>
      <p className="mb-4 text-[12px] text-muted-foreground">El cliente verá tu rango y tu mensaje.</p>

      <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }} className="flex flex-col gap-4">
        <form.Subscribe selector={(s) => [s.values.priceMin, s.values.priceMax] as const}>
          {([priceMin, priceMax]) => (
            <FairPriceBar
              fair={fair}
              value={[priceMin, priceMax]}
              onChange={([min, max]) => {
                form.setFieldValue("priceMin", min)
                form.setFieldValue("priceMax", max)
              }}
              disabled={form.state.isSubmitting}
            />
          )}
        </form.Subscribe>

        <FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <form.Field name="priceMin">
              {(field) => {
                const attempted = form.state.submissionAttempts > 0
                const isInvalid = (field.state.meta.isTouched || attempted) && field.state.meta.errors.length > 0
                return (
                  <Field data-invalid={isInvalid || undefined}>
                    <FieldLabel htmlFor={field.name} className="text-[12px] font-medium text-ink-soft">
                      Mínimo
                    </FieldLabel>
                    <Input
                      id={field.name}
                      className="font-semibold tabular-nums"
                      value={field.state.value.toLocaleString("es-CL")}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(parseCLPInput(e.target.value))}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            </form.Field>

            <form.Field name="priceMax">
              {(field) => {
                const attempted = form.state.submissionAttempts > 0
                const isInvalid = (field.state.meta.isTouched || attempted) && field.state.meta.errors.length > 0
                return (
                  <Field data-invalid={isInvalid || undefined}>
                    <FieldLabel htmlFor={field.name} className="text-[12px] font-medium text-ink-soft">
                      Máximo
                    </FieldLabel>
                    <Input
                      id={field.name}
                      className="font-semibold tabular-nums"
                      value={field.state.value.toLocaleString("es-CL")}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(parseCLPInput(e.target.value))}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            </form.Field>
          </div>

          <form.Subscribe selector={(s) => [s.values.priceMin, s.values.priceMax] as const}>
            {([priceMin, priceMax]) => (
              <div className="rounded-[8px] bg-muted px-3 py-2.5">
                <p className="text-[12px] text-ink-soft">
                  Recibes después de la comisión ({Math.round(fair.feeRate * 100)}%)
                </p>
                <p className="text-[15px] font-bold tabular-nums text-primary">
                  {formatCLPRange(
                    Math.round(priceMin * (1 - fair.feeRate)),
                    Math.round(priceMax * (1 - fair.feeRate)),
                  )}
                </p>
              </div>
            )}
          </form.Subscribe>

          <form.Field name="message">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name} className="text-[12px] font-medium text-ink-soft">
                  Mensaje <span className="font-normal text-muted-foreground">(opcional)</span>
                </FieldLabel>
                <FieldDescription>Cuéntale algo al cliente sobre tu servicio.</FieldDescription>
                <textarea
                  id={field.name}
                  rows={2}
                  aria-label="Mensaje para el cliente"
                  className="w-full resize-none rounded-[8px] border border-border bg-white px-3 py-2.5 text-[13px] text-foreground placeholder:text-ink-faint outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
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
            <Button type="submit" disabled={isSubmitting} className="active:scale-[0.96] transition-[scale,opacity]">
              {isSubmitting ? "Enviando…" : "Enviar cotización"}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </div>
  )
}

function SubmitQuoteForm({ requestId }: { requestId: string }) {
  const { data: fair, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.requests.priceRange(requestId),
    queryFn: () => api.requests.priceRange(requestId),
  })

  if (isLoading) {
    return (
      <div className="rounded-[14px] border border-border bg-white p-5">
        <Skeleton className="mb-4 h-4 w-32" />
        <Skeleton className="mb-4 h-10 w-full rounded-[8px]" />
        <Skeleton className="h-10 w-full rounded-[9px]" />
      </div>
    )
  }

  if (isError || !fair) {
    return (
      <div className="rounded-[14px] border border-border bg-white p-5 text-center">
        <p className="text-[13px] text-muted-foreground">No se pudo calcular el precio sugerido.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-2 text-[13px] font-medium text-primary"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return <QuoteRangeForm requestId={requestId} fair={fair} />
}

function DriverOpportunityPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
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
      <div className="p-4 md:p-8">
        <Skeleton className="mb-6 h-5 w-40" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_360px]">
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
      <div className="p-4 md:p-8">
        <p className="text-sm text-destructive">No se pudo cargar la solicitud.</p>
      </div>
    )
  }

  if (isOwnRequest) return null

  const myQuote = req.quotes.find((q) => q.driverId === userId)
  const isOpen = req.status === "open"

  return (
    <div className="p-4 md:p-8">
      <button
        type="button"
        onClick={() => navigate({ to: "/available" })}
        className="mb-6 flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-ink-soft"
      >
        <ChevronLeft className="size-4" />
        Solicitudes disponibles
      </button>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_360px] md:items-start">
        {/* Left — request details */}
        <div className="flex flex-col gap-4">
          <div className="rounded-[14px] border border-border bg-white p-4 md:p-6">
            <div className="mb-5 flex items-center gap-3 text-[12px] text-ink-faint">
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                {formatLongDateTime(req.scheduledAt)}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Package className="size-3.5" />
                {volumeLabels[req.volumeCategory]}
              </span>
            </div>

            {/* Route */}
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary">
                  <MapPin className="size-3.5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Origen</p>
                  <p className="text-[14px] font-medium text-foreground">{req.originAddress}</p>
                  {(req.originFloor != null || req.originHasElevator) && (
                    <p className="text-[12px] text-muted-foreground">{floorLine(req.originFloor, req.originHasElevator)}</p>
                  )}
                </div>
              </div>
              <div className="ml-3 h-5 w-px bg-border" />
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
                  <MapPin className="size-3.5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Destino</p>
                  <p className="text-[14px] font-medium text-foreground">{req.destAddress}</p>
                  {(req.destFloor != null || req.destHasElevator) && (
                    <p className="text-[12px] text-muted-foreground">{floorLine(req.destFloor, req.destHasElevator)}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-surface-dim pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Qué se mueve</p>
              <p className="mt-1 text-[13px] text-foreground">{req.itemDescription}</p>
            </div>

            {/* Service details */}
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-surface-dim pt-4">
              {req.budgetMax && (
                <div className="col-span-2 rounded-[8px] bg-green-50 px-3 py-2">
                  <p className="text-[11px] font-semibold text-green-700">
                    Presupuesto máximo: ${req.budgetMax.toLocaleString("es-CL")}
                  </p>
                </div>
              )}
              {req.helpersNeeded > 0 && (
                <div className="rounded-[8px] bg-muted px-3 py-2">
                  <p className="text-[10px] text-muted-foreground">Ayudantes</p>
                  <p className="text-[13px] font-medium text-foreground">+{req.helpersNeeded}</p>
                </div>
              )}
              {req.parkingType !== "street" && (
                <div className="rounded-[8px] bg-muted px-3 py-2">
                  <p className="text-[10px] text-muted-foreground">Estacionamiento</p>
                  <p className="text-[13px] font-medium text-foreground">
                    {req.parkingType === "garage" ? "Garage" : "Andén de carga"}
                  </p>
                </div>
              )}
            </div>
            {(req.hasFragileItems || req.assemblyRequired || req.packingIncluded || req.longCarry || req.flexibleDate) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {req.hasFragileItems && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">⚠ Artículos frágiles</span>}
                {req.assemblyRequired && <span className="rounded-full bg-surface-dim px-2.5 py-1 text-[11px] font-medium text-ink-soft">🔧 Desarme requerido</span>}
                {req.packingIncluded && <span className="rounded-full bg-surface-dim px-2.5 py-1 text-[11px] font-medium text-ink-soft">📦 Incluye embalaje</span>}
                {req.longCarry && <span className="rounded-full bg-surface-dim px-2.5 py-1 text-[11px] font-medium text-ink-soft">↔ Acarreo largo</span>}
                {req.flexibleDate && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">📅 Fecha flexible</span>}
              </div>
            )}

            {req.notes && (
              <div className="mt-4 rounded-[8px] bg-muted px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Notas del cliente</p>
                <p className="mt-0.5 text-[13px] text-ink-soft">{req.notes}</p>
              </div>
            )}
          </div>

          {req.photos.length > 0 && (
            <div className="rounded-[14px] border border-border bg-white p-5">
              <p className="mb-3 text-[13px] font-semibold text-foreground">Fotos</p>
              <div className="flex flex-wrap gap-2">
                {req.photos.map((p) => (
                  <img key={p.id} src={p.url} alt="" className="h-24 w-24 rounded-[8px] object-cover" />
                ))}
              </div>
            </div>
          )}

          {/* Other quotes count — social proof without revealing prices */}
          {isOpen && req.quoteCount > 0 && (
            <div className="rounded-[10px] border border-border bg-surface px-4 py-3">
              <p className="text-[12px] text-muted-foreground">
                {req.quoteCount} transportista{req.quoteCount !== 1 ? "s" : ""} ya cotizó este flete.
              </p>
            </div>
          )}
        </div>

        {/* Right — action panel */}
        <div className="flex flex-col gap-4">
          {/* Client info — name only, no phone until job accepted */}
          <div className="rounded-[14px] border border-border bg-white p-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Cliente</p>
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[13px] font-bold text-primary">
                {initials(req.user.name)}
              </div>
              <p className="text-[13px] font-semibold text-foreground">{req.user.name}</p>
            </div>
          </div>

          {/* My existing quote */}
          {myQuote && (
            <div className={cn(
              "animate-in fade-in slide-in-from-bottom-2 rounded-[14px] border p-5 duration-300",
              myQuote.status === "accepted" ? "border-primary bg-accent" : "border-border bg-white"
            )}>
              <p className="mb-1 text-[13px] font-semibold text-foreground">Tu cotización</p>
              <p className="text-[24px] font-bold tabular-nums text-primary">
                {myQuote.priceMin != null && myQuote.priceMax != null
                  ? formatCLPRange(myQuote.priceMin, myQuote.priceMax)
                  : formatCLP(myQuote.price)}
              </p>
              {myQuote.message && (
                <div className="mt-2 flex gap-2 rounded-[8px] bg-muted px-3 py-2">
                  <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-ink-faint" />
                  <p className="text-[12px] text-ink-soft">{myQuote.message}</p>
                </div>
              )}
              <p className="mt-3 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                {myQuote.status === "accepted" ? (
                  `El cliente aceptó tu cotización por ${formatCLP(myQuote.price)}.`
                ) : myQuote.status === "rejected" ? (
                  "El cliente eligió otro transportista."
                ) : myQuote.status === "expired" ? (
                  "Esta cotización expiró."
                ) : myQuote.status === "cancelled" ? (
                  "Esta cotización fue cancelada."
                ) : (
                  <>
                    <Clock className="size-3.5 shrink-0" />
                    Esperando respuesta del cliente.
                  </>
                )}
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
          {isOpen && !myQuote && <SubmitQuoteForm requestId={id} />}

          {/* Closed state */}
          {!isOpen && !myQuote && (
            <div className="rounded-[14px] border border-border bg-muted p-5 text-center">
              <p className="text-[13px] text-muted-foreground">Esta solicitud ya no está disponible.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
