import type { AddressResult } from "@/components/address-autocomplete"
import type { VolumeCategory } from "@/lib/types"

export type Step = 1 | 2 | 3 | 4 | 5 | 6

export interface Draft {
  origin: AddressResult | null
  originFloor: string
  originHasElevator: boolean
  dest: AddressResult | null
  destFloor: string
  destHasElevator: boolean
  scheduledDate: string
  scheduledTime: string
  flexibleDate: boolean
  volumeCategory: VolumeCategory | ""
  itemDescription: string
  notes: string
  photoUrls: string[]
  budgetMax: string
  helpersNeeded: number
  hasFragileItems: boolean
  assemblyRequired: boolean
  packingIncluded: boolean
  parkingType: "street" | "garage" | "loading_dock"
  longCarry: boolean
}
