import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { quote } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import type { AppEnv } from "../lib/types";
import { acceptQuote } from "../workflows/quotes";

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
  const { jobId } = await acceptQuote(db, user.id, quoteId);
  return c.json({ jobId }, 201);
});

export type QuotesType = typeof quotes;
export default quotes;
