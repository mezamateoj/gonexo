import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router"
import { getSession } from "@/lib/auth-client"
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAppMode } from "@/lib/app-mode"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session.data) {
      throw redirect({ to: "/login" })
    }
  },
  component: AppLayout,
})

const CRUMBS: Record<string, string> = {
  "/requests": "Mis solicitudes",
  "/requests/new": "Publicar flete",
  "/jobs": "Mis trabajos",
  "/available": "Solicitudes disponibles",
  "/quotes": "Mis cotizaciones",
  "/vehicle": "Mi vehículo",
  "/stats": "Estadísticas",
  "/profile": "Perfil",
}

function TopBar() {
  const { pathname } = useRouterState({ select: (s) => s.location })
  const { mode } = useAppMode()
  const isWizard = pathname === "/requests/new"

  const currentLabel = CRUMBS[pathname] ?? "Gonexo"

  return (
    <header className={cn(
      "flex h-[52px] shrink-0 items-center justify-between border-b border-[#EEEEEE] bg-white px-6",
      isWizard && "hidden md:flex",
    )}>
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground" />
        <div className="h-5 w-px bg-border" />
        <nav className="flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">Gonexo</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium text-foreground">{currentLabel}</span>
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {mode === "client" && (
          <Button size="sm" asChild>
            <Link to="/requests/new">
              <Plus className="size-4" />
              Publicar flete
            </Link>
          </Button>
        )}
      </div>
    </header>
  )
}

function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-[#FAFAFA]">
        <TopBar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
