export const accountTypes = ["client", "driver"] as const;

export type AccountType = (typeof accountTypes)[number];
