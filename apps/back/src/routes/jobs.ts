import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, sql, or, desc } from "drizzle-orm";
import { job, review, driverProfile } from "../db/schema";
import { requireAuth, requireDriver } from "../middleware/auth";
import { conflict, forbidden, notFound } from "../lib/errors";
import type { AppEnv } from "../lib/types";
import { sendEmail, confirmReminderEmail } from "../lib/email";
import { advanceJob, confirmJob } from "../workflows/jobs";

const jobs = new Hono<AppEnv>();

// Must be before /:id.
jobs.get("/my", requireAuth, async (c) => {
  const db = c.get("db");
  const userId = c.get("user")!.id;

  const results = await db.query.job.findMany({
    where: or(eq(job.userId, userId), eq(job.driverId, userId)),
    orderBy: [desc(job.createdAt)],
    with: {
      request: {
        columns: {
          id: true,
          originAddress: true,
          destAddress: true,
          scheduledAt: true,
          volumeCategory: true,
        },
        with: {
          photos: {
            limit: 1,
            columns: { url: true },
          },
        },
      },
      user: { columns: { id: true, name: true, image: true } },
      driver: { columns: { id: true, name: true, image: true } },
      reviews: { columns: { reviewerId: true } },
    },
  });

  return c.json(results);
});

jobs.get("/:id", requireAuth, async (c) => {
  const db = c.get("db");
  const j = await db.query.job.findFirst({
    where: eq(job.id, c.req.param("id")),
    with: {
      request: { with: { photos: true } },
      quote: true,
      user: { columns: { id: true, name: true, image: true, phone: true } },
      driver: { columns: { id: true, name: true, image: true, phone: true } },
      reviews: true,
    },
  });
  if (!j) throw notFound();

  const userId = c.get("user")!.id;
  if (j.userId !== userId && j.driverId !== userId)
    throw forbidden();

  // The handoff code belongs to the client — the driver must get it in person.
  if (userId !== j.userId) {
    const { confirmCode: _confirmCode, ...withoutCode } = j;
    return c.json(withoutCode);
  }
  return c.json(j);
});

const updateStatusSchema = z.object({
  status: z.enum(["on_the_way", "arrived", "completed"]),
  confirmCode: z.string().optional(),
});

jobs.patch(
  "/:id/status",
  requireDriver,
  zValidator("json", updateStatusSchema),
  async (c) => {
    const db = c.get("db");
    const driver = c.get("user")!;
    const { status: nextStatus, confirmCode } = c.req.valid("json");

    const result = await advanceJob(
      db,
      driver.id,
      c.req.param("id"),
      nextStatus === "completed"
        ? { status: nextStatus, confirmCode }
        : { status: nextStatus },
    );

    if (result.completed) {
      c.executionCtx.waitUntil(
        sendEmail(c.env, result.job.user.email, confirmReminderEmail({
          clientName: result.job.user.name,
          origin: result.job.request.originAddress,
          dest: result.job.request.destAddress,
          jobId: result.job.id,
          frontendUrl: c.env.FRONTEND_URL,
        })),
      );
    }

    return c.json({ status: nextStatus });
  }
);

jobs.post("/:id/confirm", requireAuth, async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;

  await confirmJob(db, user.id, c.req.param("id"));

  return c.json({ ok: true });
});

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

jobs.post(
  "/:id/reviews",
  requireAuth,
  zValidator("json", createReviewSchema),
  async (c) => {
    const db = c.get("db");
    const reviewer = c.get("user")!;
    const { rating, comment } = c.req.valid("json");

    const j = await db.query.job.findFirst({
      where: eq(job.id, c.req.param("id")),
    });
    if (!j) throw notFound("Job not found");
    if (j.status !== "completed" || !j.confirmedAt)
      throw conflict("Job not yet confirmed");

    const isUser = reviewer.id === j.userId;
    const isDriver = reviewer.id === j.driverId;
    if (!isUser && !isDriver) throw forbidden();

    const revieweeId = isUser ? j.driverId : j.userId;
    const reviewerRole = isUser ? "user" : "driver";

    const insertReview = db.insert(review).values({
      id: crypto.randomUUID(),
      jobId: j.id,
      reviewerId: reviewer.id,
      revieweeId,
      reviewerRole,
      rating,
      comment: comment ?? null,
    });

    // Keep avg_rating denormalized so profile fetches stay cheap.
    if (revieweeId === j.driverId) {
      await db.batch([
        insertReview,
        db
          .update(driverProfile)
          .set({
            avgRating: sql`(
              SELECT CAST(AVG(rating) AS REAL) FROM review
              WHERE reviewee_id = ${j.driverId} AND reviewer_role = 'user'
            )`,
          })
          .where(eq(driverProfile.userId, j.driverId)),
      ]);
    } else {
      await insertReview;
    }

    return c.json({ ok: true }, 201);
  }
);

export type JobsType = typeof jobs;
export default jobs;
