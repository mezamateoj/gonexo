import type { CreateRequestInput } from "@/lib/api"
import { volumeLabels } from "@/lib/display"
import type { Draft, Step } from "@/components/requests/new/types"

export const defaultRequestDraft: Draft = {
  origin: null,
  originFloor: "",
  originHasElevator: false,
  dest: null,
  destFloor: "",
  destHasElevator: false,
  scheduledDate: "",
  scheduledTime: "",
  flexibleDate: false,
  volumeCategory: "",
  itemDescription: "",
  notes: "",
  photoUrls: [],
  budgetMax: "",
  helpersNeeded: 0,
  hasFragileItems: false,
  assemblyRequired: false,
  packingIncluded: false,
  parkingType: "street",
  longCarry: false,
}

export function canAdvanceRequestStep(draft: Draft, step: Step) {
  if (step === 1) return !!draft.origin
  if (step === 2) return !!draft.dest
  if (step === 3) return !!draft.scheduledDate && !!draft.scheduledTime
  if (step === 4) return !!draft.volumeCategory && draft.itemDescription.length >= 5
  return true
}

export function toCreateRequestInput(draft: Draft): CreateRequestInput {
  if (!draft.origin || !draft.dest || !draft.volumeCategory) {
    throw new Error("Completa los campos requeridos")
  }

  return {
    originAddress: draft.origin.address,
    originLat: draft.origin.lat,
    originLng: draft.origin.lng,
    originFloor: draft.originFloor ? parseInt(draft.originFloor) : undefined,
    originHasElevator: draft.originHasElevator,
    destAddress: draft.dest.address,
    destLat: draft.dest.lat,
    destLng: draft.dest.lng,
    destFloor: draft.destFloor ? parseInt(draft.destFloor) : undefined,
    destHasElevator: draft.destHasElevator,
    scheduledAt: new Date(`${draft.scheduledDate}T${draft.scheduledTime}`).toISOString(),
    flexibleDate: draft.flexibleDate,
    volumeCategory: draft.volumeCategory,
    itemDescription: draft.itemDescription,
    notes: draft.notes || undefined,
    photoUrls: draft.photoUrls,
    budgetMax: draft.budgetMax ? parseInt(draft.budgetMax.replace(/\D/g, "")) : undefined,
    helpersNeeded: draft.helpersNeeded,
    hasFragileItems: draft.hasFragileItems,
    assemblyRequired: draft.assemblyRequired,
    packingIncluded: draft.packingIncluded,
    parkingType: draft.parkingType,
    longCarry: draft.longCarry,
  }
}

export function getDraftVolumeLabel(draft: Draft) {
  return draft.volumeCategory ? volumeLabels[draft.volumeCategory] : ""
}

export function formatDraftDate(draft: Draft) {
  return draft.scheduledDate
    ? new Date(`${draft.scheduledDate}T00:00:00`).toLocaleDateString("es-CL", {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Selecciona una fecha"
}

export function formatDraftDateTime(draft: Draft) {
  return draft.scheduledDate && draft.scheduledTime
    ? new Date(`${draft.scheduledDate}T${draft.scheduledTime}`).toLocaleString("es-CL", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—"
}
