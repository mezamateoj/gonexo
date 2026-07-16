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

export type JobRole = "client" | "driver"

export type JobStatusUpdate =
  | { status: "on_the_way" | "arrived" }
  | { status: "completed"; confirmCode: string }

export type VehicleType = "van" | "pickup" | "truck_small" | "truck_large"

export type QuoteStatus = "pending" | "accepted" | "rejected" | "expired" | "cancelled"

export type DriverDocumentKind = "license" | "papers" | "vehicle_photo"

export interface DriverDocument {
  id: string
  driverProfileId: string
  kind: DriverDocumentKind
  key: string
  order: number
  createdAt: string
}

export interface CurrentUser {
  id: string
  name: string
  email: string
  image: string | null
  phone: string | null
}

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
  documents: DriverDocument[]
  vehicleDescription: string | null
  vehicleCapacity: string | null
  documentsStatus: string
  createdAt: string
}

export type DriverVerificationStatus = "pending" | "submitted" | "verified"

// The bare driver_profile row an admin acts on — matches what the verification
// PATCH returns via `.returning()` (no relations joined).
export interface AdminDriverProfile {
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
  vehicleDescription: string | null
  vehicleCapacity: string | null
  documentsStatus: DriverVerificationStatus
  createdAt: string
}

// A driver profile as seen by an admin in the verification queue: the profile
// plus the owning user's contact info and the uploaded documents.
export interface AdminDriver extends AdminDriverProfile {
  user: { id: string; name: string; email: string; phone: string | null }
  documents: DriverDocument[]
}

export interface AdminDriversResponse {
  data: AdminDriver[]
  page: number
  limit: number
  total: number
}

export interface UpsertDriverInput {
  phone: string
  vehicleType: VehicleType
  vehiclePlate: string
  vehicleYear?: number
  bio?: string
  documents?: { kind: DriverDocumentKind; key: string; order: number }[]
  vehicleDescription?: string
  vehicleCapacity?: string
}

export interface EnrichVehicleResult {
  vehicleDescription: string
  vehicleCapacity: string
  attributes: string[]
}

// Public driver profile returned on request-detail quotes — no sensitive fields
export interface PublicDriverProfile {
  vehicleType: VehicleType
  vehicleDescription: string | null
  vehicleCapacity: string | null
  isVerified: boolean
  documentsStatus: string // 'pending' | 'submitted' | 'verified'
  avgRating: number | null
  totalJobs: number
  bio: string | null
}

export interface QuoteWithDriver {
  id: string
  driverId: string
  price: number
  // Null on quotes submitted before range quotes shipped — render as a single
  // price (`price`) rather than a range in that case.
  priceMin: number | null
  priceMax: number | null
  message: string | null
  status: QuoteStatus
  createdAt: string
  driver: {
    id: string
    name: string
    image: string | null
    driverProfile: PublicDriverProfile | null
  }
}

// Fair-price advisory band for a request — GET /api/requests/:id/price-range
export interface PriceRange {
  min: number
  mid: number
  max: number
  // Server-enforced acceptance window for POST .../quotes; the slider spans this.
  acceptableMin: number
  acceptableMax: number
  distanceKm: number
  distanceSource: "mapbox" | "haversine"
  durationS: number | null
  feeRate: number
}

export interface RequestDetail {
  id: string
  userId: string
  status: RequestStatus
  originAddress: string
  // Exact coords are null unless the viewer is the owner or the matched driver.
  originLat: number | null
  originLng: number | null
  originFloor: number | null
  originHasElevator: boolean
  destAddress: string
  destLat: number | null
  destLng: number | null
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
  distanceKm: number
  photos: { id: string; url: string; order: number }[]
  user: { id: string; name: string; image: string | null; phone: string | null }
  quotes: QuoteWithDriver[]
  quoteCount: number
  job: { id: string; status: JobStatus; confirmedAt: string | null } | null
}

export interface OpenRequest {
  id: string
  // Addresses are masked to the zone (street + comuna) and coords are withheld
  // on the feed — drivers never see the exact door before winning the job.
  originAddress: string
  originFloor: number | null
  originHasElevator: boolean
  destAddress: string
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
  quoteCount: number
  myQuoteStatus: QuoteStatus | null
  budgetMax: number | null
  helpersNeeded: number
  hasFragileItems: boolean
  assemblyRequired: boolean
  packingIncluded: boolean
  parkingType: "street" | "garage" | "loading_dock"
  longCarry: boolean
  routeDurationS: number | null
  // Display distance (km) computed server-side, so exact coords stay hidden.
  distanceKm: number
  // Suggested fair price (band midpoint) computed server-side per row.
  fairPrice: number
}

export type AvailableSort = "recent" | "soonest" | "distance"

export interface AvailableQuery {
  page: number
  sort: AvailableSort
  volume?: VolumeCategory[]
  hasPhotos?: boolean
}

export interface AvailableResponse {
  data: OpenRequest[]
  page: number
  limit: number
  total: number
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
  cancelledAt: string | null
  cancelledByRole: "user" | "driver" | null
  confirmCode?: string | null
  confirmCodeUsedAt: string | null
  autoConfirmAt: string | null
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
  cancelledAt: string | null
  cancelledByRole: "user" | "driver" | null
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
  quotes: { id: string; status: string; price: number; priceMin: number | null; priceMax: number | null }[]
  job: { id: string; status: JobStatus; confirmedAt: string | null } | null
}

// Lifecycle buckets for the paginated "Mis fletes" lists.
export type RequestBucket = "offers" | "active" | "history"
export type JobBucket = "active" | "history"

// Sort keys map to sortable table columns (default "recent" = newest first).
export type RequestSort = "recent" | "sched_asc" | "sched_desc"
export type JobSort = "recent" | "price_asc" | "price_desc"

export interface MyRequestsQuery {
  bucket: RequestBucket
  page: number
  q?: string
  volume?: VolumeCategory[]
  sort?: RequestSort
}

export interface MyJobsQuery {
  role: JobRole
  bucket: JobBucket
  page: number
  q?: string
  volume?: VolumeCategory[]
  sort?: JobSort
}

export interface MyRequestsResponse {
  data: RequestSummary[]
  page: number
  limit: number
  total: number
}

export interface MyJobsResponse {
  data: JobSummary[]
  page: number
  limit: number
  total: number
}
