import type { RequestSummary, VolumeCategory, DriverProfile, UpsertDriverInput, EnrichVehicleResult, RequestDetail, JobDetail, JobSummary, MyQuote, PriceRange, AvailableQuery, AvailableResponse } from "./types"

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8787"

type ApiErrorResponse = {
  error?: {
    code: string
    message: string
  }
}

async function readErrorMessage(res: Response, fallback: string) {
  const err = await res.json().catch(() => ({ error: { code: "unknown", message: fallback } })) as ApiErrorResponse
  return err.error?.message ?? fallback
}

// Carries the HTTP status so global handlers can distinguish a dead session
// (401) from ordinary failures (e.g. a 403 role check) without reparsing.
export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    throw new ApiError(await readErrorMessage(res, "Request failed"), res.status)
  }
  return res.json() as Promise<T>
}

export interface CreateRequestInput {
  originAddress: string
  originLat: number
  originLng: number
  originFloor?: number
  originHasElevator: boolean
  destAddress: string
  destLat: number
  destLng: number
  destFloor?: number
  destHasElevator: boolean
  scheduledAt: string
  flexibleDate: boolean
  volumeCategory: VolumeCategory
  itemDescription: string
  notes?: string
  photoUrls: string[]
  budgetMax?: number
  helpersNeeded: number
  hasFragileItems: boolean
  assemblyRequired: boolean
  packingIncluded: boolean
  parkingType: "street" | "garage" | "loading_dock"
  longCarry: boolean
}

export async function uploadFile(file: File): Promise<string> {
  const form = new FormData()
  form.append("file", file)
  const res = await fetch(`${BASE}/api/uploads`, {
    method: "POST",
    credentials: "include",
    body: form,
  })
  if (!res.ok) throw new ApiError(await readErrorMessage(res, "Upload failed"), res.status)
  const data = (await res.json()) as { url: string }
  return data.url
}

export const api = {
  requests: {
    my: () => apiFetch<RequestSummary[]>("/api/requests/my"),
    list: (query: AvailableQuery) => {
      const params = new URLSearchParams({ page: String(query.page), sort: query.sort })
      if (query.volume?.length) params.set("volume", query.volume.join(","))
      if (query.hasPhotos) params.set("hasPhotos", "true")
      return apiFetch<AvailableResponse>(`/api/requests?${params.toString()}`)
    },
    get: (id: string) => apiFetch<RequestDetail>(`/api/requests/${id}`),
    priceRange: (id: string) => apiFetch<PriceRange>(`/api/requests/${id}/price-range`),
    create: (body: CreateRequestInput) =>
      apiFetch<{ id: string }>("/api/requests", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    submitQuote: (requestId: string, body: { priceMin: number; priceMax: number; message?: string }) =>
      apiFetch<{ id: string }>(`/api/requests/${requestId}/quotes`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    cancel: (id: string) =>
      apiFetch<{ ok: boolean }>(`/api/requests/${id}/cancel`, { method: "PATCH" }),
  },
  quotes: {
    my: () => apiFetch<MyQuote[]>("/api/quotes/my"),
    accept: (quoteId: string) =>
      apiFetch<{ jobId: string }>(`/api/quotes/${quoteId}/accept`, { method: "POST" }),
  },
  jobs: {
    my: () => apiFetch<JobSummary[]>("/api/jobs/my"),
    get: (id: string) => apiFetch<JobDetail>(`/api/jobs/${id}`),
    updateStatus: (id: string, status: "on_the_way" | "arrived" | "completed") =>
      apiFetch<{ status: string }>(`/api/jobs/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    confirm: (id: string) =>
      apiFetch<{ ok: boolean }>(`/api/jobs/${id}/confirm`, { method: "POST" }),
    review: (id: string, body: { rating: number; comment?: string }) =>
      apiFetch<{ ok: boolean }>(`/api/jobs/${id}/reviews`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
  geo: {
    suggest: (q: string, session: string) =>
      apiFetch<{ suggestions: { mapbox_id: string; name: string; place_formatted: string }[] }>(
        `/api/geo/suggest?q=${encodeURIComponent(q)}&session=${session}`
      ),
    retrieve: (id: string, session: string) =>
      apiFetch<{ features: { geometry: { coordinates: [number, number] }; properties: { full_address: string } }[] }>(
        `/api/geo/retrieve?id=${encodeURIComponent(id)}&session=${session}`
      ),
  },
  drivers: {
    me: () => apiFetch<DriverProfile | null>("/api/drivers/me"),
    upsertMe: (body: UpsertDriverInput) =>
      apiFetch<{ id: string }>("/api/drivers/me", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    enrich: (body: { photoUrls: string[]; papersUrl?: string }) =>
      apiFetch<EnrichVehicleResult>("/api/drivers/enrich", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
}
