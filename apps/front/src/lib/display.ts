import type { JobStatus, MyQuote, VolumeCategory } from "@/lib/types"

export const volumeLabels: Record<VolumeCategory, string> = {
  small: "Pequeño",
  medium: "Mediano",
  large: "Grande",
  full_move: "Mudanza completa",
}

export const volumeColors: Record<VolumeCategory, string> = {
  small: "bg-blue-50 text-blue-700",
  medium: "bg-amber-50 text-amber-700",
  large: "bg-orange-50 text-orange-700",
  full_move: "bg-red-50 text-red-700",
}

export const requestStatusLabels: Record<string, string> = {
  open: "Abierto",
  accepted: "Aceptado",
  in_progress: "En camino",
  completed: "Completado",
  cancelled: "Cancelado",
}

export const requestStatusClasses: Record<string, string> = {
  open: "bg-[#E7F4EE] text-primary",
  accepted: "bg-[#E7F4EE] text-primary",
  in_progress: "bg-[#E7F4EE] text-primary",
  completed: "bg-[#F5F4F0] text-[#969e9b]",
  cancelled: "bg-[#FEF2F2] text-destructive",
}

export const quoteStatusLabels: Record<MyQuote["status"], string> = {
  pending: "Esperando",
  accepted: "Aceptado",
  rejected: "No elegido",
  expired: "Expirado",
}

export const quoteStatusClasses: Record<MyQuote["status"], string> = {
  pending: "bg-amber-50 text-amber-700",
  accepted: "bg-green-50 text-green-700",
  rejected: "bg-[#F5F4F0] text-[#969e9b]",
  expired: "bg-[#F5F4F0] text-[#969e9b]",
}

export const jobStatusLabels: Record<JobStatus, string> = {
  scheduled: "Agendado",
  on_the_way: "En camino",
  arrived: "En destino",
  completed: "Completado",
  cancelled: "Cancelado",
}

export const jobStatusClasses: Record<JobStatus, string> = {
  scheduled: "bg-blue-50 text-blue-600",
  on_the_way: "bg-amber-50 text-amber-700",
  arrived: "bg-orange-50 text-orange-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
}

export const jobStatusOrder: JobStatus[] = ["scheduled", "on_the_way", "arrived", "completed"]

export const nextJobStatus: Partial<Record<JobStatus, "on_the_way" | "arrived" | "completed">> = {
  scheduled: "on_the_way",
  on_the_way: "arrived",
  arrived: "completed",
}

export const nextJobStatusLabels: Partial<Record<JobStatus, string>> = {
  scheduled: "Marcar en camino",
  on_the_way: "Marcar llegué",
  arrived: "Marcar completado",
}

export const vehicleLabels: Record<string, string> = {
  van: "Furgón",
  pickup: "Camioneta",
  truck_small: "Camión chico",
  truck_large: "Camión grande",
}

export function formatCLP(n: number) {
  return n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 })
}

export function formatPrice(n: number) {
  return `$${n.toLocaleString("es-CL")}`
}

export function formatCLPRange(min: number, max: number) {
  return `${formatCLP(min)} – ${formatCLP(max)}`
}

export function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function formatLongDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatCompactDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatKm(meters: number) {
  return `${(meters / 1000).toFixed(1)} km`
}

export function formatDurationMin(seconds: number) {
  const min = Math.round(seconds / 60)
  if (min < 60) return `~${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `~${h} h` : `~${h} h ${m} min`
}

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function shortAddress(address: string) {
  const parts = address.split(",").map((p) => p.trim())
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0]
}

export function relativeDate(iso: string) {
  const now = new Date()
  const d = new Date(iso)
  const diffDays = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const time = d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })

  if (diffDays < 0) return { label: "Vencida", urgent: true }
  if (diffDays === 0) return { label: `Hoy ${time}`, urgent: true }
  if (diffDays === 1) return { label: `Mañana ${time}`, urgent: true }
  if (diffDays < 7) return { label: `En ${diffDays} días`, urgent: false }

  return {
    label: `${d.toLocaleDateString("es-CL", { day: "numeric", month: "short" })} ${time}`,
    urgent: false,
  }
}

export function floorLine(floor: number | null | undefined, hasElevator: boolean) {
  const floorLabel = floor != null ? `Piso ${floor}` : "Piso 1"
  return `${floorLabel} · ${hasElevator ? "con ascensor" : "sin ascensor"}`
}

export function initials(name?: string | null) {
  return name?.[0]?.toUpperCase() ?? "?"
}
