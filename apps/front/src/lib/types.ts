export type RequestStatus =
  | "open"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled"

export type VolumeCategory = "small" | "medium" | "large" | "full_move"

export type JobStatus =
  | "scheduled"
  | "on_the_way"
  | "arrived"
  | "completed"
  | "cancelled"

export type VehicleType = "van" | "pickup" | "truck_small" | "truck_large"

export interface DriverProfile {
  id: string
  userId: string
  phone: string
  vehicleType: VehicleType
  vehiclePlate: string
  vehicleYear: number | null
  bio: string | null
  isVerified: boolean
  isAvailable: boolean
  avgRating: number | null
  totalJobs: number
  licenseUrl: string | null
  vehiclePhotos: string | null
  papersUrl: string | null
  vehicleDescription: string | null
  vehicleCapacity: string | null
  documentsStatus: string
  createdAt: string
}

export interface UpsertDriverInput {
  phone: string
  vehicleType: VehicleType
  vehiclePlate: string
  vehicleYear?: number
  bio?: string
  licenseUrl?: string
  vehiclePhotos?: string[]
  papersUrl?: string
  vehicleDescription?: string
  vehicleCapacity?: string
}

export interface EnrichVehicleResult {
  vehicleDescription: string
  vehicleCapacity: string
  attributes: string[]
}

export interface QuoteWithDriver {
  id: string
  driverId: string
  price: number
  message: string | null
  status: string
  createdAt: string
  driver: {
    id: string
    name: string
    image: string | null
    driverProfile: DriverProfile | null
  }
}

export interface RequestDetail {
  id: string
  userId: string
  status: RequestStatus
  originAddress: string
  originLat: number
  originLng: number
  originFloor: number | null
  originHasElevator: boolean
  destAddress: string
  destLat: number
  destLng: number
  destFloor: number | null
  destHasElevator: boolean
  scheduledAt: string
  flexibleDate: boolean
  volumeCategory: VolumeCategory
  itemDescription: string
  notes: string | null
  createdAt: string
  budgetMax: number | null
  helpersNeeded: number
  hasFragileItems: boolean
  assemblyRequired: boolean
  packingIncluded: boolean
  parkingType: "street" | "garage" | "loading_dock"
  longCarry: boolean
  photos: { id: string; url: string; order: number }[]
  user: { id: string; name: string; image: string | null; phone: string | null }
  quotes: QuoteWithDriver[]
}

export interface OpenRequest {
  id: string
  originAddress: string
  originLat: number
  originLng: number
  originFloor: number | null
  originHasElevator: boolean
  destAddress: string
  destLat: number
  destLng: number
  destFloor: number | null
  destHasElevator: boolean
  scheduledAt: string
  flexibleDate: boolean
  volumeCategory: VolumeCategory
  itemDescription: string
  notes: string | null
  photos: { url: string }[]
  user: { name: string; image: string | null }
  quotes: { id: string }[]
  budgetMax: number | null
  helpersNeeded: number
  hasFragileItems: boolean
  assemblyRequired: boolean
  packingIncluded: boolean
  parkingType: "street" | "garage" | "loading_dock"
  longCarry: boolean
}

export interface MyQuote {
  id: string
  requestId: string
  price: number
  message: string | null
  status: "pending" | "accepted" | "rejected" | "expired"
  createdAt: string
  expiresAt: string
  request: {
    id: string
    originAddress: string
    destAddress: string
    scheduledAt: string
    volumeCategory: VolumeCategory
    status: string
    photos: { url: string }[]
  }
}

export interface JobDetail {
  id: string
  requestId: string
  quoteId: string
  userId: string
  driverId: string
  status: JobStatus
  agreedPrice: number
  paymentStatus: string
  onTheWayAt: string | null
  arrivedAt: string | null
  completedAt: string | null
  confirmedAt: string | null
  createdAt: string
  request: {
    id: string
    originAddress: string
    destAddress: string
    scheduledAt: string
    volumeCategory: VolumeCategory
    itemDescription: string
    notes: string | null
    photos: { id: string; url: string; order: number }[]
  }
  user: { id: string; name: string; image: string | null; phone: string | null }
  driver: { id: string; name: string; image: string | null; phone: string | null }
  reviews: { reviewerId: string; reviewerRole: string; rating: number; comment: string | null }[]
}

export interface JobSummary {
  id: string
  status: JobStatus
  agreedPrice: number
  createdAt: string
  request: {
    id: string
    originAddress: string
    destAddress: string
    scheduledAt: string
    volumeCategory: VolumeCategory
    photos: { url: string }[]
  }
  user: { id: string; name: string; image: string | null }
  driver: { id: string; name: string; image: string | null }
  reviews: { reviewerId: string }[]
}

export interface RequestSummary {
  id: string
  status: RequestStatus
  originAddress: string
  destAddress: string
  scheduledAt: string
  volumeCategory: VolumeCategory
  itemDescription: string
  notes: string | null
  createdAt: string
  photos: { url: string }[]
  quotes: { id: string; status: string; price: number }[]
  job: { id: string; status: JobStatus } | null
}
