import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { JobStatusUpdate } from "@/lib/types"

export function useAcceptQuote(requestId: string) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (quoteId: string) => api.quotes.accept(quoteId),
    onSuccess: ({ jobId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.detail(requestId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.myAll })
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.myAll })
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
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.myAll })
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.availableAll })
    },
  })
}

export function useReopenRequest(requestId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.requests.reopen(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.detail(requestId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.myAll })
    },
  })
}

export function useSubmitQuote(requestId: string, onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: { priceMin: number; priceMax: number; message?: string }) =>
      api.requests.submitQuote(requestId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.detail(requestId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.availableAll })
      toast.success("Oferta enviada", {
        description: "Te avisaremos cuando el cliente responda.",
      })
      onSuccess?.()
    },
  })
}

export function useAdvanceJobStatus(jobId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: JobStatusUpdate) => api.jobs.updateStatus(jobId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.myAll })
    },
    onError: (error) => {
      toast.error("No pudimos actualizar el estado", {
        description: error.message,
      })
    },
  })
}

export function useCancelJob(jobId: string, requestId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.jobs.cancel(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.myAll })
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.detail(requestId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.myAll })
    },
  })
}

export function useConfirmJob(jobId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.jobs.confirm(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.myAll })
    },
  })
}

export function useSubmitReview(jobId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: { rating: number; comment?: string }) => api.jobs.review(jobId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.myAll })
    },
  })
}
