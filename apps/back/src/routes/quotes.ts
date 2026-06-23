import { Hono } from "hono";
import { eq, and, ne } from "drizzle-orm";
import { quote, request, job } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import type { AppEnv } from "../lib/types";

const PLATFORM_FEE_RATE = 0.12;

const quotes = new Hono<AppEnv>();

// Rejects all other pending quotes on the same request in the same transaction.
quotes.post("/:id/accept", requireAuth, async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  
  const quoteId = c.req.param("id");

  const q = await db.query.quote.findFirst({
    where: and(eq(quote.id, quoteId), eq(quote.status, "pending")),
    with: { request: true },
  });

  if (!q) return c.json({ error: "Quote not found or not pending" }, 404);
  if (q.request.userId !== user.id) return c.json({ error: "Forbidden" }, 403);
  if (q.request.status !== "open")
    return c.json({ error: "Request no longer open" }, 409);

  const agreedPrice = q.price;
  const platformFee = Math.round(agreedPrice * PLATFORM_FEE_RATE);
  const driverPayout = agreedPrice - platformFee;
  const jobId = crypto.randomUUID();

  await db.batch([
    db
      .update(quote)
      .set({ status: "accepted" })
      .where(eq(quote.id, quoteId)),

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

  return c.json({ jobId }, 201);
});

export type QuotesType = typeof quotes;
export default quotes;
