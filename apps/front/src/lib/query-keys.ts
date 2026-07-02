import type { AvailableQuery } from "./types"

export const queryKeys = {
  drivers: {
    me: ["drivers", "me"] as const,
  },
  requests: {
    my: ["requests", "my"] as const,
    // Prefix for invalidating every available-feed query regardless of filters.
    availableAll: ["requests", "available"] as const,
    available: (query: AvailableQuery) =>
      ["requests", "available", query.sort, query.page, query.volume ?? [], query.hasPhotos ?? false] as const,
    detail: (id: string) => ["requests", id] as const,
    priceRange: (id: string) => ["requests", id, "price-range"] as const,
  },
  quotes: {
    my: ["quotes", "my"] as const,
  },
  jobs: {
    my: ["jobs", "my"] as const,
    detail: (id: string) => ["jobs", id] as const,
  },
} as const
