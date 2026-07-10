import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/quotes/")({
  beforeLoad: () => {
    throw redirect({ to: "/available" })
  },
})
