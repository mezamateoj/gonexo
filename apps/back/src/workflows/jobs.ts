import { and, eq, exists, gt, inArray, isNull, lt, sql } from "drizzle-orm";
import { job, jobEvent, driverProfile, quote, request } from "../db/schema";
import type { Db } from "../db";
import { paymentAllowsDriverAccess } from "../domain/payments";
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
  if (!paymentAllowsDriverAccess(j.paymentStatus)) {
    throw conflict("Payment approval is required before starting this job");
  }

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
  const claim = and(
    eq(job.id, j.id),
    eq(job.driverId, driverId),
    eq(job.status, j.status),
    inArray(job.paymentStatus, ["approved", "not_required"]),
  );
  const canTransition = exists(
    db.select({ id: job.id }).from(job).where(claim),
  );

  const [, , advanced] = await db.batch([
    db
      .update(request)
      .set({ status: requestStatus })
      .where(and(eq(request.id, j.requestId), canTransition)),
    db.insert(jobEvent).select(
      db
        .select({
          id: sql<string>`${crypto.randomUUID()}`.as("id"),
          jobId: job.id,
          type: sql<string>`${input.status}`.as("type"),
          actorRole: sql<string>`'driver'`.as("actor_role"),
          meta: sql<string | null>`null`.as("meta"),
          createdAt: sql<Date>`cast(unixepoch('subsecond') * 1000 as integer)`.as("created_at"),
        })
        .from(job)
        .where(claim),
    ),
    db
      .update(job)
      .set({ status: input.status, ...timestampUpdates })
      .where(claim)
      .returning({ id: job.id }),
  ]);
  if (advanced.length === 0) throw conflict("Job status changed; refresh and try again");

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

export async function cancelScheduledJob(db: Db, userId: string, jobId: string) {
  const j = await db.query.job.findFirst({
    where: eq(job.id, jobId),
    columns: {
      id: true,
      requestId: true,
      quoteId: true,
      userId: true,
      driverId: true,
      status: true,
      paymentStatus: true,
      cancelledAt: true,
    },
    with: {
      user: { columns: { email: true, name: true } },
      driver: { columns: { email: true, name: true } },
      request: { columns: { originAddress: true, destAddress: true } },
    },
  });
  if (!j) throw notFound("Job not found");

  const actorRole =
    userId === j.userId ? "user" :
    userId === j.driverId ? "driver" :
    null;
  if (!actorRole) throw notFound("Job not found");
  if (j.cancelledAt || j.status === "cancelled") throw conflict("Job already cancelled");
  if (j.status !== "scheduled") throw conflict("Only scheduled jobs can be cancelled");
  if (j.paymentStatus !== "pending" && j.paymentStatus !== "not_required") {
    throw conflict("Paid jobs cannot be cancelled yet");
  }

  const now = new Date();
  const requestStatus = actorRole === "driver" ? "open" : "cancelled";
  const claim = and(
    eq(job.id, j.id),
    eq(job.status, "scheduled"),
    inArray(job.paymentStatus, ["pending", "not_required"]),
  );
  const cancelJob = db
    .update(job)
    .set({
      status: "cancelled",
      cancelledAt: now,
      cancelledByRole: actorRole,
    })
    .where(claim)
    .returning({ id: job.id });
  const wasCancelled = exists(
    db.select({ id: job.id }).from(job).where(and(
      eq(job.id, j.id),
      eq(job.status, "cancelled"),
      eq(job.cancelledAt, now),
      eq(job.cancelledByRole, actorRole),
    )),
  );
  const cancelAcceptedQuote = db
    .update(quote)
    .set({ status: "cancelled" })
    .where(and(eq(quote.id, j.quoteId), wasCancelled));
  const restoreRejectedQuotes = db
    .update(quote)
    .set({ status: "pending" })
    .where(and(
      eq(quote.requestId, j.requestId),
      eq(quote.status, "rejected"),
      gt(quote.expiresAt, now),
      wasCancelled,
    ));
  const updateRequest = db
    .update(request)
    .set({ status: requestStatus })
    .where(and(eq(request.id, j.requestId), wasCancelled));
  const writeEvent = db.insert(jobEvent).select(
    db
      .select({
        id: sql<string>`${crypto.randomUUID()}`.as("id"),
        jobId: job.id,
        type: sql<string>`'cancelled'`.as("type"),
        actorRole: sql<string>`${actorRole}`.as("actor_role"),
        meta: sql<string | null>`null`.as("meta"),
        createdAt: sql<Date>`cast(unixepoch('subsecond') * 1000 as integer)`.as("created_at"),
      })
      .from(job)
      .where(and(eq(job.id, j.id), wasCancelled)),
  );

  const [cancelled] = actorRole === "driver"
    ? await db.batch([
        cancelJob,
        cancelAcceptedQuote,
        restoreRejectedQuotes,
        updateRequest,
        writeEvent,
      ])
    : await db.batch([
        cancelJob,
        cancelAcceptedQuote,
        updateRequest,
        writeEvent,
      ]);
  if (cancelled.length === 0) throw conflict("Job can no longer be cancelled");

  logger.info("Job cancelled: {jobId} by {actorRole} {userId}; request is now {requestStatus}", {
    jobId: j.id,
    actorRole,
    userId,
    requestId: j.requestId,
    requestStatus,
  });

  return {
    cancelledBy: actorRole,
    notifyRecipient: actorRole === "driver" || j.paymentStatus === "not_required",
    recipient: actorRole === "driver" ? j.user : j.driver,
    request: j.request,
    requestId: j.requestId,
  };
}

async function releaseCompletedJob(
  db: Db,
  j: { id: string; driverId: string; requestId: string },
  now: Date,
  actorRole: "user" | "system",
) {
  const isUnconfirmed = exists(
    db
      .select({ id: job.id })
      .from(job)
      .where(and(eq(job.id, j.id), isNull(job.confirmedAt))),
  );

  await db.batch([
    db
      .update(request)
      .set({ status: "completed" })
      .where(and(eq(request.id, j.requestId), isUnconfirmed)),
    db
      .update(driverProfile)
      .set({ totalJobs: sql`${driverProfile.totalJobs} + 1` })
      .where(and(eq(driverProfile.userId, j.driverId), isUnconfirmed)),
    db.insert(jobEvent).select(
      db
        .select({
          id: sql<string>`${crypto.randomUUID()}`.as("id"),
          jobId: job.id,
          type: sql<string>`'confirmed'`.as("type"),
          actorRole: sql<string>`${actorRole}`.as("actor_role"),
          meta: sql<string | null>`null`.as("meta"),
          createdAt: sql<Date>`cast(unixepoch('subsecond') * 1000 as integer)`.as("created_at"),
        })
        .from(job)
        .where(and(eq(job.id, j.id), isNull(job.confirmedAt))),
    ),
    db
      .update(job)
      .set({ confirmedAt: now })
      .where(and(eq(job.id, j.id), isNull(job.confirmedAt))),
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

  await releaseCompletedJob(db, j, new Date(), "user");
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
    await releaseCompletedJob(db, j, now, "system");
  }

  logger.info("Auto-confirmed {count} overdue job(s): {ids}", {
    count: overdue.length,
    ids: overdue.map((j) => j.id),
  });
  return overdue.length;
}
