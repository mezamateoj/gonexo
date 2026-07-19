import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { asc, avg, count, desc, eq, or, type SQL } from "drizzle-orm";
import { documentTriageResultSchema } from "../ai/document-review";
import { documentReview, driverDocument, driverProfile, job, quote, request, review, session, user } from "../db/schema";
import { requireAdmin } from "../middleware/auth";
import { badRequest, notFound } from "../lib/errors";
import type { Db } from "../db";
import type { AppEnv } from "../lib/types";

// All routes here sit under /api/admin and require an admin session. Users
// list/search comes from the Better Auth admin plugin (`/api/auth/admin/*`);
// this module owns driver verification and the per-user profile page.
const admin = new Hono<AppEnv>();

admin.use("*", requireAdmin);

// Shared load + serialization for queue rows and the single expediente page.
async function loadAdminDrivers(db: Db, where: SQL, limit: number, offset: number) {
  const profiles = await db.query.driverProfile.findMany({
    where,
    limit,
    offset,
    with: {
      user: { columns: { id: true, name: true, email: true, phone: true } },
      documents: { orderBy: [asc(driverDocument.order)] },
      documentReviews: {
        limit: 1,
        orderBy: [desc(documentReview.createdAt)],
        // The `documents` snapshot blob is only needed by the analysis
        // worker; keep it out of the payload.
        columns: {
          id: true,
          status: true,
          result: true,
          analysisAttempts: true,
          analyzedAt: true,
          decision: true,
          reviewedAt: true,
          note: true,
          createdAt: true,
        },
        with: {
          reviewer: { columns: { id: true, name: true } },
        },
      },
    },
    // Stable chronological order by profile creation; not bumped by later
    // edits (updatedAt would be). Precise submission-time ordering arrives
    // with the Fase 3 review row.
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });

  return profiles.map(({ documentReviews, ...profile }) => {
    const review = documentReviews[0];
    return {
      ...profile,
      latestReview: review
        ? {
            id: review.id,
            status: review.status,
            result: review.result
              ? documentTriageResultSchema.parse(JSON.parse(review.result))
              : null,
            analysisAttempts: review.analysisAttempts,
            analyzedAt: review.analyzedAt,
            decision: review.decision,
            reviewedAt: review.reviewedAt,
            note: review.note,
            createdAt: review.createdAt,
            reviewer: review.reviewer,
          }
        : null,
    };
  });
}

// Driver verification queue. Defaults to `submitted` — the profiles waiting
// on a human decision — but any status can be requested. Paginated server-side
// so the (unbounded) verified tab never loads the whole table at once.
admin.get(
  "/drivers",
  zValidator(
    "query",
    z.object({
      status: z.enum(["pending", "submitted", "verified"]).default("submitted"),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(20),
    }),
  ),
  async (c) => {
    const { status, page, limit } = c.req.valid("query");
    const db = c.get("db");
    const where = eq(driverProfile.documentsStatus, status);

    const [data, countRows] = await Promise.all([
      loadAdminDrivers(db, where, limit, (page - 1) * limit),
      db.select({ n: count() }).from(driverProfile).where(where),
    ]);

    return c.json({ data, page, limit, total: countRows[0]?.n ?? 0 });
  },
);

// Single expediente for the review page. Same row shape as the queue so the
// frontend `AdminDriver` type covers both.
admin.get("/drivers/:id", async (c) => {
  const db = c.get("db");
  const [driver] = await loadAdminDrivers(db, eq(driverProfile.id, c.req.param("id")), 1, 0);
  if (!driver) throw notFound("Driver profile not found");
  return c.json({ driver });
});

// Full platform picture of one user for the admin profile page: the account,
// its driver profile if any, activity tallies, and the latest activity. The
// Better Auth admin plugin only sees the user table, so this fills the rest.
admin.get("/users/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const target = await db.query.user.findFirst({
    where: eq(user.id, id),
    columns: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      phone: true,
      image: true,
      role: true,
      banned: true,
      banReason: true,
      banExpires: true,
      createdAt: true,
    },
    with: {
      driverProfile: {
        columns: {
          id: true,
          vehicleType: true,
          vehiclePlate: true,
          vehicleYear: true,
          isVerified: true,
          isAvailable: true,
          avgRating: true,
          totalJobs: true,
          documentsStatus: true,
          createdAt: true,
        },
      },
    },
  });
  if (!target) throw notFound("User not found");

  const [lastSession, requestAgg, clientJobAgg, driverJobAgg, quoteAgg, reviewAgg, recentRequests, recentJobs] =
    await Promise.all([
      db.query.session.findFirst({
        where: eq(session.userId, id),
        orderBy: [desc(session.updatedAt)],
        columns: { updatedAt: true },
      }),
      db.select({ status: request.status, n: count() }).from(request).where(eq(request.userId, id)).groupBy(request.status),
      db.select({ status: job.status, n: count() }).from(job).where(eq(job.userId, id)).groupBy(job.status),
      db.select({ status: job.status, n: count() }).from(job).where(eq(job.driverId, id)).groupBy(job.status),
      db.select({ n: count() }).from(quote).where(eq(quote.driverId, id)),
      db.select({ n: count(), avgRating: avg(review.rating) }).from(review).where(eq(review.revieweeId, id)),
      db.query.request.findMany({
        where: eq(request.userId, id),
        orderBy: [desc(request.createdAt)],
        limit: 5,
        columns: {
          id: true,
          status: true,
          originAddress: true,
          destAddress: true,
          volumeCategory: true,
          scheduledAt: true,
          createdAt: true,
        },
      }),
      db.query.job.findMany({
        where: or(eq(job.userId, id), eq(job.driverId, id)),
        orderBy: [desc(job.createdAt)],
        limit: 5,
        columns: { id: true, status: true, agreedPrice: true, driverId: true, createdAt: true },
        with: { request: { columns: { originAddress: true, destAddress: true } } },
      }),
    ]);

  const tally = (rows: { status: string; n: number }[]) => ({
    total: rows.reduce((sum, row) => sum + row.n, 0),
    completed: rows.find((row) => row.status === "completed")?.n ?? 0,
    cancelled: rows.find((row) => row.status === "cancelled")?.n ?? 0,
  });

  return c.json({
    user: { ...target, lastActiveAt: lastSession?.updatedAt ?? null },
    stats: {
      requests: tally(requestAgg),
      jobsAsClient: tally(clientJobAgg),
      jobsAsDriver: tally(driverJobAgg),
      quotesSent: quoteAgg[0]?.n ?? 0,
      reviewsReceived: {
        count: reviewAgg[0]?.n ?? 0,
        avgRating: reviewAgg[0]?.avgRating != null ? Number(reviewAgg[0].avgRating) : null,
      },
    },
    recentRequests,
    recentJobs: recentJobs.map(({ driverId, ...j }) => ({
      ...j,
      role: driverId === id ? ("driver" as const) : ("client" as const),
    })),
  });
});

// The human decision and driver trust state change together. Reopening clears
// the current decision so an admin can correct it without rerunning the model.
admin.patch(
  "/drivers/:id/verification",
  zValidator(
    "json",
    z.union([
      z.object({
        decision: z.enum(["verified", "changes_requested"]),
        note: z.string().trim().max(1000).optional(),
      }).superRefine(({ decision, note }, ctx) => {
        if (decision === "changes_requested" && !note) {
          ctx.addIssue({ code: "custom", path: ["note"], message: "Explain the requested changes" });
        }
      }),
      z.object({ action: z.literal("reopen") }),
    ]),
  ),
  async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const db = c.get("db");
    const reviewer = c.get("user")!;

    const [profile, review] = await Promise.all([
      db.query.driverProfile.findFirst({ where: eq(driverProfile.id, id) }),
      db.query.documentReview.findFirst({
        where: eq(documentReview.driverProfileId, id),
        orderBy: [desc(documentReview.createdAt)],
      }),
    ]);
    if (!profile) throw notFound("Driver profile not found");
    if (!review) throw badRequest("Driver has no document review");
    if (!["ready", "analysis_failed", "enqueue_failed"].includes(review.status)) {
      throw badRequest("Document review is still being analyzed");
    }

    if ("action" in body) {
      if (!review.decision) throw badRequest("Document review has no decision to reopen");

      const [updated] = await db.batch([
        db
          .update(driverProfile)
          .set({ documentsStatus: "submitted", isVerified: false })
          .where(eq(driverProfile.id, id))
          .returning(),
        db
          .update(documentReview)
          .set({ reviewerId: null, decision: null, reviewedAt: null, note: null })
          .where(eq(documentReview.id, review.id)),
      ]);

      return c.json({ driver: updated[0] });
    }

    if (review.decision) throw badRequest("Reopen the document review before deciding again");

    const reviewedAt = new Date();
    const [updated] = await db.batch([
      db
        .update(driverProfile)
        .set(body.decision === "verified"
          ? { documentsStatus: "verified", isVerified: true }
          : { documentsStatus: "pending", isVerified: false })
        .where(eq(driverProfile.id, id))
        .returning(),
      db
        .update(documentReview)
        .set({
          reviewerId: reviewer.id,
          decision: body.decision,
          reviewedAt,
          note: body.note || null,
        })
        .where(eq(documentReview.id, review.id)),
    ]);

    return c.json({ driver: updated[0] });
  },
);

export default admin;
