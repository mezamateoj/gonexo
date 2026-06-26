import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useForm } from "@tanstack/react-form"
import { useEffect, useRef, useState } from "react"
import { z } from "zod"
import { signUp, useSession } from "@/lib/auth-client"
import { useAppMode, type AppMode } from "@/lib/app-mode"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { cn } from "@/lib/utils"
import { Truck, User } from "lucide-react"

export const Route = createFileRoute("/signup")({
  component: SignupPage,
})

const firstNameSchema = z.string().min(1, "Requerido")
const lastNameSchema  = z.string().min(1, "Requerido")
const emailSchema     = z.string().email("Ingresa un correo válido")
const passwordSchema  = z.string().min(8, "Mínimo 8 caracteres")

const formSchema = z.object({
  firstName: firstNameSchema,
  lastName:  lastNameSchema,
  email:     emailSchema,
  password:  passwordSchema,
})

const INTENTS: { key: AppMode; label: string; sub: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "client", label: "Necesito un flete", sub: "Publica solicitudes y contrata transportistas", icon: User },
  { key: "driver", label: "Quiero transportar", sub: "Recibe solicitudes y cotiza fletes", icon: Truck },
]

function DarkPanel() {
  return (
    <div className="relative flex w-[500px] shrink-0 flex-col justify-between overflow-hidden bg-[#121715] p-10">
      <Link to="/requests" className="relative z-10 flex items-center gap-2">
        <div className="flex size-[26px] items-center justify-center rounded-[7px] bg-primary">
          <span className="text-[13px] font-bold text-white">g</span>
        </div>
        <span className="text-[15px] font-semibold text-white">gonexo</span>
      </Link>
      <div
        className="pointer-events-none absolute bg-primary"
        style={{ width: 340, height: 520, borderRadius: 170, top: "50%", left: "50%", transform: "translate(-50%,-50%) rotate(30deg)", opacity: 0.85 }}
      />
      <div className="relative z-10">
        <p className="text-[38px] font-bold leading-[1.15] tracking-tight text-white">Conecta.<br />Transporta.<br />Confía.</p>
        <p className="mt-3 text-[13px] leading-relaxed text-white/45">Todo lo que necesitas para mover lo que importa.</p>
      </div>
    </div>
  )
}

function SignupPage() {
  const navigate = useNavigate()
  const { data: session } = useSession()
  const { setMode } = useAppMode()
  const [intent, setIntent] = useState<AppMode>("client")
  const [submitError, setSubmitError] = useState<string | null>(null)
  const handlingSubmit = useRef(false)

  useEffect(() => {
    if (session && !handlingSubmit.current) {
      navigate({ to: "/requests" })
    }
  }, [session, navigate])

  const form = useForm({
    defaultValues: { firstName: "", lastName: "", email: "", password: "" },
    validators: { onSubmit: formSchema },
    onSubmit: async ({ value }) => {
      handlingSubmit.current = true
      setSubmitError(null)
      const { error } = await signUp.email({
        name: `${value.firstName} ${value.lastName}`.trim(),
        email: value.email,
        password: value.password,
      })
      if (error) {
        handlingSubmit.current = false
        setSubmitError("Error al crear la cuenta. Verifica tus datos e intenta de nuevo.")
        return
      }
      if (intent === "driver") {
        setMode("driver")
        navigate({ to: "/driver-onboarding" })
        return
      }
      setMode("client")
      navigate({ to: "/requests" })
    },
  })

  return (
    <div className="flex h-screen overflow-hidden">
      <DarkPanel />
      <div className="flex flex-1 items-center justify-center overflow-y-auto bg-[#FAFAF8]">
        <div className="flex w-[340px] flex-col gap-6 py-10">
          <div>
            <h1 className="text-[22px] font-semibold text-[#121715]">Crea tu cuenta</h1>
            <p className="mt-1 text-[14px] text-[#969e9b]">Empieza gratis. Sin tarjeta requerida.</p>
          </div>

          <div className="flex gap-[2px] rounded-[9px] bg-[#F0EEE9] p-[3px]">
            <Link to="/login" className="flex-1 rounded-[7px] py-2 text-center text-[13px] font-medium text-[#969e9b]">Iniciar sesión</Link>
            <span className="flex-1 rounded-[7px] bg-white py-2 text-center text-[13px] font-semibold text-[#121715] shadow-sm">Crear cuenta</span>
          </div>

          <div>
            <p className="mb-2 text-[12px] font-medium text-[#485450]">¿Qué quieres hacer?</p>
            <div className="grid grid-cols-2 gap-2">
              {INTENTS.map(({ key, label, sub, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIntent(key)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-[10px] border p-3 text-left transition-colors",
                    intent === key
                      ? "border-2 border-primary bg-white"
                      : "border-[1.5px] border-[#E9E7E3] bg-white hover:border-[#C4C0BA]"
                  )}
                >
                  <Icon className={cn("size-4", intent === key ? "text-primary" : "text-[#969e9b]")} />
                  <span className={cn("text-[12px] font-semibold leading-tight", intent === key ? "text-primary" : "text-[#121715]")}>
                    {label}
                  </span>
                  <span className="text-[11px] leading-tight text-[#969e9b]">{sub}</span>
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}
            className="flex flex-col gap-4"
          >
            <FieldGroup>
              <div className="grid grid-cols-2 gap-3">
                <form.Field
                  name="firstName"
                  validators={{ onChange: firstNameSchema, onBlur: firstNameSchema }}
                >
                  {(field) => {
                    const attempted = form.state.submissionAttempts > 0
                    const isInvalid = (field.state.meta.isTouched || attempted) && field.state.meta.errors.length > 0
                    return (
                      <Field data-invalid={isInvalid || undefined}>
                        <FieldLabel htmlFor={field.name} className="text-[12px] font-medium text-[#485450]">Nombre</FieldLabel>
                        <Input
                          id={field.name}
                          placeholder="Juan"
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
                  name="lastName"
                  validators={{ onChange: lastNameSchema, onBlur: lastNameSchema }}
                >
                  {(field) => {
                    const attempted = form.state.submissionAttempts > 0
                    const isInvalid = (field.state.meta.isTouched || attempted) && field.state.meta.errors.length > 0
                    return (
                      <Field data-invalid={isInvalid || undefined}>
                        <FieldLabel htmlFor={field.name} className="text-[12px] font-medium text-[#485450]">Apellido</FieldLabel>
                        <Input
                          id={field.name}
                          placeholder="Díaz"
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
              </div>

              <form.Field
                name="email"
                validators={{ onChange: emailSchema, onBlur: emailSchema }}
              >
                {(field) => {
                  const attempted = form.state.submissionAttempts > 0
                  const isInvalid = (field.state.meta.isTouched || attempted) && field.state.meta.errors.length > 0
                  return (
                    <Field data-invalid={isInvalid || undefined}>
                      <FieldLabel htmlFor={field.name} className="text-[12px] font-medium text-[#485450]">Correo electrónico</FieldLabel>
                      <Input
                        id={field.name}
                        type="email"
                        placeholder="juan@empresa.cl"
                        autoComplete="email"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => {
                          field.handleChange(e.target.value)
                          if (submitError) setSubmitError(null)
                        }}
                        aria-invalid={isInvalid}
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  )
                }}
              </form.Field>

              <form.Field
                name="password"
                validators={{ onChange: passwordSchema, onBlur: passwordSchema }}
              >
                {(field) => {
                  const attempted = form.state.submissionAttempts > 0
                  const isInvalid = (field.state.meta.isTouched || attempted) && field.state.meta.errors.length > 0
                  return (
                    <Field data-invalid={isInvalid || undefined}>
                      <FieldLabel htmlFor={field.name} className="text-[12px] font-medium text-[#485450]">Contraseña</FieldLabel>
                      <Input
                        id={field.name}
                        type="password"
                        placeholder="Mínimo 8 caracteres"
                        autoComplete="new-password"
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
            </FieldGroup>

            {submitError && (
              <p className="rounded-[8px] bg-red-50 px-3 py-2.5 text-[13px] text-red-600">
                {submitError}
              </p>
            )}

            <form.Subscribe selector={(s) => s.isSubmitting}>
              {(isSubmitting) => (
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
                </Button>
              )}
            </form.Subscribe>
          </form>

          <p className="text-center text-sm text-[#969e9b]">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="font-medium text-primary underline underline-offset-4">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
