import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router"
import { getSession } from "@/lib/auth-client"
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Bell, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session.data) {
      throw redirect({ to: "/login" })
    }
  },
  component: AppLayout,
})

function TopBar() {
  const { pathname } = useRouterState({ select: (s) => s.location })

  const crumbs: Record<string, string> = {
    "/solicitudes": "Mis solicitudes",
    "/solicitudes/nueva": "Nueva solicitud",
    "/trabajos": "Mis trabajos",
    "/disponibles": "Solicitudes disponibles",
    "/estadisticas": "Estadísticas",
  }

  const currentLabel = crumbs[pathname] ?? "Gonexo"

  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-[#EEEEEE] bg-white px-6">
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
        {/* Search hint */}
        <button className="hidden md:flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary/80 transition-colors">
          Buscar...
          <kbd className="pointer-events-none rounded border border-border bg-background px-1 text-[10px]">
            ⌘K
          </kbd>
        </button>

        {/* Notifications */}
        <button className="relative flex size-8 items-center justify-center rounded-md bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors">
          <Bell className="size-4" />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" />
        </button>

        {/* Post button */}
        <Button size="sm" asChild>
          <Link to="/solicitudes/nueva">
            <Plus className="size-4" />
            Publicar flete
          </Link>
        </Button>
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
