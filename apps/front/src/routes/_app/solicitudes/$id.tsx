import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/solicitudes/$id")({
  component: () => (
    <div className="p-8">
      <p className="text-muted-foreground text-sm">Detalle de solicitud — próximamente</p>
    </div>
  ),
})
