import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GonexoLogo } from "@/components/gonexo-logo";
import { useForm } from "@tanstack/react-form";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { signIn, useSession } from "@/lib/auth-client";
import { useAppMode } from "@/lib/app-mode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const emailSchema = z.email({ message: "Ingresa un correo válido" });
const passwordSchema = z.string().min(1, "La contraseña es requerida");

const formSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

const ACTIVITY_MOBILE = [
  { route: "Providencia → Ñuñoa", meta: "Nueva cotización · Hace 2 min" },
  { route: "Las Condes → Vitacura", meta: "Flete en camino · Hace 9 min" },
];

const STATS = [
  { value: "2.400+", label: "Transportistas" },
  { value: "12.000+", label: "Fletes realizados" },
  { value: "4.8 ★", label: "Nota promedio" },
];

const ACTIVITY = [
  { initials: "C", name: "Carlos R.", info: "Nueva cotización recibida", when: "Hace 2 min", bg: "#0c8c5e" },
  { initials: "A", name: "Ana P.", info: "Solicitud confirmada", when: "Hace 5 min", bg: "#717d79" },
  { initials: "D", name: "Diego M.", info: "Flete en camino", when: "Hace 9 min", bg: "#485450" },
];

// Mobile-only dark header replaces the desktop left panel
function LoginMobileHeader() {
  return (
    <div className="flex flex-col gap-[14px] bg-[#0a0b0f] px-6 pb-8 pt-10 md:hidden">
      <Link to="/">
        <GonexoLogo size="sm" wordmarkClassName="text-[#faf8f5]" />
      </Link>
      <h2 className="text-[28px] font-bold leading-[1.1] tracking-[-0.8px] text-[#faf8f5]">
        Bienvenido<br />de vuelta.
      </h2>
      <p className="text-[14px] leading-[1.5] text-[#717d79]">
        Revisa tus solicitudes y cotizaciones pendientes.
      </p>
      {/* Compact activity card */}
      <div className="overflow-hidden rounded-[10px] border border-[#2a2c32] bg-[#17191e]">
        <div className="border-b border-[#2a2c32] px-[14px] py-3">
          <span className="text-[11px] font-semibold tracking-[0.8px] text-[#485450]">ACTIVIDAD RECIENTE</span>
        </div>
        {ACTIVITY_MOBILE.map(({ route, meta }) => (
          <div key={route} className="flex items-center justify-between border-b border-[#2a2c32] px-[14px] py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-medium text-[#faf8f5]">{route}</span>
              <span className="text-[11px] text-[#485450]">{meta}</span>
            </div>
            <div className="rounded-full px-2.5 py-1" style={{ background: "#18e2991a" }}>
              <span className="text-[11px] font-medium" style={{ color: "#18e299" }}>Activo</span>
            </div>
          </div>
        ))}
        {/* Stats row */}
        <div className="flex items-center justify-between px-[14px] py-3">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col gap-0.5">
              <span className="text-[15px] font-bold text-[#faf8f5]">{s.value}</span>
              <span className="text-[11px] text-[#717d79]">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Desktop-only left panel
function LoginLeftPanel() {
  return (
    <div className="hidden w-[560px] shrink-0 flex-col justify-between bg-[#0a0b0f] px-12 py-10 md:flex">
      <Link to="/">
        <GonexoLogo size="sm" wordmarkClassName="text-[#faf8f5]" />
      </Link>

      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-7">
          <h2 className="text-[44px] font-bold leading-[1.1] tracking-[-1.2px] text-[#faf8f5]">
            Bienvenido<br />de vuelta.
          </h2>
          <p className="w-[420px] text-[15px] leading-[1.6] text-[#717d79]">
            Revisa tus solicitudes activas, cotizaciones pendientes y el estado
            de tus fletes en curso.
          </p>
        </div>

        <div className="w-[464px] overflow-hidden rounded-xl border border-[#2a2c32] bg-[#17191e]">
          <div className="px-[18px] py-[14px]">
            <span className="text-[11px] font-semibold tracking-[0.8px] text-[#485450]">
              ACTIVIDAD RECIENTE
            </span>
          </div>
          {ACTIVITY.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-3 border-t border-[#2a2c32] px-[18px] py-3"
            >
              <div
                className="flex size-[34px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
                style={{ backgroundColor: item.bg }}
              >
                {item.initials}
              </div>
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-medium text-[#faf8f5]">{item.name}</span>
                <span className="text-[12px] text-[#485450]">{item.info}</span>
              </div>
              <span className="text-[11px] text-[#485450]">{item.when}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-[10px]">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="flex flex-1 flex-col gap-1 rounded-[10px] border border-[#2a2c32] bg-[#17191e] px-4 py-[14px]"
          >
            <span className="text-[20px] font-bold text-[#faf8f5]">{s.value}</span>
            <span className="text-[12px] text-[#717d79]">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { mode } = useAppMode();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const handlingSubmit = useRef(false);

  useEffect(() => {
    if (session && !handlingSubmit.current) {
      navigate({ to: mode === "driver" ? "/available" : "/requests" });
    }
  }, [session, navigate, mode]);

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onSubmit: formSchema },
    onSubmit: async ({ value }) => {
      handlingSubmit.current = true;
      setSubmitError(null);
      const { error } = await signIn.email({
        email: value.email,
        password: value.password,
      });
      if (error) {
        handlingSubmit.current = false;
        setSubmitError("Correo o contraseña incorrectos.");
        return;
      }
      navigate({ to: mode === "driver" ? "/available" : "/requests" });
    },
  });

  return (
    <div className="flex min-h-screen flex-col md:h-screen md:flex-row md:overflow-hidden">
      {/* Mobile: dark header on top */}
      <LoginMobileHeader />

      {/* Desktop: dark left panel */}
      <LoginLeftPanel />

      {/* Form area */}
      <div className="flex flex-1 bg-white px-5 py-7 md:items-center md:justify-center md:overflow-y-auto md:px-0 md:py-0">
        <div className="flex w-full flex-col gap-[18px] md:w-[420px] md:py-10">
          <Link
            to="/"
            className="flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-[14px]" />
            Volver al inicio
          </Link>

          <div className="flex flex-col gap-1">
            <h1 className="text-[26px] font-bold tracking-[-0.5px] text-foreground md:text-[28px]">
              Iniciar sesión
            </h1>
            <div className="flex items-center gap-1">
              <span className="text-[14px] text-muted-foreground">¿No tienes cuenta?</span>
              <Link to="/signup" className="text-[14px] font-medium text-primary">
                Regístrate gratis
              </Link>
            </div>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}
            className="flex flex-col gap-5"
          >
            <FieldGroup>
              <form.Field
                name="email"
                validators={{ onChange: emailSchema, onBlur: emailSchema }}
              >
                {(field) => {
                  const isInvalid =
                    field.state.meta.errors.length > 0 &&
                    (field.state.meta.isTouched || form.state.submissionAttempts > 0);
                  return (
                    <Field data-invalid={isInvalid || undefined}>
                      <FieldLabel htmlFor={field.name} className="text-[13px] font-medium">
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
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              </form.Field>

              <form.Field
                name="password"
                validators={{ onChange: passwordSchema, onBlur: passwordSchema }}
              >
                {(field) => {
                  const isInvalid =
                    field.state.meta.errors.length > 0 &&
                    (field.state.meta.isTouched || form.state.submissionAttempts > 0);
                  return (
                    <Field data-invalid={isInvalid || undefined}>
                      <div className="flex items-center justify-between">
                        <FieldLabel htmlFor={field.name} className="text-[13px] font-medium">
                          Contraseña
                        </FieldLabel>
                        <button type="button" className="text-[13px] font-medium text-primary">
                          ¿Olvidaste tu contraseña?
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          id={field.name}
                          type={showPassword ? "text" : "password"}
                          placeholder="Tu contraseña"
                          autoComplete="current-password"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => {
                            field.handleChange(e.target.value);
                            if (submitError) setSubmitError(null);
                          }}
                          aria-invalid={isInvalid}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              </form.Field>
            </FieldGroup>

            <label className="flex cursor-pointer items-center gap-2.5">
              <div
                role="checkbox"
                aria-checked={remember}
                onClick={() => setRemember((v) => !v)}
                className={`flex size-[17px] shrink-0 cursor-pointer items-center justify-center rounded border transition-colors ${remember ? "border-primary bg-primary" : "border-border bg-white"}`}
              >
                {remember && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-[13px] text-muted-foreground">Mantener sesión iniciada</span>
            </label>

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
                  {isSubmitting ? "Ingresando…" : "Iniciar sesión"}
                </Button>
              )}
            </form.Subscribe>
          </form>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[13px] text-muted-foreground">o continúa con</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={() => void signIn.social({ provider: "google" })}
            className="flex w-full items-center justify-center gap-2.5 rounded-[8px] border border-border bg-white py-[13px] text-[14px] font-medium text-foreground transition-colors hover:bg-accent"
          >
            <GoogleIcon />
            Continuar con Google
          </button>

          <p className="text-center text-[12px] leading-[1.5] text-muted-foreground">
            Al continuar, aceptas nuestros Términos y Política de privacidad.
          </p>
        </div>
      </div>
    </div>
  );
}
