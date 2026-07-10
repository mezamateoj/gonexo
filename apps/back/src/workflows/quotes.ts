import { and, eq, ne } from "drizzle-orm";
import { job, jobEvent, quote, request } from "../db/schema";
import type { Db } from "../db";
import { conflict, forbidden, notFound } from "../lib/errors";
import { logger } from "../lib/logger";
import { PLATFORM_FEE_RATE } from "../lib/pricing";

export async function acceptQuote(db: Db, userId: string, quoteId: string) {
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

  await db.batch([
    db.update(quote).set({ status: "accepted" }).where(eq(quote.id, quoteId)),

    db
      .update(quote)
      .set({ status: "rejected" })
      .where(
        and(
          eq(quote.requestId, q.requestId),
          ne(quote.id, quoteId),
          eq(quote.status, "pending"),
        ),
      ),

    db
      .update(request)
      .set({ status: "accepted" })
      .where(eq(request.id, q.requestId)),

    db.insert(job).values({
      id: jobId,
      requestId: q.requestId,
      quoteId,
      userId,
      driverId: q.driverId,
      agreedPrice,
      platformFee,
      driverPayout,
      confirmCode,
    }),

    db.insert(jobEvent).values({
      id: crypto.randomUUID(),
      jobId,
      type: "scheduled",
      actorRole: "user",
      meta: JSON.stringify({ quoteId, requestId: q.requestId }),
    }),
  ]);

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
