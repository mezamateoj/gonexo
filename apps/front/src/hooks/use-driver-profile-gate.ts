import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { api } from "@/lib/api"
import { useSession } from "@/lib/auth-client"
import { queryKeys } from "@/lib/query-keys"

export function useDriverProfile() {
  const { data: session } = useSession()
  const userId = session?.user.id

  return useQuery({
    queryKey: queryKeys.drivers.me(userId ?? "anonymous"),
    queryFn: api.drivers.me,
    enabled: !!userId,
  })
}

export function useDriverProfileGate() {
  const navigate = useNavigate()
  const query = useDriverProfile()

  useEffect(() => {
    if (!query.isLoading && !query.data) {
      navigate({ to: "/driver-onboarding" })
    }
  }, [navigate, query.data, query.isLoading])

  return query
}
