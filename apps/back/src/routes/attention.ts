import { Hono } from "hono";
import { and, desc, eq, exists, gt, inArray, isNotNull, not, or } from "drizzle-orm";
import { documentReview, driverProfile, job, quote, request, review } from "../db/schema";
import type { ClientJobAction, DriverJobAction } from "../domain/attention";
import type { AppEnv } from "../lib/types";
import { requireAuth, requireClient, requireDriverAccount } from "../middleware/auth";

const attention = new Hono<AppEnv>();

attention.get("/offers", requireClient, async (c) => {
  const db = c.get("db");
  const userId = c.get("user")!.id;
  const now = new Date();
  const rows = await db.query.request.findMany({
    where: and(
      eq(request.userId, userId),
      eq(request.status, "open"),
      exists(db.select({ id: quote.id }).from(quote).where(and(
        eq(quote.requestId, request.id),
        eq(quote.status, "pending"),
        gt(quote.expiresAt, now),
      ))),
    ),
    columns: { id: true },
    with: {
      quotes: {
        where: and(eq(quote.status, "pending"), gt(quote.expiresAt, now)),
        columns: { createdAt: true },
        orderBy: [desc(quote.createdAt)],
      },
    },
    orderBy: [desc(request.createdAt)],
    limit: 20,
  });
  const offers = rows.flatMap((item) => {
    const [lastOffer] = item.quotes;
    return lastOffer
      ? [{
          requestId: item.id,
          quoteCount: item.quotes.length,
          lastOfferAt: lastOffer.createdAt,
        }]
      : [];
  });

  return c.json({ count: offers.length, offers });
});

attention.get("/jobs", requireAuth, async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const hasNotReviewed = not(
    exists(db.select({ id: review.id }).from(review).where(and(
      eq(review.jobId, job.id),
      eq(review.reviewerId, user.id),
    ))),
  );

  if (user.accountType === "client") {
    const rows = await db.query.job.findMany({
      where: and(
        eq(job.userId, user.id),
        eq(job.status, "completed"),
        hasNotReviewed,
      ),
      columns: {
        id: true,
        requestId: true,
        completedAt: true,
        confirmedAt: true,
      },
      orderBy: [desc(job.completedAt)],
      limit: 20,
    });
    const jobs = rows.flatMap<ClientJobAction>((item) => {
      if (item.confirmedAt) {
        return [{
          type: "review_job",
          jobId: item.id,
          requestId: item.requestId,
          createdAt: item.confirmedAt,
        }];
      }
      return item.completedAt
        ? [{
            type: "confirm_reception",
            jobId: item.id,
            requestId: item.requestId,
            createdAt: item.completedAt,
          }]
        : [];
    });

    return c.json({ count: jobs.length, jobs });
  }

  const rows = await db.query.job.findMany({
    where: and(
      eq(job.driverId, user.id),
      or(
        inArray(job.status, ["scheduled", "on_the_way", "arrived"]),
        and(
          eq(job.status, "completed"),
          isNotNull(job.confirmedAt),
          hasNotReviewed,
        ),
      ),
    ),
    columns: {
      id: true,
      requestId: true,
      status: true,
      confirmedAt: true,
      createdAt: true,
    },
    with: {
      request: { columns: { scheduledAt: true } },
    },
    orderBy: [desc(job.createdAt)],
    limit: 20,
  });
  const jobs = rows.flatMap<DriverJobAction>((item) => {
    const shared = { jobId: item.id, requestId: item.requestId };
    switch (item.status) {
      case "scheduled":
        return [{
          ...shared,
          type: "start_job",
          scheduledAt: item.request.scheduledAt,
          createdAt: item.createdAt,
        }];
      case "on_the_way":
        return [{ ...shared, type: "mark_arrived", createdAt: item.createdAt }];
      case "arrived":
        return [{ ...shared, type: "complete_job", createdAt: item.createdAt }];
      case "completed":
        return item.confirmedAt
          ? [{ ...shared, type: "review_job", createdAt: item.confirmedAt }]
          : [];
      default:
        return [];
    }
  });

  return c.json({ count: jobs.length, jobs });
});

attention.get("/verification", requireDriverAccount, async (c) => {
  const db = c.get("db");
  const userId = c.get("user")!.id;
  const profile = await db.query.driverProfile.findFirst({
    where: eq(driverProfile.userId, userId),
    columns: { documentsStatus: true },
    with: {
      documentReviews: {
        columns: { decision: true, note: true, reviewedAt: true },
        orderBy: [desc(documentReview.createdAt)],
        limit: 1,
      },
    },
  });
  const latestReview = profile?.documentReviews[0];
  const verification =
    profile?.documentsStatus === "pending" &&
    latestReview?.decision === "changes_requested" &&
    latestReview.reviewedAt &&
    latestReview.note
      ? {
          type: "verification_changes_requested" as const,
          note: latestReview.note,
          createdAt: latestReview.reviewedAt,
        }
      : null;

  return c.json({ verification });
});

export default attention;
