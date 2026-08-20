import { useState } from "react"
import { useForm, useStore } from "@tanstack/react-form"
import { Link, useNavigate } from "@tanstack/react-router"
import {
  ArrowRight,
  CalendarClock,
  Check,
  LifeBuoy,
  LoaderCircle,
  RefreshCw,
  TimerOff,
} from "lucide-react"
import { z } from "zod"
import { useRepublishRequest } from "@/hooks/use-request-mutations"
import { formatLongDateTime } from "@/lib/display"
import type { RequestDetail } from "@/lib/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const DAY_MS = 24 * 60 * 60 * 1000

function shiftDate(iso: string, days: number) {
  const date = new Date(iso)
  date.setDate(date.getDate() + days)
  return date
}

function toLocalInputValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
}

function toIso(value: string) {
  return new Date(value).toISOString()
}

function republishSchema(originalScheduledAt: string) {
  const originalTime = new Date(originalScheduledAt).getTime()

  return z.object({
    scheduledAt: z.string()
      .min(1, "Elige una nueva fecha")
      .refine((value) => !Number.isNaN(new Date(value).getTime()), "Ingresa una fecha válida")
      .refine((value) => new Date(value).getTime() > Date.now(), "La nueva fecha debe estar en el futuro")
      .refine(
        (value) => new Date(value).getTime() > originalTime,
        "La nueva fecha debe ser posterior a la fecha original",
      ),
    flexibleDate: z.boolean(),
  })
}

function defaultRepublishDate(originalScheduledAt: string) {
  const quickDates = [1, 3, 7].map((days) => shiftDate(originalScheduledAt, days))
  const firstFuture = quickDates.find((date) => date.getTime() > Date.now())
  return toLocalInputValue(firstFuture ?? new Date(Math.max(Date.now(), new Date(originalScheduledAt).getTime()) + DAY_MS))
}

function RepublishDialog({
  requestId,
  scheduledAt,
  flexibleDate,
}: {
  requestId: string
  scheduledAt: string
  flexibleDate: boolean
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"date" | "confirm">("date")
  const mutation = useRepublishRequest(requestId)
  const schema = republishSchema(scheduledAt)
  const quickDates = [1, 3, 7].map((days) => ({
    days,
    date: shiftDate(scheduledAt, days),
  }))

  const form = useForm({
    defaultValues: {
      scheduledAt: defaultRepublishDate(scheduledAt),
      flexibleDate,
    },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      const result = await mutation.mutateAsync({
        scheduledAt: toIso(value.scheduledAt),
        flexibleDate: value.flexibleDate,
      })
      setOpen(false)
      navigate({ to: "/requests/$id", params: { id: result.id } })
    },
  })

  const values = useStore(form.store, (state) => state.values)
  const selectedQuickDate = quickDates.find(
    ({ date }) => toLocalInputValue(date) === values.scheduledAt,
  )
  const earliestDate = new Date(Math.max(Date.now(), new Date(scheduledAt).getTime()) + 60_000)

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setStep("date")
      mutation.reset()
      form.reset()
    }
  }

  async function continueToConfirmation() {
    await form.validateAllFields("submit")
    if (schema.safeParse(form.state.values).success) {
      setStep("confirm")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="min-h-10 w-full transition-transform duration-150 active:scale-[0.96]">
          <RefreshCw data-icon="inline-start" />
          Republicar con nueva fecha
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault()
            form.handleSubmit()
          }}
        >
          <DialogHeader>
            <div className="mb-1 flex items-center gap-2">
              <Badge variant={step === "date" ? "default" : "secondary"}>1. Nueva fecha</Badge>
              <ArrowRight className="size-3.5 text-muted-foreground" />
              <Badge variant={step === "confirm" ? "default" : "secondary"}>2. Confirmar</Badge>
            </div>
            <DialogTitle>
              {step === "date" ? "Dale otra oportunidad a tu flete" : "Confirma la republicación"}
            </DialogTitle>
            <DialogDescription>
              {step === "date"
                ? "Conservaremos la ruta, los detalles y las fotos. Solo necesitas mover la fecha."
                : "La publicación anterior se cerrará y los transportistas verán una nueva solicitud."}
            </DialogDescription>
          </DialogHeader>

          {step === "date" ? (
            <FieldGroup>
              <form.Field name="scheduledAt" validators={{ onBlur: schema.shape.scheduledAt }}>
                {(field) => {
                  const isInvalid = field.state.meta.errors.length > 0

                  return (
                    <Field data-invalid={isInvalid || undefined}>
                      <FieldLabel>¿Cuánto quieres moverla?</FieldLabel>
                      <ToggleGroup
                        type="single"
                        variant="outline"
                        value={selectedQuickDate ? String(selectedQuickDate.days) : "custom"}
                        className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4"
                        onValueChange={(value) => {
                          if (value === "custom") {
                            const customDate = new Date(
                              Math.max(Date.now(), new Date(scheduledAt).getTime()) + 2 * DAY_MS,
                            )
                            field.handleChange(toLocalInputValue(customDate))
                            return
                          }
                          const option = quickDates.find(({ days }) => String(days) === value)
                          if (option) field.handleChange(toLocalInputValue(option.date))
                        }}
                      >
                        {quickDates.map(({ days, date }) => (
                          <ToggleGroupItem
                            key={days}
                            value={String(days)}
                            disabled={date.getTime() <= Date.now()}
                            className="h-auto min-h-16 flex-col items-start px-3 text-left"
                          >
                            <span>+{days} {days === 1 ? "día" : "días"}</span>
                            <span className="text-xs font-normal text-muted-foreground">
                              {date.toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                            </span>
                          </ToggleGroupItem>
                        ))}
                        <ToggleGroupItem
                          value="custom"
                          className="h-auto min-h-16 flex-col items-start px-3 text-left"
                        >
                          <CalendarClock />
                          <span>Otra fecha</span>
                        </ToggleGroupItem>
                      </ToggleGroup>

                      <div className="mt-2">
                        <FieldLabel htmlFor={field.name}>Fecha y hora exactas</FieldLabel>
                        <Input
                          id={field.name}
                          type="datetime-local"
                          min={toLocalInputValue(earliestDate)}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) => field.handleChange(event.target.value)}
                          aria-invalid={isInvalid}
                          className="mt-2 min-h-10"
                        />
                      </div>
                      <FieldDescription>
                        Las opciones rápidas respetan la hora de tu fecha original.
                      </FieldDescription>
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  )
                }}
              </form.Field>

              <form.Field name="flexibleDate">
                {(field) => (
                  <Field orientation="horizontal" className="rounded-lg border p-3">
                    <FieldContent>
                      <FieldLabel htmlFor={field.name}>Tengo flexibilidad con la fecha</FieldLabel>
                      <FieldDescription>
                        Conservamos tu preferencia actual; puedes cambiarla aquí.
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id={field.name}
                      checked={field.state.value}
                      onCheckedChange={field.handleChange}
                    />
                  </Field>
                )}
              </form.Field>
            </FieldGroup>
          ) : (
            <div className="grid gap-3 rounded-xl border bg-muted/35 p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CalendarClock className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Nueva fecha</p>
                  <p className="text-sm text-muted-foreground">
                    {formatLongDateTime(toIso(values.scheduledAt))}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 border-t pt-3 text-sm">
                <Check className="size-4 text-primary" />
                <span>
                  {values.flexibleDate ? "La fecha seguirá siendo flexible" : "La fecha será fija"}
                </span>
              </div>
            </div>
          )}

          {mutation.isError && (
            <Alert variant="destructive">
              <AlertDescription>{mutation.error.message}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            {step === "date" ? (
              <>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={continueToConfirmation}>
                  Revisar nueva fecha
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setStep("date")}>
                  Cambiar fecha
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending && <LoaderCircle className="animate-spin" data-icon="inline-start" />}
                  {mutation.isPending ? "Republicando…" : "Confirmar y republicar"}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function RequestRescueCard({ request }: { request: RequestDetail }) {
  if (request.republishedAs) {
    return (
      <Card size="sm" className="border-primary/20 bg-primary/[0.03]">
        <CardHeader>
          <Badge className="mb-1 w-fit">Republicado</Badge>
          <CardTitle>Este flete tiene una nueva publicación</CardTitle>
          <CardDescription>
            La nueva fecha es {formatLongDateTime(request.republishedAs.scheduledAt)}.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild variant="outline" className="min-h-10 w-full">
            <Link to="/requests/$id" params={{ id: request.republishedAs.id }}>
              Ver nueva publicación
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (
    !request.rescueState ||
    request.rescueState === "waiting" ||
    request.rescueState === "offers_available"
  ) {
    return null
  }

  const content = {
    needs_rescue: {
      icon: LifeBuoy,
      title: "Estamos interviniendo personalmente",
      description: "Avisamos al equipo de CargUp para contactar transportistas. Una nueva fecha también puede abrir más opciones.",
      className: "border-amber-200 bg-amber-50/60",
    },
    offers_expired: {
      icon: TimerOff,
      title: "Las ofertas anteriores vencieron",
      description: "Esos precios ya no son válidos. Republica el flete con una nueva fecha para recibir ofertas vigentes.",
      className: "border-amber-200 bg-amber-50/60",
    },
  }[request.rescueState]
  const Icon = content.icon

  return (
    <Card size="sm" className={content.className}>
      <CardHeader>
        <div className="mb-1 flex size-9 items-center justify-center rounded-full bg-background text-primary ring-1 ring-foreground/10">
          <Icon className="size-4" />
        </div>
        <CardTitle>{content.title}</CardTitle>
        <CardDescription>{content.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <RepublishDialog
          requestId={request.id}
          scheduledAt={request.scheduledAt}
          flexibleDate={request.flexibleDate}
        />
      </CardContent>
    </Card>
  )
}
