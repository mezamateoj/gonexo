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
