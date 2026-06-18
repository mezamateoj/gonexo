import type { RequestSummary, VolumeCategory } from "./types"

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8787"

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }))
    throw new Error((err as { error?: string }).error ?? "Request failed")
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
  volumeCategory: VolumeCategory
  itemDescription: string
  notes?: string
  photoUrls: string[]
}

export async function uploadFile(file: File): Promise<string> {
  const form = new FormData()
  form.append("file", file)
  const res = await fetch(`${BASE}/api/uploads`, {
    method: "POST",
    credentials: "include",
    body: form,
  })
  if (!res.ok) throw new Error("Upload failed")
  const data = (await res.json()) as { url: string }
  return data.url
}

export const api = {
  requests: {
    my: () => apiFetch<RequestSummary[]>("/api/requests/my"),
    create: (body: CreateRequestInput) =>
      apiFetch<{ id: string }>("/api/requests", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
}
