import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { signUp, useSession } from "@/lib/auth-client";
import { useAppMode, type AppMode } from "@/lib/app-mode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check, Eye, EyeOff } from "lucide-react";
import { GonexoLogo } from "@/components/gonexo-logo";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

const firstNameSchema = z.string().min(1, "Requerido");
const lastNameSchema = z.string().min(1, "Requerido");
const emailSchema = z.email({ message: "Ingresa un correo válido" });
const phoneSchema = z.string();
const passwordSchema = z.string().min(8, "Mínimo 8 caracteres");

const formSchema = z.object({
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
});

const BULLETS = [
  "Publica tu solicitud en minutos",
  "Recibe cotizaciones reales de transportistas",
  "Compara, elige y coordina desde la plataforma",
];

function SignupLeftPanel() {
  return (
    <div className="flex w-[560px] shrink-0 flex-col justify-between bg-[#0a0b0f] px-12 py-10">
      <Link to="/">
        <GonexoLogo size="sm" wordmarkClassName="text-[#faf8f5]" />
      </Link>

      <div className="flex flex-col gap-7">
        <h2 className="text-[40px] font-bold leading-[1.12] tracking-[-1.2px] text-[#faf8f5]">
          El marketplace
          <br />
          chileno de fletes
          <br />y mudanzas.
        </h2>
        <div className="flex flex-col gap-[14px]">
          {BULLETS.map((bullet) => (
            <div key={bullet} className="flex items-center gap-3">
              <div className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[#0c8c5e20]">
                <Check className="size-3 text-primary" />
              </div>
              <span className="text-[15px] leading-[1.4] text-[#d9d7d4]">
                {bullet}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-[#2a2c32] bg-[#17191e] p-5">
        <p className="w-[416px] text-[14px] leading-[1.65] text-[#d9d7d4]">
          "Publiqué mi mudanza y en menos de una hora ya tenía tres
          cotizaciones distintas. Elegí la que más me acomodó sin presiones."
        </p>
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-[14px] font-bold text-white">
            M
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-[#faf8f5]">
              Macarena S.
            </span>
            <span className="text-[12px] text-[#717d79]">
              Cliente gonexo, Santiago
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignupPage() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { setMode } = useAppMode();
  const [intent, setIntent] = useState<AppMode>("client");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptsTerms, setAcceptsTerms] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const handlingSubmit = useRef(false);

  useEffect(() => {
    if (session && !handlingSubmit.current) {
      navigate({ to: "/requests" });
    }
  }, [session, navigate]);

  const form = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
    },
    validators: { onSubmit: formSchema },
    onSubmit: async ({ value }) => {
      if (!acceptsTerms) {
        setTermsError(true);
        return;
      }
      handlingSubmit.current = true;
      setSubmitError(null);
      const { error } = await signUp.email({
        name: `${value.firstName} ${value.lastName}`.trim(),
        email: value.email,
        password: value.password,
      });
      if (error) {
        handlingSubmit.current = false;
        setSubmitError(
          "Error al crear la cuenta. Verifica tus datos e intenta de nuevo.",
        );
        return;
      }
      if (intent === "driver") {
        setMode("driver");
        navigate({ to: "/driver-onboarding" });
        return;
      }
      setMode("client");
      navigate({ to: "/requests" });
    },
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <SignupLeftPanel />

      <div className="flex flex-1 items-center justify-center overflow-y-auto bg-white">
        <div className="flex w-[420px] flex-col gap-6 py-10">
          <Link
            to="/"
            className="flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-[15px]" />
            Volver al inicio
          </Link>

          <div className="flex flex-col gap-1.5">
            <h1 className="text-[28px] font-bold tracking-[-0.5px] text-foreground">
              Crear cuenta
            </h1>
            <div className="flex items-center gap-1">
              <span className="text-[14px] text-muted-foreground">
                ¿Ya tienes cuenta?
              </span>
              <Link to="/login" className="text-[14px] font-medium text-primary">
                Inicia sesión
              </Link>
            </div>
          </div>

          <div className="flex gap-0.5 rounded-[10px] bg-secondary p-1">
            {(
              [
                { key: "client" as AppMode, label: "Soy cliente" },
                { key: "driver" as AppMode, label: "Soy transportista" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setIntent(key)}
                className={cn(
                  "flex-1 rounded-[7px] py-[9px] text-center text-[14px] transition-all",
                  intent === key
                    ? "bg-white font-semibold text-foreground shadow-sm"
                    : "font-medium text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
            className="flex flex-col gap-5"
          >
            <FieldGroup>
              <div className="grid grid-cols-2 gap-3">
                <form.Field
                  name="firstName"
                  validators={{
                    onChange: firstNameSchema,
                    onBlur: firstNameSchema,
                  }}
                >
                  {(field) => {
                    const isInvalid =
                      field.state.meta.errors.length > 0 &&
                      (field.state.meta.isTouched ||
                        form.state.submissionAttempts > 0);
                    return (
                      <Field data-invalid={isInvalid || undefined}>
                        <FieldLabel
                          htmlFor={field.name}
                          className="text-[13px] font-medium"
                        >
                          Nombre
                        </FieldLabel>
                        <Input
                          id={field.name}
                          placeholder="Juan"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                </form.Field>

                <form.Field
                  name="lastName"
                  validators={{
                    onChange: lastNameSchema,
                    onBlur: lastNameSchema,
                  }}
                >
                  {(field) => {
                    const isInvalid =
                      field.state.meta.errors.length > 0 &&
                      (field.state.meta.isTouched ||
                        form.state.submissionAttempts > 0);
                    return (
                      <Field data-invalid={isInvalid || undefined}>
                        <FieldLabel
                          htmlFor={field.name}
                          className="text-[13px] font-medium"
                        >
                          Apellido
                        </FieldLabel>
                        <Input
                          id={field.name}
                          placeholder="Díaz"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                </form.Field>
              </div>

              <form.Field
                name="email"
                validators={{ onChange: emailSchema, onBlur: emailSchema }}
              >
                {(field) => {
                  const isInvalid =
                    field.state.meta.errors.length > 0 &&
                    (field.state.meta.isTouched ||
                      form.state.submissionAttempts > 0);
                  return (
                    <Field data-invalid={isInvalid || undefined}>
                      <FieldLabel
                        htmlFor={field.name}
                        className="text-[13px] font-medium"
                      >
                        Correo electrónico
                      </FieldLabel>
                      <Input
                        id={field.name}
                        type="email"
                        placeholder="tú@correo.cl"
                        autoComplete="email"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => {
                          field.handleChange(e.target.value);
                          if (submitError) setSubmitError(null);
                        }}
                        aria-invalid={isInvalid}
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>

              <form.Field name="phone">
                {(field) => (
                  <Field>
                    <FieldLabel
                      htmlFor={field.name}
                      className="text-[13px] font-medium"
                    >
                      Teléfono
                    </FieldLabel>
                    <Input
                      id={field.name}
                      type="tel"
                      placeholder="+56 9 1234 5678"
                      autoComplete="tel"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </Field>
                )}
              </form.Field>

              <form.Field
                name="password"
                validators={{
                  onChange: passwordSchema,
                  onBlur: passwordSchema,
                }}
              >
                {(field) => {
                  const isInvalid =
                    field.state.meta.errors.length > 0 &&
                    (field.state.meta.isTouched ||
                      form.state.submissionAttempts > 0);
                  return (
                    <Field data-invalid={isInvalid || undefined}>
                      <FieldLabel
                        htmlFor={field.name}
                        className="text-[13px] font-medium"
                      >
                        Contraseña
                      </FieldLabel>
                      <div className="relative">
                        <Input
                          id={field.name}
                          type={showPassword ? "text" : "password"}
                          placeholder="Mínimo 8 caracteres"
                          autoComplete="new-password"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={
                            showPassword ? "Ocultar contraseña" : "Ver contraseña"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>
            </FieldGroup>

            <div className="flex flex-col gap-1">
              <div
                className="flex cursor-pointer items-start gap-2.5"
                onClick={() => {
                  setAcceptsTerms((v) => !v);
                  setTermsError(false);
                }}
              >
                <div
                  className={cn(
                    "mt-0.5 flex size-[17px] shrink-0 items-center justify-center rounded border transition-colors",
                    acceptsTerms
                      ? "border-primary bg-primary"
                      : "border-border bg-white",
                    termsError && !acceptsTerms && "border-destructive",
                  )}
                >
                  {acceptsTerms && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path
                        d="M1 4L3.5 6.5L9 1"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-1 text-[13px] text-muted-foreground">
                  <span>Acepto los</span>
                  <span className="font-medium text-primary">
                    Términos de servicio
                  </span>
                  <span>y la</span>
                  <span className="font-medium text-primary">
                    Política de privacidad
                  </span>
                </div>
              </div>
              {termsError && !acceptsTerms && (
                <p className="text-[12px] text-destructive">
                  Debes aceptar los términos para continuar
                </p>
              )}
            </div>

            {submitError && (
              <p className="rounded-[8px] bg-red-50 px-3 py-2.5 text-[13px] text-red-600">
                {submitError}
              </p>
            )}

            <form.Subscribe selector={(s) => s.isSubmitting}>
              {(isSubmitting) => (
                <Button
                  type="submit"
                  className="h-auto w-full rounded-[9px] py-[14px] text-[15px] font-semibold"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Creando cuenta…"
                    : intent === "client"
                      ? "Crear cuenta de cliente"
                      : "Crear cuenta de transportista"}
                </Button>
              )}
            </form.Subscribe>
          </form>

          <p className="text-center text-[12px] text-muted-foreground">
            Al registrarte, tu información queda protegida y no es compartida
            sin tu consentimiento.
          </p>
        </div>
      </div>
    </div>
  );
}
