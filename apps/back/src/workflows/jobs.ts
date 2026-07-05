import { and, eq, isNull, lt, sql } from "drizzle-orm";
import { job, driverProfile, request } from "../db/schema";
import type { Db } from "../db";
import { badRequest, conflict, notFound } from "../lib/errors";
import { logger } from "../lib/logger";

const STATUS_TRANSITIONS = {
  scheduled: "on_the_way",
  on_the_way: "arrived",
  arrived: "completed",
} as const;

export type AdvanceJobInput =
  | { status: "on_the_way" | "arrived" }
  | { status: "completed"; confirmCode?: string };

export async function advanceJob(db: Db, driverId: string, jobId: string, input: AdvanceJobInput) {
  const j = await db.query.job.findFirst({
    where: and(eq(job.id, jobId), eq(job.driverId, driverId)),
    with: {
      user: { columns: { name: true, email: true } },
      request: { columns: { originAddress: true, destAddress: true } },
    },
  });
  if (!j) throw notFound("Job not found");

  if (STATUS_TRANSITIONS[j.status as keyof typeof STATUS_TRANSITIONS] !== input.status) {
    throw conflict(`Cannot transition from '${j.status}' to '${input.status}'`);
  }

  if (input.status === "completed" && j.confirmCode && input.confirmCode !== j.confirmCode) {
    throw badRequest("Código incorrecto. Pídele al cliente su código de entrega.");
  }

  const now = new Date();
  const timestampUpdates =
    input.status === "on_the_way"
      ? { onTheWayAt: now }
      : input.status === "arrived"
        ? { arrivedAt: now }
        : {
            completedAt: now,
            confirmCodeUsedAt: j.confirmCode ? now : null,
            autoConfirmAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          };

  const requestStatus = input.status === "completed" ? "completed" : "in_progress";

  await db.batch([
    db
      .update(job)
      .set({ status: input.status, ...timestampUpdates })
      .where(eq(job.id, j.id)),
    db
      .update(request)
      .set({ status: requestStatus })
      .where(eq(request.id, j.requestId)),
  ]);

  return input.status === "completed"
    ? {
        status: input.status,
        completed: true as const,
        job: {
          id: j.id,
          user: j.user,
          request: j.request,
        },
      }
    : { status: input.status, completed: false as const };
}

async function releaseCompletedJob(db: Db, j: { id: string; driverId: string; requestId: string }, now: Date) {
  await db.batch([
    db
      .update(job)
      .set({ confirmedAt: now, paymentStatus: "released" })
      .where(eq(job.id, j.id)),
    db
      .update(request)
      .set({ status: "completed" })
      .where(eq(request.id, j.requestId)),
    db
      .update(driverProfile)
      .set({ totalJobs: sql`${driverProfile.totalJobs} + 1` })
      .where(eq(driverProfile.userId, j.driverId)),
  ]);
}

export async function confirmJob(db: Db, userId: string, jobId: string) {
  const j = await db.query.job.findFirst({
    where: and(eq(job.id, jobId), eq(job.userId, userId)),
    columns: { id: true, driverId: true, requestId: true, status: true, confirmedAt: true },
  });
  if (!j) throw notFound("Job not found");
  if (j.status !== "completed") throw conflict("Job not completed yet");
  if (j.confirmedAt) throw conflict("Already confirmed");

  await releaseCompletedJob(db, j, new Date());
}

export async function autoConfirmOverdueJobs(db: Db, now = new Date()) {
  const overdue = await db.query.job.findMany({
    where: and(
      eq(job.status, "completed"),
      isNull(job.confirmedAt),
      lt(job.autoConfirmAt, now),
    ),
    columns: { id: true, driverId: true, requestId: true },
  });
  if (overdue.length === 0) return 0;

  for (const j of overdue) {
    await releaseCompletedJob(db, j, now);
  }

  logger.info("Auto-confirmed {count} overdue job(s): {ids}", {
    count: overdue.length,
    ids: overdue.map((j) => j.id),
  });
  return overdue.length;
}
