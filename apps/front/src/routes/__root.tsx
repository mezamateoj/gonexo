import { createRootRoute, Outlet } from "@tanstack/react-router"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { AppModeProvider } from "@/lib/app-mode"

export const Route = createRootRoute({
  component: () => (
    <AppModeProvider>
      <TooltipProvider delayDuration={300}>
        <Outlet />
        <Toaster position="top-center" />
      </TooltipProvider>
    </AppModeProvider>
  ),
})
