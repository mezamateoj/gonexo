import { Hono } from "hono";
import { eq, and, ne, desc } from "drizzle-orm";
import { quote, request, job } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { conflict, forbidden, notFound } from "../lib/errors";
import type { AppEnv } from "../lib/types";
import { logger } from "../lib/logger";

const PLATFORM_FEE_RATE = 0.12;

const quotes = new Hono<AppEnv>();

// Must be before /:id so "my" is not captured as a param.
quotes.get("/my", requireAuth, async (c) => {
  const db = c.get("db");
  const driver = c.get("user")!;

  const results = await db.query.quote.findMany({
    where: eq(quote.driverId, driver.id),
    orderBy: [desc(quote.createdAt)],
    with: {
      request: {
        columns: {
          id: true,
          originAddress: true,
          destAddress: true,
          scheduledAt: true,
          volumeCategory: true,
          status: true,
        },
        with: {
          photos: {
            limit: 1,
            columns: { url: true },
          },
        },
      },
    },
  });

  return c.json(results);
});

// Rejects all other pending quotes on the same request in the same transaction.
quotes.post("/:id/accept", requireAuth, async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;

  const quoteId = c.req.param("id");

  const q = await db.query.quote.findFirst({
    where: and(eq(quote.id, quoteId), eq(quote.status, "pending")),
    with: { request: true },
  });

  if (!q) throw notFound("Quote not found or not pending");
  if (q.request.userId !== user.id) throw forbidden();
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
      .where(and(eq(quote.requestId, q.requestId), ne(quote.id, quoteId))),

    db
      .update(request)
      .set({ status: "accepted" })
      .where(eq(request.id, q.requestId)),

    db.insert(job).values({
      id: jobId,
      requestId: q.requestId,
      quoteId,
      userId: user.id,
      driverId: q.driverId,
      agreedPrice,
      platformFee,
      driverPayout,
    }),
  ]);

  logger.info("Quote accepted → job created: {jobId} (quote {quoteId}, request {requestId})", {
    jobId,
    quoteId,
    requestId: q.requestId,
    driverId: q.driverId,
    clientId: user.id,
    agreedPrice,
    platformFee,
    driverPayout,
  });
  return c.json({ jobId }, 201);
});

export type QuotesType = typeof quotes;
export default quotes;
