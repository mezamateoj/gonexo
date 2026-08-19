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
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ location }) => {
    const session = await getSession()
    if (!session.data) {
      throw redirect({ to: "/login" })
    }

    const { accountType } = session.data.user
    const isRequestsRoute = location.pathname.startsWith("/requests")
    const isAvailableRoute = location.pathname.startsWith("/available")
    const isJobsIndex = location.pathname === "/jobs" || location.pathname === "/jobs/"

    if (accountType === "driver" && isRequestsRoute) {
      throw redirect({ to: "/available" })
    }
    if (accountType === "client" && (isAvailableRoute || isJobsIndex)) {
      throw redirect({ to: "/requests" })
    }

    return { session: session.data }
  },
  component: AppLayout,
})

const CRUMBS: Record<string, string> = {
  "/requests": "Mis fletes",
  "/requests/new": "Publicar flete",
  "/jobs": "Mis fletes",
  "/available": "Buscar fletes",
  "/profile": "Configuración",
}

function TopBar() {
  const { pathname } = useRouterState({ select: (s) => s.location })
  const { session } = Route.useRouteContext()
  const isWizard = pathname === "/requests/new"

  const currentLabel =
    CRUMBS[pathname] ??
    (pathname.startsWith("/requests/")
      ? pathname.endsWith("/offers")
        ? "Ofertas recibidas"
        : "Detalle del flete"
      : "CargUp")

  return (
    <header className={cn(
      "flex h-[52px] shrink-0 items-center justify-between border-b border-border bg-white px-3 sm:px-6",
      isWizard && "hidden md:flex",
    )}>
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <SidebarTrigger className="text-muted-foreground" />
        <div className="h-5 w-px bg-border" />
        <nav className="hidden min-w-0 items-center gap-1.5 text-sm md:flex">
          <span className="text-muted-foreground">CargUp</span>
          <span className="text-muted-foreground">/</span>
          <span className="truncate font-medium text-foreground">{currentLabel}</span>
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {session.user.accountType === "client" && (
          <Button size="sm" asChild>
            <Link to="/requests/new" aria-label="Publicar flete">
              <Plus data-icon="inline-start" />
              <span className="hidden sm:inline">Publicar flete</span>
            </Link>
          </Button>
        )}
      </div>
    </header>
  )
}

function AppLayout() {
  const { session } = Route.useRouteContext()

  return (
    <SidebarProvider data-account-type={session.user.accountType}>
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-background">
        <TopBar />
        <main className="min-w-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
