import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from "@tanstack/react-query"
import { routeTree } from "./routeTree.gen"
import { ApiError } from "./lib/api"
import "./index.css"

const router = createRouter({ routeTree })

// A 401 means the session is gone (a 403 role failure is left to surface as a
// normal error). Route through the SPA so we don't hard-reload the page.
function handleAuthError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    router.navigate({ to: "/login" })
  }
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleAuthError }),
  mutationCache: new MutationCache({ onError: handleAuthError }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) =>
        !(error instanceof ApiError && error.status === 401) && count < 3,
    },
  },
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
