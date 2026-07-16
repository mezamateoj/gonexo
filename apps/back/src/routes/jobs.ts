import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, sql, or, asc, desc, like, exists, count, inArray, notInArray, type SQL } from "drizzle-orm";
import { job, review, driverProfile, request, user as userTable } from "../db/schema";
import type { VolumeCategory } from "../lib/pricing";
import { requireAuth, requireDriver } from "../middleware/auth";
import { conflict, forbidden, notFound } from "../lib/errors";
import type { AppEnv } from "../lib/types";
import { sendEmail, confirmReminderEmail } from "../lib/email";
import { advanceJob, cancelScheduledJob, confirmJob } from "../workflows/jobs";
import { throwConflictOnUniqueConstraint } from "../lib/database-errors";

const jobs = new Hono<AppEnv>();

const myJobsQuerySchema = z.object({
  role: z.enum(["client", "driver"]).optional(),
  bucket: z.enum(["active", "history"]).optional(),
  page: z.coerce.number().int().positive().catch(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).catch(20).default(20),
  q: z.string().optional(),
  volume: z.string().optional(),
  sort: z.enum(["recent", "price_asc", "price_desc"]).catch("recent").default("recent"),
});

const VOLUME_CATEGORIES: VolumeCategory[] = ["small", "medium", "large", "full_move"];

// Sortable via the price header; default is newest first.
const MY_JOB_SORTS = {
  recent: [desc(job.createdAt)],
  price_asc: [asc(job.agreedPrice)],
  price_desc: [desc(job.agreedPrice)],
} as const;

// Jobs list for either role. Paginated per bucket (active = running, history =
// completed/cancelled) so it scales; omitting `role`/`bucket` returns the
// caller's full combined set.
jobs.get(
  "/my",
  requireAuth,
  zValidator("query", myJobsQuerySchema),
  async (c) => {
    const db = c.get("db");
    const userId = c.get("user")!.id;
    const { role, bucket, page, limit, q, volume, sort } = c.req.valid("query");
    const offset = (page - 1) * limit;
    const orderBy = MY_JOB_SORTS[sort] ?? MY_JOB_SORTS.recent;

    const conditions: SQL[] = [];
    const roleCond =
      role === "client"
        ? eq(job.userId, userId)
        : role === "driver"
          ? eq(job.driverId, userId)
          : or(eq(job.userId, userId), eq(job.driverId, userId));
    if (roleCond) conditions.push(roleCond);
    if (bucket === "active") conditions.push(notInArray(job.status, ["completed", "cancelled"]));
    else if (bucket === "history") conditions.push(inArray(job.status, ["completed", "cancelled"]));

    // request/counterpart live on related tables — match them via exists subqueries.
    const trimmed = q?.trim();
    if (trimmed) {
      const pattern = `%${trimmed}%`;
      const search = or(
        exists(
          db.select({ x: sql`1` }).from(request).where(
            and(eq(request.id, job.requestId), or(like(request.originAddress, pattern), like(request.destAddress, pattern))),
          ),
        ),
        exists(db.select({ x: sql`1` }).from(userTable).where(and(eq(userTable.id, job.userId), like(userTable.name, pattern)))),
        exists(db.select({ x: sql`1` }).from(userTable).where(and(eq(userTable.id, job.driverId), like(userTable.name, pattern)))),
      );
      if (search) conditions.push(search);
    }
    if (volume) {
      const volumes = volume
        .split(",")
        .filter((v): v is VolumeCategory => VOLUME_CATEGORIES.includes(v as VolumeCategory));
      if (volumes.length > 0) {
        conditions.push(
          exists(
            db.select({ x: sql`1` }).from(request).where(
              and(eq(request.id, job.requestId), inArray(request.volumeCategory, volumes)),
            ),
          ),
        );
      }
    }

    const where = and(...conditions);

    const [results, countRows] = await Promise.all([
      db.query.job.findMany({
        where,
        orderBy: [...orderBy],
        limit,
        offset,
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
      }),
      db.select({ n: count() }).from(job).where(where),
    ]);

    return c.json({ data: results, page, limit, total: countRows[0]?.n ?? 0 });
  },
);

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

jobs.patch("/:id/cancel", requireAuth, async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;

  await cancelScheduledJob(db, user.id, c.req.param("id"));

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
    try {
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
    } catch (error) {
      throwConflictOnUniqueConstraint(error, "You have already reviewed this job");
    }

    return c.json({ ok: true }, 201);
  }
);

export type JobsType = typeof jobs;
export default jobs;
