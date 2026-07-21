import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { getSession } from "@/lib/auth-client"

// Layout for the /admin section. The _app parent already ensured a session;
// here we additionally require the admin role and bounce everyone else.
export const Route = createFileRoute("/_app/admin")({
  beforeLoad: async () => {
    const session = await getSession()
    if (session.data?.user.role !== "admin") {
      throw redirect({ to: "/requests" })
    }
  },
  component: () => <Outlet />,
})
