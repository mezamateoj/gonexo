import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"

export function useAcceptQuote(requestId: string) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (quoteId: string) => api.quotes.accept(quoteId),
    onSuccess: ({ jobId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.detail(requestId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.my })
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.my })
      navigate({ to: "/jobs/$id", params: { id: jobId } })
    },
  })
}

export function useCancelRequest(requestId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.requests.cancel(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.detail(requestId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.my })
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.available(1) })
    },
  })
}

export function useSubmitQuote(requestId: string, onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: { price: number; message?: string }) => api.requests.submitQuote(requestId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.detail(requestId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes.my })
      onSuccess?.()
    },
  })
}

export function useAdvanceJobStatus(jobId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (status: "on_the_way" | "arrived" | "completed") => api.jobs.updateStatus(jobId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.my })
    },
  })
}

export function useConfirmJob(jobId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.jobs.confirm(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.my })
    },
  })
}
