import type { CreateRequestInput } from "@/lib/api"
import { volumeLabels } from "@/lib/display"
import type { Draft, Step } from "@/components/requests/new/types"
import { z } from "zod"
import { noContactInfo } from "../../../back/src/lib/content-safety"

export const itemDescriptionSchema = z.string().min(5, "Describe qué vas a mover (mínimo 5 caracteres)").refine(noContactInfo.check, noContactInfo.message)

export const scheduledDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona una fecha válida")
export const scheduledTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Selecciona una hora válida")

export function hasValidDraftSchedule(draft: Pick<Draft, "scheduleType" | "scheduledDate" | "scheduledTime">) {
  return draft.scheduleType === "asap" || (
    scheduledDateSchema.safeParse(draft.scheduledDate).success &&
    scheduledTimeSchema.safeParse(draft.scheduledTime).success &&
    new Date(`${draft.scheduledDate}T${draft.scheduledTime}`).getTime() > Date.now()
  )
}

export const defaultRequestDraft: Draft = {
  origin: null,
  originFloor: "",
  originHasElevator: false,
  dest: null,
  destFloor: "",
  destHasElevator: false,
  scheduleType: "scheduled",
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
  if (step === 3) return hasValidDraftSchedule(draft)
  if (step === 4) return !!draft.volumeCategory && itemDescriptionSchema.safeParse(draft.itemDescription).success
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
    ...(draft.scheduleType === "asap"
      ? { scheduleType: "asap" as const, scheduledAt: null, flexibleDate: false }
      : { scheduleType: "scheduled" as const, scheduledAt: new Date(`${draft.scheduledDate}T${draft.scheduledTime}`).toISOString(), flexibleDate: draft.flexibleDate }),
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
  if (draft.scheduleType === "asap") return "Lo antes posible"
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
  if (draft.scheduleType === "asap") return "Lo antes posible"
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
