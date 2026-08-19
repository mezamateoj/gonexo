import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { signUp, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { ArrowLeft, Check, Eye, EyeOff, Package, Truck } from "lucide-react";
import { CargUpLogo } from "@/components/cargup-logo";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

const accountTypeSchema = z.enum(["client", "driver"]);

export const Route = createFileRoute("/signup")({
  validateSearch: z.object({
    accountType: accountTypeSchema.catch("client").default("client"),
  }),
  component: SignupPage,
});

const firstNameSchema = z.string().min(1, "Requerido");
const lastNameSchema = z.string().min(1, "Requerido");
const emailSchema = z.email({ message: "Ingresa un correo válido" });
const phoneSchema = z
  .string()
  .refine((v) => v.replace(/\D/g, "").length >= 8, {
    message: "Ingresa un teléfono válido (+56 9 ...)",
  });
const passwordSchema = z.string().min(8, "Mínimo 8 caracteres");

const formSchema = z.object({
  accountType: accountTypeSchema,
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
});

const BULLETS = [
  "Publica tu solicitud en minutos",
  "Recibe ofertas reales de transportistas",
  "Compara, elige y coordina desde la plataforma",
];

// Mobile-only dark header replaces the desktop left panel
function SignupMobileHeader() {
  return (
    <div className="flex flex-col gap-3 bg-panel px-6 pb-7 pt-10 md:hidden">
      <Link to="/">
        <CargUpLogo size="sm" wordmarkClassName="text-surface" />
      </Link>
      <h2 className="text-[28px] font-bold leading-[1.12] tracking-[-0.8px] text-surface">
        El marketplace
        <br />
        chileno de fletes.
      </h2>
      <p className="text-[13px] leading-[1.5] text-ink-muted">
        Recibe ofertas, compara y elige tranquilo.
      </p>
    </div>
  );
}

// Desktop-only left panel
function SignupLeftPanel() {
  return (
    <div className="hidden w-[560px] shrink-0 flex-col justify-between bg-panel px-12 py-10 md:flex">
      <Link to="/">
        <CargUpLogo size="sm" wordmarkClassName="text-surface" />
      </Link>

      <div className="flex flex-col gap-7">
        <h2 className="text-[40px] font-bold leading-[1.12] tracking-[-1.2px] text-surface">
          El marketplace
          <br />
          chileno de envios
          <br />y mudanzas.
        </h2>
        <div className="flex flex-col gap-[14px]">
          {BULLETS.map((bullet) => (
            <div key={bullet} className="flex items-center gap-3">
              <div className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-primary/12">
                <Check className="size-3 text-primary" />
              </div>
              <span className="text-[15px] leading-[1.4] text-panel-muted">
                {bullet}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-panel-border bg-panel-card p-5">
        <p className="w-[416px] text-[14px] leading-[1.65] text-panel-muted">
          "Publiqué mi mudanza y en menos de una hora ya tenía tres ofertas
          distintas. Elegí la que más me acomodó sin presiones."
        </p>
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-[14px] font-bold text-white">
            M
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-surface">
              Macarena S.
            </span>
            <span className="text-[12px] text-ink-muted">
              Cliente CargUp, Santiago
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignupPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { data: session } = useSession();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptsTerms, setAcceptsTerms] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const handlingSubmit = useRef(false);

  useEffect(() => {
    if (session && !handlingSubmit.current) {
      navigate({
        to: session.user.accountType === "driver" ? "/available" : "/requests",
      });
    }
  }, [session, navigate]);

  const form = useForm({
    defaultValues: {
      accountType: search.accountType,
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
        phone: value.phone,
        accountType: value.accountType,
      });
      if (error) {
        handlingSubmit.current = false;
        setSubmitError(
          "Error al crear la cuenta. Verifica tus datos e intenta de nuevo.",
        );
        return;
      }
      if (value.accountType === "driver") {
        navigate({ to: "/driver-onboarding" });
        return;
      }
      navigate({ to: "/requests" });
    },
  });

  return (
    <div className="flex min-h-screen flex-col md:h-screen md:flex-row md:overflow-hidden">
      {/* Mobile: dark header on top */}
      <SignupMobileHeader />

      {/* Desktop: dark left panel */}
      <SignupLeftPanel />

      {/* Form area */}
      <div className="flex flex-1 bg-white px-5 py-7 md:items-center md:justify-center md:overflow-y-auto md:px-0 md:py-0">
        <div className="flex w-full flex-col gap-5 md:w-[420px] md:py-10">
          <Link
            to="/"
            className="flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-[14px]" />
            Volver al inicio
          </Link>

          <div className="flex flex-col gap-1">
            <h1 className="text-[26px] font-bold tracking-[-0.5px] text-foreground md:text-[28px]">
              Crear cuenta
            </h1>
            <div className="flex items-center gap-1">
              <span className="text-[14px] text-muted-foreground">
                ¿Ya tienes cuenta?
              </span>
              <Link
                to="/login"
                className="text-[14px] font-medium text-primary"
              >
                Inicia sesión
              </Link>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
            className="flex flex-col gap-5"
          >
            <FieldGroup>
              <form.Field name="accountType">
                {(field) => (
                  <Field>
                    <FieldLabel>¿Cómo usarás CargUp?</FieldLabel>
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      value={field.state.value}
                      onValueChange={(value) => {
                        const accountType = accountTypeSchema.safeParse(value);
                        if (accountType.success) field.handleChange(accountType.data);
                      }}
                      className="grid w-full grid-cols-2 gap-2.5"
                      aria-label="Tipo de cuenta"
                    >
                      <ToggleGroupItem
                        value="client"
                        className="min-h-24 flex-col items-start px-3 text-left whitespace-normal"
                      >
                        <Package />
                        <span className="font-semibold">Necesito un flete</span>
                        <span className="text-pretty text-xs font-normal text-muted-foreground">
                          Publica solicitudes, compara ofertas y elige transportista.
                        </span>
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="driver"
                        className="min-h-24 flex-col items-start px-3 text-left whitespace-normal"
                      >
                        <Truck />
                        <span className="font-semibold">Soy transportista</span>
                        <span className="text-pretty text-xs font-normal text-muted-foreground">
                          Registra tu vehículo, busca fletes y envía ofertas.
                        </span>
                      </ToggleGroupItem>
                    </ToggleGroup>
                    <FieldDescription className="text-pretty">
                      Cada cuenta tiene un solo tipo y no se puede cambiar después.
                    </FieldDescription>
                  </Field>
                )}
              </form.Field>

              {/* Nombre + Apellido — stacked on mobile, side-by-side on desktop */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-3">
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

              <form.Field
                name="phone"
                validators={{ onChange: phoneSchema, onBlur: phoneSchema }}
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
                            showPassword
                              ? "Ocultar contraseña"
                              : "Ver contraseña"
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
                  className="h-auto w-full rounded-[9px] py-[15px] text-[15px] font-semibold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
                </Button>
              )}
            </form.Subscribe>
          </form>

          <p className="text-center text-[12px] leading-[1.5] text-muted-foreground">
            Al registrarte, tu información queda protegida y no es compartida
            sin tu consentimiento.
          </p>
        </div>
      </div>
    </div>
  );
}
