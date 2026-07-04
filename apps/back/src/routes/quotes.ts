import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { quote, user } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import type { AppEnv } from "../lib/types";
import { acceptQuote } from "../workflows/quotes";
import { sendEmail, quoteAcceptedEmail } from "../lib/email";

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
  const client = c.get("user")!;
  const quoteId = c.req.param("id");
  const { jobId, driverId, agreedPrice, request: req } = await acceptQuote(db, client.id, quoteId);

  c.executionCtx.waitUntil(
    (async () => {
      const driver = await db.query.user.findFirst({
        where: eq(user.id, driverId),
        columns: { name: true, email: true },
      });
      if (!driver) return;
      await sendEmail(c.env, driver.email, quoteAcceptedEmail({
        driverName: driver.name,
        origin: req.originAddress,
        dest: req.destAddress,
        agreedPrice,
        jobId,
        frontendUrl: c.env.FRONTEND_URL,
      }));
    })(),
  );

  return c.json({ jobId }, 201);
});

export type QuotesType = typeof quotes;
export default quotes;
