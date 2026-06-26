import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const emailSchema = z.email({ message: "Ingresa un correo válido" });
const passwordSchema = z.string().min(1, "La contraseña es requerida");

const formSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

function LoginPage() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { mode } = useAppMode();
  const [submitError, setSubmitError] = useState<string | null>(null);
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
    <div className="flex h-screen overflow-hidden">
      <div className="relative flex w-[500px] shrink-0 flex-col justify-between overflow-hidden bg-[#121715] p-10">
        <Link to="/requests" className="relative z-10 flex items-center gap-2">
          <div className="flex size-[26px] items-center justify-center rounded-[7px] bg-primary">
            <span className="text-[13px] font-bold text-white">g</span>
          </div>
          <span className="text-[15px] font-semibold text-white">gonexo</span>
        </Link>
        <div
          className="pointer-events-none absolute bg-primary"
          style={{
            width: 340,
            height: 520,
            borderRadius: 170,
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%) rotate(30deg)",
            opacity: 0.85,
          }}
        />
        <div className="relative z-10">
          <p className="text-[38px] font-bold leading-[1.15] tracking-tight text-white">
            Conecta.
            <br />
            Transporta.
            <br />
            Confía.
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-white/45">
            Todo lo que necesitas para mover lo que importa.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-[#FAFAF8]">
        <div className="flex w-[340px] flex-col gap-6">
          <div>
            <h1 className="text-[22px] font-semibold text-[#121715]">
              Bienvenido de vuelta
            </h1>
            <p className="mt-1 text-[14px] text-[#969e9b]">
              Inicia sesión para continuar
            </p>
          </div>

          <div className="flex gap-[2px] rounded-[9px] bg-[#F0EEE9] p-[3px]">
            <span className="flex-1 rounded-[7px] bg-white py-2 text-center text-[13px] font-semibold text-[#121715] shadow-sm">
              Iniciar sesión
            </span>
            <Link
              to="/signup"
              className="flex-1 rounded-[7px] py-2 text-center text-[13px] font-medium text-[#969e9b]"
            >
              Crear cuenta
            </Link>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
            className="flex flex-col gap-4"
          >
            <FieldGroup>
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
                        className="text-[12px] font-medium text-[#485450]"
                      >
                        Correo electrónico
                      </FieldLabel>
                      <Input
                        id={field.name}
                        type="email"
                        placeholder="juan@empresa.cl"
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
                        className="text-[12px] font-medium text-[#485450]"
                      >
                        Contraseña
                      </FieldLabel>
                      <Input
                        id={field.name}
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
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
            </FieldGroup>

            {submitError && (
              <p className="rounded-[8px] bg-red-50 px-3 py-2.5 text-[13px] text-red-600">
                {submitError}
              </p>
            )}

            <form.Subscribe selector={(s) => s.isSubmitting}>
              {(isSubmitting) => (
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Ingresando…" : "Iniciar sesión"}
                </Button>
              )}
            </form.Subscribe>
          </form>

          <p className="text-center text-sm text-[#969e9b]">
            ¿No tienes cuenta?{" "}
            <Link
              to="/signup"
              className="font-medium text-primary underline underline-offset-4"
            >
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
