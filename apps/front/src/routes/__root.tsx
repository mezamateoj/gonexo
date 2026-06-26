import { createRootRoute, Outlet } from "@tanstack/react-router"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppModeProvider } from "@/lib/app-mode"

export const Route = createRootRoute({
  component: () => (
    <AppModeProvider>
      <TooltipProvider delayDuration={300}>
        <Outlet />
      </TooltipProvider>
    </AppModeProvider>
  ),
})
