import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/jobs/")({
  component: () => (
    <div className="p-8">
      <p className="text-muted-foreground text-sm">Mis trabajos — próximamente</p>
    </div>
  ),
})
