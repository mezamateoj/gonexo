import { and, eq, exists, ne, sql } from "drizzle-orm";
import { job, jobEvent, quote, request } from "../db/schema";
import type { Db } from "../db";
import { conflict, forbidden, notFound } from "../lib/errors";
import { logger } from "../lib/logger";
import { PLATFORM_FEE_RATE } from "../lib/pricing";
import { throwConflictOnUniqueConstraint } from "../lib/database-errors";
import { requestDeadlineOpen } from "../lib/request-schedule";
import { expireOverdueRequests } from "./request-rescue";

export async function acceptQuote(db: Db, userId: string, quoteId: string) {
  await expireOverdueRequests(db);
  const q = await db.query.quote.findFirst({
    where: and(eq(quote.id, quoteId), eq(quote.status, "pending")),
    with: { request: true },
  });

  if (!q) throw notFound("Quote not found or not pending");
  if (q.request.userId !== userId) throw forbidden();
  if (q.request.status !== "open") throw conflict("Request no longer open");
  if (q.expiresAt <= new Date()) {
    await db
      .update(quote)
      .set({ status: "expired" })
      .where(and(eq(quote.id, quoteId), eq(quote.status, "pending")));
    throw conflict("Quote has expired");
  }

  const activeJob = await db.query.job.findFirst({
    where: and(eq(job.requestId, q.requestId), ne(job.status, "cancelled")),
    columns: { id: true },
  });
  if (activeJob) throw conflict("Request already has an active job");

  const agreedPrice = q.price;
  const platformFee = Math.round(agreedPrice * PLATFORM_FEE_RATE);
  const driverPayout = agreedPrice - platformFee;
  const jobId = crypto.randomUUID();
  // Rappi-style handoff code: shown to the client, entered by the driver at
  // delivery to mark the job completed.
  const confirmCode = String(Math.floor(1000 + Math.random() * 9000));
  const wasAccepted = exists(db.select({ id: job.id }).from(job).where(eq(job.id, jobId)));

  try {
    const [inserted] = await db.batch([
    // The job is the claim: every later write depends on this guarded insert.
    db.insert(job).select(db.select({
      id: sql<string>`${jobId}`.as("id"),
      requestId: request.id,
      quoteId: quote.id,
      userId: request.userId,
      driverId: quote.driverId,
      status: sql<string>`'scheduled'`.as("status"),
      agreedPrice: quote.price,
      platformFee: sql<number>`${platformFee}`.as("platform_fee"),
      driverPayout: sql<number>`${driverPayout}`.as("driver_payout"),
      paymentStatus: sql<string>`'pending'`.as("payment_status"),
      onTheWayAt: sql<Date | null>`null`.as("on_the_way_at"),
      arrivedAt: sql<Date | null>`null`.as("arrived_at"),
      beforePhotoKey: sql<string | null>`null`.as("before_photo_key"),
      afterPhotoKey: sql<string | null>`null`.as("after_photo_key"),
      completedAt: sql<Date | null>`null`.as("completed_at"),
      autoConfirmAt: sql<Date | null>`null`.as("auto_confirm_at"),
      confirmedAt: sql<Date | null>`null`.as("confirmed_at"),
      cancelledAt: sql<Date | null>`null`.as("cancelled_at"),
      cancelledByRole: sql<string | null>`null`.as("cancelled_by_role"),
      confirmCode: sql<string>`${confirmCode}`.as("confirm_code"),
      confirmCodeUsedAt: sql<Date | null>`null`.as("confirm_code_used_at"),
      createdAt: sql<Date>`cast(unixepoch('subsecond') * 1000 as integer)`.as("created_at"),
      updatedAt: sql<Date>`cast(unixepoch('subsecond') * 1000 as integer)`.as("updated_at"),
    }).from(quote).innerJoin(request, eq(request.id, quote.requestId)).where(and(
      eq(quote.id, quoteId),
      eq(quote.status, "pending"),
      sql`${quote.expiresAt} > cast(unixepoch('subsecond') * 1000 as integer)`,
      eq(request.status, "open"),
      requestDeadlineOpen,
    ))).returning({ id: job.id }),

    db.update(quote).set({ status: "accepted" }).where(and(eq(quote.id, quoteId), wasAccepted)),

    db
      .update(quote)
      .set({ status: "rejected" })
      .where(
        and(
          eq(quote.requestId, q.requestId),
          ne(quote.id, quoteId),
          eq(quote.status, "pending"),
          wasAccepted,
        ),
      ),

    db
      .update(request)
      .set({ status: "accepted" })
      .where(and(eq(request.id, q.requestId), wasAccepted)),

    db.insert(jobEvent).select(db.select({
      id: sql<string>`${crypto.randomUUID()}`.as("id"),
      jobId: job.id,
      type: sql<string>`'scheduled'`.as("type"),
      actorRole: sql<string>`'user'`.as("actor_role"),
      meta: sql<string>`${JSON.stringify({ quoteId, requestId: q.requestId })}`.as("meta"),
      createdAt: sql<Date>`cast(unixepoch('subsecond') * 1000 as integer)`.as("created_at"),
    }).from(job).where(eq(job.id, jobId))),
    ]);
    if (inserted.length === 0) throw conflict("Request or quote no longer available or has expired");
  } catch (error) {
    throwConflictOnUniqueConstraint(error, "Request already has an active job");
  }

  logger.info("Quote accepted -> job created: {jobId} (quote {quoteId}, request {requestId})", {
    jobId,
    quoteId,
    requestId: q.requestId,
    driverId: q.driverId,
    clientId: userId,
    agreedPrice,
    platformFee,
    driverPayout,
  });

  return { jobId, driverId: q.driverId, agreedPrice, request: q.request };
}
