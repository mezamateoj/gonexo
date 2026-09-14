import { useEffect, useState } from "react"
import { useForm } from "@tanstack/react-form"
import { REGEXP_ONLY_DIGITS } from "input-otp"
import { Check, CircleAlert, Lock } from "lucide-react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { cn } from "@/lib/utils"
import { fireConfetti, warmConfetti } from "@/lib/celebrate"
import { uploadFile } from "@/lib/api"
import { useAdvanceJobStatus } from "@/hooks/use-request-mutations"
import { JobPhotoInput, jobPhotoSchema } from "./job-photo-input"

type Phase = "idle" | "error" | "success"

const deliveryCodeSchema = z.object({
  confirmCode: z.string().length(4, "Ingresa los 4 dígitos"),
  photo: jobPhotoSchema,
})

export function ConfirmDeliverySheet({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>("idle")
  const [showEscape, setShowEscape] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const advance = useAdvanceJobStatus(jobId)
  // Warm the confetti worker on mount so the success burst is hitch-free.
  useEffect(() => {
    warmConfetti()
  }, [])
  const deliveryForm = useForm({
    defaultValues: { confirmCode: "", photo: undefined as File | undefined },
    validators: { onSubmit: deliveryCodeSchema },
    onSubmit: ({ value }) => submit(value.confirmCode, value.photo!),
  })
  const busy = uploading || advance.isPending

  function handleOpenChange(next: boolean) {
    if (!next && busy) return
    if (!next) {
      deliveryForm.reset()
      setPhase("idle")
      setShowEscape(false)
      setUploadError(null)
    }
    setOpen(next)
  }

  async function submit(confirmCode: string, photo: File) {
    if (confirmCode.length < 4 || busy || phase === "success") return
    setUploadError(null)
    setUploading(true)
    let uploaded
    try {
      uploaded = await uploadFile(photo)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "No pudimos subir la foto")
      setUploading(false)
      return
    }
    setUploading(false)

    try {
      await advance.mutateAsync(
        { status: "completed", confirmCode, photoKey: uploaded.key },
        {
          onSuccess: () => {
            setPhase("success")
            fireConfetti()
            setTimeout(() => handleOpenChange(false), 800)
          },
          onError: () => {
            setPhase("error")
            deliveryForm.setFieldValue("confirmCode", "")
          },
        }
      )
    } catch {
      // The mutation hook shows the backend error.
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button type="button" className="h-[38px] w-[200px] text-[13px] font-semibold transition-transform active:scale-[0.96]">
          <Lock data-icon="inline-start" />
          Confirmar entrega
        </Button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-4 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void deliveryForm.handleSubmit()
          }}
          className="mx-auto flex w-full max-w-md flex-col gap-5"
        >
          <SheetHeader className="items-center gap-1.5 px-8 py-0 text-center">
            <SheetTitle className="text-balance text-[20px] font-bold text-foreground">
              Confirmar entrega
            </SheetTitle>
            <SheetDescription className="text-pretty text-[14px] leading-relaxed">
              Sube una foto final y pídele al cliente su código de 4 dígitos.
            </SheetDescription>
          </SheetHeader>

          <FieldGroup>
            <deliveryForm.Field name="photo" validators={{ onBlur: jobPhotoSchema }}>
              {(field) => (
                <JobPhotoInput
                  id="completed-job-photo"
                  file={field.state.value}
                  errors={field.state.meta.errors}
                  disabled={busy || phase === "success"}
                  onBlur={field.handleBlur}
                  onChange={(file) => {
                    field.handleChange(file)
                    setUploadError(null)
                  }}
                />
              )}
            </deliveryForm.Field>

            <deliveryForm.Field
              name="confirmCode"
              validators={{ onBlur: deliveryCodeSchema.shape.confirmCode }}
            >
              {(field) => {
                const isInvalid =
                  phase === "error" ||
                  (field.state.meta.errors.length > 0 &&
                    (field.state.meta.isTouched || deliveryForm.state.submissionAttempts > 0))

                return (
                  <Field data-invalid={isInvalid || undefined} className="items-center gap-2">
                    <FieldLabel htmlFor={field.name} className="sr-only">
                      Código de entrega
                    </FieldLabel>
                    <div className={cn("flex justify-center py-1", phase === "error" && "animate-shake")}>
                      <InputOTP
                        id={field.name}
                        maxLength={4}
                        pattern={REGEXP_ONLY_DIGITS}
                        value={field.state.value}
                        onChange={(value) => {
                          field.handleChange(value)
                          if (phase === "error") setPhase("idle")
                        }}
                        onBlur={field.handleBlur}
                        disabled={busy || phase === "success"}
                      >
                        <InputOTPGroup className="gap-2 sm:gap-3">
                          {[0, 1, 2, 3].map((i) => (
                            <InputOTPSlot
                              key={i}
                              index={i}
                              aria-invalid={isInvalid}
                              className={cn(
                                "size-14 rounded-lg border text-[28px] font-bold tabular-nums first:rounded-lg last:rounded-lg sm:size-16 sm:rounded-xl sm:text-[32px] sm:first:rounded-xl sm:last:rounded-xl",
                                phase === "error" && "border-destructive bg-destructive/5",
                                phase === "success" && "border-primary bg-primary/5 text-primary"
                              )}
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    {phase !== "error" && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            </deliveryForm.Field>
          </FieldGroup>

          {phase !== "success" && (
            <SheetFooter className="mt-0 gap-1.5 p-0">
              <deliveryForm.Subscribe selector={(state) => state.values}>
                {({ confirmCode, photo }) => (
                  <Button
                    type="submit"
                    disabled={confirmCode.length < 4 || !photo || busy}
                    className="h-11 w-full text-[15px] font-semibold transition-transform active:scale-[0.96]"
                  >
                    {uploading ? "Subiendo foto…" : advance.isPending ? "Confirmando…" : "Confirmar entrega"}
                  </Button>
                )}
              </deliveryForm.Subscribe>
              <Button
                type="button"
                variant="link"
                onClick={() => setShowEscape((value) => !value)}
                className="h-auto p-0 text-[13px] text-muted-foreground"
              >
                El cliente no encuentra su código
              </Button>
              {showEscape && (
                <p className="animate-in fade-in slide-in-from-top-1 text-center text-[12px] leading-relaxed text-muted-foreground">
                  El cliente puede confirmar la recepción manualmente desde su flete. No necesitas hacer nada más.
                </p>
              )}
            </SheetFooter>
          )}

          {uploadError && <p className="text-center text-[13px] text-destructive">{uploadError}</p>}

          {phase === "success" && (
            <div className="animate-in fade-in zoom-in-95 flex flex-col items-center gap-2">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary">
                <Check className="size-6 text-primary-foreground" />
              </div>
              <p className="text-[14px] font-semibold text-primary">¡Código correcto!</p>
            </div>
          )}

          {phase === "error" && (
            <p className="flex items-center justify-center gap-1.5 text-[13px] text-destructive">
              <CircleAlert className="size-3.5 shrink-0" />
              Código incorrecto. Pídele al cliente su código de entrega.
            </p>
          )}
        </form>
      </SheetContent>
    </Sheet>
  )
}
