import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { signUp } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export const Route = createFileRoute("/signup")({
  component: SignupPage,
})

function SignupPage() {
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const mutation = useMutation({
    mutationFn: () =>
      signUp.email({
        name: `${firstName} ${lastName}`.trim(),
        email,
        password,
      }),
    onSuccess: () => navigate({ to: "/" }),
  })

  const errorMessage =
    mutation.error instanceof Error
      ? mutation.error.message
      : mutation.error
        ? "Sign up failed. Please try again."
        : null

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Left panel ── */}
      <div className="relative flex w-[660px] shrink-0 flex-col justify-between overflow-hidden bg-[#1A1A1A] p-12">
        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary">
            <span className="text-sm font-bold text-white">g</span>
          </div>
          <span className="text-base font-semibold text-white">gonexo</span>
        </div>

        {/* Decorative pill */}
        <div
          className="pointer-events-none absolute bg-primary opacity-90"
          style={{
            width: 320,
            height: 480,
            borderRadius: "160px",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(30deg)",
          }}
        />

        {/* Headline */}
        <div className="relative z-10 flex flex-col gap-3">
          <p className="text-4xl font-bold leading-tight text-white">
            Empieza tu viaje<br />hoy mismo.
          </p>
          <p className="text-sm text-white/50">
            Miles ya están listo/empezando con gonexo.
          </p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex flex-1 items-center justify-center bg-[#FAFAFA]">
        <div className="flex w-[360px] flex-col gap-6">
          {/* Heading */}
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-foreground">Create your account</h1>
            <p className="text-sm text-muted-foreground">Get started free. No credit card required.</p>
          </div>

          {/* Tab toggle */}
          <div className="flex gap-1 rounded-lg bg-secondary p-1">
            <Link
              to="/login"
              className="flex-1 rounded-md py-1.5 text-center text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Log in
            </Link>
            <span className="flex-1 rounded-md bg-background py-1.5 text-center text-sm font-medium text-foreground shadow-sm">
              Sign up
            </span>
          </div>

          {/* Form */}
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              mutation.mutate()
            }}
          >
            {/* First + Last name row */}
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Jane"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Smith"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>

            {errorMessage && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            By creating an account you agree to our{" "}
            <a href="#" className="underline underline-offset-4 hover:text-foreground">Terms of Service</a>
            {" "}and{" "}
            <a href="#" className="underline underline-offset-4 hover:text-foreground">Privacy Policy</a>.
          </p>

          {/* Footer */}
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-foreground underline underline-offset-4">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
