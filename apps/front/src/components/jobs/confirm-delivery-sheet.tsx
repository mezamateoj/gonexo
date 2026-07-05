import { useState } from "react"
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
  const deliveryForm = useForm({
    defaultValues: { confirmCode: "" },
    validators: { onSubmit: deliveryCodeSchema },
    onSubmit: ({ value }) => submit(value.confirmCode),
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      deliveryForm.reset()
      setPhase("idle")
      setShowEscape(false)
    }
  }

  function submit(value: string) {
    if (value.length < 4 || advance.isPending || phase === "success") return
    advance.mutate(
      { status: "completed", confirmCode: value },
      {
        onSuccess: () => {
          setPhase("success")
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
        <Button type="button" className="h-[38px] w-[200px] text-[13px] font-semibold active:scale-[0.97]">
          <Lock className="size-3.5" data-icon="inline-start" />
          Confirmar entrega
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void deliveryForm.handleSubmit()
          }}
          className="flex flex-col gap-4"
        >
          <SheetHeader className="p-0">
            <SheetTitle className="text-[20px] font-bold tracking-tight text-foreground">
              Confirmar entrega
            </SheetTitle>
            <SheetDescription className="text-[14px] leading-relaxed">
              Pídele al cliente su código de 4 dígitos para confirmar.
            </SheetDescription>
          </SheetHeader>

          <deliveryForm.Field
            name="confirmCode"
            validators={{
              onChange: deliveryCodeSchema.shape.confirmCode,
              onBlur: deliveryCodeSchema.shape.confirmCode,
            }}
          >
            {(field) => {
              const isInvalid =
                phase === "error" ||
                (field.state.meta.errors.length > 0 &&
                  (field.state.meta.isTouched || deliveryForm.state.submissionAttempts > 0))

              return (
                <>
                  <Field data-invalid={isInvalid || undefined} className="items-center gap-3">
                    <FieldLabel htmlFor={field.name} className="sr-only">
                      Código de entrega
                    </FieldLabel>
                    <div className={cn("flex justify-center py-2", phase === "error" && "animate-shake")}>
                      <InputOTP
                        id={field.name}
                        maxLength={4}
                        pattern={REGEXP_ONLY_DIGITS}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(value) => {
                          field.handleChange(value)
                          if (phase === "error") setPhase("idle")
                        }}
                        onComplete={submit}
                        autoFocus
                        disabled={advance.isPending || phase === "success"}
                      >
                        <InputOTPGroup className="gap-3">
                          {[0, 1, 2, 3].map((i) => (
                            <InputOTPSlot
                              key={i}
                              index={i}
                              aria-invalid={isInvalid}
                              className={cn(
                                "size-[68px] rounded-xl border text-[32px] font-bold first:rounded-xl last:rounded-xl",
                                phase === "error" && "border-destructive bg-destructive/5",
                                phase === "success" && "border-green-600 bg-green-50 text-green-600"
                              )}
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    {phase !== "error" && <FieldError errors={field.state.meta.errors} />}
                  </Field>

                  {phase !== "success" && (
                    <SheetFooter className="p-0">
                      <Button
                        type="submit"
                        disabled={field.state.value.length < 4 || advance.isPending}
                        className="h-[50px] w-full text-[16px] font-semibold"
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
              <div className="flex size-12 items-center justify-center rounded-full bg-green-600">
                <Check className="size-6 text-white" />
              </div>
              <p className="text-[14px] font-semibold text-green-600">¡Código correcto!</p>
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
