import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { AccountType } from "@/lib/types"

const options = {
  staleTime: 10_000,
  refetchInterval: 30_000,
} as const

export function useAttentionQueries(accountType: AccountType | undefined, userId: string | undefined) {
  const keyId = userId ?? "anonymous"
  const enabled = !!accountType && !!userId

  const offers = useQuery({
    queryKey: queryKeys.attention.offers(keyId),
    queryFn: api.attention.offers,
    enabled: enabled && accountType === "client",
    ...options,
  })
  const jobs = useQuery({
    queryKey: queryKeys.attention.jobs(keyId),
    queryFn: api.attention.jobs,
    enabled,
    ...options,
  })
  const verification = useQuery({
    queryKey: queryKeys.attention.verification(keyId),
    queryFn: api.attention.verification,
    enabled: enabled && accountType === "driver",
    ...options,
  })

  return { offers, jobs, verification }
}
