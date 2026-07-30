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
export type AccountType = "client" | "driver"

type AttentionJob = {
  jobId: string
  requestId: string
  createdAt: string
}

export type ClientAttentionJob =
  | AttentionJob & { type: "confirm_reception" }
  | AttentionJob & { type: "review_job" }

export type DriverAttentionJob =
  | AttentionJob & { type: "start_job"; scheduledAt: string }
  | AttentionJob & { type: "mark_arrived" }
  | AttentionJob & { type: "complete_job" }
  | AttentionJob & { type: "review_job" }

export interface AttentionOffersResponse {
  count: number
  offers: {
    requestId: string
    quoteCount: number
    lastOfferAt: string
  }[]
}

export interface AttentionJobsResponse {
  count: number
  jobs: (ClientAttentionJob | DriverAttentionJob)[]
}

export interface AttentionVerificationResponse {
  verification: {
    type: "verification_changes_requested"
    note: string
    createdAt: string
  } | null
}

export type JobStatusUpdate =
  | { status: "on_the_way" | "arrived" }
  | { status: "completed"; confirmCode: string }

export type VehicleType = "van" | "pickup" | "truck_small" | "truck_large"

export type QuoteStatus = "pending" | "accepted" | "rejected" | "expired" | "cancelled"

export type DriverDocumentKind = "license" | "papers" | "vehicle_photo"
export type VerificationDocumentKind = Exclude<DriverDocumentKind, "vehicle_photo">

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
  accountType: AccountType
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
  documentsStatus: DriverVerificationStatus
  createdAt: string
}

export type DriverVerificationStatus = "pending" | "submitted" | "verified"

export type DocumentReviewStatus =
  | "queued"
  | "analyzing"
  | "ready"
  | "analysis_failed"
  | "enqueue_failed"
  | "superseded"

export type DocumentReviewDecision = "verified" | "changes_requested"

export interface DocumentTriageResult {
  documents: {
    key: string
    kind: "license" | "papers"
    documentType:
      | "license"
      | "vehicle_registration"
      | "circulation_permit"
      | "technical_inspection"
      | "other"
    name: string | null
    rut: string | null
    plate: string | null
    expiryDate: string | null
    readable: boolean
    confidence: number
    notes: string[]
  }[]
  flags: { code: string; message: string; documentKey: string | null }[]
}

export interface AdminDocumentReview {
  id: string
  status: DocumentReviewStatus
  result: DocumentTriageResult | null
  analysisAttempts: number
  analyzedAt: string | null
  decision: DocumentReviewDecision | null
  reviewedAt: string | null
  note: string | null
  createdAt: string
  reviewer: { id: string; name: string } | null
}

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
  latestReview: AdminDocumentReview | null
}

export interface AdminDriversResponse {
  data: AdminDriver[]
  page: number
  limit: number
  total: number
}

// Everything /api/admin/users/:id aggregates for the admin user profile page.
export interface AdminUserTally {
  total: number
  completed: number
  cancelled: number
}

export interface AdminUserDetail {
  user: {
    id: string
    name: string
    email: string
    emailVerified: boolean
    phone: string | null
    image: string | null
    role: string
    accountType: AccountType
    banned: boolean | null
    banReason: string | null
    banExpires: string | null
    createdAt: string
    lastActiveAt: string | null
    driverProfile: {
      id: string
      vehicleType: VehicleType
      vehiclePlate: string
      vehicleYear: number | null
      isVerified: boolean
      isAvailable: boolean
      avgRating: number | null
      totalJobs: number
      documentsStatus: DriverVerificationStatus
      createdAt: string
    } | null
  }
  stats: {
    requests: AdminUserTally
    jobsAsClient: AdminUserTally
    jobsAsDriver: AdminUserTally
    quotesSent: number
    reviewsReceived: { count: number; avgRating: number | null }
  }
  recentRequests: {
    id: string
    status: RequestStatus
    originAddress: string
    destAddress: string
    volumeCategory: VolumeCategory
    scheduledAt: string
    createdAt: string
  }[]
  recentJobs: {
    id: string
    status: JobStatus
    agreedPrice: number
    role: JobRole
    createdAt: string
    request: { originAddress: string; destAddress: string }
  }[]
}

export interface UpsertDriverInput {
  phone: string
  vehicleType: VehicleType
  vehiclePlate: string
  vehicleYear?: number
  bio?: string
  documents?: { kind: VerificationDocumentKind; key: string; order: number }[]
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
  id: string
  user: { id: string; name: string; image: string | null }
  vehicleType: VehicleType
  vehicleYear: number | null
  vehicleDescription: string | null
  vehicleCapacity: string | null
  isVerified: boolean
  documentsStatus: string // 'pending' | 'submitted' | 'verified'
  avgRating: number | null
  totalJobs: number
  bio: string | null
  vehiclePhotos: { key: string; order: number }[]
  recentReviews: {
    rating: number
    comment: string | null
    reviewerRole: string
    createdAt: string
    reviewer: { name: string; image: string | null }
  }[]
}

export interface QuoteDriverProfile {
  id: string
  vehicleType: VehicleType
  vehicleDescription: string | null
  vehicleCapacity: string | null
  isVerified: boolean
  documentsStatus: string
  avgRating: number | null
  totalJobs: number
  bio: string | null
}

export interface QuoteWithDriver {
  id: string
  driverId: string
  price: number
  message: string | null
  status: QuoteStatus
  createdAt: string
  driver: {
    id: string
    name: string
    image: string | null
    driverProfile: QuoteDriverProfile | null
  }
}

export interface RequestQuotesResponse {
  count: number
  quotes: QuoteWithDriver[]
}

export type RequestRescueState =
  | "waiting"
  | "offers_available"
  | "offers_expired"
  | "needs_rescue"

export interface MyQuote {
  id: string
  price: number
  message: string | null
  status: QuoteStatus
  createdAt: string
}

// Fair-price advisory band for a request — GET /api/requests/:id/price-range
export interface PriceRange {
  min: number
  mid: number
  max: number
  // Server-enforced acceptance window for POST .../quotes.
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
  myQuote: MyQuote | null
  quoteCount: number
  activeQuoteCount: number
  rescueState: RequestRescueState | null
  republishedFrom: { id: string } | null
  republishedAs: { id: string; scheduledAt: string } | null
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
  quotes: { id: string; status: string; price: number }[]
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
