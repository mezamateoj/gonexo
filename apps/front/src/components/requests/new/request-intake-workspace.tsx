import { useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { useForm } from "@tanstack/react-form"
import { useChat } from "@ai-sdk/react"
import ReactMarkdown from "react-markdown"
import {
  DefaultChatTransport,
  getToolName,
  isToolUIPart,
} from "ai"
import {
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  Loader2,
  MapPin,
  Package,
  Send,
  Sparkles,
} from "lucide-react"
import { z } from "zod"
import { AddressAutocomplete } from "@/components/address-autocomplete"
import type { AddressResult } from "@/components/address-autocomplete"
import { PhotoUploader } from "@/components/requests/new/photo-uploader"
import type { Draft } from "@/components/requests/new/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { API_BASE, api } from "@/lib/api"
import type { UploadedFile } from "@/lib/api"
import { asapBookingDescription, formatCLPRange, volumeLabels } from "@/lib/display"
import { formatDraftDateTime } from "@/lib/request-draft"
import { cn } from "@/lib/utils"

const composerSchema = z.string().trim().min(1, "Escribe un mensaje").max(4_000, "El mensaje es demasiado largo")

const draftPatchSchema = z.object({
  scheduleType: z.enum(["scheduled", "asap"]).optional(),
  originFloor: z.string().optional(),
  originHasElevator: z.boolean().optional(),
  destFloor: z.string().optional(),
  destHasElevator: z.boolean().optional(),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  flexibleDate: z.boolean().optional(),
  volumeCategory: z.enum(["small", "medium", "large", "full_move", ""]).optional(),
  itemDescription: z.string().optional(),
  notes: z.string().optional(),
  budgetMax: z.string().optional(),
  helpersNeeded: z.number().int().min(0).max(3).optional(),
  hasFragileItems: z.boolean().optional(),
  assemblyRequired: z.boolean().optional(),
  packingIncluded: z.boolean().optional(),
  parkingType: z.enum(["street", "garage", "loading_dock"]).optional(),
  longCarry: z.boolean().optional(),
})

const updateDraftOutputSchema = z.object({ patch: draftPatchSchema })
const addressSearchOutputSchema = z.object({
  field: z.enum(["origin", "destination"]),
  candidates: z.array(z.object({ id: z.string(), label: z.string() })),
})
const priceEstimateOutputSchema = z.object({
  available: z.literal(true),
  estimate: z.object({ min: z.number(), max: z.number(), distanceKm: z.number() }),
})
const photoAnalysisOutputSchema = z.object({
  available: z.literal(true),
  analysis: z.object({
    items: z.array(z.object({ name: z.string(), quantity: z.number() })),
    volumeCategory: z.enum(["small", "medium", "large", "full_move"]).nullable(),
    helpersNeeded: z.number(),
    hasFragileItems: z.boolean(),
    questions: z.array(z.string()),
  }),
})

type DraftPatch = z.infer<typeof draftPatchSchema>

interface Props {
  draft: Draft
  sessionToken: string
  photoKeys: string[]
  ready: boolean
  isPublishing: boolean
  publishError: string | null
  onPatch: (patch: DraftPatch) => void
  onOriginChange: (address: AddressResult | null) => void
  onDestChange: (address: AddressResult | null) => void
  onPhotosChange: (urls: string[]) => void
  onPhotosUploaded: (files: UploadedFile[]) => void
  onPhotoRemoved: (url: string) => void
  onManual: () => void
  onPublish: () => void
  scheduleFields: ReactNode
  cargoFields: ReactNode
  isUploading: boolean
  onUploadingChange: (uploading: boolean) => void
}

const starters = [
  "Necesito mover un departamento",
  "Quiero trasladar algunos muebles",
  "Tengo fotos de lo que necesito mover",
]

export function RequestIntakeWorkspace({
  draft,
  sessionToken,
  photoKeys,
  ready,
  isPublishing,
  publishError,
  onPatch,
  onOriginChange,
  onDestChange,
  onPhotosChange,
  onPhotosUploaded,
  onPhotoRemoved,
  onManual,
  onPublish,
  scheduleFields,
  cargoFields,
  isUploading,
  onUploadingChange,
}: Props) {
  const [selectingAddress, setSelectingAddress] = useState<string | null>(null)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [resolvedSearches, setResolvedSearches] = useState<string[]>([])
  const conversationRef = useRef<HTMLDivElement>(null)
  const followLatest = useRef(true)
  const transport = useMemo(() => new DefaultChatTransport({
    api: `${API_BASE}/api/intake/chat`,
    credentials: "include",
  }), [])

  const { messages, sendMessage, status, error } = useChat({
    transport,
    onFinish: ({ message, isAbort, isError }) => {
      if (isAbort || isError) return
      for (const part of message.parts) {
        if (!isToolUIPart(part) || getToolName(part) !== "updateDraft" || part.state !== "output-available") continue
        const result = updateDraftOutputSchema.safeParse(part.output)
        if (result.success) onPatch(result.data.patch)
      }
    },
  })

  useEffect(() => {
    const conversation = conversationRef.current
    if (conversation && followLatest.current) conversation.scrollTop = conversation.scrollHeight
  }, [messages, status])

  const composer = useForm({
    defaultValues: { message: "" },
    onSubmit: async ({ value }) => {
      const message = value.message.trim()
      if (!message || isLocked) return
      composer.reset()
      await sendMessage({ text: message }, {
        body: { draft, mapboxSessionToken: sessionToken, photoKeys },
      })
    },
  })

  const isBusy = status === "submitted" || status === "streaming"
  const isLocked = isBusy || isPublishing || isUploading || selectingAddress !== null
  const latestSearches = new Map<string, string>()
  for (const message of messages) {
    for (const part of message.parts) {
      if (!isToolUIPart(part) || getToolName(part) !== "searchAddress" || part.state !== "output-available") continue
      const result = addressSearchOutputSchema.safeParse(part.output)
      if (result.success) latestSearches.set(result.data.field, part.toolCallId)
    }
  }

  function changeAddress(field: "origin" | "destination", address: AddressResult | null) {
    const searchId = latestSearches.get(field)
    if (searchId && address) setResolvedSearches((current) => [...current, searchId])
    if (field === "origin") onOriginChange(address)
    else onDestChange(address)
  }

  async function sendStarter(text: string) {
    if (isLocked) return
    await sendMessage({ text }, {
      body: { draft, mapboxSessionToken: sessionToken, photoKeys },
    })
  }

  async function selectAddress(field: "origin" | "destination", id: string, label: string) {
    if (isLocked) return
    setSelectingAddress(id)
    setAddressError(null)
    try {
      const result = await api.geo.retrieve(id, sessionToken)
      const feature = result.features[0]
      if (!feature) {
        setAddressError("No pude confirmar esa dirección. Elige otra opción o busca en el borrador.")
        return
      }
      const [lng, lat] = feature.geometry.coordinates
      const address = { address: feature.properties.full_address || label, lat, lng }
      changeAddress(field, address)

      await sendMessage({ text: `Elegí ${address.address} como ${field === "origin" ? "origen" : "destino"}.` }, {
        body: {
          draft: { ...draft, [field === "origin" ? "origin" : "dest"]: address },
          mapboxSessionToken: sessionToken,
          photoKeys,
        },
      })
    } catch {
      setAddressError("No pude confirmar esa dirección. Intenta nuevamente o busca en el borrador.")
    } finally {
      setSelectingAddress(null)
    }
  }

  return (
    <div className="min-h-full bg-muted/30">
      <header className="border-b border-border bg-background px-4 py-4 sm:px-7">
        <div className="mx-auto flex max-w-[1240px] flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Nueva solicitud</h1>
              <Badge variant="secondary"><Sparkles /> Con asistente</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Cuéntanos el flete como lo explicarías por WhatsApp.</p>
          </div>
          <Button variant="outline" className="min-h-11 w-full sm:w-auto" disabled={isLocked} onClick={onManual}>Completar paso a paso</Button>
        </div>
        <div className="mt-3 lg:hidden">
          <Button variant="secondary" asChild className="min-h-11 w-full"><a href="#intake-draft">Revisar borrador <ArrowRight /></a></Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1240px] grid-cols-1 gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:px-7">
        <Card id="intake-chat" className="h-[min(640px,80dvh)] min-h-96 min-w-0 scroll-mt-4 shadow-sm lg:sticky lg:top-4 lg:h-[calc(100dvh-154px)]">
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Bot className="size-4" />
              </div>
              <div>
                <CardTitle>Asistente CargUp</CardTitle>
                <CardDescription>Arma el borrador contigo. Tú decides cuándo enviar la solicitud.</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
            <div ref={conversationRef} onScroll={(event) => {
              const conversation = event.currentTarget
              followLatest.current = conversation.scrollHeight - conversation.scrollTop - conversation.clientHeight < 80
            }} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain pr-1">
              <div className="max-w-[85%] border-l-2 border-primary pl-4 text-sm leading-relaxed">
                Hola, soy el asistente de CargUp. ¿Qué necesitas mover y desde dónde?
              </div>

              {messages.length === 0 && (
                <div className="flex flex-wrap gap-2">
                  {starters.map((starter) => (
                    <Button key={starter} type="button" variant="outline" className="h-auto min-h-11 max-w-full whitespace-normal text-left" disabled={isLocked} onClick={() => sendStarter(starter)}>
                      {starter}
                    </Button>
                  ))}
                </div>
              )}

              {messages.map((message) => (
                <div key={message.id} className={cn("flex flex-col gap-2", message.role === "user" && "items-end")}>
                  {message.parts.map((part, index) => {
                    if (part.type === "text" && part.text.trim()) {
                      return (
                        <div
                          key={`${message.id}-${index}`}
                          className={cn(
                            "min-w-0 max-w-[95%] [overflow-wrap:anywhere] text-sm leading-6 [&_pre]:overflow-x-auto [&_img]:max-w-full sm:max-w-[85%]",
                            message.role === "user"
                              ? "whitespace-pre-wrap rounded-lg bg-foreground px-3 py-2 text-pretty text-background"
                              : "border-l-2 border-primary pl-4 text-foreground",
                          )}
                        >
                          {message.role === "assistant" ? (
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <p className="text-pretty [&:not(:first-child)]:mt-2">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
                                ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
                                li: ({ children }) => <li className="text-pretty pl-0.5">{children}</li>,
                                a: ({ children, href }) => <a className="font-medium text-primary underline underline-offset-4" href={href} target="_blank" rel="noreferrer">{children}</a>,
                              }}
                            >
                              {part.text}
                            </ReactMarkdown>
                          ) : part.text}
                        </div>
                      )
                    }
                    if (!isToolUIPart(part) || part.state !== "output-available") return null

                    const toolName = getToolName(part)
                    if (toolName === "searchAddress") {
                      const result = addressSearchOutputSchema.safeParse(part.output)
                      if (!result.success || latestSearches.get(result.data.field) !== part.toolCallId || resolvedSearches.includes(part.toolCallId)) return null
                      return (
                        <div key={`${message.id}-${index}`} className="w-full max-w-[520px] space-y-2 rounded-lg border bg-background p-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Elige {result.data.field === "origin" ? "el origen" : "el destino"}
                          </p>
                          {result.data.candidates.map((candidate) => (
                            <Button
                              key={candidate.id}
                              type="button"
                              variant="outline"
                              disabled={isLocked}
                              onClick={() => selectAddress(result.data.field, candidate.id, candidate.label)}
                              className="h-auto min-h-11 w-full justify-start whitespace-normal py-3 text-left"
                            >
                              {selectingAddress === candidate.id ? <Loader2 className="animate-spin" /> : <MapPin />}
                              <span className="min-w-0 [overflow-wrap:anywhere]">{candidate.label}</span>
                            </Button>
                          ))}
                        </div>
                      )
                    }
                    if (toolName === "getPriceEstimate") {
                      const result = priceEstimateOutputSchema.safeParse(part.output)
                      if (!result.success) return null
                      return (
                        <Alert key={`${message.id}-${index}`} className="max-w-[520px] border-primary/30 bg-primary/5">
                          <Sparkles className="text-primary" />
                          <AlertDescription>
                            Rango orientativo: <strong className="text-foreground">{formatCLPRange(result.data.estimate.min, result.data.estimate.max)}</strong>
                            {` · ${result.data.estimate.distanceKm} km`}
                          </AlertDescription>
                        </Alert>
                      )
                    }
                    if (toolName === "analyzePhotos") {
                      const result = photoAnalysisOutputSchema.safeParse(part.output)
                      if (!result.success) return null
                      return (
                        <Alert key={`${message.id}-${index}`} className="max-w-[520px]">
                          <Package />
                          <AlertDescription>
                            Detecté {result.data.analysis.items.map(({ quantity, name }) => `${quantity} ${name}`).join(", ")}.
                          </AlertDescription>
                        </Alert>
                      )
                    }
                    return null
                  })}
                </div>
              ))}

              {isBusy && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Revisando tu solicitud…
                </div>
              )}
              {error && <p className="text-sm text-destructive">No pude responder. Intenta nuevamente.</p>}
              {addressError && <p role="alert" className="text-sm text-destructive">{addressError}</p>}
            </div>

            <form
              className="border-t pt-4"
              onSubmit={(event) => {
                event.preventDefault()
                composer.handleSubmit()
              }}
            >
              <composer.Field name="message" validators={{ onBlur: composerSchema }}>
                {(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                    <FieldLabel htmlFor="intake-message" className="sr-only">Mensaje al asistente</FieldLabel>
                      <Textarea
                        id="intake-message"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                            event.preventDefault()
                            composer.handleSubmit()
                          }
                        }}
                        placeholder="Ej: quiero mover un sofá desde Providencia a Ñuñoa…"
                        className="min-h-20 resize-none"
                        disabled={isLocked}
                        aria-invalid={field.state.meta.errors.length > 0}
                      />
                      <Button type="submit" className="min-h-11 self-end" disabled={isLocked || !field.state.value.trim()}>
                        {isBusy ? <Loader2 className="animate-spin" /> : <Send />} Enviar
                      </Button>
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </composer.Field>
            </form>
          </CardContent>
        </Card>

        <aside id="intake-draft" className="flex min-w-0 scroll-mt-4 flex-col gap-4 pb-[env(safe-area-inset-bottom)]">
          <Button variant="outline" asChild className="min-h-11 lg:hidden"><a href="#intake-chat">Volver al asistente</a></Button>
          <Card className="shadow-sm">
            <CardHeader className="border-b">
              <CardTitle>Borrador del flete</CardTitle>
              <CardDescription>Se actualiza mientras conversas. También puedes editarlo aquí.</CardDescription>
              <CardAction>
                <Badge variant={ready && !isLocked ? "default" : "outline"}>{isLocked ? "Actualizando" : ready ? "Listo" : "En progreso"}</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <fieldset disabled={isLocked} inert={isLocked} className="flex min-w-0 flex-col gap-5">
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium"><MapPin className="size-4 text-primary" /> Ruta</div>
                <Field>
                  <FieldLabel>Origen</FieldLabel>
                  <AddressAutocomplete value={draft.origin} disabled={isLocked} onChange={(address) => changeAddress("origin", address)} sessionToken={sessionToken} placeholder="Dirección de retiro" />
                </Field>
                <Field>
                  <FieldLabel>Destino</FieldLabel>
                  <AddressAutocomplete value={draft.dest} disabled={isLocked} onChange={(address) => changeAddress("destination", address)} sessionToken={sessionToken} placeholder="Dirección de entrega" />
                </Field>
              </section>

              <section className="space-y-3 border-t pt-4">
                <div className="flex items-center gap-2 text-sm font-medium"><CalendarDays className="size-4 text-primary" /> Fecha y hora</div>
                {scheduleFields}
                <p className="text-xs text-muted-foreground">{formatDraftDateTime(draft)}</p>
              </section>

              <section className="space-y-3 border-t pt-4">
                <div className="flex items-center gap-2 text-sm font-medium"><Package className="size-4 text-primary" /> Carga</div>
                {cargoFields}
                <PhotoUploader
                  urls={draft.photoUrls}
                  onChange={onPhotosChange}
                  onUploaded={onPhotosUploaded}
                  onRemoved={onPhotoRemoved}
                  disabled={isLocked}
                  onUploadingChange={onUploadingChange}
                />
              </section>
              </fieldset>
              <section className="flex flex-col gap-3 border-t pt-4 text-sm [overflow-wrap:anywhere]">
                <h2 className="font-medium">Revisa los detalles antes de solicitar</h2>
                <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-3 gap-y-2">
                  <dt className="text-muted-foreground">Carga</dt><dd>{draft.volumeCategory ? volumeLabels[draft.volumeCategory] : "Por definir"}</dd>
                  <dt className="text-muted-foreground">Piso en origen</dt><dd>{draft.originFloor || "Sin indicar"} · {draft.originHasElevator ? "Con ascensor" : "Sin ascensor"}</dd>
                  <dt className="text-muted-foreground">Piso en destino</dt><dd>{draft.destFloor || "Sin indicar"} · {draft.destHasElevator ? "Con ascensor" : "Sin ascensor"}</dd>
                  <dt className="text-muted-foreground">Ayudantes</dt><dd>{draft.helpersNeeded === 0 ? "Solo transportista" : draft.helpersNeeded}</dd>
                  <dt className="text-muted-foreground">Presupuesto máximo</dt><dd>{draft.budgetMax ? `$${draft.budgetMax}` : "Sin indicar"}</dd>
                  <dt className="text-muted-foreground">Artículos frágiles</dt><dd>{draft.hasFragileItems ? "Sí" : "No"}</dd>
                  <dt className="text-muted-foreground">Desarme / armado</dt><dd>{draft.assemblyRequired ? "Sí" : "No"}</dd>
                  <dt className="text-muted-foreground">Embalaje</dt><dd>{draft.packingIncluded ? "Sí" : "No"}</dd>
                  <dt className="text-muted-foreground">Acarreo largo</dt><dd>{draft.longCarry ? "Sí" : "No"}</dd>
                  <dt className="text-muted-foreground">Estacionamiento</dt><dd>{draft.parkingType === "street" ? "Calle" : draft.parkingType === "garage" ? "Garage / Estacionamiento" : "Andén de carga"}</dd>
                </dl>
                <p className="whitespace-pre-wrap"><span className="text-muted-foreground">Notas: </span>{draft.notes || "Sin notas adicionales"}</p>
                <Button variant="outline" className="min-h-11" disabled={isLocked} onClick={onManual}>Editar todos los detalles</Button>
              </section>
            </CardContent>
          </Card>

          {publishError && <p className="text-sm text-destructive">{publishError}</p>}
          {isLocked && <p role="status" className="text-center text-xs text-muted-foreground">Espera a que termine la actualización para editar o enviar la solicitud.</p>}
          <Button size="lg" className="min-h-11" disabled={!ready || isLocked} onClick={onPublish}>
            {isPublishing ? <><Loader2 className="animate-spin" /> Enviando…</> : <><CheckCircle2 /> Solicitar flete <ArrowRight /></>}
          </Button>
          {draft.scheduleType === "asap" && <p className="text-center text-xs text-muted-foreground">{asapBookingDescription}</p>}
          {!ready && <p className="text-center text-xs text-muted-foreground">Completa ruta, {draft.scheduleType === "scheduled" ? "fecha y hora futuras, " : ""}volumen y descripción para solicitar el flete.</p>}
        </aside>
      </main>
    </div>
  )
}
