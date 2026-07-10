import { Navigate, createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { getSession, useSession } from "@/lib/auth-client"
import { useAppMode, type AppMode } from "@/lib/app-mode"
import { GonexoLogo } from "@/components/gonexo-logo"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PackageOpen, Truck } from "lucide-react"

export const Route = createFileRoute("/choose-mode")({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session.data) {
      throw redirect({ to: "/login" })
    }
  },
  component: ChooseModePage,
})

const OPTIONS = [
  {
    mode: "client",
    title: "Cliente",
    description: "Publicar y gestionar mis fletes",
    action: "Entrar como cliente",
    destination: "/requests",
    icon: PackageOpen,
  },
  {
    mode: "driver",
    title: "Transportista",
    description: "Buscar fletes y enviar ofertas",
    action: "Entrar como transportista",
    destination: "/available",
    icon: Truck,
  },
] as const

function ChooseModePage() {
  const navigate = useNavigate()
  const { data: session } = useSession()
  const { setMode, hasDriverProfile, isPending } = useAppMode()

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-6">
        <div className="flex w-full max-w-3xl flex-col gap-6">
          <Skeleton className="h-8 w-36" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
          </div>
        </div>
      </div>
    )
  }

  if (!hasDriverProfile) {
    return <Navigate to="/requests" replace />
  }

  function chooseMode(mode: AppMode, destination: "/requests" | "/available") {
    setMode(mode, session?.user.id)
    navigate({ to: destination })
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <div className="flex w-full max-w-3xl flex-col gap-8">
        <GonexoLogo size="sm" />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-foreground">¿Cómo usarás Gonexo hoy?</h1>
          <p className="text-muted-foreground">
            Elige el espacio donde quieres trabajar. Podrás cambiarlo desde tu perfil.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {OPTIONS.map((option) => {
            const Icon = option.icon
            return (
              <Card key={option.mode} className="h-full">
                <CardHeader>
                  <CardTitle>{option.title}</CardTitle>
                  <CardDescription>{option.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex size-12 items-center justify-center rounded-md bg-muted text-foreground">
                    <Icon />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={option.mode === "client" ? "default" : "outline"}
                    onClick={() => chooseMode(option.mode, option.destination)}
                  >
                    {option.action}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </div>
    </main>
  )
}
