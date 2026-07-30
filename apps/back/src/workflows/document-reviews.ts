import * as Sentry from "@sentry/cloudflare";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { and, eq, lt, ne, or, sql } from "drizzle-orm";
import { triageDocuments, type ReviewDocument } from "../ai/document-review";
import type { Bindings } from "../binding";
import { createDb, type Db } from "../db";
import { documentReview } from "../db/schema";
import {
  verificationDocumentsSchema,
  type VerificationDocument,
} from "../domain/driver-documents";
import { documentReviewReadyEmail } from "../lib/email";
import { upstreamError } from "../lib/errors";
import { sendEmailToAdmins } from "./admin-notifications";

const ANALYSIS_LEASE_MS = 5 * 60 * 1000;

export type DocumentReviewMessage = { reviewId: string };

export function createDocumentReviewValues(
  driverProfileId: string,
  accountName: string,
  vehiclePlate: string,
  documents: VerificationDocument[],
) {
  return {
    id: crypto.randomUUID(),
    driverProfileId,
    accountName,
    vehiclePlate,
    documents: JSON.stringify(documents),
  };
}

// Marks every live review for the profile as replaced. Batched alongside the
// document/profile writes wherever verification documents change.
export function supersedeDocumentReviews(db: Db, driverProfileId: string) {
  return db
    .update(documentReview)
    .set({ status: "superseded" })
    .where(and(
      eq(documentReview.driverProfileId, driverProfileId),
      ne(documentReview.status, "superseded"),
    ));
}

async function enqueueDocumentReview(
  env: Bindings,
  db: Db,
  reviewId: string,
) {
  try {
    await env.DOCUMENT_REVIEW_QUEUE.send({ reviewId });
  } catch (error) {
    await db
      .update(documentReview)
      .set({ status: "enqueue_failed" })
      .where(and(
        eq(documentReview.id, reviewId),
        eq(documentReview.status, "queued"),
      ));
    Sentry.captureException(error, { extra: { reviewId } });
    throw error;
  }
}

export async function scheduleDocumentReview(
  env: Bindings,
  db: Db,
  reviewId: string,
) {
  try {
    await enqueueDocumentReview(env, db, reviewId);
  } catch {
    throw upstreamError("Could not schedule document review");
  }
}

export async function retryFailedDocumentReview(
  env: Bindings,
  db: Db,
  driverProfileId: string,
) {
  // At most one non-superseded review exists per profile, so a conditional
  // update both detects and claims the retry in one round trip.
  const [failedReview] = await db
    .update(documentReview)
    .set({ status: "queued" })
    .where(and(
      eq(documentReview.driverProfileId, driverProfileId),
      eq(documentReview.status, "enqueue_failed"),
    ))
    .returning({ id: documentReview.id });
  if (!failedReview) return;

  await scheduleDocumentReview(env, db, failedReview.id);
}

export async function processDocumentReview(env: Bindings, reviewId: string) {
  const db = createDb(env.db);
  const leaseExpiredAt = new Date(Date.now() - ANALYSIS_LEASE_MS);

  const [review] = await db
    .update(documentReview)
    .set({
      status: "analyzing",
      analysisStartedAt: new Date(),
      analysisAttempts: sql`${documentReview.analysisAttempts} + 1`,
    })
    .where(and(
      eq(documentReview.id, reviewId),
      or(
        eq(documentReview.status, "queued"),
        and(eq(documentReview.status, "analyzing"), lt(documentReview.analysisStartedAt, leaseExpiredAt)),
      ),
    ))
    .returning();
  if (!review) return;

  const submittedDocuments = verificationDocumentsSchema.parse(JSON.parse(review.documents));
  const reviewDocuments = await Promise.all(
    submittedDocuments.map(async (document): Promise<ReviewDocument> => {
      const object = await env.BUCKET.get(document.key);
      if (!object) throw new Error(`Document upload missing: ${document.key}`);
      return { key: document.key, kind: document.kind, image: await object.arrayBuffer() };
    }),
  );

  const google = createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY });
  const result = await triageDocuments(
    google("gemini-3-flash"),
    reviewDocuments,
    { accountName: review.accountName, vehiclePlate: review.vehiclePlate },
  );

  const completed = await db
    .update(documentReview)
    .set({ status: "ready", result: JSON.stringify(result), analyzedAt: new Date() })
    .where(and(
      eq(documentReview.id, review.id),
      eq(documentReview.status, "analyzing"),
    ))
    .run();
  if (!completed.meta.changes) return;

  const notifiedAdmins = await sendEmailToAdmins(db, env, documentReviewReadyEmail({
    driverName: review.accountName,
    driverProfileId: review.driverProfileId,
    frontendUrl: env.FRONTEND_URL,
  }));
  if (notifiedAdmins === 0) return;

  await db
    .update(documentReview)
    .set({ adminNotificationAttemptedAt: new Date() })
    .where(eq(documentReview.id, review.id));
}

export async function markDocumentReviewFailed(env: Bindings, reviewId: string) {
  const db = createDb(env.db);
  await db
    .update(documentReview)
    .set({ status: "analysis_failed" })
    .where(and(
      eq(documentReview.id, reviewId),
      or(eq(documentReview.status, "queued"), eq(documentReview.status, "analyzing")),
    ));
  Sentry.captureException(new Error(`Document review exhausted retries: ${reviewId}`));
}
