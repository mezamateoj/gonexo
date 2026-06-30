import { and, eq, ne } from "drizzle-orm";
import { job, quote, request } from "../db/schema";
import type { Db } from "../db";
import { conflict, forbidden, notFound } from "../lib/errors";
import { logger } from "../lib/logger";

const PLATFORM_FEE_RATE = 0.12;

export async function acceptQuote(db: Db, userId: string, quoteId: string) {
  const q = await db.query.quote.findFirst({
    where: and(eq(quote.id, quoteId), eq(quote.status, "pending")),
    with: { request: true },
  });

  if (!q) throw notFound("Quote not found or not pending");
  if (q.request.userId !== userId) throw forbidden();
  if (q.request.status !== "open") throw conflict("Request no longer open");

  const agreedPrice = q.price;
  const platformFee = Math.round(agreedPrice * PLATFORM_FEE_RATE);
  const driverPayout = agreedPrice - platformFee;
  const jobId = crypto.randomUUID();

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

  return { jobId };
}
