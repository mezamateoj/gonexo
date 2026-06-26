import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"

export function useDriverProfile() {
  return useQuery({
    queryKey: queryKeys.drivers.me,
    queryFn: api.drivers.me,
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
