import { createFileRoute, Navigate, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router"
import { getSession } from "@/lib/auth-client"
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Plus, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
  "/requests": "Mis fletes",
  "/requests/new": "Publicar flete",
  "/jobs": "Mis fletes",
  "/available": "Buscar fletes",
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
      "flex h-[52px] shrink-0 items-center justify-between border-b border-border bg-white px-3 sm:px-6",
      isWizard && "hidden md:flex",
    )}>
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <SidebarTrigger className="text-muted-foreground" />
        <div className="h-5 w-px bg-border" />
        <nav className="hidden min-w-0 items-center gap-1.5 text-sm md:flex">
          <span className="text-muted-foreground">Gonexo</span>
          <span className="text-muted-foreground">/</span>
          <span className="truncate font-medium text-foreground">{currentLabel}</span>
        </nav>
        {mode === "driver" && (
          <Badge>
            <Truck data-icon="inline-start" />
            Transportista
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        {mode === "client" && (
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
  const { mode, hasDriverProfile, hasSelectedMode, isPending } = useAppMode()

  if (isPending) {
    return (
      <div className="flex h-svh bg-background">
        <div className="hidden w-64 shrink-0 flex-col gap-4 border-r border-sidebar-border bg-sidebar p-4 md:flex">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-8 w-4/5" />
          <Skeleton className="h-8 w-3/5" />
        </div>
        <div className="flex flex-1 flex-col">
          <div className="flex h-[52px] items-center border-b border-border px-4">
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="flex flex-1 items-start justify-center p-6">
            <Skeleton className="h-40 w-full max-w-3xl" />
          </div>
        </div>
      </div>
    )
  }

  if (hasDriverProfile && !hasSelectedMode) {
    return <Navigate to="/choose-mode" replace />
  }

  return (
    <SidebarProvider data-app-mode={mode}>
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
