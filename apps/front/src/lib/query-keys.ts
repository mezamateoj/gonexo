export const queryKeys = {
  drivers: {
    me: ["drivers", "me"] as const,
  },
  requests: {
    my: ["requests", "my"] as const,
    available: (page: number) => ["requests", "available", page] as const,
    detail: (id: string) => ["requests", id] as const,
  },
  quotes: {
    my: ["quotes", "my"] as const,
  },
  jobs: {
    my: ["jobs", "my"] as const,
    detail: (id: string) => ["jobs", id] as const,
  },
} as const
