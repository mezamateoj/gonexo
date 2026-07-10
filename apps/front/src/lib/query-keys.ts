import type { AvailableQuery, MyJobsQuery, MyRequestsQuery } from "./types"

export const queryKeys = {
  users: {
    me: (userId: string) => ["users", "me", userId] as const,
  },
  drivers: {
    me: (userId: string) => ["drivers", "me", userId] as const,
  },
  requests: {
    // Prefix for invalidating my-requests regardless of bucket/page/filters.
    myAll: ["requests", "my"] as const,
    my: (query: MyRequestsQuery) =>
      ["requests", "my", query.bucket, query.page, query.q ?? "", query.volume ?? [], query.sort ?? "recent"] as const,
    // Prefix for invalidating every available-feed query regardless of filters.
    availableAll: ["requests", "available"] as const,
    available: (query: AvailableQuery) =>
      ["requests", "available", query.sort, query.page, query.volume ?? [], query.hasPhotos ?? false] as const,
    detail: (id: string) => ["requests", id] as const,
    priceRange: (id: string) => ["requests", id, "price-range"] as const,
  },
  jobs: {
    myAll: ["jobs", "my"] as const,
    my: (userId: string, query: MyJobsQuery) =>
      ["jobs", "my", userId, query.role, query.bucket, query.page, query.q ?? "", query.volume ?? [], query.sort ?? "recent"] as const,
    detail: (id: string) => ["jobs", id] as const,
  },
} as const
