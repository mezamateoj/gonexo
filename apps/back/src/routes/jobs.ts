import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, sql, or, desc } from "drizzle-orm";
import { job, review, driverProfile } from "../db/schema";
import { requireAuth, requireDriver } from "../middleware/auth";
import type { AppEnv } from "../lib/types";

const jobs = new Hono<AppEnv>();

// Valid driver-side status progression
const STATUS_TRANSITIONS: Record<string, string> = {
  scheduled: "on_the_way",
  on_the_way: "arrived",
  arrived: "completed",
};

// ─── My jobs (user and driver) ────────────────────────────────────────────────
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

// ─── Job detail ───────────────────────────────────────────────────────────────

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
  if (!j) return c.json({ error: "Not found" }, 404);

  const userId = c.get("user")!.id;
  if (j.userId !== userId && j.driverId !== userId)
    return c.json({ error: "Forbidden" }, 403);

  return c.json(j);
});

// ─── Driver advances job status ───────────────────────────────────────────────

const updateStatusSchema = z.object({
  status: z.enum(["on_the_way", "arrived", "completed"]),
});

jobs.patch(
  "/:id/status",
  requireDriver,
  zValidator("json", updateStatusSchema),
  async (c) => {
    const db = c.get("db");
    const driver = c.get("user")!;
    const { status: nextStatus } = c.req.valid("json");

    const j = await db.query.job.findFirst({
      where: and(eq(job.id, c.req.param("id")), eq(job.driverId, driver.id)),
    });
    if (!j) return c.json({ error: "Job not found" }, 404);

    if (STATUS_TRANSITIONS[j.status] !== nextStatus) {
      return c.json(
        { error: `Cannot transition from '${j.status}' to '${nextStatus}'` },
        409
      );
    }

    const now = new Date();
    const timestampUpdates =
      nextStatus === "on_the_way"
        ? { onTheWayAt: now }
        : nextStatus === "arrived"
          ? { arrivedAt: now }
          : { completedAt: now };

    const extra =
      nextStatus === "completed"
        ? {
            // TODO: schedule Upstash QStash job with delay=86400s → POST /api/jobs/:id/confirm
            autoConfirmAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          }
        : {};

    await db
      .update(job)
      .set({ status: nextStatus, ...timestampUpdates, ...extra })
      .where(eq(job.id, j.id));

    return c.json({ status: nextStatus });
  }
);

// ─── User confirms job complete ────────────────────────────────────────────────

jobs.post("/:id/confirm", requireAuth, async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;

  const j = await db.query.job.findFirst({
    where: and(eq(job.id, c.req.param("id")), eq(job.userId, user.id)),
  });
  if (!j) return c.json({ error: "Job not found" }, 404);
  if (j.status !== "completed")
    return c.json({ error: "Job not completed yet" }, 409);
  if (j.confirmedAt) return c.json({ error: "Already confirmed" }, 409);

  await db.batch([
    db
      .update(job)
      .set({ confirmedAt: new Date(), paymentStatus: "released" })
      .where(eq(job.id, j.id)),

    db
      .update(driverProfile)
      .set({ totalJobs: sql`${driverProfile.totalJobs} + 1` })
      .where(eq(driverProfile.userId, j.driverId)),
  ]);

  return c.json({ ok: true });
});

// ─── Submit review (both parties) ─────────────────────────────────────────────

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
    if (!j) return c.json({ error: "Job not found" }, 404);
    if (j.status !== "completed" || !j.confirmedAt)
      return c.json({ error: "Job not yet confirmed" }, 409);

    const isUser = reviewer.id === j.userId;
    const isDriver = reviewer.id === j.driverId;
    if (!isUser && !isDriver) return c.json({ error: "Forbidden" }, 403);

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
