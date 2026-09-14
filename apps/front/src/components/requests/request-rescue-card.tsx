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
import { asapBookingDescription, formatLongDateTime, formatSchedule } from "@/lib/display"
import type { RequestDetail, RequestSchedule } from "@/lib/types"
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

function shiftDate(iso: string | null, days: number) {
  const date = iso ? new Date(iso) : new Date()
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

function republishSchema(originalScheduledAt: string | null) {
  const originalTime = originalScheduledAt ? new Date(originalScheduledAt).getTime() : 0

  return z.object({
    scheduleType: z.enum(["scheduled", "asap"]),
    scheduledAt: z.string(),
    flexibleDate: z.boolean(),
  }).refine((value) => value.scheduleType === "asap" || (
    new Date(value.scheduledAt).getTime() > Math.max(Date.now(), originalTime)
  ), {
    path: ["scheduledAt"],
    message: "Elige una fecha futura, posterior a la original si tenía fecha",
  })
}

function defaultRepublishDate(originalScheduledAt: string | null) {
  const quickDates = [1, 3, 7].map((days) => shiftDate(originalScheduledAt, days))
  const firstFuture = quickDates.find((date) => date.getTime() > Date.now())
  return toLocalInputValue(firstFuture ?? new Date(Date.now() + DAY_MS))
}

function RepublishDialog({
  requestId,
  scheduleType,
  scheduledAt,
  flexibleDate,
}: {
  requestId: string
  scheduleType: RequestSchedule["scheduleType"]
  scheduledAt: string | null
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
      scheduleType,
      scheduledAt: defaultRepublishDate(scheduledAt),
      flexibleDate,
    },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      const result = await mutation.mutateAsync(value.scheduleType === "asap"
        ? { scheduleType: "asap", scheduledAt: null, flexibleDate: false }
        : { scheduleType: "scheduled", scheduledAt: toIso(value.scheduledAt), flexibleDate: value.flexibleDate })
      setOpen(false)
      navigate({ to: "/requests/$id", params: { id: result.id } })
    },
  })

  const values = useStore(form.store, (state) => state.values)
  const selectedQuickDate = quickDates.find(
    ({ date }) => toLocalInputValue(date) === values.scheduledAt,
  )
  const earliestDate = new Date(Math.max(Date.now(), scheduledAt ? new Date(scheduledAt).getTime() : 0) + 60_000)

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
          Republicar solicitud
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
              <Badge variant={step === "date" ? "default" : "secondary"}>1. Cuándo</Badge>
              <ArrowRight className="size-3.5 text-muted-foreground" />
              <Badge variant={step === "confirm" ? "default" : "secondary"}>2. Confirmar</Badge>
            </div>
            <DialogTitle>
              {step === "date" ? "Dale otra oportunidad a tu flete" : "Confirma la republicación"}
            </DialogTitle>
            <DialogDescription>
              {step === "date"
                ? "Conservaremos la ruta, los detalles y las fotos. Elige cuándo necesitas el flete."
                : "La publicación anterior se cerrará y los transportistas verán una nueva solicitud."}
            </DialogDescription>
          </DialogHeader>

          {step === "date" ? (
            <FieldGroup>
              <form.Field name="scheduleType" validators={{ onBlur: schema.shape.scheduleType }}>
                {(field) => (
                  <Field>
                    <FieldLabel id="republish-schedule-label">¿Cuándo necesitas el flete?</FieldLabel>
                    <ToggleGroup type="single" variant="outline" value={field.state.value}
                      aria-labelledby="republish-schedule-label" onBlur={field.handleBlur}
                      className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2"
                      onValueChange={(value) => {
                        if (value === "scheduled" || value === "asap") {
                          field.handleChange(value)
                          if (value === "asap") form.setFieldValue("flexibleDate", false)
                        }
                      }}>
                      <ToggleGroupItem value="asap">Lo antes posible</ToggleGroupItem>
                      <ToggleGroupItem value="scheduled">Elegir fecha y hora</ToggleGroupItem>
                    </ToggleGroup>
                    {values.scheduleType === "asap" && <FieldDescription>{asapBookingDescription} El plazo comienza de nuevo al republicar.</FieldDescription>}
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </form.Field>
              {values.scheduleType === "scheduled" && <>
              <form.Field name="scheduledAt" validators={{ onBlur: z.string().refine(
                (value) => new Date(value).getTime() > Math.max(Date.now(), scheduledAt ? new Date(scheduledAt).getTime() : 0),
                "Elige una fecha futura, posterior a la original si tenía fecha",
              ) }}>
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
                              earliestDate.getTime() + 2 * DAY_MS,
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
              </>}
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
                    {formatSchedule({ scheduleType: values.scheduleType, scheduledAt: values.scheduleType === "asap" ? null : toIso(values.scheduledAt) }, formatLongDateTime)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 border-t pt-3 text-sm">
                <Check className="size-4 text-primary" />
                <span>
                  {values.scheduleType === "asap" ? `${asapBookingDescription} El plazo comienza de nuevo al republicar.` : values.flexibleDate ? "La fecha seguirá siendo flexible" : "La fecha será fija"}
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
                  Revisar solicitud
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setStep("date")}>
                  Cambiar horario
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
            Nuevo horario: {formatSchedule(request.republishedAs, formatLongDateTime)}.
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

  if (request.scheduleType === "asap" && (request.status === "open" || request.status === "expired")) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{request.status === "expired" ? "La solicitud venció" : "Solicitud lo antes posible"}</CardTitle>
          <CardDescription>
            {request.status === "expired"
              ? "Terminó el plazo para recibir y aceptar ofertas. Republica para iniciar un nuevo plazo de 24 horas o elige una fecha y hora."
              : asapBookingDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RepublishDialog requestId={request.id} scheduleType={request.scheduleType} scheduledAt={request.scheduledAt} flexibleDate={request.flexibleDate} />
        </CardContent>
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
          scheduleType={request.scheduleType}
          scheduledAt={request.scheduledAt}
          flexibleDate={request.flexibleDate}
        />
      </CardContent>
    </Card>
  )
}
