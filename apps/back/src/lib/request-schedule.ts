import { sql } from "drizzle-orm";
import { z } from "zod";
import { request } from "../db/schema";

export const requestScheduleSchema = z.object({
  scheduleType: z.enum(["scheduled", "asap"]).default("scheduled"),
  scheduledAt: z.string().datetime().nullish(),
  flexibleDate: z.boolean().default(false),
}).refine(
  (value) => value.scheduleType === "asap" ? value.scheduledAt == null : value.scheduledAt != null,
  { path: ["scheduledAt"], message: "Indica una fecha para un flete programado, o ninguna para lo antes posible" },
);

// Evaluated by SQLite at the write, not at an earlier application read.
export const requestDeadlineOpen = sql`(${request.expiresAt} is null or ${request.expiresAt} > cast(unixepoch('subsecond') * 1000 as integer))`;
