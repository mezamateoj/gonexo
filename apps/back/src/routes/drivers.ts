import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { documentReview, driverDocument, driverProfile, review, user as userTable } from "../db/schema";
import {
  onlyVerificationDocuments,
  sameVerificationDocuments,
} from "../domain/driver-documents";
import { requireAuth, requireDriverAccount } from "../middleware/auth";
import { badRequest, notFound } from "../lib/errors";
import type { AppEnv } from "../lib/types";
import { enrichVehicle } from "../ai/vehicle-enrichment";
import { logger } from "../lib/logger";
import { normalizePhone, normalizeVehiclePlate } from "../lib/normalizers";
import { containsContactInfo, NO_CONTACT_MESSAGE } from "../lib/content-safety";
import { throwConflictOnUniqueConstraint } from "../lib/database-errors";
import { enforceRateLimit } from "../lib/rate-limit";
import { getOwnedUpload, requireOwnedUpload } from "../lib/uploads";
import {
  createDocumentReviewValues,
  retryFailedDocumentReview,
  scheduleDocumentReview,
  supersedeDocumentReviews,
} from "../workflows/document-reviews";
import {
  enrichSchema,
  replaceDocumentsSchema,
  replacePhotosSchema,
  upsertDriverSchema,
} from "./drivers.schemas";

const drivers = new Hono<AppEnv>();

drivers.get("/me", requireDriverAccount, async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const profile = await db.query.driverProfile.findFirst({
    where: eq(driverProfile.userId, user.id),
    with: { documents: { orderBy: [asc(driverDocument.order)] } },
  });
  return c.json(profile ?? null);
});

drivers.post(
  "/me",
  requireDriverAccount,
  zValidator("json", upsertDriverSchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const body = c.req.valid("json");
    if (containsContactInfo(body.bio)) throw badRequest(NO_CONTACT_MESSAGE);
    const phone = normalizePhone(body.phone);
    const vehiclePlate = normalizeVehiclePlate(body.vehiclePlate);

    if (body.documents) {
      await Promise.all(
        body.documents.map(({ key }) => requireOwnedUpload(c.env.BUCKET, key, user.id)),
      );
    }

    const existing = await db.query.driverProfile.findFirst({
      where: eq(driverProfile.userId, user.id),
      with: { documents: { orderBy: [asc(driverDocument.order)] } },
    });
    const existingVerificationDocuments = existing
      ? onlyVerificationDocuments(existing.documents)
      : [];
    const vehicleChanged = !!existing && (
      existing.vehicleType !== body.vehicleType || existing.vehiclePlate !== vehiclePlate
    );
    const documentsChanged = body.documents !== undefined
      && (!existing || !sameVerificationDocuments(existingVerificationDocuments, body.documents));
    const reviewDocuments = body.documents ?? existingVerificationDocuments;
    const hasDocuments = reviewDocuments.length > 0;
    // Papers are cross-checked against the vehicle, so a plate or type change
    // requires the same human re-review as replacing the documents.
    const verificationChanged = documentsChanged || vehicleChanged;
    const currentStatus = existing?.documentsStatus ?? "pending";
    const documentsStatus = verificationChanged
      ? hasDocuments ? "submitted" : "pending"
      : currentStatus;
    if (existing) {
      const documentReviewValues = verificationChanged && hasDocuments
        ? createDocumentReviewValues(existing.id, user.name, vehiclePlate, reviewDocuments)
        : null;
      if (documentReviewValues) {
        await enforceRateLimit(
          c.env.AI_RATE_LIMITER,
          `${user.id}:document-review`,
          "Too many document review requests",
        );
      }
      const updateUser = db
        .update(userTable)
        .set({ phone })
        .where(eq(userTable.id, user.id));
      const updateProfile = db
        .update(driverProfile)
        .set({
          phone,
          vehicleType: body.vehicleType,
          vehiclePlate,
          vehicleYear: body.vehicleYear ?? null,
          bio: body.bio ?? null,
          vehicleDescription: body.vehicleDescription ?? existing.vehicleDescription,
          vehicleCapacity: body.vehicleCapacity ?? existing.vehicleCapacity,
          documentsStatus,
          isVerified: verificationChanged ? false : existing.isVerified,
        })
        .where(eq(driverProfile.userId, user.id));

      const documentStatements = documentsChanged && body.documents
        ? [
            db.delete(driverDocument).where(and(
              eq(driverDocument.driverProfileId, existing.id),
              ne(driverDocument.kind, "vehicle_photo"),
            )),
            ...(body.documents.length
              ? [db.insert(driverDocument).values(
                  body.documents.map((document) => ({
                    id: crypto.randomUUID(),
                    driverProfileId: existing.id,
                    kind: document.kind,
                    key: document.key,
                    order: document.order,
                  })),
                )]
              : []),
          ]
        : [];
      const reviewStatements = [
        ...(documentsChanged || documentReviewValues
          ? [supersedeDocumentReviews(db, existing.id)]
          : []),
        ...(documentReviewValues ? [db.insert(documentReview).values(documentReviewValues)] : []),
      ];
      try {
        await db.batch([updateUser, updateProfile, ...documentStatements, ...reviewStatements]);
      } catch (error) {
        throwConflictOnUniqueConstraint(error, "Phone number or vehicle plate is already in use");
      }
      logger.info("Driver profile updated: {userId} ({vehicleType} {vehiclePlate}, docs: {documentsStatus})", {
        userId: user.id,
        vehicleType: body.vehicleType,
        vehiclePlate,
        documentsStatus,
      });
      if (documentReviewValues) {
        await scheduleDocumentReview(c.env, db, documentReviewValues.id);
      } else if (!verificationChanged) {
        await retryFailedDocumentReview(c.env, db, existing.id);
      }
      return c.json({ id: existing.id });
    }

    const id = crypto.randomUUID();
    const documentReviewValues = body.documents && hasDocuments
      ? createDocumentReviewValues(id, user.name, vehiclePlate, body.documents)
      : null;
    if (documentReviewValues) {
      await enforceRateLimit(
        c.env.AI_RATE_LIMITER,
        `${user.id}:document-review`,
        "Too many document review requests",
      );
    }
    const updateUser = db
      .update(userTable)
      .set({ phone })
      .where(eq(userTable.id, user.id));
    const insertProfile = db.insert(driverProfile).values({
      id,
      userId: user.id,
      phone,
      vehicleType: body.vehicleType,
      vehiclePlate,
      vehicleYear: body.vehicleYear ?? null,
      bio: body.bio ?? null,
      vehicleDescription: body.vehicleDescription ?? null,
      vehicleCapacity: body.vehicleCapacity ?? null,
      documentsStatus,
    });
    try {
      if (body.documents?.length) {
        await db.batch([
          updateUser,
          insertProfile,
          db.insert(driverDocument).values(
            body.documents.map((document) => ({
              id: crypto.randomUUID(),
              driverProfileId: id,
              kind: document.kind,
              key: document.key,
              order: document.order,
            })),
          ),
          ...(documentReviewValues ? [db.insert(documentReview).values(documentReviewValues)] : []),
        ]);
      } else {
        await db.batch([updateUser, insertProfile]);
      }
    } catch (error) {
      throwConflictOnUniqueConstraint(error, "Phone number or vehicle plate is already in use");
    }
    logger.info("Driver profile created: {id} for user {userId} ({vehicleType} {vehiclePlate})", {
      id,
      userId: user.id,
      vehicleType: body.vehicleType,
      vehiclePlate,
      documentsStatus,
    });
    if (documentReviewValues) {
      await scheduleDocumentReview(c.env, db, documentReviewValues.id);
    }
    return c.json({ id }, 201);
  },
);

drivers.get("/me/documents", requireDriverAccount, async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const profile = await db.query.driverProfile.findFirst({
    where: eq(driverProfile.userId, user.id),
    columns: { id: true },
  });
  if (!profile) throw notFound("Driver profile not found");

  const documents = await db.query.driverDocument.findMany({
    where: eq(driverDocument.driverProfileId, profile.id),
    orderBy: [asc(driverDocument.order)],
  });
  return c.json(documents);
});

drivers.put(
  "/me/documents",
  requireDriverAccount,
  zValidator("json", replaceDocumentsSchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const { documents } = c.req.valid("json");
    await Promise.all(
      documents.map(({ key }) => requireOwnedUpload(c.env.BUCKET, key, user.id)),
    );
    const profile = await db.query.driverProfile.findFirst({
      where: eq(driverProfile.userId, user.id),
      columns: { id: true, vehiclePlate: true },
      with: { documents: { orderBy: [asc(driverDocument.order)] } },
    });
    if (!profile) throw notFound("Driver profile not found");

    const documentsChanged = !sameVerificationDocuments(
      onlyVerificationDocuments(profile.documents),
      documents,
    );
    if (!documentsChanged) {
      await retryFailedDocumentReview(c.env, db, profile.id);
      return c.json({ ok: true });
    }

    const hasDocuments = documents.length > 0;
    const documentReviewValues = hasDocuments
      ? createDocumentReviewValues(profile.id, user.name, profile.vehiclePlate, documents)
      : null;
    if (documentReviewValues) {
      await enforceRateLimit(
        c.env.AI_RATE_LIMITER,
        `${user.id}:document-review`,
        "Too many document review requests",
      );
    }

    const replaceDocuments = db
      .delete(driverDocument)
      .where(and(
        eq(driverDocument.driverProfileId, profile.id),
        ne(driverDocument.kind, "vehicle_photo"),
      ));
    const updateProfile = db
      .update(driverProfile)
      .set({
        documentsStatus: hasDocuments ? "submitted" : "pending",
        isVerified: false,
      })
      .where(eq(driverProfile.id, profile.id));

    try {
      await db.batch([
        replaceDocuments,
        ...(documents.length
          ? [db.insert(driverDocument).values(
              documents.map((document) => ({
                id: crypto.randomUUID(),
                driverProfileId: profile.id,
                kind: document.kind,
                key: document.key,
                order: document.order,
              })),
            )]
          : []),
        updateProfile,
        supersedeDocumentReviews(db, profile.id),
        ...(documentReviewValues ? [db.insert(documentReview).values(documentReviewValues)] : []),
      ]);
    } catch (error) {
      throwConflictOnUniqueConstraint(error, "A document is already in use");
    }

    if (documentReviewValues) {
      await scheduleDocumentReview(c.env, db, documentReviewValues.id);
    }

    return c.json({ ok: true });
  },
);

drivers.put("/me/photos", requireDriverAccount, zValidator("json", replacePhotosSchema), async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const { photos } = c.req.valid("json");
  await Promise.all(
    photos.map(({ key }) => requireOwnedUpload(c.env.BUCKET, key, user.id)),
  );
  const profile = await db.query.driverProfile.findFirst({ where: eq(driverProfile.userId, user.id), columns: { id: true } });
  if (!profile) throw notFound("Driver profile not found");

  await db.batch([
    db.delete(driverDocument).where(and(eq(driverDocument.driverProfileId, profile.id), eq(driverDocument.kind, "vehicle_photo"))),
    ...(photos.length ? [db.insert(driverDocument).values(photos.map((photo) => ({ id: crypto.randomUUID(), driverProfileId: profile.id, ...photo })))] : []),
  ]);
  return c.json({ ok: true });
});

drivers.post(
  "/enrich",
  requireDriverAccount,
  zValidator("json", enrichSchema),
  async (c) => {
    const user = c.get("user")!;
    await enforceRateLimit(
      c.env.AI_RATE_LIMITER,
      `${user.id}:drivers-enrich`,
      "Too many vehicle enrichment requests",
    );
    const { photoKeys, papersKey } = c.req.valid("json");
    const photoObjects = await Promise.all(
      photoKeys.map((key) => getOwnedUpload(c.env.BUCKET, key, user.id)),
    );
    const papersObject = papersKey
      ? await getOwnedUpload(c.env.BUCKET, papersKey, user.id)
      : null;
    const [photos, papers] = await Promise.all([
      Promise.all(photoObjects.map((object) => object.arrayBuffer())),
      papersObject ? papersObject.arrayBuffer() : null,
    ]);
    const apiKey = c.env.ANTHROPIC_API_KEY;
    logger.debug("Vehicle enrichment started for user {userId} ({photoCount} photos)", {
      userId: user.id,
      photoCount: photoKeys.length,
      hasPapers: !!papersKey,
    });
    const result = await enrichVehicle(photos, papers, apiKey);
    logger.info("Vehicle enrichment complete for user {userId} ({attributes} attributes)", {
      userId: user.id,
      attributes: result.attributes.length,
      vehicleCapacity: result.vehicleCapacity,
    });
    return c.json(result);
  },
);

// Public driver profile. Auth-gated and projected to non-sensitive fields only —
// phone, plate, document URLs, and the owning user id never leave the server here.
drivers.get("/:id", requireAuth, async (c) => {
  const db = c.get("db");
  const profile = await db.query.driverProfile.findFirst({
    where: eq(driverProfile.id, c.req.param("id")),
    columns: {
      id: true,
      userId: true, // needed to look up reviews; stripped from the response
      vehicleType: true,
      vehicleYear: true,
      bio: true,
      isVerified: true,
      documentsStatus: true,
      avgRating: true,
      totalJobs: true,
      vehicleDescription: true,
      vehicleCapacity: true,
      createdAt: true,
    },
    with: {
      user: { columns: { id: true, name: true, image: true } },
      documents: {
        where: eq(driverDocument.kind, "vehicle_photo"),
        orderBy: [asc(driverDocument.order)],
        columns: { key: true, order: true },
      },
    },
  });
  if (!profile) throw notFound();

  const recentReviews = await db.query.review.findMany({
    where: eq(review.revieweeId, profile.userId),
    orderBy: [desc(review.createdAt)],
    limit: 10,
    columns: { rating: true, comment: true, reviewerRole: true, createdAt: true },
    with: {
      reviewer: { columns: { name: true, image: true } },
    },
  });

  const { userId: _userId, documents, ...publicProfile } = profile;
  return c.json({ ...publicProfile, vehiclePhotos: documents, recentReviews });
});

export type DriversType = typeof drivers;
export default drivers;
