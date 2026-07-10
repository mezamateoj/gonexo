import { useEffect, useState } from "react"
import { useForm } from "@tanstack/react-form"
import { REGEXP_ONLY_DIGITS } from "input-otp"
import { Check, CircleAlert, Lock } from "lucide-react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
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
import { useAdvanceJobStatus } from "@/hooks/use-request-mutations"

type Phase = "idle" | "error" | "success"

const deliveryCodeSchema = z.object({
  confirmCode: z.string().length(4, "Ingresa los 4 dígitos"),
})

export function ConfirmDeliverySheet({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>("idle")
  const [showEscape, setShowEscape] = useState(false)
  const advance = useAdvanceJobStatus(jobId)
  // Warm the confetti worker on mount so the success burst is hitch-free.
  useEffect(() => {
    warmConfetti()
  }, [])
  const deliveryForm = useForm({
    defaultValues: { confirmCode: "" },
    validators: { onSubmit: deliveryCodeSchema },
    onSubmit: ({ value }) => submit(value.confirmCode),
  })

  function handleOpenChange(next: boolean) {
    if (!next) {
      deliveryForm.reset()
      setPhase("idle")
      setShowEscape(false)
    }
    setOpen(next)
  }

  function submit(value: string) {
    if (value.length < 4 || advance.isPending || phase === "success") return
    advance.mutate(
      { status: "completed", confirmCode: value },
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
              Pídele al cliente su código de 4 dígitos para confirmar.
            </SheetDescription>
          </SheetHeader>

          <deliveryForm.Field
            name="confirmCode"
          >
            {(field) => {
              const isInvalid =
                phase === "error" ||
                (field.state.meta.errors.length > 0 &&
                  (field.state.meta.isTouched || deliveryForm.state.submissionAttempts > 0))

              return (
                <>
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
                        autoFocus
                        disabled={advance.isPending || phase === "success"}
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

                  {phase !== "success" && (
                    <SheetFooter className="mt-0 gap-1.5 p-0">
                      <Button
                        type="submit"
                        disabled={field.state.value.length < 4 || advance.isPending}
                        className="h-11 w-full text-[15px] font-semibold transition-transform active:scale-[0.96]"
                      >
                        {advance.isPending ? "Confirmando…" : "Confirmar entrega"}
                      </Button>
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => setShowEscape((v) => !v)}
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
                </>
              )
            }}
          </deliveryForm.Field>

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
