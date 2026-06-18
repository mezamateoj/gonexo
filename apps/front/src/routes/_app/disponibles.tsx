import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/disponibles")({
  component: () => (
    <div className="p-8">
      <p className="text-muted-foreground text-sm">Solicitudes disponibles — próximamente</p>
    </div>
  ),
})
