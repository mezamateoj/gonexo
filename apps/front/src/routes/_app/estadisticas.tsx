import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/estadisticas")({
  component: () => (
    <div className="p-8">
      <p className="text-muted-foreground text-sm">Estadísticas — próximamente</p>
    </div>
  ),
})
