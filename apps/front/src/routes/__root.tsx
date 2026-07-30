import { createRootRoute, Outlet } from "@tanstack/react-router"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"

export const Route = createRootRoute({
  component: () => (
    <TooltipProvider delayDuration={300}>
      <Outlet />
      <Toaster position="top-center" />
    </TooltipProvider>
  ),
})
