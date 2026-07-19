import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { asc, count, desc, eq } from "drizzle-orm";
import { documentTriageResultSchema } from "../ai/document-review";
import { documentReview, driverDocument, driverProfile } from "../db/schema";
import { requireAdmin } from "../middleware/auth";
import { badRequest, notFound } from "../lib/errors";
import type { AppEnv } from "../lib/types";

// All routes here sit under /api/admin and require an admin session. Users
// list/search comes from the Better Auth admin plugin (`/api/auth/admin/*`),
// so this module only owns driver verification.
const admin = new Hono<AppEnv>();

admin.use("*", requireAdmin);

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

    const [profiles, countRows] = await Promise.all([
      db.query.driverProfile.findMany({
        where,
        limit,
        offset: (page - 1) * limit,
        with: {
          user: { columns: { id: true, name: true, email: true, phone: true } },
          documents: { orderBy: [asc(driverDocument.order)] },
          documentReviews: {
            limit: 1,
            orderBy: [desc(documentReview.createdAt)],
            // The `documents` snapshot blob is only needed by the analysis
            // worker; keep it out of the list payload.
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
      }),
      db.select({ n: count() }).from(driverProfile).where(where),
    ]);

    const data = profiles.map(({ documentReviews, ...profile }) => {
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

    return c.json({ data, page, limit, total: countRows[0]?.n ?? 0 });
  },
);

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
