import { and, eq, isNull, lt, sql } from "drizzle-orm";
import { job, driverProfile } from "../db/schema";
import type { Db } from "../db";
import { logger } from "../lib/logger";

// Cron sweep: jobs the driver marked completed whose 24h confirmation window
// expired without the client confirming. Mirrors POST /api/jobs/:id/confirm —
// releases payment and credits the driver's completed-job count.
export async function autoConfirmOverdueJobs(db: Db) {
  const overdue = await db.query.job.findMany({
    where: and(
      eq(job.status, "completed"),
      isNull(job.confirmedAt),
      lt(job.autoConfirmAt, new Date()),
    ),
    columns: { id: true, driverId: true },
  });
  if (overdue.length === 0) return 0;

  const now = new Date();
  const statements = [
    ...overdue.map((j) =>
      db
        .update(job)
        .set({ confirmedAt: now, paymentStatus: "released" })
        .where(eq(job.id, j.id)),
    ),
    ...overdue.map((j) =>
      db
        .update(driverProfile)
        .set({ totalJobs: sql`${driverProfile.totalJobs} + 1` })
        .where(eq(driverProfile.userId, j.driverId)),
    ),
  ];
  await db.batch([statements[0], ...statements.slice(1)]);

  logger.info("Auto-confirmed {count} overdue job(s): {ids}", {
    count: overdue.length,
    ids: overdue.map((j) => j.id),
  });
  return overdue.length;
}
